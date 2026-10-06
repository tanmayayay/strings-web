-- ============================================================
-- STRINGS — Post-media storage (photo attachments on posts)
-- Run once in the Supabase SQL editor (Database page).
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Anyone can view attached photos (public bucket).
drop policy if exists "post-media: public read" on storage.objects;
create policy "post-media: public read"
  on storage.objects for select
  using (bucket_id = 'post-media');

-- Signed-in users can upload into the bucket.
drop policy if exists "post-media: authenticated upload" on storage.objects;
create policy "post-media: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media');

-- Owners can delete their own uploads.
drop policy if exists "post-media: owner delete" on storage.objects;
create policy "post-media: owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and owner = auth.uid());
