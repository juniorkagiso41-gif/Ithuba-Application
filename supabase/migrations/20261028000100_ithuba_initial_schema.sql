create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'graduate' check (role in ('graduate', 'employer', 'verifier')),
  headline text,
  bio text,
  location text,
  skills text,
  work_preference text,
  education text,
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  location text not null,
  type text not null,
  salary text not null,
  description text not null,
  requirements text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  graduate_id uuid not null references public.profiles (id) on delete cascade,
  cover_letter text not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, graduate_id)
);

create index if not exists jobs_employer_id_created_at_idx
  on public.jobs (employer_id, created_at desc);
create index if not exists applications_job_id_updated_at_idx
  on public.applications (job_id, updated_at desc);
create index if not exists applications_graduate_id_updated_at_idx
  on public.applications (graduate_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

grant select on table public.profiles to authenticated;
grant select on table public.jobs to anon, authenticated;
grant insert, update, delete on table public.jobs to authenticated;
grant select, insert, update on table public.applications to authenticated;

create policy "Profiles are visible to their owner, employers, and applicants"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or role = 'employer'
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.graduate_id = id and j.employer_id = auth.uid()
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on table public.profiles from authenticated;
grant update (full_name, headline, bio, location, skills, work_preference, education)
  on table public.profiles to authenticated;

create policy "Jobs are visible to everyone"
  on public.jobs for select
  to anon, authenticated
  using (true);

create policy "Employers can create their own jobs"
  on public.jobs for insert
  to authenticated
  with check (
    auth.uid() = employer_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'employer'
    )
  );

create policy "Employers can update their own jobs"
  on public.jobs for update
  to authenticated
  using (auth.uid() = employer_id)
  with check (
    auth.uid() = employer_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'employer'
    )
  );

create policy "Employers can delete their own jobs"
  on public.jobs for delete
  to authenticated
  using (auth.uid() = employer_id);

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

create policy "Graduates can apply to jobs"
  on public.applications for insert
  to authenticated
  with check (
    auth.uid() = graduate_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'graduate'
    )
  );

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

revoke update on table public.applications from authenticated;
grant update (status) on table public.applications to authenticated;

insert into storage.buckets (id, name, public)
values ('graduate-evidence', 'graduate-evidence', false)
on conflict (id) do nothing;

create policy "Users can view their own evidence files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload their own evidence files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own evidence files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own evidence files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
