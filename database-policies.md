# Supabase RLS & Security Policies

Diese Datei enthält ein vollständiges SQL-Playbook zum Härten der Datenbank.

- Aktiviert RLS auf allen `public`-Tabellen.
- Definiert Rollen-/Berechtigungslogik für `member`, `parent`, `guide`, `materialwart`, `admin`.
- Schließt offensichtliche IDOR-Pfade bei Kind-Anmeldungen.
- Härtet betroffene DB-Funktionen (`search_path`).

> Vor Ausführung: Backup / Snapshot erstellen und zuerst in Staging testen.

```sql
begin;

-- =====================================================================
-- 0) Helper-Funktionen für RLS (SECURITY DEFINER + fester search_path)
-- =====================================================================

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

create or replace function public.is_guide_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_role() in ('guide'::public.user_role, 'admin'::public.user_role)
$$;

create or replace function public.can_manage_tour(tour_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.tours t
      where t.id = tour_uuid and t.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.tour_guides tg
      where tg.tour_id = tour_uuid and tg.user_id = auth.uid()
    )
$$;

-- =====================================================================
-- 1) RLS auf allen Public-Tabellen aktivieren
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.tours enable row level security;
alter table public.tour_guides enable row level security;
alter table public.tour_participants enable row level security;
alter table public.materials enable row level security;
alter table public.tour_materials enable row level security;
alter table public.material_reservations enable row level security;
alter table public.tour_reports enable row level security;
alter table public.report_images enable row level security;
alter table public.documents enable row level security;

alter table public.profiles force row level security;
alter table public.child_profiles force row level security;
alter table public.tours force row level security;
alter table public.tour_guides force row level security;
alter table public.tour_participants force row level security;
alter table public.materials force row level security;
alter table public.tour_materials force row level security;
alter table public.material_reservations force row level security;
alter table public.tour_reports force row level security;
alter table public.report_images force row level security;
alter table public.documents force row level security;

-- =====================================================================
-- 2) Vorhandene Policies entfernen (idempotent)
-- =====================================================================

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_admin_all on public.profiles;

drop policy if exists child_profiles_parent_crud on public.child_profiles;
drop policy if exists child_profiles_guide_admin_read on public.child_profiles;

drop policy if exists tours_read_authenticated on public.tours;
drop policy if exists tours_create_guide_admin on public.tours;
drop policy if exists tours_update_manage on public.tours;
drop policy if exists tours_delete_manage on public.tours;

drop policy if exists tour_guides_read_authenticated on public.tour_guides;
drop policy if exists tour_guides_write_manage on public.tour_guides;

drop policy if exists tour_participants_read_own_or_manage on public.tour_participants;
drop policy if exists tour_participants_insert_own on public.tour_participants;
drop policy if exists tour_participants_update_own_or_manage on public.tour_participants;
drop policy if exists tour_participants_delete_manage on public.tour_participants;

drop policy if exists materials_read_authenticated on public.materials;
drop policy if exists materials_write_guide_admin on public.materials;

drop policy if exists tour_materials_read_authenticated on public.tour_materials;
drop policy if exists tour_materials_write_manage on public.tour_materials;

drop policy if exists material_reservations_read_own_or_manage on public.material_reservations;
drop policy if exists material_reservations_insert_own on public.material_reservations;
drop policy if exists material_reservations_update_own_or_manage on public.material_reservations;
drop policy if exists material_reservations_delete_own_or_manage on public.material_reservations;

drop policy if exists tour_reports_read_authenticated on public.tour_reports;
drop policy if exists tour_reports_write_guide_admin on public.tour_reports;

drop policy if exists report_images_read_authenticated on public.report_images;
drop policy if exists report_images_write_guide_admin on public.report_images;

drop policy if exists documents_read_authenticated on public.documents;
drop policy if exists documents_write_admin on public.documents;

-- =====================================================================
-- 3) PROFILES
-- =====================================================================

-- Eigenes Profil lesen; Guides in Tourkontext sichtbar; Admin alles.
create policy profiles_select
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.tour_guides tg
    where tg.user_id = public.profiles.id
  )
  or exists (
    select 1
    from public.tour_participants tp
    join public.tour_guides viewer_tg on viewer_tg.tour_id = tp.tour_id
    where tp.user_id = public.profiles.id
      and viewer_tg.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.tour_participants tp
    join public.tours t on t.id = tp.tour_id
    where tp.user_id = public.profiles.id
      and t.created_by = auth.uid()
  )
);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role in ('member'::public.user_role, 'parent'::public.user_role)
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  id = auth.uid()
  or public.is_admin()
);

-- =====================================================================
-- 4) CHILD_PROFILES
-- =====================================================================

create policy child_profiles_parent_crud
on public.child_profiles
for all
to authenticated
using (parent_id = auth.uid() or public.is_admin())
with check (parent_id = auth.uid() or public.is_admin());

create policy child_profiles_linked_parent_read
on public.child_profiles
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.parent_child_relations pcr
    where pcr.child_id = public.child_profiles.id
      and pcr.parent_id = auth.uid()
  )
);

create policy child_profiles_linked_parent_update
on public.child_profiles
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.parent_child_relations pcr
    where pcr.child_id = public.child_profiles.id
      and pcr.parent_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.parent_child_relations pcr
    where pcr.child_id = public.child_profiles.id
      and pcr.parent_id = auth.uid()
  )
);

create policy child_profiles_guide_admin_read
on public.child_profiles
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.tour_participants tp
    where tp.child_profile_id = public.child_profiles.id
      and public.can_manage_tour(tp.tour_id)
  )
);

-- =====================================================================
-- 5) TOURS
-- =====================================================================

create policy tours_read_authenticated
on public.tours
for select
to authenticated
using (true);

create policy tours_create_guide_admin
on public.tours
for insert
to authenticated
with check (
  public.is_guide_or_admin()
  and created_by = auth.uid()
);

create policy tours_update_manage
on public.tours
for update
to authenticated
using (public.can_manage_tour(id))
with check (public.can_manage_tour(id));

create policy tours_delete_manage
on public.tours
for delete
to authenticated
using (public.can_manage_tour(id));

-- =====================================================================
-- 6) TOUR_GUIDES
-- =====================================================================

create policy tour_guides_read_authenticated
on public.tour_guides
for select
to authenticated
using (true);

create policy tour_guides_write_manage
on public.tour_guides
for all
to authenticated
using (public.can_manage_tour(tour_id))
with check (public.can_manage_tour(tour_id));

-- =====================================================================
-- 7) TOUR_PARTICIPANTS
-- =====================================================================

create policy tour_participants_read_own_or_manage
on public.tour_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.child_profiles cp
    where cp.id = public.tour_participants.child_profile_id
      and cp.parent_id = auth.uid()
  )
  or public.can_manage_tour(tour_id)
);

create policy tour_participants_insert_own
on public.tour_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    child_profile_id is null
    or exists (
      select 1 from public.child_profiles cp
      where cp.id = child_profile_id
        and cp.parent_id = auth.uid()
    )
  )
);

create policy tour_participants_update_own_or_manage
on public.tour_participants
for update
to authenticated
using (
  user_id = auth.uid()
  or public.can_manage_tour(tour_id)
)
with check (
  (
    user_id = auth.uid()
    and (
      child_profile_id is null
      or exists (
        select 1 from public.child_profiles cp
        where cp.id = child_profile_id
          and cp.parent_id = auth.uid()
      )
    )
  )
  or public.can_manage_tour(tour_id)
);

create policy tour_participants_delete_manage
on public.tour_participants
for delete
to authenticated
using (public.can_manage_tour(tour_id));

-- =====================================================================
-- 8) MATERIALS / TOUR_MATERIALS / RESERVATIONS
-- =====================================================================

create policy materials_read_authenticated
on public.materials
for select
to authenticated
using (true);

create policy materials_write_guide_admin
on public.materials
for all
to authenticated
using (public.is_guide_or_admin())
with check (public.is_guide_or_admin());

create policy tour_materials_read_authenticated
on public.tour_materials
for select
to authenticated
using (true);

create policy tour_materials_write_manage
on public.tour_materials
for all
to authenticated
using (public.can_manage_tour(tour_id))
with check (public.can_manage_tour(tour_id));

create policy material_reservations_read_own_or_manage
on public.material_reservations
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.child_profiles cp
    where cp.id = public.material_reservations.child_profile_id
      and cp.parent_id = auth.uid()
  )
  or public.can_manage_tour(tour_id)
);

create policy material_reservations_insert_own
on public.material_reservations
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    child_profile_id is null
    or exists (
      select 1 from public.child_profiles cp
      where cp.id = child_profile_id
        and cp.parent_id = auth.uid()
    )
  )
);

create policy material_reservations_update_own_or_manage
on public.material_reservations
for update
to authenticated
using (
  user_id = auth.uid()
  or public.can_manage_tour(tour_id)
)
with check (
  user_id = auth.uid()
  or public.can_manage_tour(tour_id)
);

create policy material_reservations_delete_own_or_manage
on public.material_reservations
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.can_manage_tour(tour_id)
);

-- =====================================================================
-- 9) REPORTS / REPORT_IMAGES
-- =====================================================================

create policy tour_reports_read_authenticated
on public.tour_reports
for select
to authenticated
using (true);

create policy tour_reports_write_guide_admin
on public.tour_reports
for all
to authenticated
using (
  public.is_guide_or_admin()
  and (
    created_by = auth.uid()
    or public.is_admin()
    or public.can_manage_tour(tour_id)
  )
)
with check (
  public.is_guide_or_admin()
  and created_by = auth.uid()
);

create policy report_images_read_authenticated
on public.report_images
for select
to authenticated
using (
  exists (
    select 1 from public.tour_reports tr
    where tr.id = public.report_images.report_id
  )
);

create policy report_images_write_guide_admin
on public.report_images
for all
to authenticated
using (
  exists (
    select 1
    from public.tour_reports tr
    where tr.id = public.report_images.report_id
      and (
        tr.created_by = auth.uid()
        or public.is_admin()
        or public.can_manage_tour(tr.tour_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.tour_reports tr
    where tr.id = public.report_images.report_id
      and (
        tr.created_by = auth.uid()
        or public.is_admin()
        or public.can_manage_tour(tr.tour_id)
      )
  )
);

-- =====================================================================
-- 10) DOCUMENTS
-- =====================================================================

create policy documents_read_authenticated
on public.documents
for select
to authenticated
using (true);

create policy documents_write_admin
on public.documents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =====================================================================
-- 11) Zusätzliche DB-Härtung (Integrität + Advisor)
-- =====================================================================

-- Duplikate verhindern
create unique index if not exists ux_tour_guides_tour_user
  on public.tour_guides (tour_id, user_id);

-- Für nullable child_profile_id einen deterministischen eindeutigen Schlüssel
create unique index if not exists ux_tour_participants_unique_registration
  on public.tour_participants (
    tour_id,
    user_id,
    coalesce(child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Empfohlene FK-Indizes (Performance Advisor)
create index if not exists idx_child_profiles_parent_id on public.child_profiles(parent_id);
create index if not exists idx_tour_guides_tour_id on public.tour_guides(tour_id);
create index if not exists idx_tour_guides_user_id on public.tour_guides(user_id);
create index if not exists idx_tour_participants_tour_id on public.tour_participants(tour_id);
create index if not exists idx_tour_participants_user_id on public.tour_participants(user_id);
create index if not exists idx_tour_participants_child_profile_id on public.tour_participants(child_profile_id);
create index if not exists idx_tours_created_by on public.tours(created_by);
create index if not exists idx_tour_reports_tour_id on public.tour_reports(tour_id);
create index if not exists idx_tour_reports_created_by on public.tour_reports(created_by);
create index if not exists idx_report_images_report_id on public.report_images(report_id);
create index if not exists idx_tour_materials_tour_id on public.tour_materials(tour_id);
create index if not exists idx_tour_materials_material_id on public.tour_materials(material_id);
create index if not exists idx_material_reservations_tour_id on public.material_reservations(tour_id);
create index if not exists idx_material_reservations_material_inventory_id on public.material_reservations(material_inventory_id);
create index if not exists idx_material_reservations_user_id on public.material_reservations(user_id);
create index if not exists idx_material_reservations_child_profile_id on public.material_reservations(child_profile_id);

-- search_path-Härtung für Advisor-betroffene Funktionen
alter function if exists public.assign_waitlist_position() set search_path = public, pg_temp;
alter function if exists public.check_material_availability() set search_path = public, pg_temp;
alter function if exists public.promote_waitlist() set search_path = public, pg_temp;
alter function if exists public.limit_report_images() set search_path = public, pg_temp;

commit;
```

## Ergänzung: Policies für bislang ungeschützte Tabellen (neue Struktur)

Die folgenden Tabellen waren in der neuen Struktur (`database.md`) aktiv, aber ohne vollständige RLS-Absicherung:

- `material_types`
- `material_inventory`
- `material_pricing`
- `tour_groups`
- `tour_material_requirements`
- `resources`
- `resource_bookings`
- `material_reservations` (RLS aktiv, aber ohne Policies)

Policy-Zielbild:

- `admin`: Vollzugriff
- `guide`: nur tourbezogene Datensätze der eigenen Touren (`can_manage_tour(tour_id)`)
- `anon`: nur öffentliche Tour-bezogene Lesedaten
- `authenticated`: Lesen wie `anon` plus interne Leserechte je Tabelle

Bereits angewendete Migration (Kurzfassung):

```sql
begin;

alter table public.material_types enable row level security;
alter table public.material_inventory enable row level security;
alter table public.material_pricing enable row level security;
alter table public.tour_groups enable row level security;
alter table public.tour_material_requirements enable row level security;
alter table public.resources enable row level security;
alter table public.resource_bookings enable row level security;
alter table public.material_reservations enable row level security;

alter table public.material_types force row level security;
alter table public.material_inventory force row level security;
alter table public.material_pricing force row level security;
alter table public.tour_groups force row level security;
alter table public.tour_material_requirements force row level security;
alter table public.resources force row level security;
alter table public.resource_bookings force row level security;
alter table public.material_reservations force row level security;

-- Öffentliche Leserechte für Tour-Kontext
create policy material_types_read_anon on public.material_types for select to anon using (true);
create policy tour_groups_read_anon on public.tour_groups for select to anon using (true);
create policy tour_material_requirements_read_anon on public.tour_material_requirements for select to anon using (true);

-- Authenticated-Lesen
create policy material_types_read_authenticated on public.material_types for select to authenticated using (true);
create policy material_inventory_read_authenticated on public.material_inventory for select to authenticated using (true);
create policy material_pricing_read_authenticated on public.material_pricing for select to authenticated using (true);
create policy tour_groups_read_authenticated on public.tour_groups for select to authenticated using (true);
create policy tour_material_requirements_read_authenticated on public.tour_material_requirements for select to authenticated using (true);
create policy resources_read_authenticated on public.resources for select to authenticated using (true);

-- Admin-Schreibrechte auf globale Stammdaten
create policy material_types_write_admin on public.material_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy material_inventory_write_admin on public.material_inventory for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy material_pricing_write_admin on public.material_pricing for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tour_groups_write_admin on public.tour_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy resources_write_admin on public.resources for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tour-gebundene Schreibrechte für Guide/Admin
create policy tour_material_requirements_write_manage on public.tour_material_requirements
for all to authenticated
using (public.can_manage_tour(tour_id))
with check (public.can_manage_tour(tour_id));

create policy resource_bookings_read_authenticated on public.resource_bookings
for select to authenticated
using (public.is_admin() or public.can_manage_tour(tour_id));

create policy resource_bookings_write_manage on public.resource_bookings
for all to authenticated
using (public.is_admin() or public.can_manage_tour(tour_id))
with check (public.is_admin() or (public.can_manage_tour(tour_id) and created_by = auth.uid()));

-- Materialreservierungen: eigene/Kind oder tourverantwortliche Guides/Admin
create policy material_reservations_select_own_or_manage on public.material_reservations
for select to authenticated
using (
  public.is_admin()
  or public.can_manage_tour(tour_id)
  or user_id = auth.uid()
  or exists (
    select 1 from public.child_profiles cp
    where cp.id = material_reservations.child_profile_id
      and cp.parent_id = auth.uid()
  )
);

create policy material_reservations_insert_own_or_manage on public.material_reservations
for insert to authenticated
with check (
  public.is_admin()
  or public.can_manage_tour(tour_id)
  or (
    user_id = auth.uid()
    and (
      child_profile_id is null
      or exists (
        select 1 from public.child_profiles cp
        where cp.id = material_reservations.child_profile_id
          and cp.parent_id = auth.uid()
      )
    )
  )
);

create policy material_reservations_update_own_or_manage on public.material_reservations
for update to authenticated
using (public.is_admin() or public.can_manage_tour(tour_id) or user_id = auth.uid())
with check (
  public.is_admin()
  or public.can_manage_tour(tour_id)
  or (
    user_id = auth.uid()
    and (
      child_profile_id is null
      or exists (
        select 1 from public.child_profiles cp
        where cp.id = material_reservations.child_profile_id
          and cp.parent_id = auth.uid()
      )
    )
  )
);

create policy material_reservations_delete_own_or_manage on public.material_reservations
for delete to authenticated
using (public.is_admin() or public.can_manage_tour(tour_id) or user_id = auth.uid());

commit;
```

## Nach dem Ausführen prüfen

## Update 2026-03-28: Rolle `materialwart`

Die Rolle `materialwart` wurde als dedizierte Material-Adminrolle eingeführt.

- Darf `material_types`, `material_inventory`, `material_pricing` schreiben.
- Darf `material_reservations` global verwalten (inkl. private Ausleihen).
- Erhält **keine** User-/Dokument-/Ressourcen-Adminrechte.

Ausführbare Migration: `supabase/migrations/20260328133000_add_materialwart_role.sql`

Wichtige DB-Änderungen:

```sql
alter type public.user_role add value if not exists 'materialwart';

create or replace function public.is_materialwart_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_role() in ('materialwart'::public.user_role, 'admin'::public.user_role)
$$;
```

```sql
-- RLS-Status
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Policies
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

