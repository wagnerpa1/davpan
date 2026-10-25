BEGIN;

DROP INDEX IF EXISTS public.idx_notifications_user_created;
DROP INDEX IF EXISTS public.idx_notifications_child_created;

DO $$
DECLARE
  policy_row record;
  policy_roles text;
  policy_command text;
  create_statement text;
BEGIN
  FOR policy_row IN
    SELECT
      pol.polname AS policy_name,
      cls.relname AS table_name,
      ns.nspname AS schema_name,
      pol.polcmd AS policy_command_code,
      pol.polroles AS policy_roles,
      pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expression
    FROM pg_policy AS pol
    JOIN pg_class AS cls ON cls.oid = pol.polrelid
    JOIN pg_namespace AS ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = 'public'
      AND pol.polname IN (
        'resource_bookings_owner_select_authenticated',
        'resource_bookings_manager_select_authenticated',
        'resource_bookings_insert_authenticated',
        'resource_bookings_owner_update_authenticated',
        'resource_bookings_owner_delete_authenticated',
        'section_members_select_authenticated',
        'family_guardianship_select_authenticated',
        'family_guardianship_manage_authenticated',
        'push_subscriptions_owner_select',
        'push_subscriptions_owner_insert',
        'push_subscriptions_owner_update',
        'push_subscriptions_owner_delete',
        'material_reservations_select_own_or_manage',
        'material_reservations_insert_own_or_manage',
        'material_reservations_update_own_or_manage',
        'material_reservations_delete_own_or_manage',
        'profiles_select',
        'resource_bookings_write_manage',
        'notification_preferences_owner_crud',
        'child_notification_preferences_parent_crud',
        'notifications_owner_select',
        'notifications_owner_update_read',
        'Admins can delete tours',
        'profiles_update_self',
        'child_profiles_linked_parent_read',
        'child_profiles_linked_parent_update'
      )
  LOOP
    policy_roles := (
      SELECT string_agg(
        CASE
          WHEN role_oid = 0 THEN 'public'
          ELSE format('%I', pg_get_userbyid(role_oid))
        END,
        ', '
      )
      FROM unnest(policy_row.policy_roles) AS roles(role_oid)
    );

    policy_command := CASE policy_row.policy_command_code
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;

    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      policy_row.policy_name,
      policy_row.schema_name,
      policy_row.table_name
    );

    create_statement := format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
      policy_row.policy_name,
      policy_row.schema_name,
      policy_row.table_name,
      policy_command,
      policy_roles
    );

    IF policy_row.using_expression IS NOT NULL THEN
      create_statement := create_statement || format(
        ' USING (%s)',
        regexp_replace(
          policy_row.using_expression,
          'auth\.([a-z_]+\(\))',
          '(SELECT auth.\1)',
          'g'
        )
      );
    END IF;

    IF policy_row.check_expression IS NOT NULL THEN
      create_statement := create_statement || format(
        ' WITH CHECK (%s)',
        regexp_replace(
          policy_row.check_expression,
          'auth\.([a-z_]+\(\))',
          '(SELECT auth.\1)',
          'g'
        )
      );
    END IF;

    EXECUTE create_statement;
  END LOOP;
END;
$$;

COMMIT;
