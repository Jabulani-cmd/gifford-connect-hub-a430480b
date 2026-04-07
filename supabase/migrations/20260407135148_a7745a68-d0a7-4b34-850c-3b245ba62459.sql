
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 10000;

CREATE OR REPLACE FUNCTION public.auto_invoice_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fee RECORD;
  v_invoice_id uuid;
  v_invoice_number text;
  v_total_usd numeric := 0;
  v_total_zig numeric := 0;
  v_academic_year text := to_char(now(), 'YYYY');
  v_term text := 'Term 1';
  v_has_fees boolean := false;
BEGIN
  IF NEW.status != 'active' OR NEW.form IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXTRACT(MONTH FROM now()) BETWEEN 1 AND 4 THEN
    v_term := 'Term 1';
  ELSIF EXTRACT(MONTH FROM now()) BETWEEN 5 AND 8 THEN
    v_term := 'Term 2';
  ELSE
    v_term := 'Term 3';
  END IF;

  IF EXISTS (
    SELECT 1 FROM invoices
    WHERE student_id = NEW.id
      AND academic_year = v_academic_year
      AND term = v_term
  ) THEN
    RETURN NEW;
  END IF;

  FOR v_fee IN
    SELECT * FROM fee_structures
    WHERE is_active = true
      AND academic_year = v_academic_year
      AND term = v_term
      AND form = NEW.form
      AND (boarding_status = COALESCE(NEW.boarding_status, 'day'))
  LOOP
    v_total_usd := v_total_usd + v_fee.amount_usd;
    v_total_zig := v_total_zig + v_fee.amount_zig;
    v_has_fees := true;
  END LOOP;

  IF NOT v_has_fees THEN
    RETURN NEW;
  END IF;

  v_invoice_number := 'INV-' || RIGHT(v_academic_year, 2) || '-' || REPLACE(v_term, 'Term ', 'T') || '-' || LPAD(nextval('invoice_number_seq'::regclass)::text, 5, '0');

  INSERT INTO invoices (
    invoice_number, student_id, academic_year, term,
    total_usd, total_zig, paid_usd, paid_zig, status
  ) VALUES (
    v_invoice_number, NEW.id, v_academic_year, v_term,
    v_total_usd, v_total_zig, 0, 0, 'unpaid'
  ) RETURNING id INTO v_invoice_id;

  FOR v_fee IN
    SELECT * FROM fee_structures
    WHERE is_active = true
      AND academic_year = v_academic_year
      AND term = v_term
      AND form = NEW.form
      AND (boarding_status = COALESCE(NEW.boarding_status, 'day'))
  LOOP
    INSERT INTO invoice_items (invoice_id, fee_structure_id, description, amount_usd, amount_zig)
    VALUES (
      v_invoice_id,
      v_fee.id,
      COALESCE(v_fee.description, v_fee.form || ' - ' || CASE WHEN v_fee.boarding_status = 'boarding' THEN 'Boarding' ELSE 'Day' END || ' Fees'),
      v_fee.amount_usd,
      v_fee.amount_zig
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
