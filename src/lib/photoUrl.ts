import { supabase } from "@/integrations/supabase/client";

/**
 * Profile photos live in a private storage bucket. Public URLs no longer work
 * for student-folder objects. This helper extracts the storage path from a
 * stored URL and creates a short-lived signed URL.
 *
 * Falls back to the original URL if it can't be parsed (e.g. external URLs,
 * non-storage paths, or already-signed URLs).
 */
export async function getSignedProfilePhotoUrl(
  url: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!url) return null;

  // Already a signed URL — leave it alone
  if (url.includes("/object/sign/")) return url;

  // External or data URL — leave alone
  if (!url.includes("/profile-photos/")) return url;

  // Extract path after /profile-photos/
  const match = url.match(/\/profile-photos\/(.+?)(?:\?|$)/);
  if (!match) return url;
  const path = decodeURIComponent(match[1]);

  const { data, error } = await supabase
    .storage
    .from("profile-photos")
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    // Last resort: return original (may 404 for student photos when bucket is private)
    return url;
  }
  return data.signedUrl;
}
