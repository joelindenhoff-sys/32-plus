alter table public.rental_requests
  alter column permanent_address drop not null;

comment on column public.rental_requests.permanent_address is
  'Collected after owner approval when required for the seasonal rental agreement.';

comment on column public.rental_requests.relevant_organisation is
  'Collected after owner approval when required for the seasonal rental agreement.';
