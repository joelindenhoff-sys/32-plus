-- Return the private property address to the booking parties only after Stripe
-- payment has been confirmed. Before payment, callers receive a null address.

drop function if exists public.get_visible_contracts();

create function public.get_visible_contracts()
returns table (
  rental_request_id uuid,
  owner_approved_at timestamptz,
  tenant_signed_at timestamptz,
  contract_version text,
  owner_name text,
  tenant_name text,
  owner_signature_data text,
  tenant_signature_data text,
  identity_released boolean,
  property_address text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.rental_request_id,
    c.owner_approved_at,
    c.tenant_signed_at,
    c.contract_version,
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then c.owner_name
      else 'Property owner'
    end,
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then c.tenant_name
      else 'Tenant'
    end,
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then c.owner_signature_data
      else null
    end,
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then c.tenant_signature_data
      else null
    end,
    r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
      or viewer.role = 'admin',
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then p.full_address
      else null
    end
  from public.contracts c
  join public.rental_requests r on r.id = c.rental_request_id
  join public.properties p on p.id = r.property_id
  left join public.profiles viewer on viewer.id = (select auth.uid())
  where (select auth.uid()) is not null
    and (
      r.owner_id = (select auth.uid())
      or r.tenant_id = (select auth.uid())
      or viewer.role = 'admin'
    );
$$;

revoke execute on function public.get_visible_contracts() from public, anon;
grant execute on function public.get_visible_contracts() to authenticated;

comment on function public.get_visible_contracts() is
  'Returns agreements to their parties, withholding names, signatures and the exact property address until payment is confirmed.';
