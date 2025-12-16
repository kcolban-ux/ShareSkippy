drop extension if exists "pg_net";



  insert into storage.buckets
  (id, name, public)
values
  ('dog-photos', 'dog-photos', true),
  ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;



  create policy "Anyone can view dog photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'dog-photos'::text));



  create policy "Anyone can view profile photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'profile-photos'::text));



  create policy "Users can delete their own dog photos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'dog-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their own profile photos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'profile-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update their own profile photos"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'profile-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload dog photos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'dog-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload profile photos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'profile-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



