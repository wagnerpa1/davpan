-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.child_notification_preferences (
id uuid NOT NULL DEFAULT gen_random_uuid(),
child_id uuid NOT NULL UNIQUE,
parent_id uuid NOT NULL,
news_enabled boolean NOT NULL DEFAULT true,
system_enabled boolean NOT NULL DEFAULT true,
material_enabled boolean NOT NULL DEFAULT true,
comments_enabled boolean NOT NULL DEFAULT true,
group_notifications_enabled boolean NOT NULL DEFAULT true,
tour_group_ids ARRAY NOT NULL DEFAULT '{}'::uuid[],
push_enabled boolean NOT NULL DEFAULT false,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT child_notification_preferences_pkey PRIMARY KEY (id),
CONSTRAINT child_notification_preferences_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.child_profiles(id),
CONSTRAINT child_notification_preferences_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.child_profiles (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
parent_id uuid,
full_name text NOT NULL,
birthdate date NOT NULL,
created_at timestamp without time zone DEFAULT now(),
medical_notes text,
image_consent boolean DEFAULT false,
CONSTRAINT child_profiles_pkey PRIMARY KEY (id),
CONSTRAINT child_profiles_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.documents (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
title text NOT NULL,
file_url text NOT NULL,
category text,
created_at timestamp without time zone DEFAULT now(),
CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.material_inventory (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
material_type_id uuid,
size text,
quantity_total integer NOT NULL,
quantity_available integer NOT NULL,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT material_inventory_pkey PRIMARY KEY (id),
CONSTRAINT material_inventory_material_type_id_fkey FOREIGN KEY (material_type_id) REFERENCES public.material_types(id)
);
CREATE TABLE public.material_pricing (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
material_type_id uuid,
price_day numeric,
price_extra_day numeric,
price_week numeric,
CONSTRAINT material_pricing_pkey PRIMARY KEY (id),
CONSTRAINT material_pricing_material_type_id_fkey FOREIGN KEY (material_type_id) REFERENCES public.material_types(id)
);
CREATE TABLE public.material_reservations (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
material_inventory_id uuid,
user_id uuid,
child_profile_id uuid,
quantity integer DEFAULT 1,
status text DEFAULT 'reserved'::text,
loan_date date,
return_date date,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT material_reservations_pkey PRIMARY KEY (id),
CONSTRAINT material_reservations_tour_id_fkey1 FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT material_reservations_material_inventory_id_fkey FOREIGN KEY (material_inventory_id) REFERENCES public.material_inventory(id),
CONSTRAINT material_reservations_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public.profiles(id),
CONSTRAINT material_reservations_child_profile_id_fkey1 FOREIGN KEY (child_profile_id) REFERENCES public.child_profiles(id)
);
CREATE TABLE public.material_types (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
name text NOT NULL,
description text,
category text,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT material_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.materials (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
name USER-DEFINED NOT NULL,
total_quantity integer NOT NULL,
size USER-DEFINED,
price_day integer,
price_extraday integer,
price_week integer,
CONSTRAINT materials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.news_posts (
id uuid NOT NULL DEFAULT gen_random_uuid(),
title text NOT NULL,
content text NOT NULL,
image_url text,
published_by uuid NOT NULL,
published_at timestamp with time zone NOT NULL DEFAULT now(),
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT news_posts_pkey PRIMARY KEY (id),
CONSTRAINT news_posts_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.notification_preferences (
id uuid NOT NULL DEFAULT gen_random_uuid(),
user_id uuid NOT NULL UNIQUE,
news_enabled boolean NOT NULL DEFAULT true,
system_enabled boolean NOT NULL DEFAULT true,
material_enabled boolean NOT NULL DEFAULT true,
comments_enabled boolean NOT NULL DEFAULT true,
group_notifications_enabled boolean NOT NULL DEFAULT true,
tour_group_ids ARRAY NOT NULL DEFAULT '{}'::uuid[],
push_enabled boolean NOT NULL DEFAULT false,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
id uuid NOT NULL DEFAULT gen_random_uuid(),
type text NOT NULL CHECK (type = ANY (ARRAY['news'::text, 'tour_new'::text, 'tour_update'::text, 'registration'::text, 'waitlist'::text, 'material'::text, 'comment'::text, 'system'::text])),
title text NOT NULL,
body text NOT NULL,
payload jsonb NOT NULL DEFAULT '{}'::jsonb,
recipient_user_id uuid,
recipient_child_id uuid,
related_tour_id uuid,
related_group_id uuid,
news_post_id uuid,
read_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT notifications_pkey PRIMARY KEY (id),
CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id),
CONSTRAINT notifications_recipient_child_id_fkey FOREIGN KEY (recipient_child_id) REFERENCES public.child_profiles(id),
CONSTRAINT notifications_related_tour_id_fkey FOREIGN KEY (related_tour_id) REFERENCES public.tours(id),
CONSTRAINT notifications_related_group_id_fkey FOREIGN KEY (related_group_id) REFERENCES public.tour_groups(id),
CONSTRAINT notifications_news_post_id_fkey FOREIGN KEY (news_post_id) REFERENCES public.news_posts(id)
);
CREATE TABLE public.profiles (
id uuid NOT NULL,
full_name text NOT NULL,
phone text,
birthdate date,
medical_notes text,
emergency_phone text,
role USER-DEFINED DEFAULT 'member'::user_role,
image_consent boolean DEFAULT false,
created_at timestamp without time zone DEFAULT now(),
CONSTRAINT profiles_pkey PRIMARY KEY (id),
CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.push_subscriptions (
id uuid NOT NULL DEFAULT gen_random_uuid(),
user_id uuid NOT NULL,
endpoint text NOT NULL UNIQUE,
p256dh text NOT NULL,
auth text NOT NULL,
user_agent text,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
last_used_at timestamp with time zone,
disabled_at timestamp with time zone,
CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.report_images (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
report_id uuid,
image_url text NOT NULL,
order_index integer,
CONSTRAINT report_images_pkey PRIMARY KEY (id),
CONSTRAINT report_images_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.tour_reports(id)
);
CREATE TABLE public.resource_bookings (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
resource_id uuid,
tour_id uuid,
start_date timestamp with time zone,
end_date timestamp with time zone,
status text DEFAULT 'requested'::text,
created_by uuid,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT resource_bookings_pkey PRIMARY KEY (id),
CONSTRAINT resource_bookings_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id),
CONSTRAINT resource_bookings_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT resource_bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.resources (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
name text NOT NULL,
description text,
type text,
capacity integer,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT resources_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tour_categorys (
id uuid NOT NULL DEFAULT gen_random_uuid(),
category text,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT tour_categorys_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tour_groups (
id uuid NOT NULL DEFAULT gen_random_uuid(),
group_name text,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT tour_groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tour_guides (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
user_id uuid,
CONSTRAINT tour_guides_pkey PRIMARY KEY (id),
CONSTRAINT tour_guides_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT tour_guides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.tour_material_requirements (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
material_type_id uuid,
CONSTRAINT tour_material_requirements_pkey PRIMARY KEY (id),
CONSTRAINT tour_material_requirements_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT tour_material_requirements_material_type_id_fkey FOREIGN KEY (material_type_id) REFERENCES public.material_types(id)
);
CREATE TABLE public.tour_materials (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
material_id uuid,
CONSTRAINT tour_materials_pkey PRIMARY KEY (id),
CONSTRAINT tour_materials_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT tour_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id)
);
CREATE TABLE public.tour_participants (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
user_id uuid,
child_profile_id uuid,
status USER-DEFINED DEFAULT 'pending'::participant_status,
age_override boolean DEFAULT false,
created_at timestamp without time zone DEFAULT now(),
waitlist_position integer,
CONSTRAINT tour_participants_pkey PRIMARY KEY (id),
CONSTRAINT tour_participants_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT tour_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
CONSTRAINT tour_participants_child_profile_id_fkey FOREIGN KEY (child_profile_id) REFERENCES public.child_profiles(id)
);
CREATE TABLE public.tour_reports (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
title text,
report_text text,
created_by uuid,
created_at timestamp without time zone DEFAULT now(),
CONSTRAINT tour_reports_pkey PRIMARY KEY (id),
CONSTRAINT tour_reports_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT tour_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.tours (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
title text NOT NULL,
description text,
difficulty USER-DEFINED DEFAULT 'Keine'::tour_difficulty,
target_area text,
requirements text,
meeting_point text,
meeting_time time without time zone,
start_date date NOT NULL,
end_date date,
elevation integer,
distance numeric,
duration_hours numeric,
cost_info text,
max_participants integer,
status USER-DEFINED DEFAULT 'planning'::tour_status,
created_by uuid,
created_at timestamp without time zone DEFAULT now(),
min_age integer,
group uuid,
category uuid,
CONSTRAINT tours_pkey PRIMARY KEY (id),
CONSTRAINT tours_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
CONSTRAINT tours_group_fkey FOREIGN KEY (group) REFERENCES public.tour_groups(id),
CONSTRAINT tours_category_fkey FOREIGN KEY (category) REFERENCES public.tour_categorys(id)
);

Enum TYPES:

user_role	member, guide, materialwart, admin, parent

tour_status	planning, open, full, completed

participant_status	pending, confirmed, waitlist, cancelled

tour_difficulty	T1, T2, T3, T4, B1, B2, B3, B4, L, WS, ZS, K1, K2, K3, K4, WT1, WT2, WT3, WT4, WT5, ST2, ST3, S0, S1, S2, S3, S4, S5, UIAA 1, UIAA 2, UIAA 3, UIAA 4, UIAA 5, UIAA 6, UIAA 7, UIAA 8, Keine

material_status	reserved, on loan, returned

Database Indexes:

Table	Columns	Name
child_notification_preferences

child_id

child_notification_preferences_child_id_key

child_notification_preferences

id

child_notification_preferences_pkey

child_profiles

id

child_profiles_pkey

documents

id

documents_pkey

child_profiles

parent_id

idx_child_profiles_parent_id

news_posts

published_at

idx_news_posts_published_at

notifications

recipient_child_id, created_at

idx_notifications_child_created

notifications

recipient_child_id

idx_notifications_unread_child

notifications

recipient_user_id

idx_notifications_unread_user

notifications

recipient_user_id, created_at

idx_notifications_user_created

push_subscriptions

user_id

idx_push_subscriptions_active

push_subscriptions

user_id

idx_push_subscriptions_user

report_images

report_id

idx_report_images_report_id

tour_guides

tour_id

idx_tour_guides_tour_id

tour_guides

user_id

idx_tour_guides_user_id

tour_materials

material_id

idx_tour_materials_material_id

tour_materials

tour_id

idx_tour_materials_tour_id

tour_participants

child_profile_id

idx_tour_participants_child_profile_id

tour_participants

tour_id

idx_tour_participants_tour_id

tour_participants

tour_id, status

idx_tour_participants_tour_status

tour_participants

user_id

idx_tour_participants_user_id

tour_reports

created_at

idx_tour_reports_created_at

tour_reports

created_by

idx_tour_reports_created_by

tour_reports

tour_id

idx_tour_reports_tour_id

tours

created_by

idx_tours_created_by

tours

end_date

idx_tours_end_date

tours

status

idx_tours_status

tours

status, start_date

idx_tours_status_start_date

tour_participants

tour_id, status, waitlist_position

idx_waitlist_lookup

material_inventory

id

material_inventory_pkey

material_pricing

id

material_pricing_pkey

material_reservations

id

material_reservations_pkey1

material_types

id

material_types_pkey

materials

id

materials_pkey

news_posts

id

news_posts_pkey

notification_preferences

id

notification_preferences_pkey

notification_preferences

user_id

notification_preferences_user_id_key

notifications

id

notifications_pkey

profiles

id

profiles_pkey

push_subscriptions

endpoint

push_subscriptions_endpoint_key

push_subscriptions

id

push_subscriptions_pkey

report_images

id

report_images_pkey

resource_bookings

id

resource_bookings_pkey

resources

id

resources_pkey

tour_categorys

id

tour_categorys_pkey

tour_groups

id

tour_groups_pkey

tour_guides

id

tour_guides_pkey

tour_material_requirements

id

tour_material_requirements_pkey

tour_materials

id

tour_materials_pkey

tour_participants

id

tour_participants_pkey

tour_reports

id

tour_reports_pkey

tours

id

tours_pkey

tour_participants

tour_id, user_id, child_profile_id

unique_participant

tour_guides

tour_id, user_id

ux_tour_guides_tour_user

tour_participants

tour_id, user_id, (expression)

ux_tour_participants_unique_registration

triggers:
Name	Table	Function	Events	Orientation	Enabled

trg_child_notification_preferences_updated_at
child_notification_preferences
set_updated_at
BEFORE UPDATE
ROW



trg_news_posts_updated_at
news_posts
set_updated_at
BEFORE UPDATE
ROW



trg_notification_preferences_updated_at
notification_preferences
set_updated_at
BEFORE UPDATE
ROW



trg_push_subscriptions_updated_at
push_subscriptions
set_updated_at
BEFORE UPDATE
ROW



trigger_promote_waitlist
tour_participants
promote_waitlist
AFTER UPDATE
ROW



trigger_waitlist_position
tour_participants
assign_waitlist_position
BEFORE INSERT
ROW

function:
[
{
"schema_name": "public",
"function_name": "assign_waitlist_position",
"args": "",
"result_type": "trigger",
"definition": "CREATE OR REPLACE FUNCTION public.assign_waitlist_position()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\ndeclare\r\n    next_pos integer;\r\nbegin\r\n\r\n    if new.status = 'waitlist' then\r\n\r\n        select coalesce(max(waitlist_position),0)+1\r\n        into next_pos\r\n        from tour_participants\r\n        where tour_id = new.tour_id\r\n        and status = 'waitlist';\r\n\r\n        new.waitlist_position := next_pos;\r\n\r\n    end if;\r\n\r\n    return new;\r\n\r\nend;\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "can_manage_tour",
"args": "tour_uuid uuid",
"result_type": "boolean",
"definition": "CREATE OR REPLACE FUNCTION public.can_manage_tour(tour_uuid uuid)\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\n  select\r\n    public.is_admin()\r\n    or exists (\r\n      select 1\r\n      from public.tours t\r\n      where t.id = tour_uuid and t.created_by = auth.uid()\r\n    )\r\n    or exists (\r\n      select 1\r\n      from public.tour_guides tg\r\n      where tg.tour_id = tour_uuid and tg.user_id = auth.uid()\r\n    )\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "check_material_availability",
"args": "",
"result_type": "trigger",
"definition": "CREATE OR REPLACE FUNCTION public.check_material_availability()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\ndeclare\r\n    total_reserved integer;\r\n    max_available integer;\r\nbegin\r\n\r\n    select coalesce(sum(quantity),0)\r\n    into total_reserved\r\n    from material_reservations\r\n    where material_id = new.material_id\r\n    and tour_id = new.tour_id;\r\n\r\n    select total_quantity\r\n    into max_available\r\n    from materials\r\n    where id = new.material_id;\r\n\r\n    if (total_reserved + new.quantity) > max_available then\r\n        raise exception 'Material not available in requested quantity';\r\n    end if;\r\n\r\n    return new;\r\n\r\nend;\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "current_user_role",
"args": "",
"result_type": "user_role",
"definition": "CREATE OR REPLACE FUNCTION public.current_user_role()\n RETURNS user_role\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\n  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'member'::public.user_role)\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "guide_can_see_child",
"args": "child_uuid uuid",
"result_type": "boolean",
"definition": "CREATE OR REPLACE FUNCTION public.guide_can_see_child(child_uuid uuid)\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\n  select exists (\n    select 1\n    from public.tour_participants tp\n    join public.tour_guides tg on tg.tour_id = tp.tour_id\n    where tp.child_profile_id = child_uuid\n      and tg.user_id = auth.uid()\n  )\n  or (\n    select coalesce(\n      (select true from public.profiles pa\n       where pa.id = auth.uid() and pa.role = 'admin'),\n      false\n    )\n  )\n$function$\n"
},
{
"schema_name": "public",
"function_name": "is_admin",
"args": "",
"result_type": "boolean",
"definition": "CREATE OR REPLACE FUNCTION public.is_admin()\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\n  select public.current_user_role() = 'admin'::public.user_role\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "is_guide_or_admin",
"args": "",
"result_type": "boolean",
"definition": "CREATE OR REPLACE FUNCTION public.is_guide_or_admin()\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\n  select public.current_user_role() in ('guide'::public.user_role, 'admin'::public.user_role)\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "is_materialwart_or_admin",
"args": "",
"result_type": "boolean",
"definition": "CREATE OR REPLACE FUNCTION public.is_materialwart_or_admin()\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\n  select public.current_user_role()::text in ('materialwart', 'admin')\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "is_parent_of_child",
"args": "child_uuid uuid",
"result_type": "boolean",
"definition": "CREATE OR REPLACE FUNCTION public.is_parent_of_child(child_uuid uuid)\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\n  select exists (\n    select 1 from public.child_profiles cp\n    where cp.id = child_uuid and cp.parent_id = auth.uid()\n  )\n$function$\n"
},
{
"schema_name": "public",
"function_name": "limit_report_images",
"args": "",
"result_type": "trigger",
"definition": "CREATE OR REPLACE FUNCTION public.limit_report_images()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\ndeclare\r\n    image_count integer;\r\nbegin\r\n\r\n    select count(*)\r\n    into image_count\r\n    from report_images\r\n    where report_id = new.report_id;\r\n\r\n    if image_count >= 20 then\r\n        raise exception 'Maximum 20 images allowed';\r\n    end if;\r\n\r\n    return new;\r\n\r\nend;\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "promote_waitlist",
"args": "",
"result_type": "trigger",
"definition": "CREATE OR REPLACE FUNCTION public.promote_waitlist()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\ndeclare\r\n    next_participant uuid;\r\nbegin\r\n\r\n    if new.status = 'cancelled' then\r\n\r\n        select id\r\n        into next_participant\r\n        from tour_participants\r\n        where tour_id = new.tour_id\r\n        and status = 'waitlist'\r\n        order by waitlist_position asc\r\n        limit 1;\r\n\r\n        if next_participant is not null then\r\n\r\n            update tour_participants\r\n            set status = 'pending',\r\n                waitlist_position = null\r\n            where id = next_participant;\r\n\r\n        end if;\r\n\r\n    end if;\r\n\r\n    return new;\r\n\r\nend;\r\n$function$\n"
},
{
"schema_name": "public",
"function_name": "set_updated_at",
"args": "",
"result_type": "trigger",
"definition": "CREATE OR REPLACE FUNCTION public.set_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$function$\n"
}
]