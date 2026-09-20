create index if not exists properties_owner_id_idx on public.properties(owner_id);
create index if not exists rental_requests_pricing_policy_id_idx
  on public.rental_requests(pricing_policy_id);

-- New requests must go through create_rental_request so the browser cannot
-- omit or manipulate the server-calculated pricing snapshot.
drop policy if exists "accounts submit own requests" on public.rental_requests;
drop policy if exists "tenants submit requests" on public.rental_requests;

drop policy if exists "tenants read own requests" on public.rental_requests;
drop policy if exists "owners read property requests" on public.rental_requests;
drop policy if exists "admins read all requests" on public.rental_requests;
create policy "booking parties and admins read requests"
  on public.rental_requests
  for select to authenticated
  using (
    (select auth.uid()) in (tenant_id, owner_id)
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

drop policy if exists "published properties are public" on public.properties;
drop policy if exists "admins read all properties" on public.properties;
create policy "published owners and admins read properties"
  on public.properties
  for select to anon, authenticated
  using (
    is_published
    or (select auth.uid()) = owner_id
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- Decisions are performed by the ownership-checking RPC, not direct updates.
drop policy if exists "owners decide requests" on public.rental_requests;
