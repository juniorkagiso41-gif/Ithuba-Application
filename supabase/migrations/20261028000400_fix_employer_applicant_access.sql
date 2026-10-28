grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;
grant select, insert on public.applications to authenticated;
grant update (status) on public.applications to authenticated;
grant select on public.profiles to authenticated;
grant select on public.graduate_work_experience,
                public.graduate_projects,
                public.graduate_documents
  to authenticated;

drop policy if exists "Verified employers create their own jobs" on public.jobs;
drop policy if exists "Verified employers update their own jobs" on public.jobs;
drop policy if exists "Verified employers delete their own jobs" on public.jobs;
drop policy if exists "Employers create their own jobs" on public.jobs;
drop policy if exists "Employers update their own jobs" on public.jobs;
drop policy if exists "Employers delete their own jobs" on public.jobs;

create policy "Employers create their own jobs"
  on public.jobs for insert
  to authenticated
  with check (
    employer_id = (select auth.uid())
    and (select public.user_has_role('employer'))
  );

create policy "Employers update their own jobs"
  on public.jobs for update
  to authenticated
  using (
    employer_id = (select auth.uid())
    and (select public.user_has_role('employer'))
  )
  with check (
    employer_id = (select auth.uid())
    and (select public.user_has_role('employer'))
  );

create policy "Employers delete their own jobs"
  on public.jobs for delete
  to authenticated
  using (
    employer_id = (select auth.uid())
    and (select public.user_has_role('employer'))
  );

drop policy if exists "Graduates and owning verified employers view applications"
  on public.applications;
drop policy if exists "Verified employers update application status"
  on public.applications;
drop policy if exists "Applicants and owning employers view applications"
  on public.applications;
drop policy if exists "Owning employers update application status"
  on public.applications;

create policy "Applicants and owning employers view applications"
  on public.applications for select
  to authenticated
  using (
    graduate_id = (select auth.uid())
    or (
      (select public.user_has_role('employer'))
      and exists (
        select 1
        from public.jobs j
        where j.id = applications.job_id
          and j.employer_id = (select auth.uid())
      )
    )
  );

create policy "Owning employers update application status"
  on public.applications for update
  to authenticated
  using (
    (select public.user_has_role('employer'))
    and exists (
      select 1
      from public.jobs j
      where j.id = applications.job_id
        and j.employer_id = (select auth.uid())
    )
  )
  with check (
    (select public.user_has_role('employer'))
    and exists (
      select 1
      from public.jobs j
      where j.id = applications.job_id
        and j.employer_id = (select auth.uid())
    )
  );

drop policy if exists "Profiles are visible to their owner and verified employers"
  on public.profiles;
drop policy if exists "Profiles are visible to owners, verified employers, and applicants' employers"
  on public.profiles;

drop policy if exists "Employers view applicants' work history"
  on public.graduate_work_experience;
drop policy if exists "Employers view applicants' projects"
  on public.graduate_projects;
drop policy if exists "Employers view applicants' documents"
  on public.graduate_documents;
drop policy if exists "Employers view applicant evidence files"
  on storage.objects;

create policy "Profiles are visible to owners, verified employers, and applicants' employers"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (
      role = 'graduate'
      and (
        (select public.is_verified_employer())
        or (
          (select public.user_has_role('employer'))
          and exists (
            select 1
            from public.applications a
            join public.jobs j on j.id = a.job_id
            where a.graduate_id = profiles.id
              and j.employer_id = (select auth.uid())
          )
        )
      )
    )
  );

create policy "Employers view applicants' work history"
  on public.graduate_work_experience for select
  to authenticated
  using (
    (select public.is_verified_employer())
    or (
      (select public.user_has_role('employer'))
      and exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where a.graduate_id = graduate_work_experience.graduate_id
          and j.employer_id = (select auth.uid())
      )
    )
  );

create policy "Employers view applicants' projects"
  on public.graduate_projects for select
  to authenticated
  using (
    (select public.is_verified_employer())
    or (
      (select public.user_has_role('employer'))
      and exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where a.graduate_id = graduate_projects.graduate_id
          and j.employer_id = (select auth.uid())
      )
    )
  );

create policy "Employers view applicants' documents"
  on public.graduate_documents for select
  to authenticated
  using (
    (select public.is_verified_employer())
    or (
      (select public.user_has_role('employer'))
      and exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where a.graduate_id = graduate_documents.graduate_id
          and j.employer_id = (select auth.uid())
      )
    )
  );

create policy "Employers view applicant evidence files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'graduate-evidence'
    and (
      (select public.is_verified_employer())
      or (
        (select public.user_has_role('employer'))
        and exists (
          select 1
          from public.applications a
          join public.jobs j on j.id = a.job_id
          where a.graduate_id::text = (storage.foldername(name))[1]
            and j.employer_id = (select auth.uid())
        )
      )
    )
  );

notify pgrst, 'reload schema';
