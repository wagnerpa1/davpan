create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "btree_gist" with schema "extensions";

create type "public"."materal_typ" as enum ('Klettergurt/Sitz– u.Brustgurt', 'Klettersteigset', 'Steinschlaghelm', 'Steigeisen', 'Eispickel/Eisbeil', 'Grödel', 'Biwaksack', 'LVS-Set', 'Schneeschuhe', 'Kraxn für Zwergerl');

create type "public"."material_size" as enum ('S', 'M', 'L', '39', '40', '41', '42', '43', '44', '45');

create type "public"."material_status" as enum ('reserved', 'on loan', 'returned');

create type "public"."participant_status" as enum ('pending', 'confirmed', 'waitlist', 'cancelled', 'pending_confirmation');

create type "public"."tour_category" as enum ('wandern', 'klettersteig', 'klettern', 'mehrseillaenge', 'kletterhalle', 'kanu', 'mountainbike', 'camp');

create type "public"."tour_difficulty" as enum ('T1', 'T2', 'T3', 'T4', 'B1', 'B2', 'B3', 'B4', 'L', 'WS', 'ZS', 'K1', 'K2', 'K3', 'K4', 'WT1', 'WT2', 'WT3', 'WT4', 'WT5', 'ST2', 'ST3', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'UIAA 1', 'UIAA 2', 'UIAA 3', 'UIAA 4', 'UIAA 5', 'UIAA 6', 'UIAA 7', 'UIAA 8', 'Keine');

create type "public"."tour_status" as enum ('planning', 'open', 'full', 'completed', 'canceled', 'cancelled');

create type "public"."user_role" as enum ('member', 'guide', 'admin', 'parent', 'materialwart');

create sequence "public"."notification_outbox_id_seq";


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "entity_type" text not null,
    "entity_id" uuid not null,
    "action" text not null,
    "old_payload" jsonb,
    "new_payload" jsonb,
    "actor_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."child_notification_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "parent_id" uuid not null,
    "news_enabled" boolean not null default true,
    "system_enabled" boolean not null default true,
    "material_enabled" boolean not null default true,
    "comments_enabled" boolean not null default true,
    "group_notifications_enabled" boolean not null default true,
    "tour_group_ids" uuid[] not null default '{}'::uuid[],
    "push_enabled" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."child_notification_preferences" enable row level security;


  create table "public"."child_profile_invites" (
    "code" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone default (now() + '7 days'::interval)
      );


alter table "public"."child_profile_invites" enable row level security;


  create table "public"."child_profiles" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "parent_id" uuid,
    "full_name" text not null,
    "birthdate" date not null,
    "created_at" timestamp without time zone default now(),
    "medical_notes" text,
    "image_consent" boolean default false
      );


alter table "public"."child_profiles" enable row level security;


  create table "public"."documents" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "title" text not null,
    "file_url" text not null,
    "category" text,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."documents" enable row level security;


  create table "public"."material_inventory" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "material_type_id" uuid,
    "size" text,
    "quantity_total" integer not null,
    "quantity_available" integer not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."material_inventory" enable row level security;


  create table "public"."material_pricing" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "material_type_id" uuid,
    "price_day" numeric,
    "price_extra_day" numeric,
    "price_week" numeric
      );


alter table "public"."material_pricing" enable row level security;


  create table "public"."material_reservations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "tour_id" uuid,
    "material_inventory_id" uuid,
    "user_id" uuid,
    "child_profile_id" uuid,
    "quantity" integer default 1,
    "status" text default 'reserved'::text,
    "loan_date" date,
    "return_date" date,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."material_reservations" enable row level security;


  create table "public"."material_types" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "category" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."material_types" enable row level security;


  create table "public"."materials" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" public.materal_typ not null,
    "total_quantity" integer not null,
    "size" public.material_size,
    "price_day" integer,
    "price_extraday" integer,
    "price_week" integer
      );


alter table "public"."materials" enable row level security;


  create table "public"."mutation_idempotency" (
    "scope" text not null,
    "idempotency_key" text not null,
    "response" jsonb not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."mutation_idempotency" enable row level security;


  create table "public"."news_posts" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" text not null,
    "image_url" text,
    "published_by" uuid not null,
    "published_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."news_posts" enable row level security;


  create table "public"."notification_outbox" (
    "id" bigint not null default nextval('public.notification_outbox_id_seq'::regclass),
    "event_key" text not null,
    "aggregate_type" text not null default 'notification'::text,
    "aggregate_id" uuid not null,
    "event_type" text not null default 'notification.created'::text,
    "event_version" bigint not null default 1,
    "payload" jsonb not null default '{}'::jsonb,
    "status" text not null default 'pending'::text,
    "attempts" integer not null default 0,
    "available_at" timestamp with time zone not null default now(),
    "locked_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "last_error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_outbox" enable row level security;


  create table "public"."notification_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "news_enabled" boolean not null default true,
    "system_enabled" boolean not null default true,
    "material_enabled" boolean not null default true,
    "comments_enabled" boolean not null default true,
    "group_notifications_enabled" boolean not null default true,
    "tour_group_ids" uuid[] not null default '{}'::uuid[],
    "push_enabled" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_preferences" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "type" text not null,
    "title" text not null,
    "body" text not null,
    "payload" jsonb not null default '{}'::jsonb,
    "recipient_user_id" uuid,
    "recipient_child_id" uuid,
    "related_tour_id" uuid,
    "related_group_id" uuid,
    "news_post_id" uuid,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."parent_child_relations" (
    "parent_id" uuid not null,
    "child_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."parent_child_relations" enable row level security;


  create table "public"."processed_events" (
    "consumer" text not null,
    "event_key" text not null,
    "processed_at" timestamp with time zone not null default now()
      );


alter table "public"."processed_events" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text not null,
    "phone" text,
    "birthdate" date,
    "medical_notes" text,
    "emergency_phone" text,
    "role" public.user_role default 'member'::public.user_role,
    "image_consent" boolean default false,
    "is_activated" boolean not null default false,
    "created_at" timestamp without time zone default now(),
    "membership_number" character varying(11)
      );


alter table "public"."profiles" enable row level security;


  create table "public"."push_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "endpoint" text not null,
    "p256dh" text not null,
    "auth" text not null,
    "user_agent" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_used_at" timestamp with time zone,
    "disabled_at" timestamp with time zone
      );


alter table "public"."push_subscriptions" enable row level security;


  create table "public"."report_images" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "report_id" uuid,
    "image_url" text not null,
    "order_index" integer
      );


alter table "public"."report_images" enable row level security;


  create table "public"."resource_bookings" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "resource_id" uuid,
    "tour_id" uuid,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "status" text default 'requested'::text,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."resource_bookings" enable row level security;


  create table "public"."resources" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "type" text,
    "capacity" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."resources" enable row level security;


  create table "public"."tour_categorys" (
    "id" uuid not null default gen_random_uuid(),
    "category" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."tour_categorys" enable row level security;


  create table "public"."tour_groups" (
    "id" uuid not null default gen_random_uuid(),
    "group_name" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."tour_groups" enable row level security;


  create table "public"."tour_guides" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "tour_id" uuid,
    "user_id" uuid
      );


alter table "public"."tour_guides" enable row level security;


  create table "public"."tour_material_requirements" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "tour_id" uuid,
    "material_type_id" uuid
      );


alter table "public"."tour_material_requirements" enable row level security;


  create table "public"."tour_materials" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "tour_id" uuid,
    "material_id" uuid
      );


alter table "public"."tour_materials" enable row level security;


  create table "public"."tour_participants" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "tour_id" uuid,
    "user_id" uuid,
    "child_profile_id" uuid,
    "status" public.participant_status default 'pending'::public.participant_status,
    "age_override" boolean default false,
    "created_at" timestamp without time zone default now(),
    "waitlist_position" integer,
    "waitlist_promoted_at" timestamp with time zone
      );


alter table "public"."tour_participants" enable row level security;


  create table "public"."tour_reports" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "tour_id" uuid,
    "title" text,
    "report_text" text,
    "created_by" uuid,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."tour_reports" enable row level security;


  create table "public"."tours" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "title" text not null,
    "description" text,
    "difficulty" public.tour_difficulty default 'Keine'::public.tour_difficulty,
    "target_area" text,
    "requirements" text,
    "meeting_point" text,
    "meeting_time" time without time zone,
    "start_date" date not null,
    "end_date" date,
    "elevation" integer,
    "distance" numeric,
    "duration_hours" numeric,
    "cost_info" text,
    "max_participants" integer,
    "status" public.tour_status default 'planning'::public.tour_status,
    "created_by" uuid,
    "created_at" timestamp without time zone default now(),
    "min_age" integer,
    "group" uuid,
    "category" uuid,
    "version" integer not null default 1,
    "updated_at" timestamp without time zone not null default now(),
    "registration_deadline" timestamp with time zone
      );


alter table "public"."tours" enable row level security;

alter sequence "public"."notification_outbox_id_seq" owned by "public"."notification_outbox"."id";

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX child_notification_preferences_child_id_key ON public.child_notification_preferences USING btree (child_id);

CREATE UNIQUE INDEX child_notification_preferences_pkey ON public.child_notification_preferences USING btree (id);

CREATE UNIQUE INDEX child_profile_invites_pkey ON public.child_profile_invites USING btree (code);

CREATE UNIQUE INDEX child_profiles_pkey ON public.child_profiles USING btree (id);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

select 1; 
-- CREATE INDEX exclude_resource_time_overlap ON public.resource_bookings USING gist (resource_id, tstzrange(start_date, end_date, '[]'::text)) WHERE (status <> 'released'::text);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);

CREATE INDEX idx_child_profiles_parent_id ON public.child_profiles USING btree (parent_id);

CREATE INDEX idx_news_posts_published_at ON public.news_posts USING btree (published_at DESC);

CREATE INDEX idx_notification_outbox_poll ON public.notification_outbox USING btree (status, available_at, id);

CREATE INDEX idx_notifications_child_created ON public.notifications USING btree (recipient_child_id, created_at DESC);

CREATE INDEX idx_notifications_unread_child ON public.notifications USING btree (recipient_child_id) WHERE (read_at IS NULL);

CREATE INDEX idx_notifications_unread_user ON public.notifications USING btree (recipient_user_id) WHERE (read_at IS NULL);

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (recipient_user_id, created_at DESC);

CREATE INDEX idx_profiles_membership_number ON public.profiles USING btree (membership_number);

CREATE INDEX idx_push_subscriptions_active ON public.push_subscriptions USING btree (user_id) WHERE (disabled_at IS NULL);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);

CREATE INDEX idx_report_images_report_id ON public.report_images USING btree (report_id);

CREATE INDEX idx_tour_guides_tour_id ON public.tour_guides USING btree (tour_id);

CREATE INDEX idx_tour_guides_user_id ON public.tour_guides USING btree (user_id);

CREATE INDEX idx_tour_materials_material_id ON public.tour_materials USING btree (material_id);

CREATE INDEX idx_tour_materials_tour_id ON public.tour_materials USING btree (tour_id);

CREATE INDEX idx_tour_participants_child_profile_id ON public.tour_participants USING btree (child_profile_id);

CREATE INDEX idx_tour_participants_tour_id ON public.tour_participants USING btree (tour_id);

CREATE INDEX idx_tour_participants_tour_status ON public.tour_participants USING btree (tour_id, status);

CREATE INDEX idx_tour_participants_user_id ON public.tour_participants USING btree (user_id);

CREATE INDEX idx_tour_reports_created_at ON public.tour_reports USING btree (created_at DESC);

CREATE INDEX idx_tour_reports_created_by ON public.tour_reports USING btree (created_by);

CREATE INDEX idx_tour_reports_tour_id ON public.tour_reports USING btree (tour_id);

CREATE INDEX idx_tours_created_by ON public.tours USING btree (created_by);

CREATE INDEX idx_tours_end_date ON public.tours USING btree (end_date);

CREATE INDEX idx_tours_status ON public.tours USING btree (status);

CREATE INDEX idx_tours_status_start_date ON public.tours USING btree (status, start_date);

CREATE INDEX idx_waitlist_lookup ON public.tour_participants USING btree (tour_id, status, waitlist_position);

CREATE UNIQUE INDEX material_inventory_pkey ON public.material_inventory USING btree (id);

CREATE UNIQUE INDEX material_pricing_pkey ON public.material_pricing USING btree (id);

CREATE UNIQUE INDEX material_reservations_pkey1 ON public.material_reservations USING btree (id);

CREATE UNIQUE INDEX material_types_pkey ON public.material_types USING btree (id);

CREATE UNIQUE INDEX materials_pkey ON public.materials USING btree (id);

CREATE UNIQUE INDEX mutation_idempotency_pkey ON public.mutation_idempotency USING btree (scope, idempotency_key);

CREATE UNIQUE INDEX news_posts_pkey ON public.news_posts USING btree (id);

CREATE UNIQUE INDEX notification_outbox_event_key_key ON public.notification_outbox USING btree (event_key);

CREATE UNIQUE INDEX notification_outbox_pkey ON public.notification_outbox USING btree (id);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);

CREATE UNIQUE INDEX notification_preferences_user_id_key ON public.notification_preferences USING btree (user_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX parent_child_relations_pkey ON public.parent_child_relations USING btree (parent_id, child_id);

CREATE UNIQUE INDEX processed_events_pkey ON public.processed_events USING btree (consumer, event_key);

CREATE UNIQUE INDEX profiles_membership_number_key ON public.profiles USING btree (membership_number);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);

CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id);

CREATE UNIQUE INDEX report_images_pkey ON public.report_images USING btree (id);

CREATE UNIQUE INDEX resource_bookings_pkey ON public.resource_bookings USING btree (id);

CREATE UNIQUE INDEX resources_pkey ON public.resources USING btree (id);

CREATE UNIQUE INDEX tour_categorys_pkey ON public.tour_categorys USING btree (id);

CREATE UNIQUE INDEX tour_groups_pkey ON public.tour_groups USING btree (id);

CREATE UNIQUE INDEX tour_guides_pkey ON public.tour_guides USING btree (id);

CREATE UNIQUE INDEX tour_material_requirements_pkey ON public.tour_material_requirements USING btree (id);

CREATE UNIQUE INDEX tour_materials_pkey ON public.tour_materials USING btree (id);

CREATE UNIQUE INDEX tour_participants_pkey ON public.tour_participants USING btree (id);

CREATE UNIQUE INDEX tour_reports_pkey ON public.tour_reports USING btree (id);

CREATE UNIQUE INDEX tours_pkey ON public.tours USING btree (id);

CREATE UNIQUE INDEX unique_participant ON public.tour_participants USING btree (tour_id, user_id, child_profile_id);

CREATE UNIQUE INDEX ux_active_registration_per_person ON public.tour_participants USING btree (tour_id, user_id, COALESCE(child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE (status = ANY (ARRAY['pending'::public.participant_status, 'confirmed'::public.participant_status, 'waitlist'::public.participant_status]));

CREATE UNIQUE INDEX ux_tour_guides_tour_user ON public.tour_guides USING btree (tour_id, user_id);

CREATE UNIQUE INDEX ux_tour_participants_unique_registration ON public.tour_participants USING btree (tour_id, user_id, COALESCE(child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE UNIQUE INDEX ux_tour_reports_one_per_tour ON public.tour_reports USING btree (tour_id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."child_notification_preferences" add constraint "child_notification_preferences_pkey" PRIMARY KEY using index "child_notification_preferences_pkey";

alter table "public"."child_profile_invites" add constraint "child_profile_invites_pkey" PRIMARY KEY using index "child_profile_invites_pkey";

alter table "public"."child_profiles" add constraint "child_profiles_pkey" PRIMARY KEY using index "child_profiles_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."material_inventory" add constraint "material_inventory_pkey" PRIMARY KEY using index "material_inventory_pkey";

alter table "public"."material_pricing" add constraint "material_pricing_pkey" PRIMARY KEY using index "material_pricing_pkey";

alter table "public"."material_reservations" add constraint "material_reservations_pkey1" PRIMARY KEY using index "material_reservations_pkey1";

alter table "public"."material_types" add constraint "material_types_pkey" PRIMARY KEY using index "material_types_pkey";

alter table "public"."materials" add constraint "materials_pkey" PRIMARY KEY using index "materials_pkey";

alter table "public"."mutation_idempotency" add constraint "mutation_idempotency_pkey" PRIMARY KEY using index "mutation_idempotency_pkey";

alter table "public"."news_posts" add constraint "news_posts_pkey" PRIMARY KEY using index "news_posts_pkey";

alter table "public"."notification_outbox" add constraint "notification_outbox_pkey" PRIMARY KEY using index "notification_outbox_pkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY using index "notification_preferences_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."parent_child_relations" add constraint "parent_child_relations_pkey" PRIMARY KEY using index "parent_child_relations_pkey";

alter table "public"."processed_events" add constraint "processed_events_pkey" PRIMARY KEY using index "processed_events_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY using index "push_subscriptions_pkey";

alter table "public"."report_images" add constraint "report_images_pkey" PRIMARY KEY using index "report_images_pkey";

alter table "public"."resource_bookings" add constraint "resource_bookings_pkey" PRIMARY KEY using index "resource_bookings_pkey";

alter table "public"."resources" add constraint "resources_pkey" PRIMARY KEY using index "resources_pkey";

alter table "public"."tour_categorys" add constraint "tour_categorys_pkey" PRIMARY KEY using index "tour_categorys_pkey";

alter table "public"."tour_groups" add constraint "tour_groups_pkey" PRIMARY KEY using index "tour_groups_pkey";

alter table "public"."tour_guides" add constraint "tour_guides_pkey" PRIMARY KEY using index "tour_guides_pkey";

alter table "public"."tour_material_requirements" add constraint "tour_material_requirements_pkey" PRIMARY KEY using index "tour_material_requirements_pkey";

alter table "public"."tour_materials" add constraint "tour_materials_pkey" PRIMARY KEY using index "tour_materials_pkey";

alter table "public"."tour_participants" add constraint "tour_participants_pkey" PRIMARY KEY using index "tour_participants_pkey";

alter table "public"."tour_reports" add constraint "tour_reports_pkey" PRIMARY KEY using index "tour_reports_pkey";

alter table "public"."tours" add constraint "tours_pkey" PRIMARY KEY using index "tours_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_actor_id_fkey";

alter table "public"."child_notification_preferences" add constraint "child_notification_preferences_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."child_notification_preferences" validate constraint "child_notification_preferences_child_id_fkey";

alter table "public"."child_notification_preferences" add constraint "child_notification_preferences_child_id_key" UNIQUE using index "child_notification_preferences_child_id_key";

alter table "public"."child_notification_preferences" add constraint "child_notification_preferences_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."child_notification_preferences" validate constraint "child_notification_preferences_parent_id_fkey";

alter table "public"."child_profile_invites" add constraint "child_profile_invites_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."child_profile_invites" validate constraint "child_profile_invites_child_id_fkey";

alter table "public"."child_profile_invites" add constraint "child_profile_invites_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."child_profile_invites" validate constraint "child_profile_invites_created_by_fkey";

alter table "public"."child_profiles" add constraint "child_profiles_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."child_profiles" validate constraint "child_profiles_parent_id_fkey";

alter table "public"."material_inventory" add constraint "material_inventory_material_type_id_fkey" FOREIGN KEY (material_type_id) REFERENCES public.material_types(id) not valid;

alter table "public"."material_inventory" validate constraint "material_inventory_material_type_id_fkey";

alter table "public"."material_pricing" add constraint "material_pricing_material_type_id_fkey" FOREIGN KEY (material_type_id) REFERENCES public.material_types(id) not valid;

alter table "public"."material_pricing" validate constraint "material_pricing_material_type_id_fkey";

alter table "public"."material_reservations" add constraint "ck_material_reservation_status" CHECK ((status = ANY (ARRAY['requested'::text, 'reserved'::text, 'on loan'::text, 'returned'::text, 'cancelled'::text]))) not valid;

alter table "public"."material_reservations" validate constraint "ck_material_reservation_status";

alter table "public"."material_reservations" add constraint "material_reservations_child_profile_id_fkey" FOREIGN KEY (child_profile_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."material_reservations" validate constraint "material_reservations_child_profile_id_fkey";

alter table "public"."material_reservations" add constraint "material_reservations_material_inventory_id_fkey" FOREIGN KEY (material_inventory_id) REFERENCES public.material_inventory(id) not valid;

alter table "public"."material_reservations" validate constraint "material_reservations_material_inventory_id_fkey";

alter table "public"."material_reservations" add constraint "material_reservations_tour_id_fkey" FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE not valid;

alter table "public"."material_reservations" validate constraint "material_reservations_tour_id_fkey";

alter table "public"."material_reservations" add constraint "material_reservations_user_id_fkey1" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."material_reservations" validate constraint "material_reservations_user_id_fkey1";

alter table "public"."news_posts" add constraint "news_posts_published_by_fkey" FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."news_posts" validate constraint "news_posts_published_by_fkey";

alter table "public"."notification_outbox" add constraint "notification_outbox_aggregate_id_fkey" FOREIGN KEY (aggregate_id) REFERENCES public.notifications(id) ON DELETE CASCADE not valid;

alter table "public"."notification_outbox" validate constraint "notification_outbox_aggregate_id_fkey";

alter table "public"."notification_outbox" add constraint "notification_outbox_event_key_key" UNIQUE using index "notification_outbox_event_key_key";

alter table "public"."notification_outbox" add constraint "notification_outbox_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text]))) not valid;

alter table "public"."notification_outbox" validate constraint "notification_outbox_status_check";

alter table "public"."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_user_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_user_id_key" UNIQUE using index "notification_preferences_user_id_key";

alter table "public"."notifications" add constraint "notifications_exactly_one_target" CHECK (((
CASE
    WHEN (recipient_user_id IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (recipient_child_id IS NOT NULL) THEN 1
    ELSE 0
END) = 1)) not valid;

alter table "public"."notifications" validate constraint "notifications_exactly_one_target";

alter table "public"."notifications" add constraint "notifications_news_post_id_fkey" FOREIGN KEY (news_post_id) REFERENCES public.news_posts(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_news_post_id_fkey";

alter table "public"."notifications" add constraint "notifications_recipient_child_id_fkey" FOREIGN KEY (recipient_child_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_recipient_child_id_fkey";

alter table "public"."notifications" add constraint "notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_recipient_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_related_group_id_fkey" FOREIGN KEY (related_group_id) REFERENCES public.tour_groups(id) ON DELETE SET NULL not valid;

alter table "public"."notifications" validate constraint "notifications_related_group_id_fkey";

alter table "public"."notifications" add constraint "notifications_related_tour_id_fkey" FOREIGN KEY (related_tour_id) REFERENCES public.tours(id) ON DELETE SET NULL not valid;

alter table "public"."notifications" validate constraint "notifications_related_tour_id_fkey";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['news'::text, 'tour_new'::text, 'tour_update'::text, 'registration'::text, 'waitlist'::text, 'material'::text, 'comment'::text, 'system'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."parent_child_relations" add constraint "parent_child_relations_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."parent_child_relations" validate constraint "parent_child_relations_child_id_fkey";

alter table "public"."parent_child_relations" add constraint "parent_child_relations_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."parent_child_relations" validate constraint "parent_child_relations_parent_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_membership_number_key" UNIQUE using index "profiles_membership_number_key";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_endpoint_key" UNIQUE using index "push_subscriptions_endpoint_key";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."push_subscriptions" validate constraint "push_subscriptions_user_id_fkey";

alter table "public"."report_images" add constraint "report_images_report_id_fkey" FOREIGN KEY (report_id) REFERENCES public.tour_reports(id) ON DELETE CASCADE not valid;

alter table "public"."report_images" validate constraint "report_images_report_id_fkey";

alter table "public"."resource_bookings" add constraint "ck_resource_booking_status" CHECK ((status = ANY (ARRAY['booked'::text, 'released'::text, 'requested'::text]))) not valid;

alter table "public"."resource_bookings" validate constraint "ck_resource_booking_status";

alter table "public"."resource_bookings" add constraint "exclude_resource_time_overlap" EXCLUDE USING gist (resource_id WITH =, tstzrange(start_date, end_date, '[]'::text) WITH &&) WHERE ((status <> 'released'::text));

alter table "public"."resource_bookings" add constraint "resource_bookings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."resource_bookings" validate constraint "resource_bookings_created_by_fkey";

alter table "public"."resource_bookings" add constraint "resource_bookings_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES public.resources(id) not valid;

alter table "public"."resource_bookings" validate constraint "resource_bookings_resource_id_fkey";

alter table "public"."resource_bookings" add constraint "resource_bookings_tour_id_fkey" FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE not valid;

alter table "public"."resource_bookings" validate constraint "resource_bookings_tour_id_fkey";

alter table "public"."tour_guides" add constraint "tour_guides_tour_id_fkey" FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE not valid;

alter table "public"."tour_guides" validate constraint "tour_guides_tour_id_fkey";

alter table "public"."tour_guides" add constraint "tour_guides_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."tour_guides" validate constraint "tour_guides_user_id_fkey";

alter table "public"."tour_material_requirements" add constraint "tour_material_requirements_material_type_id_fkey" FOREIGN KEY (material_type_id) REFERENCES public.material_types(id) not valid;

alter table "public"."tour_material_requirements" validate constraint "tour_material_requirements_material_type_id_fkey";

alter table "public"."tour_material_requirements" add constraint "tour_material_requirements_tour_id_fkey" FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE not valid;

alter table "public"."tour_material_requirements" validate constraint "tour_material_requirements_tour_id_fkey";

alter table "public"."tour_materials" add constraint "tour_materials_material_id_fkey" FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE not valid;

alter table "public"."tour_materials" validate constraint "tour_materials_material_id_fkey";

alter table "public"."tour_materials" add constraint "tour_materials_tour_id_fkey" FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE not valid;

alter table "public"."tour_materials" validate constraint "tour_materials_tour_id_fkey";

alter table "public"."tour_participants" add constraint "tour_participants_child_profile_id_fkey" FOREIGN KEY (child_profile_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."tour_participants" validate constraint "tour_participants_child_profile_id_fkey";

alter table "public"."tour_participants" add constraint "tour_participants_tour_id_fkey" FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE not valid;

alter table "public"."tour_participants" validate constraint "tour_participants_tour_id_fkey";

alter table "public"."tour_participants" add constraint "tour_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."tour_participants" validate constraint "tour_participants_user_id_fkey";

alter table "public"."tour_participants" add constraint "unique_participant" UNIQUE using index "unique_participant";

alter table "public"."tour_reports" add constraint "tour_reports_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."tour_reports" validate constraint "tour_reports_created_by_fkey";

alter table "public"."tour_reports" add constraint "tour_reports_tour_id_fkey" FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE not valid;

alter table "public"."tour_reports" validate constraint "tour_reports_tour_id_fkey";

alter table "public"."tour_reports" add constraint "ux_tour_reports_one_per_tour" UNIQUE using index "ux_tour_reports_one_per_tour";

alter table "public"."tours" add constraint "check_registration_deadline" CHECK (((registration_deadline IS NULL) OR (registration_deadline <= start_date))) not valid;

alter table "public"."tours" validate constraint "check_registration_deadline";

alter table "public"."tours" add constraint "ck_tour_capacity" CHECK (((max_participants IS NULL) OR (max_participants > 0))) not valid;

alter table "public"."tours" validate constraint "ck_tour_capacity";

alter table "public"."tours" add constraint "tours_category_fkey" FOREIGN KEY (category) REFERENCES public.tour_categorys(id) not valid;

alter table "public"."tours" validate constraint "tours_category_fkey";

alter table "public"."tours" add constraint "tours_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."tours" validate constraint "tours_created_by_fkey";

alter table "public"."tours" add constraint "tours_group_fkey" FOREIGN KEY ("group") REFERENCES public.tour_groups(id) not valid;

alter table "public"."tours" validate constraint "tours_group_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.apply_material_reservation_transition_atomic(p_reservation_id uuid, p_expected_status text, p_new_status text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.apply_material_reservation_transition_atomic(
    p_reservation_id,
    p_expected_status,
    p_new_status,
    NULL
  );
$function$
;

CREATE OR REPLACE FUNCTION public.apply_material_reservation_transition_atomic(p_reservation_id uuid, p_expected_status text, p_new_status text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_res RECORD;
  v_inventory RECORD;
  v_delta INTEGER := 0;
  v_qty INTEGER := 1;
  v_cached_response JSONB;
  v_result JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    SELECT response
    INTO v_cached_response
    FROM public.mutation_idempotency
    WHERE scope = 'material_reservation_transition'
      AND idempotency_key = p_idempotency_key;

    IF v_cached_response IS NOT NULL THEN
      RETURN v_cached_response;
    END IF;
  END IF;

  IF p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'p_reservation_id is required';
  END IF;

  SELECT id, status, quantity, tour_id, user_id, child_profile_id, material_inventory_id
  INTO v_res
  FROM public.material_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res IS NULL THEN
    RAISE EXCEPTION 'Reservation not found' USING ERRCODE = '02000';
  END IF;

  IF COALESCE(v_res.status, 'requested') IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'Reservation status changed concurrently' USING ERRCODE = '40001';
  END IF;

  v_qty := GREATEST(COALESCE(v_res.quantity, 1), 1);

  IF p_expected_status = 'requested' AND p_new_status = 'reserved' THEN
    v_delta := -v_qty;
  ELSIF p_expected_status IN ('reserved', 'on loan') AND p_new_status IN ('returned', 'cancelled') THEN
    v_delta := v_qty;
  END IF;

  IF v_delta <> 0 THEN
    SELECT id, quantity_available
    INTO v_inventory
    FROM public.material_inventory
    WHERE id = v_res.material_inventory_id
    FOR UPDATE;

    IF v_inventory IS NULL THEN
      RAISE EXCEPTION 'Material inventory not found' USING ERRCODE = '02000';
    END IF;

    IF v_inventory.quantity_available + v_delta < 0 THEN
      RAISE EXCEPTION 'Insufficient inventory' USING ERRCODE = '08000';
    END IF;

    UPDATE public.material_inventory
    SET quantity_available = quantity_available + v_delta
    WHERE id = v_res.material_inventory_id;
  END IF;

  UPDATE public.material_reservations
  SET status = p_new_status
  WHERE id = p_reservation_id;

  v_result := jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'tour_id', v_res.tour_id,
    'user_id', v_res.user_id,
    'child_profile_id', v_res.child_profile_id,
    'old_status', p_expected_status,
    'new_status', p_new_status,
    'inventory_delta', v_delta
  );

  PERFORM public.store_mutation_idempotency_response(
    'material_reservation_transition',
    p_idempotency_key,
    v_result
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_participant_status_transition_atomic(p_registration_id uuid, p_expected_status public.participant_status, p_new_status public.participant_status)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_reg RECORD;
  v_promotion JSONB;
  v_promoted_count INTEGER := 0;
BEGIN
  IF p_registration_id IS NULL THEN
    RAISE EXCEPTION 'p_registration_id is required';
  END IF;

  SELECT id, tour_id, user_id, child_profile_id, status
  INTO v_reg
  FROM public.tour_participants
  WHERE id = p_registration_id
  FOR UPDATE;

  IF v_reg IS NULL THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = '02000';
  END IF;

  IF v_reg.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'Registration status changed concurrently' USING ERRCODE = '40001';
  END IF;

  IF v_reg.status IS DISTINCT FROM p_new_status THEN
    UPDATE public.tour_participants
    SET status = p_new_status
    WHERE id = p_registration_id;
  END IF;

  -- Keep waitlist promotion and status sync in the same transaction boundary.
  IF p_new_status = 'cancelled'::public.participant_status
     AND p_expected_status IN ('pending'::public.participant_status, 'confirmed'::public.participant_status) THEN
    SELECT public.promote_first_waitlist(v_reg.tour_id) INTO v_promotion;
    v_promoted_count := COALESCE((v_promotion->>'promoted_count')::INTEGER, 0);
  ELSE
    PERFORM public.sync_tour_status_explicit(v_reg.tour_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tour_id', v_reg.tour_id,
    'participant_user_id', v_reg.user_id,
    'participant_child_id', v_reg.child_profile_id,
    'old_status', p_expected_status,
    'new_status', p_new_status,
    'promoted_count', v_promoted_count,
    'promoted_user_id', CASE WHEN v_promoted_count > 0 THEN v_promotion->>'promoted_user_id' ELSE NULL END,
    'promoted_child_id', CASE WHEN v_promoted_count > 0 THEN v_promotion->>'promoted_child_id' ELSE NULL END
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_participant_status_transition_atomic(p_registration_id uuid, p_expected_status public.participant_status, p_new_status public.participant_status, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_reg record;
  v_promotion jsonb;
  v_promoted_count integer := 0;
  v_cached_response jsonb;
  v_result jsonb;
begin
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select response
      into v_cached_response
      from public.mutation_idempotency
     where scope = 'participant_status_transition'
       and idempotency_key = p_idempotency_key;

    if v_cached_response is not null then
      return v_cached_response;
    end if;
  end if;

  if p_registration_id is null then
    raise exception 'p_registration_id is required';
  end if;

  select id, tour_id, user_id, child_profile_id, status
    into v_reg
    from public.tour_participants
   where id = p_registration_id
   for update;

  if v_reg is null then
    raise exception 'Registration not found' using errcode = '02000';
  end if;

  if v_reg.status is distinct from p_expected_status then
    raise exception 'Registration status changed concurrently' using errcode = '40001';
  end if;

  if v_reg.status is distinct from p_new_status then
    update public.tour_participants
       set status = p_new_status
     where id = p_registration_id;
  end if;

  if p_new_status = 'cancelled'::public.participant_status
     and p_expected_status in ('pending'::public.participant_status, 'confirmed'::public.participant_status) then
    select public.promote_first_waitlist(v_reg.tour_id) into v_promotion;
    v_promoted_count := coalesce((v_promotion->>'promoted_count')::integer, 0);
  else
    perform public.sync_tour_status_explicit(v_reg.tour_id);
  end if;

  v_result := jsonb_build_object(
    'success', true,
    'tour_id', v_reg.tour_id,
    'participant_user_id', v_reg.user_id,
    'participant_child_id', v_reg.child_profile_id,
    'old_status', p_expected_status,
    'new_status', p_new_status,
    'promoted_count', v_promoted_count,
    'promoted_user_id', case when v_promoted_count > 0 then v_promotion->>'promoted_user_id' else null end,
    'promoted_child_id', case when v_promoted_count > 0 then v_promotion->>'promoted_child_id' else null end
  );

  perform public.store_mutation_idempotency_response(
    'participant_status_transition',
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    next_pos integer;
begin

    if new.status = 'waitlist' then

        select coalesce(max(waitlist_position),0)+1
        into next_pos
        from tour_participants
        where tour_id = new.tour_id
        and status = 'waitlist';

        new.waitlist_position := next_pos;

    end if;

    return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_participant_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_logs (entity_type, entity_id, action, old_payload, new_payload, actor_id)
        VALUES (
            'tour_participant',
            NEW.id,
            'status_changed',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_tour_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_logs (entity_type, entity_id, action, old_payload, new_payload, actor_id)
        VALUES (
            'tour',
            NEW.id,
            'status_changed',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.book_resource_for_tour_atomic(p_resource_id uuid, p_tour_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_conflicts INTEGER;
  v_booking_id UUID;
  v_existing_booking UUID;
BEGIN
  -- Validate inputs
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'start_date must be <= end_date' USING ERRCODE = '22000';
  END IF;

  -- Check for active conflicts (proper temporal logic)
  SELECT COUNT(*)
  INTO v_conflicts
  FROM resource_bookings
  WHERE resource_id = p_resource_id
    AND tour_id <> p_tour_id
    AND status != 'released'
    AND NOT (start_date > p_end_date OR end_date < p_start_date);

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION 'Resource already booked in this time range'
      USING ERRCODE = '08000';
  END IF;

  -- Check if booking already exists for this tour + resource
  SELECT id
  INTO v_existing_booking
  FROM resource_bookings
  WHERE resource_id = p_resource_id
    AND tour_id = p_tour_id
  LIMIT 1;

  -- Upsert booking
  IF v_existing_booking IS NOT NULL THEN
    UPDATE resource_bookings
    SET start_date = p_start_date,
        end_date = p_end_date,
        status = 'booked'
    WHERE id = v_existing_booking
    RETURNING id INTO v_booking_id;
  ELSE
    INSERT INTO resource_bookings (
      resource_id, tour_id, start_date, end_date,
      status, created_by, created_at
    ) VALUES (
      p_resource_id, p_tour_id, p_start_date, p_end_date,
      'booked', p_user_id, NOW()
    ) RETURNING id INTO v_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'resource_id', p_resource_id,
    'tour_id', p_tour_id,
    'start_date', p_start_date,
    'end_date', p_end_date
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_tour(tour_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT 
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) 
    OR EXISTS (
      SELECT 1 FROM public.tour_guides WHERE tour_id = tour_uuid AND user_id = auth.uid()
    );
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_expired_waitlist_promotions(p_tour_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_expired RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_expired IN 
    SELECT id, tour_id 
    FROM public.tour_participants
    WHERE status = 'pending_confirmation'::public.participant_status
      AND waitlist_promoted_at < NOW() - INTERVAL '24 hours'
      AND (p_tour_id IS NULL OR tour_id = p_tour_id)
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Cancel the registration
    UPDATE public.tour_participants
    SET status = 'cancelled'::public.participant_status
    WHERE id = v_expired.id;
    
    v_count := v_count + 1;
    
    -- Attempt to promote the next person!
    PERFORM public.promote_first_waitlist(v_expired.tour_id);
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'cancelled_count', v_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_own_private_material_reservation_atomic(p_reservation_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_res RECORD;
  v_inventory RECORD;
  v_qty INTEGER := 1;
BEGIN
  IF p_reservation_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_reservation_id and p_user_id are required';
  END IF;

  SELECT id, user_id, tour_id, status, quantity, material_inventory_id
  INTO v_res
  FROM public.material_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res IS NULL THEN
    RAISE EXCEPTION 'Reservation not found' USING ERRCODE = '02000';
  END IF;

  IF v_res.user_id IS DISTINCT FROM p_user_id OR v_res.tour_id IS NOT NULL THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_res.status IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'Reservation cannot be cancelled' USING ERRCODE = '23514';
  END IF;

  v_qty := GREATEST(COALESCE(v_res.quantity, 1), 1);

  IF v_res.status IN ('reserved', 'on loan') THEN
    SELECT id, quantity_available
    INTO v_inventory
    FROM public.material_inventory
    WHERE id = v_res.material_inventory_id
    FOR UPDATE;

    IF v_inventory IS NULL THEN
      RAISE EXCEPTION 'Material inventory not found' USING ERRCODE = '02000';
    END IF;

    UPDATE public.material_inventory
    SET quantity_available = quantity_available + v_qty
    WHERE id = v_res.material_inventory_id;
  END IF;

  UPDATE public.material_reservations
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'old_status', v_res.status,
    'new_status', 'cancelled'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_material_availability()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    total_reserved integer;
    max_available integer;
begin

    select coalesce(sum(quantity),0)
    into total_reserved
    from material_reservations
    where material_id = new.material_id
    and tour_id = new.tour_id;

    select total_quantity
    into max_available
    from materials
    where id = new.material_id;

    if (total_reserved + new.quantity) > max_available then
        raise exception 'Material not available in requested quantity';
    end if;

    return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_tour_report_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (SELECT status FROM tours WHERE id = NEW.tour_id) != 'completed' THEN
    RAISE EXCEPTION 'Reports can only be created for completed tours' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_waitlist_promotion(p_participant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_participant RECORD;
  v_tour RECORD;
BEGIN
  -- 1. Fetch participant with lock
  SELECT *
  INTO v_participant
  FROM public.tour_participants
  WHERE id = p_participant_id
  FOR UPDATE;

  IF v_participant IS NULL THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = '02000';
  END IF;

  -- Ensure they own it
  IF v_participant.user_id != auth.uid() THEN
    -- Check if parent
    IF v_participant.child_profile_id IS NOT NULL THEN
      IF NOT public.is_parent_of_child(v_participant.child_profile_id) THEN
        RAISE EXCEPTION 'Not authorized' USING ERRCODE = 'P0001';
      END IF;
    ELSE
      RAISE EXCEPTION 'Not authorized' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_participant.status != 'pending_confirmation'::public.participant_status THEN
    RAISE EXCEPTION 'Cannot confirm this status' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Check expiration just in case
  IF v_participant.waitlist_promoted_at < NOW() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Confirmation expired' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Confirm them
  UPDATE public.tour_participants
  SET status = 'confirmed'::public.participant_status,
      waitlist_promoted_at = NULL
  WHERE id = p_participant_id;

  -- Sync tour just in case
  PERFORM public.sync_tour_status_explicit(v_participant.tour_id);

  RETURN jsonb_build_object('success', true, 'participant_id', p_participant_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS public.user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'member'::public.user_role)
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_notification_created_event(p_notification_id uuid, p_event_key text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_event_key TEXT;
  v_outbox_id BIGINT;
BEGIN
  IF p_notification_id IS NULL THEN
    RAISE EXCEPTION 'p_notification_id is required' USING ERRCODE = '22004';
  END IF;

  v_event_key := COALESCE(
    NULLIF(TRIM(p_event_key), ''),
    FORMAT('notification:%s:created:v1', p_notification_id)
  );

  INSERT INTO public.notification_outbox (
    event_key,
    aggregate_type,
    aggregate_id,
    event_type,
    event_version,
    payload,
    status,
    available_at
  ) VALUES (
    v_event_key,
    'notification',
    p_notification_id,
    'notification.created',
    1,
    COALESCE(p_payload, '{}'::jsonb),
    'pending',
    NOW()
  )
  ON CONFLICT (event_key) DO NOTHING
  RETURNING id INTO v_outbox_id;

  RETURN v_outbox_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_tour_participant_counts(p_tour_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(tour_id uuid, confirmed_count integer, pending_count integer, active_count integer, waitlist_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    tp.tour_id,
    COUNT(*) FILTER (
      WHERE tp.status = 'confirmed'::public.participant_status
    )::INTEGER AS confirmed_count,
    COUNT(*) FILTER (
      WHERE tp.status = 'pending'::public.participant_status
    )::INTEGER AS pending_count,
    COUNT(*) FILTER (
      WHERE tp.status IN (
        'pending'::public.participant_status,
        'confirmed'::public.participant_status
      )
    )::INTEGER AS active_count,
    COUNT(*) FILTER (
      WHERE tp.status = 'waitlist'::public.participant_status
    )::INTEGER AS waitlist_count
  FROM public.tour_participants tp
  WHERE p_tour_ids IS NULL OR tp.tour_id = ANY(p_tour_ids)
  GROUP BY tp.tour_id;
$function$
;

CREATE OR REPLACE FUNCTION public.guide_can_see_child(child_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.tour_participants tp
    join public.tour_guides tg on tg.tour_id = tp.tour_id
    where tp.child_profile_id = child_uuid
      and tg.user_id = auth.uid()
  )
  or (
    select coalesce(
      (select true from public.profiles pa
       where pa.id = auth.uid() and pa.role = 'admin'),
      false
    )
  )
$function$
;

CREATE OR REPLACE FUNCTION public.handle_user_deletion_anonymize()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    child_rec RECORD;
    parent_count INT;
BEGIN
    -- 1. Profil maskieren
    UPDATE public.profiles
    SET 
        full_name = 'Gel�schter Nutzer',
        phone = NULL,
        birthdate = NULL,
        medical_notes = NULL,
        emergency_phone = NULL,
        image_consent = false,
        role = 'member'::public.user_role
    WHERE id = OLD.id;

    -- 2. Direkte pers�nliche Daten wie Push-Abos oder Notifications l�schen
    DELETE FROM public.push_subscriptions WHERE user_id = OLD.id;
    DELETE FROM public.notification_preferences WHERE user_id = OLD.id;
    DELETE FROM public.notifications WHERE recipient_user_id = OLD.id;

    -- 3. Kinderprofile behandeln
    FOR child_rec IN 
        SELECT child_id FROM public.parent_child_relations WHERE parent_id = OLD.id
    LOOP
        -- Entferne die Bindung dieses Elternteils
        DELETE FROM public.parent_child_relations WHERE parent_id = OLD.id AND child_id = child_rec.child_id;

        -- Pr�fe, ob noch ein Elternteil existiert
        SELECT COUNT(*) INTO parent_count FROM public.parent_child_relations WHERE child_id = child_rec.child_id;

        IF parent_count = 0 THEN
            -- Maskiere das Kind, da kein Elternteil mehr existiert
            UPDATE public.child_profiles
            SET 
                full_name = 'Gel�schtes Kind',
                birthdate = '1900-01-01',
                medical_notes = NULL,
                image_consent = false,
                parent_id = NULL
            WHERE id = child_rec.child_id;

            -- L�sche spezifische Notifications f�r das Kind
            DELETE FROM public.child_notification_preferences WHERE child_id = child_rec.child_id;
        END IF;
    END LOOP;

    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select public.current_user_role() = 'admin'::public.user_role
$function$
;

CREATE OR REPLACE FUNCTION public.is_guide_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select public.current_user_role() in ('guide'::public.user_role, 'admin'::public.user_role)
$function$
;

CREATE OR REPLACE FUNCTION public.is_materialwart_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select public.current_user_role()::text in ('materialwart', 'admin')
$function$
;

CREATE OR REPLACE FUNCTION public.is_parent_of_child(child_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_child_relations
    WHERE child_id = child_uuid AND parent_id = auth.uid()
  ) OR EXISTS (
    -- fallback for ongoing transactions or unmigrated rules
    SELECT 1
    FROM public.child_profiles
    WHERE id = child_uuid AND parent_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.limit_report_images()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    image_count integer;
begin

    select count(*)
    into image_count
    from report_images
    where report_id = new.report_id;

    if image_count >= 20 then
        raise exception 'Maximum 20 images allowed';
    end if;

    return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.process_expired_waitlist_promotions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_participant RECORD;
BEGIN
  -- Find participants who haven't confirmed within 24 hours
  FOR v_participant IN
    SELECT id, tour_id
    FROM tour_participants
    WHERE status = 'pending_confirmation'
      AND waitlist_promoted_at < NOW() - INTERVAL '24 hours'
  LOOP
    -- 1. Cancel the expired participant
    UPDATE tour_participants
    SET status = 'canceled'
    WHERE id = v_participant.id;
    
    -- 2. Promote the next one (this will trigger email notifications)
    PERFORM public.promote_first_waitlist(v_participant.tour_id);
  END LOOP;
END;
$function$
;

create or replace view "public"."profiles_public" as  SELECT id,
    full_name,
    role
   FROM public.profiles p;


CREATE OR REPLACE FUNCTION public.promote_first_waitlist(p_tour_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_first_waitlist RECORD;
  v_promoted_count INTEGER := 0;
  v_tour RECORD;
BEGIN
  -- Lock tour for consistency
  SELECT id, max_participants, status
  INTO v_tour
  FROM tours
  WHERE id = p_tour_id
  FOR UPDATE;

  IF v_tour IS NULL THEN
    RAISE EXCEPTION 'Tour not found';
  END IF;

  -- Fetch first waitlist participant with lock
  SELECT id, user_id, child_profile_id, created_at
  INTO v_first_waitlist
  FROM tour_participants
  WHERE tour_id = p_tour_id
    AND status = 'waitlist'
  ORDER BY waitlist_position ASC, created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_first_waitlist IS NOT NULL THEN
    -- Promote to pending_confirmation
    UPDATE tour_participants
    SET status = 'pending_confirmation'::public.participant_status,
        waitlist_position = NULL,
        waitlist_promoted_at = NOW()
    WHERE id = v_first_waitlist.id;

    v_promoted_count := 1;

    -- Resequence remaining waitlist
    WITH ranked_waitlist AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_pos
      FROM tour_participants
      WHERE tour_id = p_tour_id AND status = 'waitlist'
    )
    UPDATE tour_participants
    SET waitlist_position = ranked_waitlist.new_pos
    FROM ranked_waitlist
    WHERE tour_participants.id = ranked_waitlist.id;
  END IF;

  -- Recalc tour status
  PERFORM public.sync_tour_status_explicit(p_tour_id);

  RETURN jsonb_build_object(
    'success', v_promoted_count > 0,
    'promoted_count', v_promoted_count,
    'promoted_user_id', CASE WHEN v_promoted_count > 0 THEN v_first_waitlist.user_id ELSE NULL END,
    'promoted_child_id', CASE WHEN v_promoted_count > 0 THEN v_first_waitlist.child_profile_id ELSE NULL END,
    'tour_id', p_tour_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_waitlist_user_id UUID;
  v_waitlist_position INT;
BEGIN
  -- Nur wenn Teilnehmer bestätigt wurde
  IF NEW.status = 'confirmed'::public.participant_status AND OLD.status IS DISTINCT FROM NEW.status THEN  -- ✓ FIX: explicit cast + IS DISTINCT FROM
    -- Prüfe Warteliste
    SELECT user_id, position
    INTO v_waitlist_user_id, v_waitlist_position
    FROM public.waitlist
    WHERE tour_id = NEW.tour_id
    ORDER BY position ASC
    LIMIT 1;

    IF v_waitlist_user_id IS NOT NULL THEN
      -- Erste Person von Warteliste bestätigen
      UPDATE public.tour_participants
      SET status = 'confirmed'::public.participant_status  -- ✓ FIX: explicit cast
      WHERE tour_id = NEW.tour_id
        AND user_id = v_waitlist_user_id
        AND status = 'pending'::public.participant_status;  -- ✓ FIX: explicit cast

      -- Von Warteliste entfernen
      DELETE FROM public.waitlist
      WHERE tour_id = NEW.tour_id
        AND user_id = v_waitlist_user_id;

      -- Positionen anpassen
      UPDATE public.waitlist
      SET position = position - 1
      WHERE tour_id = NEW.tour_id
        AND position > v_waitlist_position;
    END IF;
  END IF;

  -- Status synchronisieren
  PERFORM public.sync_tour_status_explicit(NEW.tour_id);

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.promote_waitlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    next_participant uuid;
begin

    if new.status = 'cancelled' then

        select id
        into next_participant
        from tour_participants
        where tour_id = new.tour_id
        and status = 'waitlist'
        order by waitlist_position asc
        limit 1;

        if next_participant is not null then

            update tour_participants
            set status = 'pending',
                waitlist_position = null
            where id = next_participant;

        end if;

    end if;

    return new;

end;
$function$
;

create or replace view "public"."public_profiles" as  SELECT id,
    full_name,
    role
   FROM public.profiles
  WHERE (role = ANY (ARRAY['guide'::public.user_role, 'admin'::public.user_role]));


CREATE OR REPLACE FUNCTION public.redeem_child_invite(p_code uuid, p_birthdate date, p_timestamp timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_child_id uuid;
    v_actual_birthdate date;
    v_expires_at timestamp with time zone;
    v_already_linked boolean;
BEGIN
    -- 1. Get the invite info
    SELECT child_id, expires_at INTO v_child_id, v_expires_at
    FROM public.child_profile_invites
    WHERE code = p_code;

    IF v_child_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CODE');
    END IF;

    IF v_expires_at < p_timestamp THEN
        RETURN jsonb_build_object('success', false, 'error', 'EXPIRED_CODE');
    END IF;

    -- 2. Verify birthdate (2nd factor)
    SELECT birthdate INTO v_actual_birthdate
    FROM public.child_profiles
    WHERE id = v_child_id;

    IF v_actual_birthdate != p_birthdate THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_BIRTHDATE');
    END IF;

    -- 3. Check if already linked
    SELECT EXISTS (
        SELECT 1 FROM public.parent_child_relations
        WHERE child_id = v_child_id AND parent_id = auth.uid()
    ) INTO v_already_linked;

    IF v_already_linked THEN
         -- Clean up the code
         DELETE FROM public.child_profile_invites WHERE code = p_code;
         RETURN jsonb_build_object('success', true, 'message', 'ALREADY_LINKED');
    END IF;

    -- 4. Create linkage
    INSERT INTO public.parent_child_relations (parent_id, child_id)
    VALUES (auth.uid(), v_child_id);

    -- 5. Delete code after successful single-use redemption
    DELETE FROM public.child_profile_invites WHERE code = p_code;

    RETURN jsonb_build_object('success', true, 'message', 'LINKED_SUCCESSFULLY');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_for_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_id uuid, p_materials jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.register_for_tour_atomic(
    p_tour_id,
    p_user_id,
    p_child_id,
    p_materials,
    NULL
  );
$function$
;

CREATE OR REPLACE FUNCTION public.register_for_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_id uuid, p_materials jsonb DEFAULT NULL::jsonb, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tour RECORD;
  v_confirmed_count INTEGER;
  v_participant_id UUID;
  v_status public.participant_status;
  v_waitlist_pos INTEGER := NULL;
  v_material JSONB;
  v_materials JSONB := '[]'::jsonb;
  v_inventory RECORD;
  v_res_id UUID;
  v_cached_response JSONB;
  v_result JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    SELECT response
    INTO v_cached_response
    FROM public.mutation_idempotency
    WHERE scope = 'register_for_tour'
      AND idempotency_key = p_idempotency_key;

    IF v_cached_response IS NOT NULL THEN
      RETURN jsonb_set(v_cached_response, '{idempotency_replayed}', 'true'::jsonb, true);
    END IF;
  END IF;

  PERFORM 1
  FROM public.tour_participants
  WHERE tour_id = p_tour_id
    AND user_id = p_user_id
    AND (
      (p_child_id IS NULL AND child_profile_id IS NULL)
      OR (p_child_id IS NOT NULL AND child_profile_id = p_child_id)
    )
    AND status IN (
      'pending'::public.participant_status,
      'confirmed'::public.participant_status,
      'waitlist'::public.participant_status,
      'pending_confirmation'::public.participant_status
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Already registered for this tour' USING ERRCODE = '23505';
  END IF;

  SELECT id, max_participants, status, created_by
  INTO v_tour
  FROM public.tours
  WHERE id = p_tour_id
  FOR UPDATE;

  IF v_tour IS NULL THEN
    RAISE EXCEPTION 'Tour not found' USING ERRCODE = '02000';
  END IF;

  SELECT COUNT(*)
  INTO v_confirmed_count
  FROM public.tour_participants
  WHERE tour_id = p_tour_id
    AND status IN (
      'confirmed'::public.participant_status,
      'pending'::public.participant_status,
      'pending_confirmation'::public.participant_status
    );

  IF v_tour.max_participants IS NOT NULL
     AND v_confirmed_count >= v_tour.max_participants THEN
    v_status := 'waitlist'::public.participant_status;

    SELECT COALESCE(MAX(waitlist_position), 0) + 1
    INTO v_waitlist_pos
    FROM public.tour_participants
    WHERE tour_id = p_tour_id
      AND status = 'waitlist'::public.participant_status;
  ELSE
    v_status := 'pending'::public.participant_status;
  END IF;

  INSERT INTO public.tour_participants (
    tour_id, user_id, child_profile_id, status, waitlist_position, created_at
  ) VALUES (
    p_tour_id, p_user_id, p_child_id, v_status, v_waitlist_pos, NOW()
  ) RETURNING id INTO v_participant_id;

  IF p_materials IS NULL THEN
    v_materials := '[]'::jsonb;
  ELSIF jsonb_typeof(p_materials) = 'array' THEN
    v_materials := p_materials;
  ELSIF jsonb_typeof(p_materials) = 'string' THEN
    BEGIN
      v_materials := COALESCE((p_materials #>> '{}')::jsonb, '[]'::jsonb);
    EXCEPTION
      WHEN others THEN
        DELETE FROM public.tour_participants WHERE id = v_participant_id;
        RAISE EXCEPTION 'Invalid materials payload format' USING ERRCODE = '22023';
    END;

    IF jsonb_typeof(v_materials) <> 'array' THEN
      DELETE FROM public.tour_participants WHERE id = v_participant_id;
      RAISE EXCEPTION 'Invalid materials payload format' USING ERRCODE = '22023';
    END IF;
  ELSE
    DELETE FROM public.tour_participants WHERE id = v_participant_id;
    RAISE EXCEPTION 'Invalid materials payload format' USING ERRCODE = '22023';
  END IF;

  FOR v_material IN SELECT value FROM jsonb_array_elements(v_materials) AS t(value)
  LOOP
    SELECT id, quantity_available
    INTO v_inventory
    FROM public.material_inventory
    WHERE id = (v_material->>'material_inventory_id')::UUID
      AND quantity_available > 0
    FOR UPDATE;

    IF v_inventory IS NULL THEN
      DELETE FROM public.tour_participants WHERE id = v_participant_id;
      RAISE EXCEPTION 'Material not available: %', v_material->>'material_type_id'
        USING ERRCODE = '08000';
    END IF;

    INSERT INTO public.material_reservations (
      tour_id,
      material_inventory_id,
      user_id,
      child_profile_id,
      quantity,
      status,
      loan_date,
      return_date,
      created_at
    ) VALUES (
      p_tour_id,
      (v_material->>'material_inventory_id')::UUID,
      p_user_id,
      p_child_id,
      COALESCE(NULLIF(v_material->>'quantity', '')::INTEGER, 1),
      'reserved',
      (SELECT start_date FROM public.tours WHERE id = p_tour_id),
      (SELECT end_date FROM public.tours WHERE id = p_tour_id),
      NOW()
    )
    RETURNING id INTO v_res_id;

    UPDATE public.material_inventory
    SET quantity_available = quantity_available - COALESCE(NULLIF(v_material->>'quantity', '')::INTEGER, 1)
    WHERE id = (v_material->>'material_inventory_id')::UUID;
  END LOOP;

  IF v_tour.max_participants IS NOT NULL
     AND v_confirmed_count + 1 >= v_tour.max_participants
     AND v_tour.status IS DISTINCT FROM 'full'::public.tour_status THEN
    UPDATE public.tours
    SET status = 'full'::public.tour_status
    WHERE id = p_tour_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'participant_id', v_participant_id,
    'status', v_status,
    'waitlist_position', v_waitlist_pos,
    'tour_id', p_tour_id,
    'idempotency_replayed', false
  );

  PERFORM public.store_mutation_idempotency_response(
    'register_for_tour',
    p_idempotency_key,
    v_result
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_profile_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(registration_id uuid, status public.participant_status, is_waitlisted boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tour_id UUID;
  v_user_id UUID;
  v_child_profile_id UUID;
  v_max_participants INT;
  v_confirmed_count INT;
  v_tour_status public.tour_status;
  v_registration_id UUID;
  v_is_waitlisted BOOLEAN;
  v_min_age INT;
  v_birthdate DATE;
  v_age INT;
BEGIN
  -- Validierung
  IF p_tour_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_tour_id and p_user_id are required';
  END IF;

  -- Tour-Daten laden
  SELECT t.id, t.status, t.max_participants, t.min_age
  INTO v_tour_id, v_tour_status, v_max_participants, v_min_age
  FROM public.tours t
  WHERE t.id = p_tour_id;

  IF v_tour_id IS NULL THEN
    RAISE EXCEPTION 'Tour not found';
  END IF;

  -- Status-Prüfung: Anmeldung offen?
  IF v_tour_status NOT IN ('Anmeldung offen'::public.tour_status, 'Ausgebucht'::public.tour_status) THEN  -- ✓ FIX: explicit cast
    RAISE EXCEPTION 'Tour is not open for registration';
  END IF;

  -- Alter prüfen (wenn Kind-Profil)
  IF p_child_profile_id IS NOT NULL THEN
    SELECT cp.birthdate
    INTO v_birthdate
    FROM public.child_profiles cp
    WHERE cp.id = p_child_profile_id
      AND cp.parent_id = p_user_id;

    IF v_birthdate IS NULL THEN
      RAISE EXCEPTION 'Child profile not found';
    END IF;

    v_age := DATE_PART('year', AGE(v_birthdate))::INT;
    IF v_min_age IS NOT NULL AND v_age < v_min_age THEN
      RAISE EXCEPTION 'Child too young for this tour (min age: %)', v_min_age;
    END IF;
  END IF;

  -- Bestätigte Teilnehmer zählen
  SELECT COUNT(*)
  INTO v_confirmed_count
  FROM public.tour_participants
  WHERE tour_id = p_tour_id
    AND status = 'confirmed'::public.participant_status;  -- ✓ FIX: explicit cast

  -- Warteliste-Status bestimmen
  v_is_waitlisted := (v_confirmed_count >= v_max_participants);

  -- Anmeldung erstellen
  INSERT INTO public.tour_participants (
    tour_id,
    user_id,
    child_profile_id,
    status
  ) VALUES (
    p_tour_id,
    p_user_id,
    p_child_profile_id,
    'pending'::public.participant_status  -- ✓ FIX: explicit cast
  )
  RETURNING id
  INTO v_registration_id;

  -- Wartelisten-Position (wenn nötig)
  IF v_is_waitlisted THEN
    INSERT INTO public.waitlist (tour_id, user_id, position)
    VALUES (p_tour_id, p_user_id, (
      SELECT COALESCE(MAX(position), 0) + 1
      FROM public.waitlist
      WHERE tour_id = p_tour_id
    ));
  END IF;

  -- Status synchronisieren
  PERFORM public.sync_tour_status_explicit(p_tour_id);

  -- Rückgabe
  RETURN QUERY SELECT
    v_registration_id,
    'pending'::public.participant_status,
    v_is_waitlisted,
    CASE
      WHEN v_is_waitlisted THEN 'Added to waitlist'
      ELSE 'Registration pending confirmation'
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.release_resource_booking_atomic(p_booking_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_booking RECORD;
BEGIN
  -- Fetch booking
  SELECT id, tour_id, resource_id
  INTO v_booking
  FROM resource_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = '02000';
  END IF;

  -- Release (set status, don't delete to preserve audit trail)
  UPDATE resource_bookings
  SET status = 'released'
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'resource_id', v_booking.resource_id,
    'tour_id', v_booking.tour_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reserve_material_for_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_id uuid, p_material_inventory_id uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inventory RECORD;
  v_res_id UUID;
BEGIN
  -- Lock inventory row (pessimistic)
  SELECT id, quantity_available, quantity_total, material_type_id
  INTO v_inventory
  FROM material_inventory
  WHERE id = p_material_inventory_id
  FOR UPDATE;

  IF v_inventory IS NULL THEN
    RAISE EXCEPTION 'Material inventory not found' USING ERRCODE = '02000';
  END IF;

  -- Check availability
  IF v_inventory.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory: % available, % requested',
      v_inventory.quantity_available, p_quantity
      USING ERRCODE = '08000';
  END IF;

  -- Insert reservation
  INSERT INTO material_reservations (
    tour_id, material_inventory_id, user_id, child_profile_id,
    quantity, status, loan_date, return_date, created_at
  ) VALUES (
    p_tour_id, p_material_inventory_id, p_user_id, p_child_id,
    p_quantity, 'reserved',
    (SELECT start_date FROM tours WHERE id = p_tour_id),
    (SELECT end_date FROM tours WHERE id = p_tour_id),
    NOW()
  ) RETURNING id INTO v_res_id;

  -- Atomically decrement inventory
  UPDATE material_inventory
  SET quantity_available = quantity_available - p_quantity
  WHERE id = p_material_inventory_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_res_id,
    'material_inventory_id', p_material_inventory_id,
    'quantity', p_quantity,
    'quantity_remaining', v_inventory.quantity_available - p_quantity
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reserve_material_independent_atomic(p_user_id uuid, p_child_id uuid, p_material_inventory_id uuid, p_loan_date date, p_return_date date, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inventory RECORD;
  v_res_id UUID;
BEGIN
  -- Lock inventory
  SELECT id, quantity_available
  INTO v_inventory
  FROM material_inventory
  WHERE id = p_material_inventory_id
  FOR UPDATE;

  IF v_inventory IS NULL THEN
    RAISE EXCEPTION 'Material inventory not found' USING ERRCODE = '02000';
  END IF;

  IF v_inventory.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory: % available, % requested',
      v_inventory.quantity_available, p_quantity
      USING ERRCODE = '08000';
  END IF;

  -- Insert reservation with 'requested' status (awaits approval)
  INSERT INTO material_reservations (
    tour_id, material_inventory_id, user_id, child_profile_id,
    quantity, status, loan_date, return_date, created_at
  ) VALUES (
    NULL, p_material_inventory_id, p_user_id, p_child_id,
    p_quantity, 'requested', p_loan_date, p_return_date, NOW()
  ) RETURNING id INTO v_res_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_res_id,
    'status', 'requested'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_material_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- If deleted, ALWAYS restore inventory
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('requested', 'reserved', 'on loan') THEN
      UPDATE material_inventory
      SET quantity_available = quantity_available + OLD.quantity
      WHERE id = OLD.material_inventory_id;
    END IF;
    RETURN OLD;
  END IF;

  -- If status changed to cancelled or returned
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('requested', 'reserved', 'on loan') AND NEW.status IN ('cancelled', 'returned') THEN
      UPDATE material_inventory
      SET quantity_available = quantity_available + OLD.quantity
      WHERE id = NEW.material_inventory_id;
    -- Conversely, if going from cancelled/returned back to reserved
    ELSIF OLD.status IN ('cancelled', 'returned') AND NEW.status IN ('requested', 'reserved', 'on loan') THEN
      -- Check if there's enough available
      DECLARE
        v_available INTEGER;
      BEGIN
        SELECT quantity_available INTO v_available FROM material_inventory WHERE id = NEW.material_inventory_id;
        IF v_available < NEW.quantity THEN
          RAISE EXCEPTION 'Insufficient inventory to restore reservation: % available, % requested', v_available, NEW.quantity USING ERRCODE = '08000';
        END IF;
        
        UPDATE material_inventory
        SET quantity_available = quantity_available - NEW.quantity
        WHERE id = NEW.material_inventory_id;
      END;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.store_mutation_idempotency_response(p_scope text, p_idempotency_key text, p_response jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    return;
  end if;

  insert into public.mutation_idempotency (scope, idempotency_key, response)
  values (p_scope, p_idempotency_key, p_response)
  on conflict (scope, idempotency_key)
  do nothing;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_tour_status_explicit(p_tour_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tour RECORD;
  v_active_count INTEGER;
  v_target_status public.tour_status;
BEGIN
  SELECT id, max_participants, status
  INTO v_tour
  FROM public.tours
  WHERE id = p_tour_id
  FOR UPDATE;

  IF v_tour IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_active_count
  FROM public.tour_participants
  WHERE tour_id = p_tour_id
    AND status IN (
      'pending'::public.participant_status,
      'confirmed'::public.participant_status
    );

  IF v_tour.status = 'planning'::public.tour_status THEN
    v_target_status := v_tour.status;
  ELSIF v_tour.status = 'completed'::public.tour_status THEN
    v_target_status := v_tour.status;
  ELSIF v_tour.status = 'cancelled'::public.tour_status THEN
    v_target_status := v_tour.status;
  ELSIF v_tour.max_participants IS NOT NULL
    AND v_active_count >= v_tour.max_participants THEN
    v_target_status := 'full'::public.tour_status;
  ELSE
    v_target_status := 'open'::public.tour_status;
  END IF;

  IF v_target_status IS DISTINCT FROM v_tour.status THEN
    UPDATE public.tours
    SET status = v_target_status
    WHERE id = p_tour_id;
  END IF;
END;
$function$
;

create or replace view "public"."system_metrics_outbox" as  SELECT count(*) AS total_events,
    count(*) FILTER (WHERE (status = 'pending'::text)) AS pending_events,
    count(*) FILTER (WHERE (status = 'failed'::text)) AS failed_events,
    avg(EXTRACT(epoch FROM (processed_at - created_at))) FILTER (WHERE (status = 'processed'::text)) AS avg_processing_latency_seconds
   FROM public.notification_outbox;


CREATE OR REPLACE FUNCTION public.tour_optimistic_concurrency_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- If nothing actually changed, just return
  IF OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NEW;
  END IF;

  -- The client MUST provide the old version number to prove they aren't overwriting someone else's unseen changes.
  -- In standard Postgres, NEW.version is the version coming from the UPDATE statement.
  -- If NEW.version = OLD.version, it means the client sent the version they knew about.
  -- BUT we want to fail if the version they sent does NOT match our OLD.version.
  -- How to implement? The client should technically pass our required version in the payload. 
  -- But here on the DB trigger level, we can enforce that:
  -- IF the application explicitly updates the version to OLD.version (or something < OLD.version), we fail it?
  -- Actually, the simpler optimistic locking pattern is:
  -- The API does: UPDATE tours SET ... WHERE id = x AND version = :client_expected_version;
  -- If 0 rows affected -> conflict.
  -- Trigger just bumps the version:
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tour_update_cascade_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- 1) Prevent changing status away from completed if a report exists
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    IF EXISTS (SELECT 1 FROM tour_reports WHERE tour_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot change status of a completed tour that already has a report' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 2) Date changes cascade to resource_bookings and material_reservations
  IF OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN
    
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
      -- Update resource bookings to match new tour dates. 
      -- EXCLUDE constraint exclude_resource_time_overlap will raise exception if a conflict occurs.
      UPDATE resource_bookings
      SET start_date = NEW.start_date::timestamp with time zone,
          end_date = NEW.end_date::timestamp with time zone
      WHERE tour_id = NEW.id
        AND status != 'released';

      -- Update material reservation windows
      UPDATE material_reservations
      SET loan_date = NEW.start_date,
          return_date = NEW.end_date
      WHERE tour_id = NEW.id
        AND status != 'returned' AND status != 'cancelled';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_insert_parent_child_relation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        INSERT INTO public.parent_child_relations (parent_id, child_id)
        VALUES (NEW.parent_id, NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_sync_tour_status_on_participant_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- INSERT has no OLD record; UPDATE should only sync when status actually changed.
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.sync_tour_status_explicit(NEW.tour_id);
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_my_tour_material(p_tour_id uuid, p_child_profile_id uuid, p_materials jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tour RECORD;
  v_participant RECORD;
  v_deadline timestamp with time zone;
  v_old_res RECORD;
  v_new_res JSONB;
BEGIN
  -- 1. Fetch tour and verify deadline
  SELECT * INTO v_tour FROM public.tours WHERE id = p_tour_id FOR SHARE;
  IF v_tour IS NULL THEN
    RAISE EXCEPTION 'Tour not found' USING ERRCODE = '02000';
  END IF;

  v_deadline := COALESCE(v_tour.registration_deadline, v_tour.start_date);
  IF NOW() > v_deadline THEN
    RAISE EXCEPTION 'Material modification deadline passed' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Fetch participant block
  SELECT *
  INTO v_participant
  FROM public.tour_participants
  WHERE tour_id = p_tour_id
    AND user_id = auth.uid()
    AND ((p_child_profile_id IS NULL AND child_profile_id IS NULL)
         OR (p_child_profile_id IS NOT NULL AND child_profile_id = p_child_profile_id))
  FOR UPDATE;

  IF v_participant IS NULL THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = '02000';
  END IF;

  -- 3. Release old reservations explicitly
  FOR v_old_res IN
    SELECT id, material_inventory_id, quantity
    FROM public.material_reservations
    WHERE tour_id = p_tour_id
      AND user_id = auth.uid()
      AND ((p_child_profile_id IS NULL AND child_profile_id IS NULL)
           OR (p_child_profile_id IS NOT NULL AND child_profile_id = p_child_profile_id))
    FOR UPDATE
  LOOP
    -- Increment inventory back
    UPDATE public.material_inventory
    SET quantity_available = quantity_available + v_old_res.quantity
    WHERE id = v_old_res.material_inventory_id;
    
    -- Delete reservation
    DELETE FROM public.material_reservations WHERE id = v_old_res.id;
  END LOOP;

  -- 4. Insert new materials
  IF p_materials IS NOT NULL THEN
    FOR v_new_res IN SELECT * FROM jsonb_array_elements(p_materials)
    LOOP
      -- Lock and check new inventory
      IF NOT EXISTS (
        SELECT 1 FROM public.material_inventory
        WHERE id = (v_new_res->>'material_inventory_id')::UUID
          AND quantity_available >= COALESCE(NULLIF(v_new_res->>'quantity', '')::INTEGER, 1)
        FOR UPDATE
      ) THEN
        RAISE EXCEPTION 'Material nicht mehr in gew�nschter Anzahl verf�gbar' USING ERRCODE = '08000';
      END IF;

      INSERT INTO public.material_reservations (
        tour_id, material_inventory_id, user_id, child_profile_id, quantity, status, loan_date, return_date
      ) VALUES (
        p_tour_id, (v_new_res->>'material_inventory_id')::UUID, auth.uid(), p_child_profile_id,
        COALESCE(NULLIF(v_new_res->>'quantity', '')::INTEGER, 1), 'reserved', v_tour.start_date, v_tour.end_date
      );

      UPDATE public.material_inventory
      SET quantity_available = quantity_available - COALESCE(NULLIF(v_new_res->>'quantity', '')::INTEGER, 1)
      WHERE id = (v_new_res->>'material_inventory_id')::UUID;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_tour_with_occ(p_tour_id uuid, p_expected_version integer, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_current_version INTEGER;
BEGIN
  -- Lock row
  SELECT version INTO v_current_version FROM tours WHERE id = p_tour_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tour not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'stale_write: Version mismatch. Expected %, got %', p_expected_version, v_current_version USING ERRCODE = '40001';
  END IF;

  -- Dynamic update based on payload (only whitelist specific fields)
  -- For brevity we just update what's in the jsonb, you map it here.
  -- In reality, we'd prefer doing the normal UPDATE in the app layer 
  -- with "... WHERE id = ID AND version = EXPECTED_VERSION".
  -- So we don't strictly need this RPC if the app layer uses Supabase SDK: 
  -- .update({ ... }).eq('id', id).eq('version', expectedVersion).

  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_tour_registration(p_tour_id uuid, p_user_id uuid, p_child_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_tour public.tours;
    v_birthdate date;
    v_age integer;
    v_target_id uuid;
BEGIN
    SELECT * INTO v_tour FROM public.tours WHERE id = p_tour_id;
    
    IF v_tour.status NOT IN ('planning', 'open', 'full') THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Tour ist nicht für Anmeldungen geöffnet.');
    END IF;

    -- Check if registration deadline has passed
    IF v_tour.registration_deadline IS NOT NULL AND now() > v_tour.registration_deadline THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Die Anmeldefrist für diese Tour ist bereits abgelaufen.');
    END IF;

    -- Define target ID
    v_target_id := COALESCE(p_child_id, p_user_id);

    -- Get birthdate
    IF p_child_id IS NOT NULL THEN
        SELECT birthdate INTO v_birthdate FROM public.child_profiles WHERE id = p_child_id;
    ELSE
        SELECT birthdate INTO v_birthdate FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_birthdate IS NOT NULL AND v_tour.min_age IS NOT NULL THEN
        -- Age calculation ON REGISTRATION DATE (now()), not start_date
        v_age := extract(year from age(now()::date, v_birthdate));
        IF v_age < v_tour.min_age THEN
            RETURN jsonb_build_object('valid', false, 'error', 'Mindestalter nicht erreicht.', 'needs_override', true);
        END IF;
    END IF;

    RETURN jsonb_build_object('valid', true);
END;
$function$
;

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."child_notification_preferences" to "anon";

grant insert on table "public"."child_notification_preferences" to "anon";

grant references on table "public"."child_notification_preferences" to "anon";

grant select on table "public"."child_notification_preferences" to "anon";

grant trigger on table "public"."child_notification_preferences" to "anon";

grant truncate on table "public"."child_notification_preferences" to "anon";

grant update on table "public"."child_notification_preferences" to "anon";

grant delete on table "public"."child_notification_preferences" to "authenticated";

grant insert on table "public"."child_notification_preferences" to "authenticated";

grant references on table "public"."child_notification_preferences" to "authenticated";

grant select on table "public"."child_notification_preferences" to "authenticated";

grant trigger on table "public"."child_notification_preferences" to "authenticated";

grant truncate on table "public"."child_notification_preferences" to "authenticated";

grant update on table "public"."child_notification_preferences" to "authenticated";

grant delete on table "public"."child_notification_preferences" to "service_role";

grant insert on table "public"."child_notification_preferences" to "service_role";

grant references on table "public"."child_notification_preferences" to "service_role";

grant select on table "public"."child_notification_preferences" to "service_role";

grant trigger on table "public"."child_notification_preferences" to "service_role";

grant truncate on table "public"."child_notification_preferences" to "service_role";

grant update on table "public"."child_notification_preferences" to "service_role";

grant delete on table "public"."child_profile_invites" to "anon";

grant insert on table "public"."child_profile_invites" to "anon";

grant references on table "public"."child_profile_invites" to "anon";

grant select on table "public"."child_profile_invites" to "anon";

grant trigger on table "public"."child_profile_invites" to "anon";

grant truncate on table "public"."child_profile_invites" to "anon";

grant update on table "public"."child_profile_invites" to "anon";

grant delete on table "public"."child_profile_invites" to "authenticated";

grant insert on table "public"."child_profile_invites" to "authenticated";

grant references on table "public"."child_profile_invites" to "authenticated";

grant select on table "public"."child_profile_invites" to "authenticated";

grant trigger on table "public"."child_profile_invites" to "authenticated";

grant truncate on table "public"."child_profile_invites" to "authenticated";

grant update on table "public"."child_profile_invites" to "authenticated";

grant delete on table "public"."child_profile_invites" to "service_role";

grant insert on table "public"."child_profile_invites" to "service_role";

grant references on table "public"."child_profile_invites" to "service_role";

grant select on table "public"."child_profile_invites" to "service_role";

grant trigger on table "public"."child_profile_invites" to "service_role";

grant truncate on table "public"."child_profile_invites" to "service_role";

grant update on table "public"."child_profile_invites" to "service_role";

grant delete on table "public"."child_profiles" to "anon";

grant insert on table "public"."child_profiles" to "anon";

grant references on table "public"."child_profiles" to "anon";

grant select on table "public"."child_profiles" to "anon";

grant trigger on table "public"."child_profiles" to "anon";

grant truncate on table "public"."child_profiles" to "anon";

grant update on table "public"."child_profiles" to "anon";

grant delete on table "public"."child_profiles" to "authenticated";

grant insert on table "public"."child_profiles" to "authenticated";

grant references on table "public"."child_profiles" to "authenticated";

grant select on table "public"."child_profiles" to "authenticated";

grant trigger on table "public"."child_profiles" to "authenticated";

grant truncate on table "public"."child_profiles" to "authenticated";

grant update on table "public"."child_profiles" to "authenticated";

grant delete on table "public"."child_profiles" to "service_role";

grant insert on table "public"."child_profiles" to "service_role";

grant references on table "public"."child_profiles" to "service_role";

grant select on table "public"."child_profiles" to "service_role";

grant trigger on table "public"."child_profiles" to "service_role";

grant truncate on table "public"."child_profiles" to "service_role";

grant update on table "public"."child_profiles" to "service_role";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."material_inventory" to "anon";

grant insert on table "public"."material_inventory" to "anon";

grant references on table "public"."material_inventory" to "anon";

grant select on table "public"."material_inventory" to "anon";

grant trigger on table "public"."material_inventory" to "anon";

grant truncate on table "public"."material_inventory" to "anon";

grant update on table "public"."material_inventory" to "anon";

grant delete on table "public"."material_inventory" to "authenticated";

grant insert on table "public"."material_inventory" to "authenticated";

grant references on table "public"."material_inventory" to "authenticated";

grant select on table "public"."material_inventory" to "authenticated";

grant trigger on table "public"."material_inventory" to "authenticated";

grant truncate on table "public"."material_inventory" to "authenticated";

grant update on table "public"."material_inventory" to "authenticated";

grant delete on table "public"."material_inventory" to "service_role";

grant insert on table "public"."material_inventory" to "service_role";

grant references on table "public"."material_inventory" to "service_role";

grant select on table "public"."material_inventory" to "service_role";

grant trigger on table "public"."material_inventory" to "service_role";

grant truncate on table "public"."material_inventory" to "service_role";

grant update on table "public"."material_inventory" to "service_role";

grant delete on table "public"."material_pricing" to "anon";

grant insert on table "public"."material_pricing" to "anon";

grant references on table "public"."material_pricing" to "anon";

grant select on table "public"."material_pricing" to "anon";

grant trigger on table "public"."material_pricing" to "anon";

grant truncate on table "public"."material_pricing" to "anon";

grant update on table "public"."material_pricing" to "anon";

grant delete on table "public"."material_pricing" to "authenticated";

grant insert on table "public"."material_pricing" to "authenticated";

grant references on table "public"."material_pricing" to "authenticated";

grant select on table "public"."material_pricing" to "authenticated";

grant trigger on table "public"."material_pricing" to "authenticated";

grant truncate on table "public"."material_pricing" to "authenticated";

grant update on table "public"."material_pricing" to "authenticated";

grant delete on table "public"."material_pricing" to "service_role";

grant insert on table "public"."material_pricing" to "service_role";

grant references on table "public"."material_pricing" to "service_role";

grant select on table "public"."material_pricing" to "service_role";

grant trigger on table "public"."material_pricing" to "service_role";

grant truncate on table "public"."material_pricing" to "service_role";

grant update on table "public"."material_pricing" to "service_role";

grant delete on table "public"."material_reservations" to "anon";

grant insert on table "public"."material_reservations" to "anon";

grant references on table "public"."material_reservations" to "anon";

grant select on table "public"."material_reservations" to "anon";

grant trigger on table "public"."material_reservations" to "anon";

grant truncate on table "public"."material_reservations" to "anon";

grant update on table "public"."material_reservations" to "anon";

grant delete on table "public"."material_reservations" to "authenticated";

grant insert on table "public"."material_reservations" to "authenticated";

grant references on table "public"."material_reservations" to "authenticated";

grant select on table "public"."material_reservations" to "authenticated";

grant trigger on table "public"."material_reservations" to "authenticated";

grant truncate on table "public"."material_reservations" to "authenticated";

grant update on table "public"."material_reservations" to "authenticated";

grant delete on table "public"."material_reservations" to "service_role";

grant insert on table "public"."material_reservations" to "service_role";

grant references on table "public"."material_reservations" to "service_role";

grant select on table "public"."material_reservations" to "service_role";

grant trigger on table "public"."material_reservations" to "service_role";

grant truncate on table "public"."material_reservations" to "service_role";

grant update on table "public"."material_reservations" to "service_role";

grant delete on table "public"."material_types" to "anon";

grant insert on table "public"."material_types" to "anon";

grant references on table "public"."material_types" to "anon";

grant select on table "public"."material_types" to "anon";

grant trigger on table "public"."material_types" to "anon";

grant truncate on table "public"."material_types" to "anon";

grant update on table "public"."material_types" to "anon";

grant delete on table "public"."material_types" to "authenticated";

grant insert on table "public"."material_types" to "authenticated";

grant references on table "public"."material_types" to "authenticated";

grant select on table "public"."material_types" to "authenticated";

grant trigger on table "public"."material_types" to "authenticated";

grant truncate on table "public"."material_types" to "authenticated";

grant update on table "public"."material_types" to "authenticated";

grant delete on table "public"."material_types" to "service_role";

grant insert on table "public"."material_types" to "service_role";

grant references on table "public"."material_types" to "service_role";

grant select on table "public"."material_types" to "service_role";

grant trigger on table "public"."material_types" to "service_role";

grant truncate on table "public"."material_types" to "service_role";

grant update on table "public"."material_types" to "service_role";

grant delete on table "public"."materials" to "anon";

grant insert on table "public"."materials" to "anon";

grant references on table "public"."materials" to "anon";

grant select on table "public"."materials" to "anon";

grant trigger on table "public"."materials" to "anon";

grant truncate on table "public"."materials" to "anon";

grant update on table "public"."materials" to "anon";

grant delete on table "public"."materials" to "authenticated";

grant insert on table "public"."materials" to "authenticated";

grant references on table "public"."materials" to "authenticated";

grant select on table "public"."materials" to "authenticated";

grant trigger on table "public"."materials" to "authenticated";

grant truncate on table "public"."materials" to "authenticated";

grant update on table "public"."materials" to "authenticated";

grant delete on table "public"."materials" to "service_role";

grant insert on table "public"."materials" to "service_role";

grant references on table "public"."materials" to "service_role";

grant select on table "public"."materials" to "service_role";

grant trigger on table "public"."materials" to "service_role";

grant truncate on table "public"."materials" to "service_role";

grant update on table "public"."materials" to "service_role";

grant delete on table "public"."mutation_idempotency" to "anon";

grant insert on table "public"."mutation_idempotency" to "anon";

grant references on table "public"."mutation_idempotency" to "anon";

grant select on table "public"."mutation_idempotency" to "anon";

grant trigger on table "public"."mutation_idempotency" to "anon";

grant truncate on table "public"."mutation_idempotency" to "anon";

grant update on table "public"."mutation_idempotency" to "anon";

grant delete on table "public"."mutation_idempotency" to "authenticated";

grant insert on table "public"."mutation_idempotency" to "authenticated";

grant references on table "public"."mutation_idempotency" to "authenticated";

grant select on table "public"."mutation_idempotency" to "authenticated";

grant trigger on table "public"."mutation_idempotency" to "authenticated";

grant truncate on table "public"."mutation_idempotency" to "authenticated";

grant update on table "public"."mutation_idempotency" to "authenticated";

grant delete on table "public"."mutation_idempotency" to "service_role";

grant insert on table "public"."mutation_idempotency" to "service_role";

grant references on table "public"."mutation_idempotency" to "service_role";

grant select on table "public"."mutation_idempotency" to "service_role";

grant trigger on table "public"."mutation_idempotency" to "service_role";

grant truncate on table "public"."mutation_idempotency" to "service_role";

grant update on table "public"."mutation_idempotency" to "service_role";

grant delete on table "public"."news_posts" to "anon";

grant insert on table "public"."news_posts" to "anon";

grant references on table "public"."news_posts" to "anon";

grant select on table "public"."news_posts" to "anon";

grant trigger on table "public"."news_posts" to "anon";

grant truncate on table "public"."news_posts" to "anon";

grant update on table "public"."news_posts" to "anon";

grant delete on table "public"."news_posts" to "authenticated";

grant insert on table "public"."news_posts" to "authenticated";

grant references on table "public"."news_posts" to "authenticated";

grant select on table "public"."news_posts" to "authenticated";

grant trigger on table "public"."news_posts" to "authenticated";

grant truncate on table "public"."news_posts" to "authenticated";

grant update on table "public"."news_posts" to "authenticated";

grant delete on table "public"."news_posts" to "service_role";

grant insert on table "public"."news_posts" to "service_role";

grant references on table "public"."news_posts" to "service_role";

grant select on table "public"."news_posts" to "service_role";

grant trigger on table "public"."news_posts" to "service_role";

grant truncate on table "public"."news_posts" to "service_role";

grant update on table "public"."news_posts" to "service_role";

grant delete on table "public"."notification_outbox" to "anon";

grant insert on table "public"."notification_outbox" to "anon";

grant references on table "public"."notification_outbox" to "anon";

grant select on table "public"."notification_outbox" to "anon";

grant trigger on table "public"."notification_outbox" to "anon";

grant truncate on table "public"."notification_outbox" to "anon";

grant update on table "public"."notification_outbox" to "anon";

grant delete on table "public"."notification_outbox" to "authenticated";

grant insert on table "public"."notification_outbox" to "authenticated";

grant references on table "public"."notification_outbox" to "authenticated";

grant select on table "public"."notification_outbox" to "authenticated";

grant trigger on table "public"."notification_outbox" to "authenticated";

grant truncate on table "public"."notification_outbox" to "authenticated";

grant update on table "public"."notification_outbox" to "authenticated";

grant delete on table "public"."notification_outbox" to "service_role";

grant insert on table "public"."notification_outbox" to "service_role";

grant references on table "public"."notification_outbox" to "service_role";

grant select on table "public"."notification_outbox" to "service_role";

grant trigger on table "public"."notification_outbox" to "service_role";

grant truncate on table "public"."notification_outbox" to "service_role";

grant update on table "public"."notification_outbox" to "service_role";

grant delete on table "public"."notification_preferences" to "anon";

grant insert on table "public"."notification_preferences" to "anon";

grant references on table "public"."notification_preferences" to "anon";

grant select on table "public"."notification_preferences" to "anon";

grant trigger on table "public"."notification_preferences" to "anon";

grant truncate on table "public"."notification_preferences" to "anon";

grant update on table "public"."notification_preferences" to "anon";

grant delete on table "public"."notification_preferences" to "authenticated";

grant insert on table "public"."notification_preferences" to "authenticated";

grant references on table "public"."notification_preferences" to "authenticated";

grant select on table "public"."notification_preferences" to "authenticated";

grant trigger on table "public"."notification_preferences" to "authenticated";

grant truncate on table "public"."notification_preferences" to "authenticated";

grant update on table "public"."notification_preferences" to "authenticated";

grant delete on table "public"."notification_preferences" to "service_role";

grant insert on table "public"."notification_preferences" to "service_role";

grant references on table "public"."notification_preferences" to "service_role";

grant select on table "public"."notification_preferences" to "service_role";

grant trigger on table "public"."notification_preferences" to "service_role";

grant truncate on table "public"."notification_preferences" to "service_role";

grant update on table "public"."notification_preferences" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."parent_child_relations" to "anon";

grant insert on table "public"."parent_child_relations" to "anon";

grant references on table "public"."parent_child_relations" to "anon";

grant select on table "public"."parent_child_relations" to "anon";

grant trigger on table "public"."parent_child_relations" to "anon";

grant truncate on table "public"."parent_child_relations" to "anon";

grant update on table "public"."parent_child_relations" to "anon";

grant delete on table "public"."parent_child_relations" to "authenticated";

grant insert on table "public"."parent_child_relations" to "authenticated";

grant references on table "public"."parent_child_relations" to "authenticated";

grant select on table "public"."parent_child_relations" to "authenticated";

grant trigger on table "public"."parent_child_relations" to "authenticated";

grant truncate on table "public"."parent_child_relations" to "authenticated";

grant update on table "public"."parent_child_relations" to "authenticated";

grant delete on table "public"."parent_child_relations" to "service_role";

grant insert on table "public"."parent_child_relations" to "service_role";

grant references on table "public"."parent_child_relations" to "service_role";

grant select on table "public"."parent_child_relations" to "service_role";

grant trigger on table "public"."parent_child_relations" to "service_role";

grant truncate on table "public"."parent_child_relations" to "service_role";

grant update on table "public"."parent_child_relations" to "service_role";

grant delete on table "public"."processed_events" to "anon";

grant insert on table "public"."processed_events" to "anon";

grant references on table "public"."processed_events" to "anon";

grant select on table "public"."processed_events" to "anon";

grant trigger on table "public"."processed_events" to "anon";

grant truncate on table "public"."processed_events" to "anon";

grant update on table "public"."processed_events" to "anon";

grant delete on table "public"."processed_events" to "authenticated";

grant insert on table "public"."processed_events" to "authenticated";

grant references on table "public"."processed_events" to "authenticated";

grant select on table "public"."processed_events" to "authenticated";

grant trigger on table "public"."processed_events" to "authenticated";

grant truncate on table "public"."processed_events" to "authenticated";

grant update on table "public"."processed_events" to "authenticated";

grant delete on table "public"."processed_events" to "service_role";

grant insert on table "public"."processed_events" to "service_role";

grant references on table "public"."processed_events" to "service_role";

grant select on table "public"."processed_events" to "service_role";

grant trigger on table "public"."processed_events" to "service_role";

grant truncate on table "public"."processed_events" to "service_role";

grant update on table "public"."processed_events" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."push_subscriptions" to "anon";

grant insert on table "public"."push_subscriptions" to "anon";

grant references on table "public"."push_subscriptions" to "anon";

grant select on table "public"."push_subscriptions" to "anon";

grant trigger on table "public"."push_subscriptions" to "anon";

grant truncate on table "public"."push_subscriptions" to "anon";

grant update on table "public"."push_subscriptions" to "anon";

grant delete on table "public"."push_subscriptions" to "authenticated";

grant insert on table "public"."push_subscriptions" to "authenticated";

grant references on table "public"."push_subscriptions" to "authenticated";

grant select on table "public"."push_subscriptions" to "authenticated";

grant trigger on table "public"."push_subscriptions" to "authenticated";

grant truncate on table "public"."push_subscriptions" to "authenticated";

grant update on table "public"."push_subscriptions" to "authenticated";

grant delete on table "public"."push_subscriptions" to "service_role";

grant insert on table "public"."push_subscriptions" to "service_role";

grant references on table "public"."push_subscriptions" to "service_role";

grant select on table "public"."push_subscriptions" to "service_role";

grant trigger on table "public"."push_subscriptions" to "service_role";

grant truncate on table "public"."push_subscriptions" to "service_role";

grant update on table "public"."push_subscriptions" to "service_role";

grant delete on table "public"."report_images" to "anon";

grant insert on table "public"."report_images" to "anon";

grant references on table "public"."report_images" to "anon";

grant select on table "public"."report_images" to "anon";

grant trigger on table "public"."report_images" to "anon";

grant truncate on table "public"."report_images" to "anon";

grant update on table "public"."report_images" to "anon";

grant delete on table "public"."report_images" to "authenticated";

grant insert on table "public"."report_images" to "authenticated";

grant references on table "public"."report_images" to "authenticated";

grant select on table "public"."report_images" to "authenticated";

grant trigger on table "public"."report_images" to "authenticated";

grant truncate on table "public"."report_images" to "authenticated";

grant update on table "public"."report_images" to "authenticated";

grant delete on table "public"."report_images" to "service_role";

grant insert on table "public"."report_images" to "service_role";

grant references on table "public"."report_images" to "service_role";

grant select on table "public"."report_images" to "service_role";

grant trigger on table "public"."report_images" to "service_role";

grant truncate on table "public"."report_images" to "service_role";

grant update on table "public"."report_images" to "service_role";

grant delete on table "public"."resource_bookings" to "anon";

grant insert on table "public"."resource_bookings" to "anon";

grant references on table "public"."resource_bookings" to "anon";

grant select on table "public"."resource_bookings" to "anon";

grant trigger on table "public"."resource_bookings" to "anon";

grant truncate on table "public"."resource_bookings" to "anon";

grant update on table "public"."resource_bookings" to "anon";

grant delete on table "public"."resource_bookings" to "authenticated";

grant insert on table "public"."resource_bookings" to "authenticated";

grant references on table "public"."resource_bookings" to "authenticated";

grant select on table "public"."resource_bookings" to "authenticated";

grant trigger on table "public"."resource_bookings" to "authenticated";

grant truncate on table "public"."resource_bookings" to "authenticated";

grant update on table "public"."resource_bookings" to "authenticated";

grant delete on table "public"."resource_bookings" to "service_role";

grant insert on table "public"."resource_bookings" to "service_role";

grant references on table "public"."resource_bookings" to "service_role";

grant select on table "public"."resource_bookings" to "service_role";

grant trigger on table "public"."resource_bookings" to "service_role";

grant truncate on table "public"."resource_bookings" to "service_role";

grant update on table "public"."resource_bookings" to "service_role";

grant delete on table "public"."resources" to "anon";

grant insert on table "public"."resources" to "anon";

grant references on table "public"."resources" to "anon";

grant select on table "public"."resources" to "anon";

grant trigger on table "public"."resources" to "anon";

grant truncate on table "public"."resources" to "anon";

grant update on table "public"."resources" to "anon";

grant delete on table "public"."resources" to "authenticated";

grant insert on table "public"."resources" to "authenticated";

grant references on table "public"."resources" to "authenticated";

grant select on table "public"."resources" to "authenticated";

grant trigger on table "public"."resources" to "authenticated";

grant truncate on table "public"."resources" to "authenticated";

grant update on table "public"."resources" to "authenticated";

grant delete on table "public"."resources" to "service_role";

grant insert on table "public"."resources" to "service_role";

grant references on table "public"."resources" to "service_role";

grant select on table "public"."resources" to "service_role";

grant trigger on table "public"."resources" to "service_role";

grant truncate on table "public"."resources" to "service_role";

grant update on table "public"."resources" to "service_role";

grant delete on table "public"."tour_categorys" to "anon";

grant insert on table "public"."tour_categorys" to "anon";

grant references on table "public"."tour_categorys" to "anon";

grant select on table "public"."tour_categorys" to "anon";

grant trigger on table "public"."tour_categorys" to "anon";

grant truncate on table "public"."tour_categorys" to "anon";

grant update on table "public"."tour_categorys" to "anon";

grant delete on table "public"."tour_categorys" to "authenticated";

grant insert on table "public"."tour_categorys" to "authenticated";

grant references on table "public"."tour_categorys" to "authenticated";

grant select on table "public"."tour_categorys" to "authenticated";

grant trigger on table "public"."tour_categorys" to "authenticated";

grant truncate on table "public"."tour_categorys" to "authenticated";

grant update on table "public"."tour_categorys" to "authenticated";

grant delete on table "public"."tour_categorys" to "service_role";

grant insert on table "public"."tour_categorys" to "service_role";

grant references on table "public"."tour_categorys" to "service_role";

grant select on table "public"."tour_categorys" to "service_role";

grant trigger on table "public"."tour_categorys" to "service_role";

grant truncate on table "public"."tour_categorys" to "service_role";

grant update on table "public"."tour_categorys" to "service_role";

grant delete on table "public"."tour_groups" to "anon";

grant insert on table "public"."tour_groups" to "anon";

grant references on table "public"."tour_groups" to "anon";

grant select on table "public"."tour_groups" to "anon";

grant trigger on table "public"."tour_groups" to "anon";

grant truncate on table "public"."tour_groups" to "anon";

grant update on table "public"."tour_groups" to "anon";

grant delete on table "public"."tour_groups" to "authenticated";

grant insert on table "public"."tour_groups" to "authenticated";

grant references on table "public"."tour_groups" to "authenticated";

grant select on table "public"."tour_groups" to "authenticated";

grant trigger on table "public"."tour_groups" to "authenticated";

grant truncate on table "public"."tour_groups" to "authenticated";

grant update on table "public"."tour_groups" to "authenticated";

grant delete on table "public"."tour_groups" to "service_role";

grant insert on table "public"."tour_groups" to "service_role";

grant references on table "public"."tour_groups" to "service_role";

grant select on table "public"."tour_groups" to "service_role";

grant trigger on table "public"."tour_groups" to "service_role";

grant truncate on table "public"."tour_groups" to "service_role";

grant update on table "public"."tour_groups" to "service_role";

grant delete on table "public"."tour_guides" to "anon";

grant insert on table "public"."tour_guides" to "anon";

grant references on table "public"."tour_guides" to "anon";

grant select on table "public"."tour_guides" to "anon";

grant trigger on table "public"."tour_guides" to "anon";

grant truncate on table "public"."tour_guides" to "anon";

grant update on table "public"."tour_guides" to "anon";

grant delete on table "public"."tour_guides" to "authenticated";

grant insert on table "public"."tour_guides" to "authenticated";

grant references on table "public"."tour_guides" to "authenticated";

grant select on table "public"."tour_guides" to "authenticated";

grant trigger on table "public"."tour_guides" to "authenticated";

grant truncate on table "public"."tour_guides" to "authenticated";

grant update on table "public"."tour_guides" to "authenticated";

grant delete on table "public"."tour_guides" to "service_role";

grant insert on table "public"."tour_guides" to "service_role";

grant references on table "public"."tour_guides" to "service_role";

grant select on table "public"."tour_guides" to "service_role";

grant trigger on table "public"."tour_guides" to "service_role";

grant truncate on table "public"."tour_guides" to "service_role";

grant update on table "public"."tour_guides" to "service_role";

grant delete on table "public"."tour_material_requirements" to "anon";

grant insert on table "public"."tour_material_requirements" to "anon";

grant references on table "public"."tour_material_requirements" to "anon";

grant select on table "public"."tour_material_requirements" to "anon";

grant trigger on table "public"."tour_material_requirements" to "anon";

grant truncate on table "public"."tour_material_requirements" to "anon";

grant update on table "public"."tour_material_requirements" to "anon";

grant delete on table "public"."tour_material_requirements" to "authenticated";

grant insert on table "public"."tour_material_requirements" to "authenticated";

grant references on table "public"."tour_material_requirements" to "authenticated";

grant select on table "public"."tour_material_requirements" to "authenticated";

grant trigger on table "public"."tour_material_requirements" to "authenticated";

grant truncate on table "public"."tour_material_requirements" to "authenticated";

grant update on table "public"."tour_material_requirements" to "authenticated";

grant delete on table "public"."tour_material_requirements" to "service_role";

grant insert on table "public"."tour_material_requirements" to "service_role";

grant references on table "public"."tour_material_requirements" to "service_role";

grant select on table "public"."tour_material_requirements" to "service_role";

grant trigger on table "public"."tour_material_requirements" to "service_role";

grant truncate on table "public"."tour_material_requirements" to "service_role";

grant update on table "public"."tour_material_requirements" to "service_role";

grant delete on table "public"."tour_materials" to "anon";

grant insert on table "public"."tour_materials" to "anon";

grant references on table "public"."tour_materials" to "anon";

grant select on table "public"."tour_materials" to "anon";

grant trigger on table "public"."tour_materials" to "anon";

grant truncate on table "public"."tour_materials" to "anon";

grant update on table "public"."tour_materials" to "anon";

grant delete on table "public"."tour_materials" to "authenticated";

grant insert on table "public"."tour_materials" to "authenticated";

grant references on table "public"."tour_materials" to "authenticated";

grant select on table "public"."tour_materials" to "authenticated";

grant trigger on table "public"."tour_materials" to "authenticated";

grant truncate on table "public"."tour_materials" to "authenticated";

grant update on table "public"."tour_materials" to "authenticated";

grant delete on table "public"."tour_materials" to "service_role";

grant insert on table "public"."tour_materials" to "service_role";

grant references on table "public"."tour_materials" to "service_role";

grant select on table "public"."tour_materials" to "service_role";

grant trigger on table "public"."tour_materials" to "service_role";

grant truncate on table "public"."tour_materials" to "service_role";

grant update on table "public"."tour_materials" to "service_role";

grant delete on table "public"."tour_participants" to "anon";

grant insert on table "public"."tour_participants" to "anon";

grant references on table "public"."tour_participants" to "anon";

grant select on table "public"."tour_participants" to "anon";

grant trigger on table "public"."tour_participants" to "anon";

grant truncate on table "public"."tour_participants" to "anon";

grant update on table "public"."tour_participants" to "anon";

grant delete on table "public"."tour_participants" to "authenticated";

grant insert on table "public"."tour_participants" to "authenticated";

grant references on table "public"."tour_participants" to "authenticated";

grant select on table "public"."tour_participants" to "authenticated";

grant trigger on table "public"."tour_participants" to "authenticated";

grant truncate on table "public"."tour_participants" to "authenticated";

grant update on table "public"."tour_participants" to "authenticated";

grant delete on table "public"."tour_participants" to "service_role";

grant insert on table "public"."tour_participants" to "service_role";

grant references on table "public"."tour_participants" to "service_role";

grant select on table "public"."tour_participants" to "service_role";

grant trigger on table "public"."tour_participants" to "service_role";

grant truncate on table "public"."tour_participants" to "service_role";

grant update on table "public"."tour_participants" to "service_role";

grant delete on table "public"."tour_reports" to "anon";

grant insert on table "public"."tour_reports" to "anon";

grant references on table "public"."tour_reports" to "anon";

grant select on table "public"."tour_reports" to "anon";

grant trigger on table "public"."tour_reports" to "anon";

grant truncate on table "public"."tour_reports" to "anon";

grant update on table "public"."tour_reports" to "anon";

grant delete on table "public"."tour_reports" to "authenticated";

grant insert on table "public"."tour_reports" to "authenticated";

grant references on table "public"."tour_reports" to "authenticated";

grant select on table "public"."tour_reports" to "authenticated";

grant trigger on table "public"."tour_reports" to "authenticated";

grant truncate on table "public"."tour_reports" to "authenticated";

grant update on table "public"."tour_reports" to "authenticated";

grant delete on table "public"."tour_reports" to "service_role";

grant insert on table "public"."tour_reports" to "service_role";

grant references on table "public"."tour_reports" to "service_role";

grant select on table "public"."tour_reports" to "service_role";

grant trigger on table "public"."tour_reports" to "service_role";

grant truncate on table "public"."tour_reports" to "service_role";

grant update on table "public"."tour_reports" to "service_role";

grant delete on table "public"."tours" to "anon";

grant insert on table "public"."tours" to "anon";

grant references on table "public"."tours" to "anon";

grant select on table "public"."tours" to "anon";

grant trigger on table "public"."tours" to "anon";

grant truncate on table "public"."tours" to "anon";

grant update on table "public"."tours" to "anon";

grant delete on table "public"."tours" to "authenticated";

grant insert on table "public"."tours" to "authenticated";

grant references on table "public"."tours" to "authenticated";

grant select on table "public"."tours" to "authenticated";

grant trigger on table "public"."tours" to "authenticated";

grant truncate on table "public"."tours" to "authenticated";

grant update on table "public"."tours" to "authenticated";

grant delete on table "public"."tours" to "service_role";

grant insert on table "public"."tours" to "service_role";

grant references on table "public"."tours" to "service_role";

grant select on table "public"."tours" to "service_role";

grant trigger on table "public"."tours" to "service_role";

grant truncate on table "public"."tours" to "service_role";

grant update on table "public"."tours" to "service_role";


  create policy "audit_logs_admin_only"
  on "public"."audit_logs"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "child_notification_preferences_parent_crud"
  on "public"."child_notification_preferences"
  as permissive
  for all
  to authenticated
using (((parent_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = child_notification_preferences.child_id) AND (cp.parent_id = auth.uid()))))))
with check (((parent_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = child_notification_preferences.child_id) AND (cp.parent_id = auth.uid()))))));



  create policy "Parents can create invites for their children"
  on "public"."child_profile_invites"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.parent_child_relations
  WHERE ((parent_child_relations.child_id = child_profile_invites.child_id) AND (parent_child_relations.parent_id = auth.uid())))));



  create policy "Parents can delete invites they created"
  on "public"."child_profile_invites"
  as permissive
  for delete
  to authenticated
using ((created_by = auth.uid()));



  create policy "Parents can view invites for their children"
  on "public"."child_profile_invites"
  as permissive
  for select
  to authenticated
using (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.parent_child_relations
  WHERE ((parent_child_relations.child_id = child_profile_invites.child_id) AND (parent_child_relations.parent_id = auth.uid()))))));



  create policy "child_profiles_delete"
  on "public"."child_profiles"
  as permissive
  for delete
  to authenticated
using (((parent_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));



  create policy "child_profiles_insert"
  on "public"."child_profiles"
  as permissive
  for insert
  to authenticated
with check ((parent_id = ( SELECT auth.uid() AS uid)));



  create policy "child_profiles_linked_parent_read"
  on "public"."child_profiles"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.parent_child_relations pcr
  WHERE ((pcr.child_id = child_profiles.id) AND (pcr.parent_id = auth.uid()))))));



  create policy "child_profiles_linked_parent_update"
  on "public"."child_profiles"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.parent_child_relations pcr
  WHERE ((pcr.child_id = child_profiles.id) AND (pcr.parent_id = auth.uid()))))))
with check ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.parent_child_relations pcr
  WHERE ((pcr.child_id = child_profiles.id) AND (pcr.parent_id = auth.uid()))))));



  create policy "child_profiles_select"
  on "public"."child_profiles"
  as permissive
  for select
  to authenticated
using (((parent_id = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR public.guide_can_see_child(id)));



  create policy "child_profiles_update"
  on "public"."child_profiles"
  as permissive
  for update
  to authenticated
using (((parent_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()))
with check (((parent_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));



  create policy "documents_delete_admin"
  on "public"."documents"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "documents_insert_admin"
  on "public"."documents"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "documents_read_authenticated"
  on "public"."documents"
  as permissive
  for select
  to authenticated
using (true);



  create policy "documents_update_admin"
  on "public"."documents"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "material_inventory_read_authenticated"
  on "public"."material_inventory"
  as permissive
  for select
  to authenticated
using (true);



  create policy "material_inventory_write_materialwart_admin"
  on "public"."material_inventory"
  as permissive
  for all
  to authenticated
using (public.is_materialwart_or_admin())
with check (public.is_materialwart_or_admin());



  create policy "material_pricing_read_authenticated"
  on "public"."material_pricing"
  as permissive
  for select
  to authenticated
using (true);



  create policy "material_pricing_write_materialwart_admin"
  on "public"."material_pricing"
  as permissive
  for all
  to authenticated
using (public.is_materialwart_or_admin())
with check (public.is_materialwart_or_admin());



  create policy "material_reservations_delete_own_or_manage"
  on "public"."material_reservations"
  as permissive
  for delete
  to authenticated
using ((public.is_materialwart_or_admin() OR public.can_manage_tour(tour_id) OR (user_id = auth.uid())));



  create policy "material_reservations_insert_own_or_manage"
  on "public"."material_reservations"
  as permissive
  for insert
  to authenticated
with check ((public.is_materialwart_or_admin() OR public.can_manage_tour(tour_id) OR ((user_id = auth.uid()) AND ((child_profile_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = material_reservations.child_profile_id) AND (cp.parent_id = auth.uid()))))))));



  create policy "material_reservations_select_own_or_manage"
  on "public"."material_reservations"
  as permissive
  for select
  to authenticated
using ((public.is_materialwart_or_admin() OR public.can_manage_tour(tour_id) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = material_reservations.child_profile_id) AND (cp.parent_id = auth.uid()))))));



  create policy "material_reservations_update_own_or_manage"
  on "public"."material_reservations"
  as permissive
  for update
  to authenticated
using ((public.is_materialwart_or_admin() OR public.can_manage_tour(tour_id) OR (user_id = auth.uid())))
with check ((public.is_materialwart_or_admin() OR public.can_manage_tour(tour_id) OR ((user_id = auth.uid()) AND ((child_profile_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = material_reservations.child_profile_id) AND (cp.parent_id = auth.uid()))))))));



  create policy "material_types_read_anon"
  on "public"."material_types"
  as permissive
  for select
  to anon
using (true);



  create policy "material_types_read_authenticated"
  on "public"."material_types"
  as permissive
  for select
  to authenticated
using (true);



  create policy "material_types_write_materialwart_admin"
  on "public"."material_types"
  as permissive
  for all
  to authenticated
using (public.is_materialwart_or_admin())
with check (public.is_materialwart_or_admin());



  create policy "materials_delete_guide_admin"
  on "public"."materials"
  as permissive
  for delete
  to authenticated
using (public.is_guide_or_admin());



  create policy "materials_insert_guide_admin"
  on "public"."materials"
  as permissive
  for insert
  to authenticated
with check (public.is_guide_or_admin());



  create policy "materials_read_authenticated"
  on "public"."materials"
  as permissive
  for select
  to authenticated
using (true);



  create policy "materials_update_guide_admin"
  on "public"."materials"
  as permissive
  for update
  to authenticated
using (public.is_guide_or_admin())
with check (public.is_guide_or_admin());



  create policy "mutation_idempotency_deny_all"
  on "public"."mutation_idempotency"
  as permissive
  for all
  to public
using (false);



  create policy "news_posts_admin_crud"
  on "public"."news_posts"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "news_posts_authenticated_read"
  on "public"."news_posts"
  as permissive
  for select
  to authenticated
using (true);



  create policy "notification_outbox_deny_all"
  on "public"."notification_outbox"
  as permissive
  for all
  to public
using (false);



  create policy "notification_preferences_owner_crud"
  on "public"."notification_preferences"
  as permissive
  for all
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "notifications_admin_insert"
  on "public"."notifications"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "notifications_owner_select"
  on "public"."notifications"
  as permissive
  for select
  to authenticated
using (((recipient_user_id = auth.uid()) OR ((recipient_child_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = notifications.recipient_child_id) AND (cp.parent_id = auth.uid()))))) OR public.is_admin()));



  create policy "notifications_owner_update_read"
  on "public"."notifications"
  as permissive
  for update
  to authenticated
using (((recipient_user_id = auth.uid()) OR ((recipient_child_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = notifications.recipient_child_id) AND (cp.parent_id = auth.uid())))))))
with check (((recipient_user_id = auth.uid()) OR ((recipient_child_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.child_profiles cp
  WHERE ((cp.id = notifications.recipient_child_id) AND (cp.parent_id = auth.uid())))))));



  create policy "Parents can view their own child relations"
  on "public"."parent_child_relations"
  as permissive
  for select
  to authenticated
using ((auth.uid() = parent_id));



  create policy "processed_events_deny_all"
  on "public"."processed_events"
  as permissive
  for all
  to public
using (false);



  create policy "profiles_insert_self"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check (((id = ( SELECT auth.uid() AS uid)) AND (role = ANY (ARRAY['member'::public.user_role, 'parent'::public.user_role]))));



  create policy "profiles_select"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (((id = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.tour_guides tg
  WHERE (tg.user_id = profiles.id))) OR (EXISTS ( SELECT 1
   FROM (public.tour_participants tp
     JOIN public.tour_guides viewer_tg ON ((viewer_tg.tour_id = tp.tour_id)))
  WHERE ((tp.user_id = profiles.id) AND (viewer_tg.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.tour_participants tp
     JOIN public.tours t ON ((t.id = tp.tour_id)))
  WHERE ((tp.user_id = profiles.id) AND (t.created_by = auth.uid()))))));



  create policy "profiles_select_full"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (((id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));



  create policy "profiles_select_guides_for_authenticated"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((role = ANY (ARRAY['guide'::public.user_role, 'admin'::public.user_role])));



  create policy "profiles_update_self"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using (((id = auth.uid()) OR public.is_admin()))
with check (((id = auth.uid()) OR public.is_admin()));



  create policy "push_subscriptions_owner_delete"
  on "public"."push_subscriptions"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "push_subscriptions_owner_insert"
  on "public"."push_subscriptions"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "push_subscriptions_owner_select"
  on "public"."push_subscriptions"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "push_subscriptions_owner_update"
  on "public"."push_subscriptions"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "report_images_delete"
  on "public"."report_images"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tour_reports tr
  WHERE ((tr.id = report_images.report_id) AND ((tr.created_by = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR public.can_manage_tour(tr.tour_id))))));



  create policy "report_images_insert"
  on "public"."report_images"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.tour_reports tr
  WHERE ((tr.id = report_images.report_id) AND ((tr.created_by = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR public.can_manage_tour(tr.tour_id))))));



  create policy "report_images_select"
  on "public"."report_images"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tour_reports tr
  WHERE (tr.id = report_images.report_id))));



  create policy "report_images_update"
  on "public"."report_images"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tour_reports tr
  WHERE ((tr.id = report_images.report_id) AND ((tr.created_by = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR public.can_manage_tour(tr.tour_id))))))
with check ((EXISTS ( SELECT 1
   FROM public.tour_reports tr
  WHERE ((tr.id = report_images.report_id) AND ((tr.created_by = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR public.can_manage_tour(tr.tour_id))))));



  create policy "resource_bookings_read_authenticated"
  on "public"."resource_bookings"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR public.can_manage_tour(tour_id)));



  create policy "resource_bookings_write_manage"
  on "public"."resource_bookings"
  as permissive
  for all
  to authenticated
using ((public.is_admin() OR public.can_manage_tour(tour_id)))
with check ((public.is_admin() OR (public.can_manage_tour(tour_id) AND (created_by = auth.uid()))));



  create policy "resources_read_authenticated"
  on "public"."resources"
  as permissive
  for select
  to authenticated
using (true);



  create policy "resources_write_admin"
  on "public"."resources"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "tour_categorys_read_anon"
  on "public"."tour_categorys"
  as permissive
  for select
  to anon
using (true);



  create policy "tour_categorys_read_authenticated"
  on "public"."tour_categorys"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tour_categorys_write_admin"
  on "public"."tour_categorys"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "tour_groups_read_anon"
  on "public"."tour_groups"
  as permissive
  for select
  to anon
using (true);



  create policy "tour_groups_read_authenticated"
  on "public"."tour_groups"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tour_groups_write_admin"
  on "public"."tour_groups"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "tour_guides_delete_manage"
  on "public"."tour_guides"
  as permissive
  for delete
  to authenticated
using (public.can_manage_tour(tour_id));



  create policy "tour_guides_insert_manage"
  on "public"."tour_guides"
  as permissive
  for insert
  to authenticated
with check (public.can_manage_tour(tour_id));



  create policy "tour_guides_read_authenticated"
  on "public"."tour_guides"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tour_guides_update_manage"
  on "public"."tour_guides"
  as permissive
  for update
  to authenticated
using (public.can_manage_tour(tour_id))
with check (public.can_manage_tour(tour_id));



  create policy "tour_material_requirements_read_anon"
  on "public"."tour_material_requirements"
  as permissive
  for select
  to anon
using (true);



  create policy "tour_material_requirements_read_authenticated"
  on "public"."tour_material_requirements"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tour_material_requirements_write_manage"
  on "public"."tour_material_requirements"
  as permissive
  for all
  to authenticated
using (public.can_manage_tour(tour_id))
with check (public.can_manage_tour(tour_id));



  create policy "tour_materials_delete_manage"
  on "public"."tour_materials"
  as permissive
  for delete
  to authenticated
using (public.can_manage_tour(tour_id));



  create policy "tour_materials_insert_manage"
  on "public"."tour_materials"
  as permissive
  for insert
  to authenticated
with check (public.can_manage_tour(tour_id));



  create policy "tour_materials_read_authenticated"
  on "public"."tour_materials"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tour_materials_update_manage"
  on "public"."tour_materials"
  as permissive
  for update
  to authenticated
using (public.can_manage_tour(tour_id))
with check (public.can_manage_tour(tour_id));



  create policy "tour_participants_delete_manage"
  on "public"."tour_participants"
  as permissive
  for delete
  to authenticated
using (public.can_manage_tour(tour_id));



  create policy "tour_participants_insert_own"
  on "public"."tour_participants"
  as permissive
  for insert
  to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) AND ((child_profile_id IS NULL) OR public.is_parent_of_child(child_profile_id))));



  create policy "tour_participants_read_own_or_manage"
  on "public"."tour_participants"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR ((child_profile_id IS NOT NULL) AND public.is_parent_of_child(child_profile_id)) OR public.can_manage_tour(tour_id)));



  create policy "tour_participants_update_own_or_manage"
  on "public"."tour_participants"
  as permissive
  for update
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.can_manage_tour(tour_id)))
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND ((child_profile_id IS NULL) OR public.is_parent_of_child(child_profile_id))) OR public.can_manage_tour(tour_id)));



  create policy "tour_reports_delete"
  on "public"."tour_reports"
  as permissive
  for delete
  to authenticated
using ((public.is_guide_or_admin() AND ((created_by = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR public.can_manage_tour(tour_id))));



  create policy "tour_reports_insert"
  on "public"."tour_reports"
  as permissive
  for insert
  to authenticated
with check ((public.is_guide_or_admin() AND (created_by = ( SELECT auth.uid() AS uid))));



  create policy "tour_reports_select"
  on "public"."tour_reports"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tour_reports_update"
  on "public"."tour_reports"
  as permissive
  for update
  to authenticated
using ((public.is_guide_or_admin() AND ((created_by = ( SELECT auth.uid() AS uid)) OR public.is_admin() OR public.can_manage_tour(tour_id))))
with check ((public.is_guide_or_admin() AND (created_by = ( SELECT auth.uid() AS uid))));



  create policy "Admins can delete tours"
  on "public"."tours"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role)))));



  create policy "tours_create_guide_admin"
  on "public"."tours"
  as permissive
  for insert
  to authenticated
with check ((public.is_guide_or_admin() AND (created_by = ( SELECT auth.uid() AS uid))));



  create policy "tours_delete_manage"
  on "public"."tours"
  as permissive
  for delete
  to authenticated
using (public.can_manage_tour(id));



  create policy "tours_read_authenticated"
  on "public"."tours"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tours_read_public_anon"
  on "public"."tours"
  as permissive
  for select
  to anon
using ((status = ANY (ARRAY['planning'::public.tour_status, 'open'::public.tour_status, 'full'::public.tour_status])));



  create policy "tours_update_manage"
  on "public"."tours"
  as permissive
  for update
  to authenticated
using (public.can_manage_tour(id))
with check (public.can_manage_tour(id));


CREATE TRIGGER trg_child_notification_preferences_updated_at BEFORE UPDATE ON public.child_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER after_child_profile_insert AFTER INSERT ON public.child_profiles FOR EACH ROW EXECUTE FUNCTION public.trg_insert_parent_child_relation();

CREATE TRIGGER maintain_material_inventory AFTER DELETE OR UPDATE ON public.material_reservations FOR EACH ROW EXECUTE FUNCTION public.restore_material_inventory();

CREATE TRIGGER trg_news_posts_updated_at BEFORE UPDATE ON public.news_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_notification_outbox_set_updated_at BEFORE UPDATE ON public.notification_outbox FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER trg_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_audit_participant_status AFTER UPDATE OF status ON public.tour_participants FOR EACH ROW EXECUTE FUNCTION public.audit_participant_status_change();

CREATE TRIGGER trigger_sync_tour_status_on_participant_insert AFTER INSERT ON public.tour_participants FOR EACH ROW WHEN ((new.status = ANY (ARRAY['confirmed'::public.participant_status, 'pending'::public.participant_status]))) EXECUTE FUNCTION public.trg_sync_tour_status_on_participant_change();

CREATE TRIGGER trigger_sync_tour_status_on_participant_update AFTER UPDATE ON public.tour_participants FOR EACH ROW EXECUTE FUNCTION public.trg_sync_tour_status_on_participant_change();

CREATE TRIGGER trigger_waitlist_position BEFORE INSERT ON public.tour_participants FOR EACH ROW EXECUTE FUNCTION public.assign_waitlist_position();

CREATE TRIGGER enforce_tour_report_status BEFORE INSERT OR UPDATE ON public.tour_reports FOR EACH ROW EXECUTE FUNCTION public.check_tour_report_status();

CREATE TRIGGER bump_tour_version BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.tour_optimistic_concurrency_guard();

CREATE TRIGGER enforce_tour_update_cascades BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.tour_update_cascade_guard();

CREATE TRIGGER tr_audit_tour_status AFTER UPDATE OF status ON public.tours FOR EACH ROW EXECUTE FUNCTION public.audit_tour_status_change();

CREATE TRIGGER on_auth_user_deleted_anonymize BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion_anonymize();


  create policy "Admin Manage Documents"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = 'documents'::text) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::public.user_role)));



  create policy "Document Read Access"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'documents'::text));



  create policy "Public Access to Documents"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'documents'::text));



  create policy "admin upload documents"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role))))));



  create policy "avatars public read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "guides upload tour images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'tour-reports'::text));



  create policy "members read documents"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'documents'::text));



  create policy "public read tour images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'tour-reports'::text));



  create policy "users upload avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



