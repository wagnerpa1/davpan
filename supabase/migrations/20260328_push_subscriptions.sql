begin;

create extension if not exists "pgcrypto";

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_used_at timestamp with time zone,
  disabled_at timestamp with time zone
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

create index if not exists idx_push_subscriptions_active
  on public.push_subscriptions (user_id)
  where disabled_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;

drop policy if exists push_subscriptions_owner_select on public.push_subscriptions;
create policy push_subscriptions_owner_select
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
create policy push_subscriptions_owner_insert
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
create policy push_subscriptions_owner_update
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;
create policy push_subscriptions_owner_delete
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

commit;

