INSERT INTO public.site_logos (slot_key, section, label, sub_label, display_order, is_active)
VALUES ('main_crest', 'branding', 'Main School Crest', 'Used as the primary logo across the site (footer, headers, login, hero fallbacks).', 0, true)
ON CONFLICT (slot_key) DO NOTHING;