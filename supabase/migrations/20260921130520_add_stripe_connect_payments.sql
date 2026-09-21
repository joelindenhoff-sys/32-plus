-- Stripe Connect identifiers are private operational data. They are stored on
-- the existing profile/request records rather than in a duplicate payment table.

alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarding_complete boolean not null default false,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false;

create unique index if not exists profiles_stripe_account_id_key
  on public.profiles(stripe_account_id)
  where stripe_account_id is not null;

alter table public.rental_requests
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_transfer_group text,
  add column if not exists paid_at timestamptz,
  add column if not exists payout_released_at timestamptz;

create unique index if not exists rental_requests_stripe_checkout_session_key
  on public.rental_requests(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists rental_requests_stripe_payment_intent_key
  on public.rental_requests(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists rental_requests_stripe_transfer_key
  on public.rental_requests(stripe_transfer_id)
  where stripe_transfer_id is not null;

create index if not exists rental_requests_due_payout_idx
  on public.rental_requests(scheduled_payout_at)
  where payment_status = 'paid' and payout_status = 'pending';

comment on column public.profiles.stripe_account_id is
  'Stripe Connect account used to receive owner proceeds.';
comment on column public.rental_requests.stripe_transfer_group is
  'Stable Stripe transfer group for the booking payment and delayed owner transfer.';
comment on column public.rental_requests.paid_at is
  'Time a signed Stripe webhook confirmed successful guest payment.';
