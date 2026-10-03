import { useEffect, useState } from "react";

/** Object URL for a pending file, revoked when it changes. */
export function useObjectUrl(file: File | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}
