create or replace function public.owner_decide_rental_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns public.rental_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.rental_requests;
  property_record public.properties;
begin
  select * into target from public.rental_requests where id = p_request_id for update;
  if target.id is null then raise exception 'Rental request not found'; end if;
  if target.owner_id <> auth.uid() then raise exception 'Only the property owner can decide this request'; end if;
  if target.status <> 'submitted' then raise exception 'This request has already been decided'; end if;

  if p_approve and exists (
    select 1 from public.rental_requests r
    where r.property_id = target.property_id
      and r.id <> target.id
      and r.status in ('approved', 'tenant_signed', 'payment_pending', 'confirmed')
      and daterange(r.move_in, r.move_out, '[)') && daterange(target.move_in, target.move_out, '[)')
  ) then
    raise exception 'These dates conflict with another approved rental';
  end if;

  update public.rental_requests
  set status = case when p_approve then 'approved'::public.rental_request_status else 'declined'::public.rental_request_status end,
      owner_decided_at = now(),
      owner_decision_note = nullif(trim(p_note), ''),
      updated_at = now()
  where id = target.id
  returning * into target;

  if p_approve then
    select * into property_record from public.properties where id = target.property_id;
    insert into public.contracts (
      rental_request_id,
      contract_version,
      contract_snapshot,
      owner_approved_at,
      owner_signature_reference
    ) values (
      target.id,
      'seasonal-rental-draft-v1',
      jsonb_build_object(
        'property', to_jsonb(property_record),
        'request', to_jsonb(target),
        'generated_at', now(),
        'legal_review_required', true
      ),
      now(),
      'owner-approval-attestation:' || auth.uid()::text
    );
  end if;

  return target;
end;
$$;

create or replace function public.tenant_accept_approved_request(p_request_id uuid)
returns public.rental_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.rental_requests;
begin
  select * into target from public.rental_requests where id = p_request_id for update;
  if target.id is null then raise exception 'Rental request not found'; end if;
  if target.tenant_id <> auth.uid() then raise exception 'Only the tenant can accept this request'; end if;
  if target.status <> 'approved' then raise exception 'This request is not ready for tenant acceptance'; end if;

  update public.contracts
  set tenant_signed_at = now(),
      tenant_signature_reference = 'tenant-acceptance-attestation:' || auth.uid()::text
  where rental_request_id = target.id;

  if not found then raise exception 'Contract record not found'; end if;

  update public.rental_requests
  set status = 'tenant_signed', updated_at = now()
  where id = target.id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.owner_decide_rental_request(uuid, boolean, text) from public;
revoke all on function public.tenant_accept_approved_request(uuid) from public;
grant execute on function public.owner_decide_rental_request(uuid, boolean, text) to authenticated;
grant execute on function public.tenant_accept_approved_request(uuid) to authenticated;
