-- ============================================================
--  ADD ON DELETE CASCADE TO ALL auth.users FOREIGN KEYS
--  Fixes: "Database error deleting user" in Supabase Auth
--
--  Safe to run multiple times — skips constraints that already
--  have CASCADE, discovers constraint names dynamically.
-- ============================================================

BEGIN;

DO $$
DECLARE
  r          RECORD;
  fk_cols    TEXT;
BEGIN
  FOR r IN
    SELECT
      tc.table_schema                          AS schema_name,
      tc.table_name,
      tc.constraint_name,
      string_agg(kcu.column_name, ', '
        ORDER BY kcu.ordinal_position)         AS column_names,
      rc.delete_rule
    FROM information_schema.table_constraints   tc
    JOIN information_schema.key_column_usage    kcu
      ON  kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema    = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON  rc.constraint_name  = tc.constraint_name
    JOIN information_schema.key_column_usage    ccu
      ON  ccu.constraint_name = rc.unique_constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema   = 'auth'
      AND ccu.table_name     = 'users'
    GROUP BY
      tc.table_schema, tc.table_name,
      tc.constraint_name, rc.delete_rule
    ORDER BY tc.table_name
  LOOP
    IF r.delete_rule = 'CASCADE' THEN
      RAISE NOTICE 'SKIP %.% — constraint "%" already CASCADE',
        r.schema_name, r.table_name, r.constraint_name;
      CONTINUE;
    END IF;

    RAISE NOTICE 'PATCHING %.% — constraint "%" (was %) → CASCADE',
      r.schema_name, r.table_name, r.constraint_name, r.delete_rule;

    -- Drop old constraint
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.schema_name, r.table_name, r.constraint_name
    );

    -- Rebuild with ON DELETE CASCADE
    -- Use the discovered column name(s) verbatim
    fk_cols := r.column_names;
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES auth.users(id) ON DELETE CASCADE',
      r.schema_name, r.table_name, r.constraint_name, fk_cols
    );
  END LOOP;

  RAISE NOTICE 'Done — all auth.users FK constraints now have ON DELETE CASCADE';
END $$;

COMMIT;
