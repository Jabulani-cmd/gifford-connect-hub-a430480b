// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteLogo = {
  id: string;
  slot_key: string;
  section: string;
  label: string;
  sub_label: string | null;
  image_url: string | null;
  display_order: number;
};

export function useSiteLogos(section: string) {
  const [logos, setLogos] = useState<SiteLogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("site_logos")
      .select("*")
      .eq("section", section)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (active && data) setLogos(data as any);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [section]);

  return { logos, loading };
}
