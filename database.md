-- WARNING: This schema snapshot is for context only and is not meant to be run directly.
-- Source: Supabase MCP (project_ref=amjxgutnnnpjbjigzwpo)
-- Updated: 2026-03-31

Tables (public schema):

public.audit_logs
```
id uuid NOT NULL DEFAULT gen_random_uuid()
entity_type text NOT NULL
entity_id uuid NOT NULL
action text NOT NULL
old_payload jsonb
new_payload jsonb
actor_id uuid
created_at timestamp with time zone NOT NULL DEFAULT now()
```

public.child_notification_preferences
```
id uuid NOT NULL DEFAULT gen_random_uuid()
child_id uuid NOT NULL
parent_id uuid NOT NULL
news_enabled boolean NOT NULL DEFAULT true
system_enabled boolean NOT NULL DEFAULT true
material_enabled boolean NOT NULL DEFAULT true
comments_enabled boolean NOT NULL DEFAULT true
group_notifications_enabled boolean NOT NULL DEFAULT true
tour_group_ids ARRAY NOT NULL DEFAULT '{}'::uuid[]
push_enabled boolean NOT NULL DEFAULT false
created_at timestamp with time zone NOT NULL DEFAULT now()
updated_at timestamp with time zone NOT NULL DEFAULT now()
```

public.child_profiles
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
parent_id uuid
full_name text NOT NULL
birthdate date NOT NULL
created_at timestamp without time zone DEFAULT now()
medical_notes text
image_consent boolean DEFAULT false
```

public.documents
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
title text NOT NULL
file_url text NOT NULL
category text
created_at timestamp without time zone DEFAULT now()
```

public.material_inventory
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
material_type_id uuid
size text
quantity_total integer NOT NULL
quantity_available integer NOT NULL
created_at timestamp with time zone DEFAULT now()
```

public.material_pricing
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
material_type_id uuid
price_day numeric
price_extra_day numeric
price_week numeric
```

public.material_reservations
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
tour_id uuid
material_inventory_id uuid
user_id uuid
child_profile_id uuid
quantity integer DEFAULT 1
status text DEFAULT 'reserved'::text
loan_date date
return_date date
created_at timestamp with time zone DEFAULT now()
```

public.material_types
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
name text NOT NULL
description text
category text
created_at timestamp with time zone DEFAULT now()
```

public.materials
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
name materal_typ NOT NULL
total_quantity integer NOT NULL
size material_size
price_day integer
price_extraday integer
price_week integer
```

public.news_posts
```
id uuid NOT NULL DEFAULT gen_random_uuid()
title text NOT NULL
content text NOT NULL
image_url text
published_by uuid NOT NULL
published_at timestamp with time zone NOT NULL DEFAULT now()
created_at timestamp with time zone NOT NULL DEFAULT now()
updated_at timestamp with time zone NOT NULL DEFAULT now()
```

public.notification_outbox
```
id bigint NOT NULL DEFAULT nextval('notification_outbox_id_seq'::regclass)
event_key text NOT NULL
aggregate_type text NOT NULL DEFAULT 'notification'::text
aggregate_id uuid NOT NULL
event_type text NOT NULL DEFAULT 'notification.created'::text
event_version bigint NOT NULL DEFAULT 1
payload jsonb NOT NULL DEFAULT '{}'::jsonb
status text NOT NULL DEFAULT 'pending'::text
attempts integer NOT NULL DEFAULT 0
available_at timestamp with time zone NOT NULL DEFAULT now()
locked_at timestamp with time zone
processed_at timestamp with time zone
last_error text
created_at timestamp with time zone NOT NULL DEFAULT now()
updated_at timestamp with time zone NOT NULL DEFAULT now()
```

public.notification_preferences
```
id uuid NOT NULL DEFAULT gen_random_uuid()
user_id uuid NOT NULL
news_enabled boolean NOT NULL DEFAULT true
system_enabled boolean NOT NULL DEFAULT true
material_enabled boolean NOT NULL DEFAULT true
comments_enabled boolean NOT NULL DEFAULT true
group_notifications_enabled boolean NOT NULL DEFAULT true
tour_group_ids ARRAY NOT NULL DEFAULT '{}'::uuid[]
push_enabled boolean NOT NULL DEFAULT false
created_at timestamp with time zone NOT NULL DEFAULT now()
updated_at timestamp with time zone NOT NULL DEFAULT now()
```

public.notifications
```
id uuid NOT NULL DEFAULT gen_random_uuid()
type text NOT NULL
title text NOT NULL
body text NOT NULL
payload jsonb NOT NULL DEFAULT '{}'::jsonb
recipient_user_id uuid
recipient_child_id uuid
related_tour_id uuid
related_group_id uuid
news_post_id uuid
read_at timestamp with time zone
created_at timestamp with time zone NOT NULL DEFAULT now()
```

public.processed_events
```
consumer text NOT NULL
event_key text NOT NULL
processed_at timestamp with time zone NOT NULL DEFAULT now()
```

public.profiles
```
id uuid NOT NULL
full_name text NOT NULL
phone text
birthdate date
medical_notes text
emergency_phone text
role user_role DEFAULT 'member'::user_role
image_consent boolean DEFAULT false
created_at timestamp without time zone DEFAULT now()
```

public.push_subscriptions
```
id uuid NOT NULL DEFAULT gen_random_uuid()
user_id uuid NOT NULL
endpoint text NOT NULL
p256dh text NOT NULL
auth text NOT NULL
user_agent text
created_at timestamp with time zone NOT NULL DEFAULT now()
updated_at timestamp with time zone NOT NULL DEFAULT now()
last_used_at timestamp with time zone
disabled_at timestamp with time zone
```

public.report_images
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
report_id uuid
image_url text NOT NULL
order_index integer
```

public.resource_bookings
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
resource_id uuid
tour_id uuid
start_date timestamp with time zone
end_date timestamp with time zone
status text DEFAULT 'requested'::text
created_by uuid
created_at timestamp with time zone DEFAULT now()
```

public.resources
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
name text NOT NULL
description text
type text
capacity integer
created_at timestamp with time zone DEFAULT now()
```

public.tour_categorys
```
id uuid NOT NULL DEFAULT gen_random_uuid()
category text
created_at timestamp with time zone NOT NULL DEFAULT now()
```

public.tour_groups
```
id uuid NOT NULL DEFAULT gen_random_uuid()
group_name text
created_at timestamp with time zone NOT NULL DEFAULT now()
```

public.tour_guides
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
tour_id uuid
user_id uuid
```

public.tour_material_requirements
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
tour_id uuid
material_type_id uuid
```

public.tour_materials
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
tour_id uuid
material_id uuid
```

public.tour_participants
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
tour_id uuid
user_id uuid
child_profile_id uuid
status participant_status DEFAULT 'pending'::participant_status
age_override boolean DEFAULT false
created_at timestamp without time zone DEFAULT now()
waitlist_position integer
```

public.tour_reports
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
tour_id uuid
title text
report_text text
created_by uuid
created_at timestamp without time zone DEFAULT now()
```

public.tours
```
id uuid NOT NULL DEFAULT extensions.uuid_generate_v4()
title text NOT NULL
description text
difficulty tour_difficulty DEFAULT 'Keine'::tour_difficulty
target_area text
requirements text
meeting_point text
meeting_time time without time zone
start_date date NOT NULL
end_date date
elevation integer
distance numeric
duration_hours numeric
cost_info text
max_participants integer
status tour_status DEFAULT 'planning'::tour_status
created_by uuid
created_at timestamp without time zone DEFAULT now()
min_age integer
group uuid
category uuid
version integer NOT NULL DEFAULT 1
updated_at timestamp without time zone NOT NULL DEFAULT now()
```

Enum TYPES:

user_role
member, guide, admin, parent, materialwart

tour_status
planning, open, full, completed, canceled

participant_status
pending, confirmed, waitlist, cancelled

tour_difficulty
T1, T2, T3, T4, B1, B2, B3, B4, L, WS, ZS, K1, K2, K3, K4, WT1, WT2, WT3, WT4, WT5, ST2, ST3, S0, S1, S2, S3, S4, S5, UIAA 1, UIAA 2, UIAA 3, UIAA 4, UIAA 5, UIAA 6, UIAA 7, UIAA 8, Keine

material_status
reserved, on loan, returned

material_size
S, M, L, 39, 40, 41, 42, 43, 44, 45

materal_typ
Klettergurt/Sitz– u.Brustgurt, Klettersteigset, Steinschlaghelm, Steigeisen, Eispickel/Eisbeil, Groedel, Biwaksack, LVS-Set, Schneeschuhe, Kraxn für Zwergerl

Foreign Keys:

- audit_logs.actor_id -> auth.users.id
- child_notification_preferences.child_id -> public.child_profiles.id
- child_notification_preferences.parent_id -> public.profiles.id
- child_profiles.parent_id -> public.profiles.id
- material_inventory.material_type_id -> public.material_types.id
- material_pricing.material_type_id -> public.material_types.id
- material_reservations.child_profile_id -> public.child_profiles.id
- material_reservations.material_inventory_id -> public.material_inventory.id
- material_reservations.tour_id -> public.tours.id
- material_reservations.user_id -> public.profiles.id
- news_posts.published_by -> public.profiles.id
- notification_outbox.aggregate_id -> public.notifications.id
- notification_preferences.user_id -> public.profiles.id
- notifications.news_post_id -> public.news_posts.id
- notifications.recipient_child_id -> public.child_profiles.id
- notifications.recipient_user_id -> public.profiles.id
- notifications.related_group_id -> public.tour_groups.id
- notifications.related_tour_id -> public.tours.id
- profiles.id -> auth.users.id
- push_subscriptions.user_id -> public.profiles.id
- report_images.report_id -> public.tour_reports.id
- resource_bookings.created_by -> public.profiles.id
- resource_bookings.resource_id -> public.resources.id
- resource_bookings.tour_id -> public.tours.id
- tour_guides.tour_id -> public.tours.id
- tour_guides.user_id -> public.profiles.id
- tour_material_requirements.material_type_id -> public.material_types.id
- tour_material_requirements.tour_id -> public.tours.id
- tour_materials.material_id -> public.materials.id
- tour_materials.tour_id -> public.tours.id
- tour_participants.child_profile_id -> public.child_profiles.id
- tour_participants.tour_id -> public.tours.id
- tour_participants.user_id -> public.profiles.id
- tour_reports.created_by -> public.profiles.id
- tour_reports.tour_id -> public.tours.id
- tours.category -> public.tour_categorys.id
- tours.created_by -> public.profiles.id
- tours.group -> public.tour_groups.id

Indexes (selected):

- audit_logs_pkey
- idx_audit_logs_created_at
- idx_audit_logs_entity
- child_notification_preferences_child_id_key
- child_notification_preferences_pkey
- child_profiles_pkey
- idx_child_profiles_parent_id
- documents_pkey
- material_inventory_pkey
- material_pricing_pkey
- material_reservations_pkey1
- material_types_pkey
- materials_pkey
- idx_news_posts_published_at
- news_posts_pkey
- idx_notification_outbox_poll
- notification_outbox_event_key_key
- notification_outbox_pkey
- notification_preferences_pkey
- notification_preferences_user_id_key
- idx_notifications_child_created
- idx_notifications_unread_child
- idx_notifications_unread_user
- idx_notifications_user_created
- notifications_pkey
- processed_events_pkey
- profiles_pkey
- idx_push_subscriptions_active
- idx_push_subscriptions_user
- push_subscriptions_endpoint_key
- push_subscriptions_pkey
- idx_report_images_report_id
- report_images_pkey
- exclude_resource_time_overlap
- resource_bookings_pkey
- resources_pkey
- tour_categorys_pkey
- tour_groups_pkey
- idx_tour_guides_tour_id
- idx_tour_guides_user_id
- tour_guides_pkey
- ux_tour_guides_tour_user
- tour_material_requirements_pkey
- idx_tour_materials_material_id
- idx_tour_materials_tour_id
- tour_materials_pkey
- idx_tour_participants_child_profile_id
- idx_tour_participants_tour_id
- idx_tour_participants_tour_status
- idx_tour_participants_user_id
- idx_waitlist_lookup
- tour_participants_pkey
- unique_participant
- ux_active_registration_per_person
- ux_tour_participants_unique_registration
- idx_tour_reports_created_at
- idx_tour_reports_created_by
- idx_tour_reports_tour_id
- tour_reports_pkey
- ux_tour_reports_one_per_tour
- idx_tours_created_by
- idx_tours_end_date
- idx_tours_status
- idx_tours_status_start_date
- tours_pkey

Triggers:

- trg_child_notification_preferences_updated_at on child_notification_preferences BEFORE UPDATE ROW -> set_updated_at
- maintain_material_inventory on material_reservations AFTER DELETE OR UPDATE ROW -> restore_material_inventory
- trg_news_posts_updated_at on news_posts BEFORE UPDATE ROW -> set_updated_at
- tr_notification_outbox_set_updated_at on notification_outbox BEFORE UPDATE ROW -> set_updated_at_timestamp
- trg_notification_preferences_updated_at on notification_preferences BEFORE UPDATE ROW -> set_updated_at
- trg_push_subscriptions_updated_at on push_subscriptions BEFORE UPDATE ROW -> set_updated_at
- tr_audit_participant_status on tour_participants AFTER UPDATE ROW -> audit_participant_status_change
- trigger_sync_tour_status_on_participant_insert on tour_participants AFTER INSERT ROW -> trg_sync_tour_status_on_participant_change
- trigger_sync_tour_status_on_participant_update on tour_participants AFTER UPDATE ROW -> trg_sync_tour_status_on_participant_change
- trigger_waitlist_position on tour_participants BEFORE INSERT ROW -> assign_waitlist_position
- enforce_tour_report_status on tour_reports BEFORE INSERT OR UPDATE ROW -> check_tour_report_status
- bump_tour_version on tours BEFORE UPDATE ROW -> tour_optimistic_concurrency_guard
- enforce_tour_update_cascades on tours BEFORE UPDATE ROW -> tour_update_cascade_guard
- tr_audit_tour_status on tours AFTER UPDATE ROW -> audit_tour_status_change

Functions (public, sql/plpgsql):

- apply_material_reservation_transition_atomic(p_reservation_id uuid, p_expected_status text, p_new_status text) -> jsonb
- apply_participant_status_transition_atomic(p_registration_id uuid, p_expected_status participant_status, p_new_status participant_status) -> jsonb
- assign_waitlist_position() -> trigger
- audit_participant_status_change() -> trigger
- audit_tour_status_change() -> trigger
- book_resource_for_tour_atomic(p_resource_id uuid, p_tour_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_user_id uuid) -> jsonb
- can_manage_tour(tour_uuid uuid) -> boolean
- cancel_own_private_material_reservation_atomic(p_reservation_id uuid, p_user_id uuid) -> jsonb
- check_material_availability() -> trigger
- check_tour_report_status() -> trigger
- current_user_role() -> user_role
- enqueue_notification_created_event(p_notification_id uuid, p_event_key text, p_payload jsonb) -> bigint
- get_tour_participant_counts(p_tour_ids uuid[]) -> TABLE
- guide_can_see_child(child_uuid uuid) -> boolean
- is_admin() -> boolean
- is_guide_or_admin() -> boolean
- is_materialwart_or_admin() -> boolean
- is_parent_of_child(child_uuid uuid) -> boolean
- limit_report_images() -> trigger
- promote_first_waitlist(p_tour_id uuid) -> jsonb
- promote_from_waitlist() -> trigger
- promote_waitlist() -> trigger
- register_for_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_id uuid, p_materials jsonb) -> jsonb
- register_for_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_id uuid, p_materials jsonb, p_idempotency_key text) -> jsonb
- register_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_profile_id uuid) -> TABLE
- release_resource_booking_atomic(p_booking_id uuid) -> jsonb
- reserve_material_for_tour_atomic(p_tour_id uuid, p_user_id uuid, p_child_id uuid, p_material_inventory_id uuid, p_quantity integer) -> jsonb
- reserve_material_independent_atomic(p_user_id uuid, p_child_id uuid, p_material_inventory_id uuid, p_loan_date date, p_return_date date, p_quantity integer) -> jsonb
- restore_material_inventory() -> trigger
- set_updated_at() -> trigger
- set_updated_at_timestamp() -> trigger
- sync_tour_status_explicit(p_tour_id uuid) -> void
- tour_optimistic_concurrency_guard() -> trigger
- tour_update_cascade_guard() -> trigger
- trg_sync_tour_status_on_participant_change() -> trigger
- update_tour_with_occ(p_tour_id uuid, p_expected_version integer, p_payload jsonb) -> jsonb
- validate_tour_registration(p_tour_id uuid, p_user_id uuid, p_child_id uuid) -> jsonb
