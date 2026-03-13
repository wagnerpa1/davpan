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
CREATE TABLE public.material_reservations (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
material_id uuid,
user_id uuid,
child_profile_id uuid,
quantity integer DEFAULT 1,
CONSTRAINT material_reservations_pkey PRIMARY KEY (id),
CONSTRAINT material_reservations_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT material_reservations_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id),
CONSTRAINT material_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
CONSTRAINT material_reservations_child_profile_id_fkey FOREIGN KEY (child_profile_id) REFERENCES public.child_profiles(id)
);
CREATE TABLE public.materials (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
name text NOT NULL,
total_quantity integer NOT NULL,
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
CONSTRAINT report_images_pkey PRIMARY KEY (id),
CONSTRAINT report_images_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.tour_reports(id)
);
CREATE TABLE public.tour_guides (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
tour_id uuid,
user_id uuid,
CONSTRAINT tour_guides_pkey PRIMARY KEY (id),
CONSTRAINT tour_guides_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id),
CONSTRAINT tour_guides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
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
category USER-DEFINED,
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
group USER-DEFINED,
min_age integer,
CONSTRAINT tours_pkey PRIMARY KEY (id),
CONSTRAINT tours_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);