alter table public.properties add column if not exists photo_urls jsonb not null default '[]'::jsonb;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('property-images','property-images',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "property images public read" on storage.objects for select using (bucket_id='property-images');
create policy "owners upload property images" on storage.objects for insert to authenticated with check (bucket_id='property-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owners update property images" on storage.objects for update to authenticated using (bucket_id='property-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owners delete property images" on storage.objects for delete to authenticated using (bucket_id='property-images' and (storage.foldername(name))[1]=auth.uid()::text);
