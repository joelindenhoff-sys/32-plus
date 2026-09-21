-- 32+ platform booking duration: 32 through 334 nights, inclusive.
-- The upper bound is a platform rule, not a statement about the legal
-- classification of a seasonal rental.

alter table public.rental_requests
  add constraint rental_requests_platform_stay_duration
  check ((move_out - move_in) between 32 and 334);

alter table public.properties
  add constraint properties_minimum_nights_within_platform_range
  check (minimum_nights between 32 and 334);

create or replace function public.is_property_available(
  p_property_id uuid,
  p_move_in date,
  p_move_out date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_move_in is not null
    and p_move_out is not null
    and (p_move_out - p_move_in) between 32 and 334
    and exists (
      select 1
      from public.properties p
      where p.id = p_property_id
        and p.is_published = true
        and (p_move_out - p_move_in) >= greatest(32, p.minimum_nights)
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
set search_path = ''
as $$
declare
  property_record public.properties;
  policy public.pricing_policies;
  accommodation bigint;
  stay_nights integer;
begin
  if p_move_in is null or p_move_out is null then
    raise exception 'Move-in and move-out dates are required';
  end if;
  stay_nights := p_move_out - p_move_in;
  if stay_nights < 32 then
    raise exception 'A rental request must be for at least 32 nights';
  end if;
  if stay_nights > 334 then
    raise exception 'A rental request cannot exceed 334 nights';
  end if;

  select * into property_record
  from public.properties
  where id = p_property_id and is_published = true;
  if property_record.id is null then raise exception 'Published property not found'; end if;
  if stay_nights < greatest(32, property_record.minimum_nights) then
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

create or replace function public.create_rental_request(
  p_property_id uuid,
  p_move_in date,
  p_move_out date,
  p_occupants integer,
  p_purpose_category text,
  p_purpose_details text,
  p_tenant_declaration boolean
)
returns public.rental_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_record public.properties;
  quote_record record;
  created_request public.rental_requests;
  allowed_purposes constant text[] := array[
    'Work or temporary assignment',
    'Studies or training',
    'Medical treatment',
    'Temporary relocation',
    'Extended holiday / temporary stay',
    'Other legitimate temporary reason'
  ];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_tenant_declaration is not true then raise exception 'Tenant declaration is required'; end if;
  if p_occupants < 1 then raise exception 'At least one occupant is required'; end if;
  if nullif(trim(p_purpose_category), '') is null then raise exception 'Temporary purpose is required'; end if;
  if not (trim(p_purpose_category) = any(allowed_purposes)) then
    raise exception 'Select a valid temporary purpose';
  end if;
  if trim(p_purpose_category) = 'Other legitimate temporary reason'
     and nullif(trim(p_purpose_details), '') is null then
    raise exception 'Please explain the other temporary reason';
  end if;

  select * into property_record
  from public.properties
  where id = p_property_id and is_published = true
  for share;
  if property_record.id is null then raise exception 'Published property not found'; end if;
  if property_record.owner_id = auth.uid() then raise exception 'Owners cannot request their own property'; end if;
  if p_occupants > property_record.max_guests then raise exception 'Guest count exceeds property capacity'; end if;

  select * into quote_record
  from public.quote_rental_request(p_property_id, p_move_in, p_move_out);

  insert into public.rental_requests (
    property_id, tenant_id, owner_id, move_in, move_out, occupants,
    purpose_category, purpose_details, permanent_address, relevant_organisation,
    tenant_declaration, pricing_policy_id, accommodation_amount,
    guest_fee_rate, guest_fee_amount, owner_fee_rate, owner_fee_amount,
    guest_total_amount, owner_net_amount, currency
  ) values (
    p_property_id, auth.uid(), property_record.owner_id, p_move_in, p_move_out, p_occupants,
    trim(p_purpose_category), coalesce(nullif(trim(p_purpose_details), ''), 'Not required for selected category'),
    null, null, true, quote_record.pricing_policy_id, quote_record.accommodation_amount,
    quote_record.guest_fee_rate, quote_record.guest_fee_amount,
    quote_record.owner_fee_rate, quote_record.owner_fee_amount,
    quote_record.guest_total_amount, quote_record.owner_net_amount, quote_record.currency
  ) returning * into created_request;

  return created_request;
end;
$$;

revoke all on function public.is_property_available(uuid, date, date) from public, anon, authenticated;
grant execute on function public.is_property_available(uuid, date, date) to anon, authenticated;

revoke all on function public.quote_rental_request(uuid, date, date) from public, anon, authenticated;
grant execute on function public.quote_rental_request(uuid, date, date) to anon, authenticated;

revoke all on function public.create_rental_request(uuid, date, date, integer, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_rental_request(uuid, date, date, integer, text, text, boolean) to authenticated;
