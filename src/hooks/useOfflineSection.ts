// Lightweight wrapper that gives any tab offline cache + status badge in ~3 LOC.
// Pattern:
//   const offline = useOfflineSection({ section: "student.marks", userId, fetcher: async () => {
//     const { data } = await supabase.from("marks").select("...").eq("student_id", studentId);
//     setMarks(data || []);
//     return data || [];
//   }, restore: (cached) => setMarks(cached) });
//   ...
//   <OfflineStatusBadge {...offline} />

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOfflinePref,
  loadSection,
  saveSection,
  setOfflinePref as persistPref,
} from "@/lib/offline/db";
import { useOnlineStatus } from "./useOnlineStatus";

interface Args<T> {
  section: string;
  userId: string | null | undefined;
  /** Live fetcher; should also commit to component state. Return the value to cache. */
  fetcher: () => Promise<T>;
  /** Apply cached value to component state (when device is offline / fetch fails). */
  restore: (cached: T) => void;
  /** Re-run when these deps change (mirrors a useEffect dep array). */
  deps?: ReadonlyArray<unknown>;
}

interface Returns {
  online: boolean;
  fromCache: boolean;
  syncedAt: number | null;
  offlineEnabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  toggleOffline: (next: boolean) => Promise<void>;
}

export function useOfflineSection<T>({
  section,
  userId,
  fetcher,
  restore,
  deps = [],
}: Args<T>): Returns {
  const online = useOnlineStatus();
  const [fromCache, setFromCache] = useState(false);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  // Load offline preference once per (section,user)
  useEffect(() => {
    let cancelled = false;
    getOfflinePref(section, userId).then((v) => {
      if (!cancelled) setOfflineEnabled(v);
    });
    return () => {
      cancelled = true;
    };
  }, [section, userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (online) {
      try {
        const fresh = await fetcherRef.current();
        await saveSection(section, userId, fresh);
        setFromCache(false);
        setSyncedAt(Date.now());
        setLoading(false);
        return;
      } catch (e) {
        console.warn(`[offline] live fetch failed for ${section}`, e);
        // Fall through to cache
      }
    }
    const cached = await loadSection<T>(section, userId);
    if (cached) {
      restoreRef.current(cached.data);
      setFromCache(true);
      setSyncedAt(cached.syncedAt);
    }
    setLoading(false);
  }, [online, section, userId]);

  // Auto-fetch on mount + dep change
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, section, userId, ...deps]);

  const toggleOffline = useCallback(
    async (next: boolean) => {
      setOfflineEnabled(next);
      await persistPref(section, userId, next);
      if (next && online) await refresh();
    },
    [online, section, userId, refresh],
  );

  return { online, fromCache, syncedAt, offlineEnabled, loading, refresh, toggleOffline };
}
