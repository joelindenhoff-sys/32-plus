-- One authenticated 32+ account can act as a tenant and as a property owner.
-- The legacy profile role is retained for admin access and backwards compatibility.

drop policy if exists "owners create properties" on public.properties;
create policy "accounts create own properties" on public.properties
  for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "tenants submit requests" on public.rental_requests;
create policy "accounts submit own requests" on public.rental_requests
  for insert to authenticated
  with check (
    auth.uid() = tenant_id and
    tenant_id <> owner_id and
    status = 'submitted' and
    owner_id = (select owner_id from public.properties where id = property_id)
  );
