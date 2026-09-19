alter table public.profiles add column if not exists saved_signature_data text;
alter table public.profiles add column if not exists saved_signature_at timestamptz;
alter table public.contracts add column if not exists owner_name text;
alter table public.contracts add column if not exists tenant_name text;
alter table public.contracts add column if not exists owner_signature_data text;
alter table public.contracts add column if not exists tenant_signature_data text;

drop function if exists public.owner_decide_rental_request(uuid, boolean, text);
create function public.owner_decide_rental_request(p_request_id uuid,p_approve boolean,p_note text default null,p_signature_data text default null)
returns public.rental_requests language plpgsql security definer set search_path=public as $$
declare target public.rental_requests; property_record public.properties; owner_profile public.profiles; tenant_profile public.profiles; signature text;
begin
 select * into target from public.rental_requests where id=p_request_id for update;
 if target.id is null or target.owner_id<>auth.uid() or target.status<>'submitted' then raise exception 'Request cannot be decided'; end if;
 if not p_approve then update public.rental_requests set status='declined',owner_decided_at=now(),updated_at=now() where id=target.id returning * into target; return target; end if;
 select * into owner_profile from public.profiles where id=auth.uid(); select * into tenant_profile from public.profiles where id=target.tenant_id;
 signature:=coalesce(nullif(p_signature_data,''),owner_profile.saved_signature_data); if signature is null then raise exception 'Owner signature required'; end if;
 if owner_profile.saved_signature_data is null then update public.profiles set saved_signature_data=signature,saved_signature_at=now() where id=auth.uid(); end if;
 update public.rental_requests set status='approved',owner_decided_at=now(),updated_at=now() where id=target.id returning * into target;
 select * into property_record from public.properties where id=target.property_id;
 insert into public.contracts(rental_request_id,contract_version,contract_snapshot,owner_approved_at,owner_signature_reference,owner_name,tenant_name,owner_signature_data) values(target.id,'seasonal-rental-draft-v2',jsonb_build_object('property',to_jsonb(property_record),'request',to_jsonb(target),'generated_at',now()),now(),'stored-signature-confirmed:'||auth.uid()::text,coalesce(owner_profile.full_name,'Property owner'),coalesce(tenant_profile.full_name,'Tenant'),signature);
 return target;
end;$$;

drop function if exists public.tenant_accept_approved_request(uuid);
create function public.tenant_accept_approved_request(p_request_id uuid,p_signature_data text)
returns public.rental_requests language plpgsql security definer set search_path=public as $$
declare target public.rental_requests; tenant_profile public.profiles;
begin
 select * into target from public.rental_requests where id=p_request_id for update;
 if target.id is null or target.tenant_id<>auth.uid() or target.status<>'approved' then raise exception 'Request is not ready for signature'; end if;
 if nullif(p_signature_data,'') is null then raise exception 'Tenant signature required'; end if;
 select * into tenant_profile from public.profiles where id=auth.uid();
 update public.contracts set tenant_signed_at=now(),tenant_signature_reference='drawn-signature:'||auth.uid()::text,tenant_signature_data=p_signature_data,tenant_name=coalesce(tenant_profile.full_name,'Tenant') where rental_request_id=target.id;
 update public.rental_requests set status='tenant_signed',updated_at=now() where id=target.id returning * into target; return target;
end;$$;
grant execute on function public.owner_decide_rental_request(uuid,boolean,text,text) to authenticated;
grant execute on function public.tenant_accept_approved_request(uuid,text) to authenticated;
