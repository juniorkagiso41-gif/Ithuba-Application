revoke all on public.jobs from public, anon, authenticated;
grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
  loop
    execute format(
      'drop policy if exists %I on public.jobs',
      policy_record.policyname
    );
  end loop;
end;
$$;

create policy "Anyone can view job listings"
  on public.jobs for select
  to anon, authenticated
  using (true);

create policy "Employers can publish unlimited jobs"
  on public.jobs for insert
  to authenticated
  with check (
    employer_id = (select auth.uid())
    and (select public.user_has_role('employer'))
  );

create policy "Employers can edit their own jobs"
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

create policy "Employers can remove their own jobs"
  on public.jobs for delete
  to authenticated
  using (
    employer_id = (select auth.uid())
    and (select public.user_has_role('employer'))
  );

notify pgrst, 'reload schema';
