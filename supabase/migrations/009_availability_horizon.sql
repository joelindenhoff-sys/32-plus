alter table public.properties
add column if not exists availability_horizon_months integer not null default 12
check (availability_horizon_months in (6, 8, 12, 24));

comment on column public.properties.availability_horizon_months is
'Number of rolling calendar months visible and open for availability planning.';
