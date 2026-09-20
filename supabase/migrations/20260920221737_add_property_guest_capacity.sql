alter table public.properties
  add column if not exists max_guests integer;

update public.properties
set max_guests = greatest(1, bedrooms * 2)
where max_guests is null;

alter table public.properties
  alter column max_guests set default 2,
  alter column max_guests set not null;

alter table public.properties
  add constraint properties_max_guests_range
  check (max_guests between 1 and 50);

create or replace function public.enforce_property_guest_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  property_capacity integer;
begin
  select p.max_guests into property_capacity
  from public.properties p
  where p.id = new.property_id;

  if property_capacity is null then
    raise exception 'Property not found';
  end if;

  if new.occupants > property_capacity then
    raise exception 'This property allows a maximum of % guests', property_capacity;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_property_guest_capacity on public.rental_requests;
create trigger enforce_property_guest_capacity
before insert or update of property_id, occupants on public.rental_requests
for each row execute function public.enforce_property_guest_capacity();

revoke all on function public.enforce_property_guest_capacity() from public, anon, authenticated;
