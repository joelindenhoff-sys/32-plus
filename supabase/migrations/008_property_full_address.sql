alter table public.properties
add column if not exists full_address text;

comment on column public.properties.full_address is
'Private exact property address entered by the owner; never expose on public listing pages.';
