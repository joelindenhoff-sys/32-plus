-- Supabase grants execute privileges broadly by default. Remove all implicit
-- access first, then grant only the RPC entry points each client role needs.

revoke all on function public.calculate_accommodation_amount(uuid, date, date) from public, anon, authenticated;
revoke all on function public.resolve_pricing_policy(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.create_rental_request(uuid, date, date, integer, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_rental_request(uuid, date, date, integer, text, text, boolean) to authenticated;

revoke all on function public.owner_decide_rental_request(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.owner_decide_rental_request(uuid, boolean, text, text) to authenticated;

revoke all on function public.tenant_accept_approved_request(uuid, text) from public, anon, authenticated;
grant execute on function public.tenant_accept_approved_request(uuid, text) to authenticated;

revoke all on function public.quote_rental_request(uuid, date, date) from public, anon, authenticated;
grant execute on function public.quote_rental_request(uuid, date, date) to anon, authenticated;

revoke all on function public.get_current_public_pricing() from public, anon, authenticated;
grant execute on function public.get_current_public_pricing() to anon, authenticated;

revoke all on function public.get_property_calendar(uuid) from public, anon, authenticated;
grant execute on function public.get_property_calendar(uuid) to anon, authenticated;
