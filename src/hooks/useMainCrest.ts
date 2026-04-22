// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultCrest from "@/assets/school-logo.png";

/**
 * Returns the active main school crest URL (admin-overridable),
 * falling back to the bundled default crest.
 */
export function useMainCrest(): string {
  const [url, setUrl] = useState<string>(defaultCrest);

  useEffect(() => {
    let active = true;
    supabase
      .from("site_logos")
      .select("image_url")
      .eq("slot_key", "main_crest")
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.image_url) setUrl(data.image_url);
      });
    return () => {
      active = false;
    };
  }, []);

  return url;
}
