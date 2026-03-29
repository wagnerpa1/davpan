begin;

create table if not exists public.admin_system_notification_audit (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  message text not null,
  target_mode text not null check (target_mode in ('all', 'roles', 'tour_groups')),
  target_roles text[] not null default '{}',
  target_group_ids uuid[] not null default '{}',
  user_target_count integer not null default 0,
  child_target_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_admin_system_notification_audit_created_at
  on public.admin_system_notification_audit (created_at desc);

create index if not exists idx_admin_system_notification_audit_sent_by
  on public.admin_system_notification_audit (sent_by);

alter table public.admin_system_notification_audit enable row level security;
alter table public.admin_system_notification_audit force row level security;

drop policy if exists admin_system_notification_audit_admin_select on public.admin_system_notification_audit;
create policy admin_system_notification_audit_admin_select
on public.admin_system_notification_audit
for select
to authenticated
using (public.is_admin());

drop policy if exists admin_system_notification_audit_admin_insert on public.admin_system_notification_audit;
create policy admin_system_notification_audit_admin_insert
on public.admin_system_notification_audit
for insert
to authenticated
with check (public.is_admin());

commit;

