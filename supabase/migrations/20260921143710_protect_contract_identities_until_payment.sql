-- Parties can read the complete agreement before signing, but names and drawn
-- signatures are only disclosed after a signed Stripe webhook records payment.

create or replace function public.get_visible_contracts()
returns table (
  rental_request_id uuid,
  owner_approved_at timestamptz,
  tenant_signed_at timestamptz,
  contract_version text,
  owner_name text,
  tenant_name text,
  owner_signature_data text,
  tenant_signature_data text,
  identity_released boolean
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
    end as owner_name,
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then c.tenant_name
      else 'Tenant'
    end as tenant_name,
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then c.owner_signature_data
      else null
    end as owner_signature_data,
    case
      when r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
        or viewer.role = 'admin'
      then c.tenant_signature_data
      else null
    end as tenant_signature_data,
    r.payment_status in ('paid', 'refunded', 'partially_refunded', 'disputed')
      or viewer.role = 'admin' as identity_released
  from public.contracts c
  join public.rental_requests r on r.id = c.rental_request_id
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
  'Returns agreements to their parties for pre-signing review, withholding party names and signatures until payment is confirmed.';
