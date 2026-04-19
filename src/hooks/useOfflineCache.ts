import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getOfflinePref,
  loadSection,
  saveSection,
  setOfflinePref as persistPref,
} from "@/lib/offline/db";

interface Options<T> {
  section: string;
  fetcher: () => Promise<T>;
  /** Auto-fetch on mount when online (default true). */
  autoFetch?: boolean;
}

interface State<T> {
  data: T | null;
  loading: boolean;
  fromCache: boolean;
  syncedAt: number | null;
  error: Error | null;
  offlineEnabled: boolean;
  online: boolean;
  refresh: () => Promise<void>;
  toggleOffline: (next: boolean) => Promise<void>;
}

/**
 * useOfflineCache — cache-first reader for parent & student portals.
 *
 * Behavior:
 *  - If offlineEnabled is true OR device is offline → read from IndexedDB first, then refresh in background when online.
 *  - If offlineEnabled is false AND device is online → fetch live, but still write to cache so it's available later.
 */
export function useOfflineCache<T>({ section, fetcher, autoFetch = true }: Options<T>): State<T> {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const online = useOnlineStatus();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [offlineEnabled, setOfflineEnabled] = useState(false);

  // Keep latest fetcher in a ref so callers can pass inline closures.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Load the user's preference for this section
  useEffect(() => {
    let cancelled = false;
    getOfflinePref(section, userId).then((v) => {
      if (!cancelled) setOfflineEnabled(v);
    });
    return () => {
      cancelled = true;
    };
  }, [section, userId]);

  const readCache = useCallback(async () => {
    const cached = await loadSection<T>(section, userId);
    if (cached) {
      setData(cached.data);
      setFromCache(true);
      setSyncedAt(cached.syncedAt);
    }
    return cached;
  }, [section, userId]);

  const refresh = useCallback(async () => {
    if (!online) {
      // Offline → only cache available
      await readCache();
      setLoading(false);
      return;
    }
    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      setFromCache(false);
      setError(null);
      const ts = Date.now();
      setSyncedAt(ts);
      // Always persist for next-time offline access
      await saveSection(section, userId, fresh);
    } catch (e: any) {
      setError(e);
      // Fall back to cache if live fetch failed
      await readCache();
    } finally {
      setLoading(false);
    }
  }, [online, section, userId, readCache]);

  // Initial load
  useEffect(() => {
    if (!autoFetch) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Show cached data immediately if any
      await readCache();
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, userId, online]);

  const toggleOffline = useCallback(
    async (next: boolean) => {
      setOfflineEnabled(next);
      await persistPref(section, userId, next);
      if (next && online) {
        // User just enabled — make sure we have a fresh copy to keep
        await refresh();
      }
    },
    [section, userId, online, refresh],
  );

  return {
    data,
    loading,
    fromCache,
    syncedAt,
    error,
    offlineEnabled,
    online,
    refresh,
    toggleOffline,
  };
}
