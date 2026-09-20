-- Configurable, effective-dated platform pricing. Rates live in one table and
-- each rental request snapshots the policy and monetary result it received.

create table public.pricing_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  owner_fee_rate numeric(7,6) not null check (owner_fee_rate between 0 and 1),
  guest_fee_rate numeric(7,6) not null check (guest_fee_rate between 0 and 1),
  applies_to_owner_id uuid references public.profiles(id) on delete cascade,
  priority integer not null default 0,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (effective_until is null or effective_until > effective_from)
);

comment on table public.pricing_policies is
  'Effective-dated platform fee policies. Booking records snapshot the resolved rates and never recalculate them.';

create index pricing_policies_resolution_idx
  on public.pricing_policies (applies_to_owner_id, priority desc, effective_from desc)
  where active = true;

alter table public.pricing_policies enable row level security;

insert into public.pricing_policies (
  code,
  label,
  owner_fee_rate,
  guest_fee_rate,
  priority,
  effective_from,
  metadata
) values (
  'launch-standard',
  '32+ launch pricing',
  0.05,
  0.05,
  0,
  '2026-09-20 00:00:00+00',
  '{"listing_fee":"free","fee_basis":"accommodation_only"}'::jsonb
);

alter table public.rental_requests
  add column pricing_policy_id uuid references public.pricing_policies(id) on delete restrict,
  add column accommodation_amount bigint,
  add column guest_fee_rate numeric(7,6),
  add column guest_fee_amount bigint,
  add column owner_fee_rate numeric(7,6),
  add column owner_fee_amount bigint,
  add column guest_total_amount bigint,
  add column owner_net_amount bigint,
  add column platform_gross_revenue bigint generated always as (
    coalesce(guest_fee_amount, 0) + coalesce(owner_fee_amount, 0)
  ) stored,
  add column currency text,
  add column payment_processing_cost bigint,
  add column payment_status text not null default 'not_started',
  add column payout_status text not null default 'not_scheduled',
  add column scheduled_payout_at timestamptz,
  add column stripe_payment_intent_id text,
  add column stripe_charge_id text,
  add column stripe_transfer_id text,
  add constraint rental_request_pricing_snapshot_complete check (
    (accommodation_amount is null and guest_fee_rate is null and guest_fee_amount is null
      and owner_fee_rate is null and owner_fee_amount is null and guest_total_amount is null
      and owner_net_amount is null and currency is null and pricing_policy_id is null)
    or
    (accommodation_amount is not null and accommodation_amount >= 0
      and guest_fee_rate between 0 and 1 and guest_fee_amount >= 0
      and owner_fee_rate between 0 and 1 and owner_fee_amount >= 0
      and guest_total_amount = accommodation_amount + guest_fee_amount
      and owner_net_amount = accommodation_amount - owner_fee_amount
      and owner_net_amount >= 0
      and currency ~ '^[A-Z]{3}$'
      and pricing_policy_id is not null)
  ),
  add constraint rental_request_processing_cost_nonnegative check (
    payment_processing_cost is null or payment_processing_cost >= 0
  ),
  add constraint rental_request_payment_status_valid check (
    payment_status in ('not_started', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed')
  ),
  add constraint rental_request_payout_status_valid check (
    payout_status in ('not_scheduled', 'pending', 'blocked', 'released', 'reversed')
  );

comment on column public.rental_requests.accommodation_amount is 'Accommodation rent only, snapshotted in integer minor units.';
comment on column public.rental_requests.guest_fee_amount is '32+ guest service fee in integer minor units; excludes deposits, utilities and other charges.';
comment on column public.rental_requests.owner_fee_amount is '32+ owner service fee in integer minor units; excludes deposits, utilities and other charges.';
comment on column public.rental_requests.payment_processing_cost is 'Processor cost paid by 32+, in integer minor units. It never changes contractual service fees.';

create or replace function public.calculate_booking_price(
  p_accommodation_amount bigint,
  p_owner_fee_rate numeric,
  p_guest_fee_rate numeric
)
returns table (
  accommodation_amount bigint,
  guest_fee_rate numeric,
  guest_fee_amount bigint,
  owner_fee_rate numeric,
  owner_fee_amount bigint,
  guest_total_amount bigint,
  owner_net_amount bigint,
  platform_gross_revenue bigint
)
language plpgsql
immutable
set search_path = public
as $$
declare
  calculated_guest_fee bigint;
  calculated_owner_fee bigint;
begin
  if p_accommodation_amount < 0 then
    raise exception 'Accommodation amount cannot be negative';
  end if;
  if p_owner_fee_rate not between 0 and 1 or p_guest_fee_rate not between 0 and 1 then
    raise exception 'Fee rates must be between zero and one';
  end if;

  calculated_guest_fee := round(p_accommodation_amount::numeric * p_guest_fee_rate)::bigint;
  calculated_owner_fee := round(p_accommodation_amount::numeric * p_owner_fee_rate)::bigint;

  return query select
    p_accommodation_amount,
    p_guest_fee_rate,
    calculated_guest_fee,
    p_owner_fee_rate,
    calculated_owner_fee,
    p_accommodation_amount + calculated_guest_fee,
    p_accommodation_amount - calculated_owner_fee,
    calculated_guest_fee + calculated_owner_fee;
end;
$$;

create or replace function public.resolve_pricing_policy(p_owner_id uuid)
returns public.pricing_policies
language sql
stable
security definer
set search_path = public
as $$
  select policy
  from public.pricing_policies policy
  where policy.active = true
    and policy.effective_from <= now()
    and (policy.effective_until is null or policy.effective_until > now())
    and (policy.applies_to_owner_id is null or policy.applies_to_owner_id = p_owner_id)
  order by (policy.applies_to_owner_id is not null) desc, policy.priority desc, policy.effective_from desc
  limit 1;
$$;

create or replace function public.calculate_accommodation_amount(
  p_property_id uuid,
  p_move_in date,
  p_move_out date
)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  property_record public.properties;
  result bigint;
begin
  select * into property_record from public.properties where id = p_property_id;
  if property_record.id is null then raise exception 'Property not found'; end if;
  if p_move_out <= p_move_in then raise exception 'Move-out must be after move-in'; end if;

  select round(sum(
    coalesce(
      nullif(property_record.monthly_prices ->> to_char(stay_day, 'YYYY-MM'), '')::numeric,
      property_record.monthly_rent::numeric
    ) * 100 / 30
  ))::bigint
  into result
  from generate_series(p_move_in, p_move_out - 1, interval '1 day') stay_day;

  return result;
end;
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

create or replace function public.get_current_public_pricing()
returns table (owner_fee_rate numeric, guest_fee_rate numeric, currency text)
language sql
stable
security definer
set search_path = public
as $$
  select policy.owner_fee_rate, policy.guest_fee_rate, 'EUR'::text
  from public.pricing_policies policy
  where policy.active = true
    and policy.applies_to_owner_id is null
    and policy.effective_from <= now()
    and (policy.effective_until is null or policy.effective_until > now())
  order by policy.priority desc, policy.effective_from desc
  limit 1;
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
set search_path = public
as $$
declare
  property_record public.properties;
  quote_record record;
  created_request public.rental_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_tenant_declaration is not true then raise exception 'Tenant declaration is required'; end if;
  if p_occupants < 1 then raise exception 'At least one occupant is required'; end if;
  if nullif(trim(p_purpose_category), '') is null then raise exception 'Temporary purpose is required'; end if;

  select * into property_record
  from public.properties
  where id = p_property_id and is_published = true
  for share;
  if property_record.id is null then raise exception 'Published property not found'; end if;
  if property_record.owner_id = auth.uid() then raise exception 'Owners cannot request their own property'; end if;

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

-- Snapshot launch pricing for existing active pre-payment requests. Declined
-- requests remain untouched because they can never produce a successful booking.
do $$
declare
  target public.rental_requests;
  quote_record record;
begin
  for target in
    select * from public.rental_requests
    where status not in ('declined', 'cancelled', 'expired')
      and accommodation_amount is null
  loop
    select * into quote_record
    from public.quote_rental_request(target.property_id, target.move_in, target.move_out);

    update public.rental_requests
    set pricing_policy_id = quote_record.pricing_policy_id,
        accommodation_amount = quote_record.accommodation_amount,
        guest_fee_rate = quote_record.guest_fee_rate,
        guest_fee_amount = quote_record.guest_fee_amount,
        owner_fee_rate = quote_record.owner_fee_rate,
        owner_fee_amount = quote_record.owner_fee_amount,
        guest_total_amount = quote_record.guest_total_amount,
        owner_net_amount = quote_record.owner_net_amount,
        currency = quote_record.currency,
        payout_status = case when status in ('approved', 'tenant_signed', 'payment_pending', 'confirmed') then 'pending' else 'not_scheduled' end,
        scheduled_payout_at = case when status in ('approved', 'tenant_signed', 'payment_pending', 'confirmed') then move_in::timestamp + interval '1 day' else null end
    where id = target.id;
  end loop;
end;
$$;

drop function if exists public.owner_decide_rental_request(uuid, boolean, text, text);
create function public.owner_decide_rental_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null,
  p_signature_data text default null
)
returns public.rental_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.rental_requests;
  property_record public.properties;
  owner_profile public.profiles;
  tenant_profile public.profiles;
  signature text;
  quote_record record;
begin
  select * into target from public.rental_requests where id = p_request_id for update;
  if target.id is null or target.owner_id <> auth.uid() or target.status <> 'submitted' then
    raise exception 'Request cannot be decided';
  end if;

  if not p_approve then
    update public.rental_requests
    set status = 'declined', owner_decided_at = now(),
        owner_decision_note = nullif(trim(p_note), ''), updated_at = now()
    where id = target.id returning * into target;
    return target;
  end if;

  if exists (
    select 1 from public.rental_requests conflicting
    where conflicting.property_id = target.property_id
      and conflicting.id <> target.id
      and conflicting.status in ('approved', 'tenant_signed', 'payment_pending', 'confirmed')
      and daterange(conflicting.move_in, conflicting.move_out, '[)') && daterange(target.move_in, target.move_out, '[)')
  ) then raise exception 'These dates conflict with another approved rental'; end if;

  if target.accommodation_amount is null then
    select * into quote_record from public.quote_rental_request(target.property_id, target.move_in, target.move_out);
    update public.rental_requests
    set pricing_policy_id = quote_record.pricing_policy_id,
        accommodation_amount = quote_record.accommodation_amount,
        guest_fee_rate = quote_record.guest_fee_rate,
        guest_fee_amount = quote_record.guest_fee_amount,
        owner_fee_rate = quote_record.owner_fee_rate,
        owner_fee_amount = quote_record.owner_fee_amount,
        guest_total_amount = quote_record.guest_total_amount,
        owner_net_amount = quote_record.owner_net_amount,
        currency = quote_record.currency
    where id = target.id returning * into target;
  end if;

  select * into owner_profile from public.profiles where id = auth.uid();
  select * into tenant_profile from public.profiles where id = target.tenant_id;
  signature := coalesce(nullif(p_signature_data, ''), owner_profile.saved_signature_data);
  if signature is null then raise exception 'Owner signature required'; end if;
  if owner_profile.saved_signature_data is null then
    update public.profiles set saved_signature_data = signature, saved_signature_at = now() where id = auth.uid();
  end if;

  update public.rental_requests
  set status = 'approved', owner_decided_at = now(), owner_decision_note = nullif(trim(p_note), ''),
      payout_status = 'pending', scheduled_payout_at = move_in::timestamp + interval '1 day', updated_at = now()
  where id = target.id returning * into target;

  select * into property_record from public.properties where id = target.property_id;
  insert into public.contracts (
    rental_request_id, contract_version, contract_snapshot, owner_approved_at,
    owner_signature_reference, owner_name, tenant_name, owner_signature_data
  ) values (
    target.id, 'seasonal-rental-draft-v3',
    jsonb_build_object('property', to_jsonb(property_record), 'request', to_jsonb(target), 'generated_at', now()),
    now(), 'stored-signature-confirmed:' || auth.uid()::text,
    coalesce(owner_profile.full_name, 'Property owner'), coalesce(tenant_profile.full_name, 'Tenant'), signature
  );
  return target;
end;
$$;

-- Prevent personal-workspace users from elevating their own profile to admin.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Profile role cannot be changed by the signed-in user';
  end if;
  return new;
end;
$$;

create trigger prevent_profile_role_change
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_change();

create policy "admins read all requests" on public.rental_requests
  for select to authenticated
  using ((select role from public.profiles where id = (select auth.uid())) = 'admin');

create policy "admins read all properties" on public.properties
  for select to authenticated
  using ((select role from public.profiles where id = (select auth.uid())) = 'admin');

create policy "admins read pricing policies" on public.pricing_policies
  for select to authenticated
  using ((select role from public.profiles where id = (select auth.uid())) = 'admin');

revoke all on function public.resolve_pricing_policy(uuid) from public;
revoke all on function public.calculate_accommodation_amount(uuid, date, date) from public;
revoke all on function public.quote_rental_request(uuid, date, date) from public;
revoke all on function public.get_current_public_pricing() from public;
revoke all on function public.create_rental_request(uuid, date, date, integer, text, text, boolean) from public;
revoke all on function public.owner_decide_rental_request(uuid, boolean, text, text) from public;

grant execute on function public.quote_rental_request(uuid, date, date) to anon, authenticated;
grant execute on function public.get_current_public_pricing() to anon, authenticated;
grant execute on function public.create_rental_request(uuid, date, date, integer, text, text, boolean) to authenticated;
grant execute on function public.owner_decide_rental_request(uuid, boolean, text, text) to authenticated;
