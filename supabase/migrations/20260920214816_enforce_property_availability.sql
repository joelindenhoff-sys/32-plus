-- Treat an approved request as a temporary hold and keep the period blocked
-- through signing, payment, and confirmation. Submitted requests do not block
-- the calendar because an owner may still decline them.

create extension if not exists btree_gist;

alter table public.rental_requests
  add constraint rental_requests_no_overlapping_reservations
  exclude using gist (
    property_id with =,
    daterange(move_in, move_out, '[)') with &&
  )
  where (status in ('approved', 'tenant_signed', 'payment_pending', 'confirmed'));

create or replace function public.is_property_available(
  p_property_id uuid,
  p_move_in date,
  p_move_out date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_move_in is not null
    and p_move_out is not null
    and p_move_out > p_move_in
    and exists (
      select 1
      from public.properties p
      where p.id = p_property_id
        and p.is_published = true
    )
    and not exists (
      select 1
      from public.rental_requests r
      where r.property_id = p_property_id
        and r.status in ('approved', 'tenant_signed', 'payment_pending', 'confirmed')
        and daterange(r.move_in, r.move_out, '[)')
          && daterange(p_move_in, p_move_out, '[)')
    );
$$;

create or replace function public.quote_rental_request(
  p_property_id uuid,
  p_move_in date,
  p_move_out date
)
returns table (
  pricing_policy_id uuid,
  accommodation_amount bigint,
  guest_fee_rate numeric,
  guest_fee_amount bigint,
  owner_fee_rate numeric,
  owner_fee_amount bigint,
  guest_total_amount bigint,
  owner_net_amount bigint,
  platform_gross_revenue bigint,
  currency text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  property_record public.properties;
  policy public.pricing_policies;
  accommodation bigint;
begin
  select * into property_record
  from public.properties
  where id = p_property_id and is_published = true;
  if property_record.id is null then raise exception 'Published property not found'; end if;
  if p_move_out < p_move_in + property_record.minimum_nights then
    raise exception 'Stay does not meet the property minimum';
  end if;
  if not public.is_property_available(p_property_id, p_move_in, p_move_out) then
    raise exception 'These dates are no longer available';
  end if;

  policy := public.resolve_pricing_policy(property_record.owner_id);
  if policy.id is null then raise exception 'No active pricing policy'; end if;
  accommodation := public.calculate_accommodation_amount(p_property_id, p_move_in, p_move_out);

  return query
  select
    policy.id,
    price.accommodation_amount,
    price.guest_fee_rate,
    price.guest_fee_amount,
    price.owner_fee_rate,
    price.owner_fee_amount,
    price.guest_total_amount,
    price.owner_net_amount,
    price.platform_gross_revenue,
    'EUR'::text
  from public.calculate_booking_price(accommodation, policy.owner_fee_rate, policy.guest_fee_rate) price;
end;
$$;

revoke all on function public.is_property_available(uuid, date, date) from public, anon, authenticated;
grant execute on function public.is_property_available(uuid, date, date) to anon, authenticated;

revoke all on function public.quote_rental_request(uuid, date, date) from public, anon, authenticated;
grant execute on function public.quote_rental_request(uuid, date, date) to anon, authenticated;
