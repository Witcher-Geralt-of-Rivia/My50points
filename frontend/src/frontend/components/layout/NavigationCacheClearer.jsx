"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { notifyRouteChange } from "@/frontend/lib/navigationCache";

/**
 * Lightweight route-change signal for client data hooks (no router.refresh / cache wipe).
 */
export default function NavigationCacheClearer() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const skipNextRef = useRef(true);
  const search = searchParams.toString();

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return undefined;
    }
    notifyRouteChange(pathname);
  }, [pathname, search]);

  return null;
}
