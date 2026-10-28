grant usage on schema public to anon, authenticated;

alter table public.jobs
  add column if not exists company_name text,
  add column if not exists department text,
  add column if not exists experience_level text,
  add column if not exists education_level text,
  add column if not exists work_arrangement text,
  add column if not exists salary_min integer,
  add column if not exists salary_max integer,
  add column if not exists salary_currency text not null default 'ZAR',
  add column if not exists benefits text,
  add column if not exists application_deadline date,
  add column if not exists openings integer not null default 1,
  add column if not exists skills text;

create table if not exists public.graduate_work_experience (
  id uuid primary key default gen_random_uuid(),
  graduate_id uuid not null references public.profiles (id) on delete cascade,
  company_name text not null,
  job_title text not null,
  location text,
  employment_type text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text not null,
  created_at timestamptz not null default now(),
  check (not is_current or end_date is null)
);

create table if not exists public.graduate_projects (
  id uuid primary key default gen_random_uuid(),
  graduate_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  technologies text,
  project_url text,
  evidence_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.graduate_documents (
  id uuid primary key default gen_random_uuid(),
  graduate_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('cv', 'project')),
  file_name text not null,
  storage_path text not null unique,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create index if not exists graduate_work_experience_owner_idx
  on public.graduate_work_experience (graduate_id, start_date desc);
create index if not exists graduate_projects_owner_idx
  on public.graduate_projects (graduate_id, created_at desc);
create index if not exists graduate_documents_owner_type_idx
  on public.graduate_documents (graduate_id, document_type, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  if requested_role is null or requested_role not in ('graduate', 'employer', 'verifier') then
    requested_role := 'graduate';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    requested_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  case
    when u.raw_user_meta_data ->> 'role' in ('graduate', 'employer', 'verifier')
      then u.raw_user_meta_data ->> 'role'
    else 'graduate'
  end
from auth.users u
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'graduate-evidence',
  'graduate-evidence',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.user_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = required_role
  );
$$;

revoke all on function public.user_has_role(text) from public, anon;
grant execute on function public.user_has_role(text) to authenticated;

create or replace function public.is_verified_employer()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_verified boolean;
begin
  if not public.user_has_role('employer') then
    return false;
  end if;

  if to_regprocedure('public.current_user_is_verified_employer()') is null then
    return false;
  end if;

  execute 'select public.current_user_is_verified_employer()'
    into is_verified;
  return coalesce(is_verified, false);
end;
$$;

revoke all on function public.is_verified_employer() from public, anon;
grant execute on function public.is_verified_employer() to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'jobs',
        'applications',
        'graduate_work_experience',
        'graduate_projects',
        'graduate_documents'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.graduate_work_experience enable row level security;
alter table public.graduate_projects enable row level security;
alter table public.graduate_documents enable row level security;

revoke all on public.jobs from public, anon, authenticated;
grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, headline, bio, location, skills, work_preference, education)
  on public.profiles to authenticated;

revoke all on public.applications from public, anon, authenticated;
grant select, insert, update on public.applications to authenticated;
revoke update on public.applications from public, anon, authenticated;
grant update (status) on public.applications to authenticated;

revoke all on public.graduate_work_experience,
             public.graduate_projects,
             public.graduate_documents
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.graduate_work_experience,
     public.graduate_projects
  to authenticated;
grant select, insert, delete on public.graduate_documents to authenticated;

create policy "Profiles are visible to their owner and verified employers"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (role = 'graduate' and (select public.is_verified_employer()))
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.graduate_id = profiles.id
        and j.employer_id = (select auth.uid())
    )
  );

create policy "Users update their own profile details"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Public can read jobs"
  on public.jobs for select
  to anon, authenticated
  using (true);

create policy "Verified employers create their own jobs"
  on public.jobs for insert
  to authenticated
  with check (
    employer_id = (select auth.uid())
    and (select public.is_verified_employer())
  );

create policy "Verified employers update their own jobs"
  on public.jobs for update
  to authenticated
  using (
    employer_id = (select auth.uid())
    and (select public.is_verified_employer())
  )
  with check (
    employer_id = (select auth.uid())
    and (select public.is_verified_employer())
  );

create policy "Verified employers delete their own jobs"
  on public.jobs for delete
  to authenticated
  using (
    employer_id = (select auth.uid())
    and (select public.is_verified_employer())
  );

create policy "Graduates and owning verified employers view applications"
  on public.applications for select
  to authenticated
  using (
    graduate_id = (select auth.uid())
    or (
      (select public.is_verified_employer())
      and exists (
        select 1 from public.jobs j
        where j.id = applications.job_id
          and j.employer_id = (select auth.uid())
      )
    )
  );

create policy "Graduates create their own applications"
  on public.applications for insert
  to authenticated
  with check (
    graduate_id = (select auth.uid())
    and (select public.user_has_role('graduate'))
  );

create policy "Verified employers update application status"
  on public.applications for update
  to authenticated
  using (
    (select public.is_verified_employer())
    and exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and j.employer_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_verified_employer())
    and exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and j.employer_id = (select auth.uid())
    )
  );

create policy "Graduates manage their own work history"
  on public.graduate_work_experience for all
  to authenticated
  using (
    graduate_id = (select auth.uid())
    and (select public.user_has_role('graduate'))
  )
  with check (
    graduate_id = (select auth.uid())
    and (select public.user_has_role('graduate'))
  );

create policy "Verified employers view graduate work history"
  on public.graduate_work_experience for select
  to authenticated
  using ((select public.is_verified_employer()));

create policy "Graduates manage their own projects"
  on public.graduate_projects for all
  to authenticated
  using (
    graduate_id = (select auth.uid())
    and (select public.user_has_role('graduate'))
  )
  with check (
    graduate_id = (select auth.uid())
    and (select public.user_has_role('graduate'))
  );

create policy "Verified employers view graduate projects"
  on public.graduate_projects for select
  to authenticated
  using ((select public.is_verified_employer()));

create policy "Graduates manage their own documents"
  on public.graduate_documents for all
  to authenticated
  using (
    graduate_id = (select auth.uid())
    and (select public.user_has_role('graduate'))
  )
  with check (
    graduate_id = (select auth.uid())
    and (select public.user_has_role('graduate'))
  );

create policy "Verified employers view graduate documents"
  on public.graduate_documents for select
  to authenticated
  using ((select public.is_verified_employer()));

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') like '%graduate-evidence%'
        or coalesce(with_check, '') like '%graduate-evidence%'
        or policyname in (
          'Graduates view their own evidence files',
          'Employers view graduate evidence files',
          'Graduates upload their own evidence files',
          'Graduates update their own evidence files',
          'Graduates delete their own evidence files'
        )
      )
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_record.policyname
    );
  end loop;
end;
$$;

create policy "Graduates view their own evidence files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Verified employers view graduate evidence files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (select public.is_verified_employer())
  );

create policy "Graduates upload their own evidence files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_has_role('graduate'))
  );

create policy "Graduates update their own evidence files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_has_role('graduate'))
  )
  with check (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_has_role('graduate'))
  );

create policy "Graduates delete their own evidence files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_has_role('graduate'))
  );

notify pgrst, 'reload schema';
