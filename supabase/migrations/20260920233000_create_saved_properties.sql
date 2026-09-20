create table public.saved_properties (
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create index saved_properties_property_id_idx on public.saved_properties(property_id);
alter table public.saved_properties enable row level security;
revoke all on table public.saved_properties from anon;
grant select, insert, delete on table public.saved_properties to authenticated;

create policy "Users can view their own saved properties"
  on public.saved_properties for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can save published properties"
  on public.saved_properties for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.properties
      where properties.id = saved_properties.property_id
        and properties.is_published = true
    )
  );

create policy "Users can remove their own saved properties"
  on public.saved_properties for delete to authenticated
  using ((select auth.uid()) = user_id);
