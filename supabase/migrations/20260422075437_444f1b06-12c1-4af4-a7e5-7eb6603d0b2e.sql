-- Site logos table for admin-managed brand logos
CREATE TABLE IF NOT EXISTS public.site_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL UNIQUE,
  section text NOT NULL,
  label text NOT NULL,
  sub_label text,
  image_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active site logos"
  ON public.site_logos FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage site logos - insert"
  ON public.site_logos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage site logos - update"
  ON public.site_logos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage site logos - delete"
  ON public.site_logos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed default slots
INSERT INTO public.site_logos (slot_key, section, label, sub_label, display_order) VALUES
  ('affiliate_cambridge', 'affiliated', 'Cambridge Assessment', 'International Education', 1),
  ('affiliate_moe', 'affiliated', 'Ministry of Education', 'Primary & Secondary — Zimbabwe', 2),
  ('affiliate_zimsec', 'affiliated', 'ZIMSEC', 'Zimbabwe Schools Examinations Council', 3),
  ('highlight_excellence', 'highlights', 'Academic Excellence', 'Cambridge & ZIMSEC curriculum with outstanding pass rates.', 1),
  ('highlight_sports', 'highlights', 'Sporting Achievements', 'Provincial and national champions in rugby, soccer, and athletics.', 2),
  ('highlight_community', 'highlights', 'Vibrant Community', 'Over 20 clubs and societies fostering holistic student development.', 3),
  ('highlight_heritage', 'highlights', 'Rich Heritage', 'Decades of tradition shaping tomorrow''s leaders since 1927.', 4),
  ('quicklink_academics', 'quicklinks', 'Academics', 'Curriculum & programmes', 1),
  ('quicklink_admissions', 'quicklinks', 'Admissions', 'Apply to join us', 2),
  ('quicklink_schoollife', 'quicklinks', 'School Life', 'Beyond the classroom', 3)
ON CONFLICT (slot_key) DO NOTHING;