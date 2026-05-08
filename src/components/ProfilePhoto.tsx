import { useEffect, useState } from "react";
import { getSignedProfilePhotoUrl } from "@/lib/photoUrl";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  fallback?: React.ReactNode;
};

/**
 * Resolves a stored profile-photo URL to a short-lived signed URL before rendering.
 * Renders the optional fallback when no URL is set or resolution fails.
 */
export function ProfilePhoto({ src, fallback = null, alt = "", ...rest }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (!src) {
      setResolved(null);
      return;
    }
    getSignedProfilePhotoUrl(src).then((u) => {
      if (!cancelled) setResolved(u);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || failed || !resolved) {
    return <>{fallback}</>;
  }

  return <img src={resolved} alt={alt} onError={() => setFailed(true)} {...rest} />;
}
