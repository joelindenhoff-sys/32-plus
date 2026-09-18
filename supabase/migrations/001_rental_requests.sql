create extension if not exists pgcrypto;

create type public.user_role as enum ('tenant', 'owner', 'admin');
create type public.rental_request_status as enum (
  'submitted',
  'approved',
  'declined',
  'tenant_signed',
  'payment_pending',
  'confirmed',
  'cancelled',
  'expired'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'tenant',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null,
  island text not null,
  monthly_rent integer not null check (monthly_rent > 0),
  bedrooms integer not null check (bedrooms > 0),
  bathrooms numeric(3,1) not null check (bathrooms > 0),
  image_url text,
  is_published boolean not null default false,
  minimum_nights integer not null default 32 check (minimum_nights >= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  tenant_id uuid not null references public.profiles(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  move_in date not null,
  move_out date not null,
  occupants integer not null default 1 check (occupants > 0),
  purpose_category text not null,
  purpose_details text not null,
  permanent_address text not null,
  relevant_organisation text,
  tenant_declaration boolean not null,
  status public.rental_request_status not null default 'submitted',
  owner_decided_at timestamptz,
  owner_decision_note text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minimum_stay check (move_out >= move_in + 32),
  constraint truthful_declaration_required check (tenant_declaration = true)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null unique references public.rental_requests(id) on delete cascade,
  contract_version text not null,
  contract_snapshot jsonb not null,
  owner_approved_at timestamptz not null,
  owner_signature_reference text not null,
  tenant_signed_at timestamptz,
  tenant_signature_reference text,
  created_at timestamptz not null default now()
);

create index rental_requests_property_dates_idx
  on public.rental_requests(property_id, move_in, move_out);
create index rental_requests_tenant_idx on public.rental_requests(tenant_id);
create index rental_requests_owner_idx on public.rental_requests(owner_id);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.rental_requests enable row level security;
alter table public.contracts enable row level security;

create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "published properties are public" on public.properties
  for select using (is_published or auth.uid() = owner_id);
create policy "owners create properties" on public.properties
  for insert with check (
    auth.uid() = owner_id and
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );
create policy "owners update own properties" on public.properties
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete own properties" on public.properties
  for delete using (auth.uid() = owner_id);

create policy "tenants read own requests" on public.rental_requests
  for select using (auth.uid() = tenant_id);
create policy "owners read property requests" on public.rental_requests
  for select using (auth.uid() = owner_id);
create policy "tenants submit requests" on public.rental_requests
  for insert with check (
    auth.uid() = tenant_id and
    status = 'submitted' and
    owner_id = (select owner_id from public.properties where id = property_id)
  );
create policy "owners decide requests" on public.rental_requests
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "contract parties read" on public.contracts
  for select using (
    exists (
      select 1 from public.rental_requests r
      where r.id = rental_request_id
        and auth.uid() in (r.tenant_id, r.owner_id)
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'owner'
      then 'owner'::public.user_role
      else 'tenant'::public.user_role
    end,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
