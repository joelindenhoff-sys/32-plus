alter table public.properties
  add column if not exists security_deposit integer not null default 0
  check (security_deposit >= 0);

comment on column public.properties.security_deposit is
  'Optional security deposit selected by the property owner, in euros. Zero means no deposit.';
