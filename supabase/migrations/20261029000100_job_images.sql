alter table public.jobs
  add column if not exists job_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-images',
  'job-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Employers can upload their own job images" on storage.objects;
create policy "Employers can upload their own job images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_has_role('employer'))
  );

drop policy if exists "Employers can remove their own job images" on storage.objects;
create policy "Employers can remove their own job images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'job-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_has_role('employer'))
  );

notify pgrst, 'reload schema';
