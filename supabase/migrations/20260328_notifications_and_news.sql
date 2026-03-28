begin;

create extension if not exists "pgcrypto";

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  news_enabled boolean not null default true,
  system_enabled boolean not null default true,
  material_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  group_notifications_enabled boolean not null default true,
  tour_group_ids uuid[] not null default '{}',
  push_enabled boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.child_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.child_profiles(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  news_enabled boolean not null default true,
  system_enabled boolean not null default true,
  material_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  group_notifications_enabled boolean not null default true,
  tour_group_ids uuid[] not null default '{}',
  push_enabled boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  published_by uuid not null references public.profiles(id) on delete cascade,
  published_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (
    type in (
      'news',
      'tour_new',
      'tour_update',
      'registration',
      'waitlist',
      'material',
      'comment',
      'system'
    )
  ),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  recipient_child_id uuid references public.child_profiles(id) on delete cascade,
  related_tour_id uuid references public.tours(id) on delete set null,
  related_group_id uuid references public.tour_groups(id) on delete set null,
  news_post_id uuid references public.news_posts(id) on delete cascade,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint notifications_exactly_one_target check (
    (
      case when recipient_user_id is not null then 1 else 0 end
      + case when recipient_child_id is not null then 1 else 0 end
    ) = 1
  )
);

create index if not exists idx_notifications_user_created
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists idx_notifications_child_created
  on public.notifications (recipient_child_id, created_at desc);

create index if not exists idx_notifications_unread_user
  on public.notifications (recipient_user_id)
  where read_at is null;

create index if not exists idx_notifications_unread_child
  on public.notifications (recipient_child_id)
  where read_at is null;

create index if not exists idx_news_posts_published_at
  on public.news_posts (published_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

drop trigger if exists trg_child_notification_preferences_updated_at on public.child_notification_preferences;
create trigger trg_child_notification_preferences_updated_at
before update on public.child_notification_preferences
for each row
execute function public.set_updated_at();

drop trigger if exists trg_news_posts_updated_at on public.news_posts;
create trigger trg_news_posts_updated_at
before update on public.news_posts
for each row
execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'member'::public.user_role)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_role() = 'admin'::public.user_role
$$;

alter table public.notification_preferences enable row level security;
alter table public.child_notification_preferences enable row level security;
alter table public.news_posts enable row level security;
alter table public.notifications enable row level security;

alter table public.notification_preferences force row level security;
alter table public.child_notification_preferences force row level security;
alter table public.news_posts force row level security;
alter table public.notifications force row level security;

drop policy if exists notification_preferences_owner_crud on public.notification_preferences;
create policy notification_preferences_owner_crud
on public.notification_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists child_notification_preferences_parent_crud on public.child_notification_preferences;
create policy child_notification_preferences_parent_crud
on public.child_notification_preferences
for all
to authenticated
using (
  parent_id = auth.uid()
  and exists (
    select 1
    from public.child_profiles cp
    where cp.id = child_id
      and cp.parent_id = auth.uid()
  )
)
with check (
  parent_id = auth.uid()
  and exists (
    select 1
    from public.child_profiles cp
    where cp.id = child_id
      and cp.parent_id = auth.uid()
  )
);

drop policy if exists notifications_owner_select on public.notifications;
create policy notifications_owner_select
on public.notifications
for select
to authenticated
using (
  recipient_user_id = auth.uid()
  or (
    recipient_child_id is not null
    and exists (
      select 1
      from public.child_profiles cp
      where cp.id = recipient_child_id
        and cp.parent_id = auth.uid()
    )
  )
  or public.is_admin()
);

drop policy if exists notifications_owner_update_read on public.notifications;
create policy notifications_owner_update_read
on public.notifications
for update
to authenticated
using (
  recipient_user_id = auth.uid()
  or (
    recipient_child_id is not null
    and exists (
      select 1
      from public.child_profiles cp
      where cp.id = recipient_child_id
        and cp.parent_id = auth.uid()
    )
  )
)
with check (
  recipient_user_id = auth.uid()
  or (
    recipient_child_id is not null
    and exists (
      select 1
      from public.child_profiles cp
      where cp.id = recipient_child_id
        and cp.parent_id = auth.uid()
    )
  )
);

drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert
on public.notifications
for insert
to authenticated
with check (public.is_admin());

drop policy if exists news_posts_authenticated_read on public.news_posts;
create policy news_posts_authenticated_read
on public.news_posts
for select
to authenticated
using (true);

drop policy if exists news_posts_admin_crud on public.news_posts;
create policy news_posts_admin_crud
on public.news_posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;

