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

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, headline, bio, location, skills, work_preference, education)
  on public.profiles to authenticated;
grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;
grant select, insert, update on public.applications to authenticated;

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

revoke all on function public.user_has_role(text) from public;
grant execute on function public.user_has_role(text) to authenticated;

drop policy if exists "Profiles are visible to their owner, employers, and applicants" on public.profiles;
create policy "Profiles are visible to their owner, employers, and applicants"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or public.user_has_role('employer')
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.graduate_id = id and j.employer_id = auth.uid()
    )
  );

drop policy if exists "Jobs are visible to everyone" on public.jobs;
create policy "Jobs are visible to everyone"
  on public.jobs for select
  to anon, authenticated
  using (true);

drop policy if exists "Employers can create their own jobs" on public.jobs;
create policy "Employers can create their own jobs"
  on public.jobs for insert
  to authenticated
  with check (
    auth.uid() = employer_id
    and public.user_has_role('employer')
  );

drop policy if exists "Employers can update their own jobs" on public.jobs;
create policy "Employers can update their own jobs"
  on public.jobs for update
  to authenticated
  using (auth.uid() = employer_id and public.user_has_role('employer'))
  with check (auth.uid() = employer_id and public.user_has_role('employer'));

drop policy if exists "Employers can delete their own jobs" on public.jobs;
create policy "Employers can delete their own jobs"
  on public.jobs for delete
  to authenticated
  using (auth.uid() = employer_id and public.user_has_role('employer'));

drop policy if exists "Applicants and the owning employer can view applications" on public.applications;
create policy "Applicants and the owning employer can view applications"
  on public.applications for select
  to authenticated
  using (
    auth.uid() = graduate_id
    or exists (
      select 1 from public.jobs j
      where j.id = job_id and j.employer_id = auth.uid()
    )
  );

drop policy if exists "Graduates can apply to jobs" on public.applications;
create policy "Graduates can apply to jobs"
  on public.applications for insert
  to authenticated
  with check (auth.uid() = graduate_id and public.user_has_role('graduate'));

revoke update on public.applications from authenticated;
grant update (status) on public.applications to authenticated;

drop policy if exists "Employers can update application status for their jobs" on public.applications;
create policy "Employers can update application status for their jobs"
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.employer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.employer_id = auth.uid()
    )
  );

alter table public.graduate_work_experience enable row level security;
alter table public.graduate_projects enable row level security;
alter table public.graduate_documents enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

grant select, insert, update, delete on public.graduate_work_experience to authenticated;
grant select, insert, update, delete on public.graduate_projects to authenticated;
grant select, insert, delete on public.graduate_documents to authenticated;

drop policy if exists "Graduates manage their own work history" on public.graduate_work_experience;
create policy "Graduates manage their own work history"
  on public.graduate_work_experience for all
  to authenticated
  using (auth.uid() = graduate_id)
  with check (
    auth.uid() = graduate_id
    and public.user_has_role('graduate')
  );

drop policy if exists "Employers view graduate work history" on public.graduate_work_experience;
create policy "Employers view graduate work history"
  on public.graduate_work_experience for select
  to authenticated
  using (public.user_has_role('employer'));

drop policy if exists "Graduates manage their own projects" on public.graduate_projects;
create policy "Graduates manage their own projects"
  on public.graduate_projects for all
  to authenticated
  using (auth.uid() = graduate_id)
  with check (
    auth.uid() = graduate_id
    and public.user_has_role('graduate')
  );

drop policy if exists "Employers view graduate projects" on public.graduate_projects;
create policy "Employers view graduate projects"
  on public.graduate_projects for select
  to authenticated
  using (public.user_has_role('employer'));

drop policy if exists "Graduates manage their own documents" on public.graduate_documents;
create policy "Graduates manage their own documents"
  on public.graduate_documents for all
  to authenticated
  using (auth.uid() = graduate_id)
  with check (
    auth.uid() = graduate_id
    and public.user_has_role('graduate')
  );

drop policy if exists "Employers view graduate documents" on public.graduate_documents;
create policy "Employers view graduate documents"
  on public.graduate_documents for select
  to authenticated
  using (public.user_has_role('employer'));

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

drop policy if exists "Users can view their own evidence files" on storage.objects;
drop policy if exists "Users can upload their own evidence files" on storage.objects;
drop policy if exists "Users can update their own evidence files" on storage.objects;
drop policy if exists "Users can delete their own evidence files" on storage.objects;

create policy "Graduates view their own evidence files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Employers view graduate evidence files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and public.user_has_role('employer')
  );

create policy "Graduates upload their own evidence files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.user_has_role('graduate')
  );

create policy "Graduates update their own evidence files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.user_has_role('graduate')
  )
  with check (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.user_has_role('graduate')
  );

create policy "Graduates delete their own evidence files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'graduate')
  );
