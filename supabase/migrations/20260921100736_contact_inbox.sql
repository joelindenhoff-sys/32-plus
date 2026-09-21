create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  user_type text not null check (user_type in ('Tenant', 'Owner', 'Other')),
  subject text not null check (char_length(btrim(subject)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 10 and 5000),
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public, anon, authenticated;
-- Visitors may submit only these fields; no read-back, update or delete access.
grant insert (name, email, user_type, subject, message) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
create policy contact_submit on public.contact_messages for insert to anon, authenticated with check (
  char_length(btrim(name)) between 1 and 100 and
  char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and
  user_type in ('Tenant', 'Owner', 'Other') and
  char_length(btrim(subject)) between 1 and 160 and
  char_length(btrim(message)) between 10 and 5000
);
create policy contact_admin_read on public.contact_messages for select to authenticated using (
  (select role from public.profiles where id = (select auth.uid())) = 'admin'
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);
create index contact_messages_email_created_idx on public.contact_messages (lower(email), created_at desc);
create schema if not exists private;
-- The definer trigger is private and cannot be invoked as an API function.
-- Anonymous submission is intentional; it reveals no existing enquiry data.
create function private.limit_contact_messages() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(320032);
  new.name := btrim(new.name);
  new.email := lower(btrim(new.email));
  new.subject := btrim(new.subject);
  new.message := btrim(new.message);
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 100
     or (select count(*) from public.contact_messages where lower(email) = new.email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Contact submission limit reached';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_contact_messages() from public, anon, authenticated;
create trigger contact_submission_limit before insert on public.contact_messages for each row execute function private.limit_contact_messages();
comment on table public.contact_messages is 'Private support inbox. Public insert-only; reads restricted to protected admin profile roles. TODO: approve retention and staff response procedures.';
