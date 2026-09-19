alter table public.properties
  add column if not exists cleaning_fee integer not null default 0 check (cleaning_fee >= 0),
  add column if not exists cancellation_policy text not null default 'flexible',
  add column if not exists monthly_prices jsonb not null default '{}'::jsonb,
  add column if not exists external_calendar_url text,
  add column if not exists external_calendar_name text;

create or replace function public.get_property_calendar(p_property_id uuid)
returns table (move_in date, move_out date, status public.rental_request_status)
language sql
security definer
set search_path = public
as $$
  select r.move_in, r.move_out, r.status
  from public.rental_requests r
  join public.properties p on p.id = r.property_id
  where r.property_id = p_property_id
    and p.is_published = true
    and r.status in ('approved','tenant_signed','payment_pending','confirmed');
$$;

revoke all on function public.get_property_calendar(uuid) from public;
grant execute on function public.get_property_calendar(uuid) to anon, authenticated;
