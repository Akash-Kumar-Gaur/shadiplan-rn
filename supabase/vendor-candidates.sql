-- Vendor shortlist (candidates) — run in Supabase SQL editor
-- Storage: create a private bucket named `vendor-documents` (not public).

create table if not exists vendor_candidates (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references weddings(id) on delete cascade not null,
  name text not null,
  category text not null,
  contact_name text,
  phone text,
  proposed_amount numeric,
  notes text,
  status text not null default 'considering', -- 'considering' | 'promoted' | 'rejected'
  created_at timestamptz default now()
);

create table if not exists vendor_candidate_files (
  id uuid primary key default gen_random_uuid(),
  vendor_candidate_id uuid references vendor_candidates(id) on delete cascade not null,
  storage_path text not null,
  file_name text,
  uploaded_at timestamptz default now()
);

alter table vendor_candidates enable row level security;
alter table vendor_candidate_files enable row level security;
grant select, insert, update, delete on vendor_candidates to authenticated;
grant select, insert, update, delete on vendor_candidate_files to authenticated;

create policy "Wedding members manage candidates" on vendor_candidates
  for all using (wedding_id in (select user_accessible_wedding_ids(auth.uid())));
create policy "Wedding members manage candidate files" on vendor_candidate_files
  for all using (
    vendor_candidate_id in (
      select id from vendor_candidates
      where wedding_id in (select user_accessible_wedding_ids(auth.uid()))
    )
  );

-- Private bucket for estimates / menus / quotes (path: {wedding_id}/{candidate_id}/...)
insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do update set public = false;

create policy "Wedding members read vendor documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1]::uuid in (select user_accessible_wedding_ids(auth.uid()))
  );

create policy "Wedding members upload vendor documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1]::uuid in (select user_accessible_wedding_ids(auth.uid()))
  );

create policy "Wedding members update vendor documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1]::uuid in (select user_accessible_wedding_ids(auth.uid()))
  );

create policy "Wedding members delete vendor documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1]::uuid in (select user_accessible_wedding_ids(auth.uid()))
  );
