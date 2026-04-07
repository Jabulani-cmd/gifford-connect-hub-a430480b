import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PortalAccessState {
  hasAccess: boolean;
  reason: string;
  trialEndDate: string | null;
  status: string | null;
  subscriptionId: string | null;
  loading: boolean;
}

export function usePortalAccess() {
  const { user, role } = useAuth();
  const [state, setState] = useState<PortalAccessState>({
    hasAccess: true,
    reason: "",
    trialEndDate: null,
    status: null,
    subscriptionId: null,
    loading: true,
  });

  useEffect(() => {
    if (!user || !role) return;

    // Only gate parent and student portals
    if (role !== "parent" && role !== "student") {
      setState(prev => ({ ...prev, hasAccess: true, reason: "non_gated_role", loading: false }));
      return;
    }

    checkAccess();
  }, [user, role]);

  const checkAccess = async () => {
    try {
      const { data, error } = await supabase.rpc("check_portal_access", {
        _user_id: user!.id,
        _role: role!,
      });

      if (error) {
        console.error("Portal access check error:", error);
        // Default to allowing access on error to not block users
        setState(prev => ({ ...prev, hasAccess: true, reason: "error", loading: false }));
        return;
      }

      const result = data as any;
      setState({
        hasAccess: result.has_access ?? true,
        reason: result.reason ?? "",
        trialEndDate: result.trial_end_date ?? null,
        status: result.status ?? null,
        subscriptionId: result.subscription_id ?? null,
        loading: false,
      });
    } catch (err) {
      console.error("Portal access exception:", err);
      setState(prev => ({ ...prev, hasAccess: true, reason: "error", loading: false }));
    }
  };

  const refreshAccess = () => {
    setState(prev => ({ ...prev, loading: true }));
    checkAccess();
  };

  return { ...state, refreshAccess };
}
