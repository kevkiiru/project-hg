-- Hiregari integrity layer: extensions, temporal exclusion constraints,
-- immutability triggers. Idempotent (safe to re-run). Applied after every
-- schema push/migration because ORMs cannot express btree_gist exclusions.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;

-- ─────────────────────────────────────────────────────────────────────────
-- Overlap prevention: CONFIRMED-class bookings may never overlap on a vehicle.
-- Paying / about-to-start states occupy the car; PENDING_HOST requests do NOT
-- hard-block (two requests may coexist; only one can win the hold at payment).
DROP TRIGGER IF EXISTS trg_block_booking_overlap ON bookings;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ex_bookings_vehicle_range;
ALTER TABLE bookings
  ADD CONSTRAINT ex_bookings_vehicle_range
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(scheduled_pickup_at, scheduled_return_at, '[)') WITH &&
  )
  WHERE (status IN ('PAYMENT_PENDING','CONFIRMED','PICKUP_PENDING','ACTIVE','RETURN_PENDING'));

-- ACTIVE holds cannot overlap each other; expired holds are flipped by the
-- sweeper before any conflict decision, so this predicate stays immutable.
ALTER TABLE booking_holds DROP CONSTRAINT IF EXISTS ex_active_holds_range;
ALTER TABLE booking_holds
  ADD CONSTRAINT ex_active_holds_range
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status = 'ACTIVE');

-- Manual / maintenance blocks never overlap themselves per vehicle.
ALTER TABLE availability_blocks DROP CONSTRAINT IF EXISTS ex_blocks_vehicle_range;
ALTER TABLE availability_blocks
  ADD CONSTRAINT ex_blocks_vehicle_range
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Append-only financial/audit/evidence tables.
CREATE OR REPLACE FUNCTION hg_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only; create a reversing/new record instead', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ledger_entries',
    'audit_logs',
    'booking_status_history',
    'inspection_photos',
    'booking_price_snapshots',
    'booking_price_items'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_immutable ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_immutable BEFORE UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION hg_reject_mutation()', t);
  END LOOP;
END $$;

-- booking_price_snapshots also must not be deleted (covered by UPDATE/DELETE
-- trigger above). Inspections themselves allow new amendment rows only; their
-- photos are immutable; signing fields can be set once.
CREATE OR REPLACE FUNCTION hg_pickup_sign_once() RETURNS trigger AS $$
BEGIN
  IF OLD.renter_signed_at IS NOT NULL AND NEW.renter_signed_at IS DISTINCT FROM OLD.renter_signed_at THEN
    RAISE EXCEPTION 'pickup renter signature is immutable; record an amendment';
  END IF;
  IF OLD.host_signed_at IS NOT NULL AND NEW.host_signed_at IS DISTINCT FROM OLD.host_signed_at THEN
    RAISE EXCEPTION 'pickup host signature is immutable; record an amendment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pickup_sign_once ON pickup_inspections;
CREATE TRIGGER trg_pickup_sign_once
  BEFORE UPDATE ON pickup_inspections
  FOR EACH ROW EXECUTE FUNCTION hg_pickup_sign_once();

-- Deposit invariant: released + deducted may never exceed the taken amount.
ALTER TABLE deposits DROP CONSTRAINT IF EXISTS chk_deposit_amounts;
ALTER TABLE deposits
  ADD CONSTRAINT chk_deposit_amounts
  CHECK (released_cents >= 0 AND deducted_cents >= 0
         AND released_cents + deducted_cents <= amount_cents);

-- Non-negative money checks on the core money columns.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE column_name LIKE '%_cents' AND data_type = 'integer'
      AND table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS chk_nonneg_%I', r.table_name, r.column_name);
    -- signed columns (adjustments, ledger-internal) are excluded.
    CONTINUE WHEN r.table_name = 'booking_adjustments';
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT chk_nonneg_%I CHECK (%I >= 0)',
      r.table_name, r.column_name, r.column_name);
  END LOOP;
END $$;
