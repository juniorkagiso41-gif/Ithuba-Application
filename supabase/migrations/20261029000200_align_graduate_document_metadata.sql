do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'graduate_documents'
      and column_name = 'original_filename'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'graduate_documents'
      and column_name = 'file_name'
  ) then
    alter table public.graduate_documents
      rename column original_filename to file_name;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'graduate_documents'
      and column_name = 'mime_type'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'graduate_documents'
      and column_name = 'content_type'
  ) then
    alter table public.graduate_documents
      rename column mime_type to content_type;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'graduate_documents'
      and column_name = 'file_size_bytes'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'graduate_documents'
      and column_name = 'size_bytes'
  ) then
    alter table public.graduate_documents
      rename column file_size_bytes to size_bytes;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'graduate_documents'
      and column_name = 'title'
      and is_nullable = 'NO'
  ) then
    alter table public.graduate_documents
      alter column title drop not null;
  end if;
end;
$$;

notify pgrst, 'reload schema';
