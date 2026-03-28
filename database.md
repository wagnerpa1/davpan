-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
CREATE TABLE public.material_reservations_old (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
material_id uuid,
user_id uuid,
child_profile_id uuid,
quantity integer DEFAULT 1,
size USER-DEFINED,
loan_date date,
return_date date,
material_status USER-DEFINED,
CONSTRAINT material_reservations_old_pkey PRIMARY KEY (id),
CONSTRAINT material_reservations_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT material_reservations_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id),
CONSTRAINT material_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
CONSTRAINT material_reservations_child_profile_id_fkey FOREIGN KEY (child_profile_id) REFERENCES public.child_profiles(id)
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

user_role	member, guide, admin, parent

tour_status	planning, open, full, completed

participant_status	pending, confirmed, waitlist, cancelled

tour_difficulty	T1, T2, T3, T4, B1, B2, B3, B4, L, WS, ZS, K1, K2, K3, K4, WT1, WT2, WT3, WT4, WT5, ST2, ST3, S0, S1, S2, S3, S4, S5, UIAA 1, UIAA 2, UIAA 3, UIAA 4, UIAA 5, UIAA 6, UIAA 7, UIAA 8, Keine

material_status	reserved, on loan, returned