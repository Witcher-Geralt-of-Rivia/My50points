"use client";

import { usePathname } from "next/navigation";
import FreePlayNotice from "@/frontend/components/layout/FreePlayNotice";
import { useAuth } from "@/frontend/contexts/AuthContext";

function isWorkflowTracksPath(pathname) {
  return /^\/modalidades\/(guest|free|paid|special)\/?$/.test(pathname || "");
}

function isProfilePath(pathname) {
  return pathname === "/profile" || /^\/profile\/[^/]+/.test(pathname || "");
}

/**
 * Shared page shell matching the /statistics (MIS TICKETS) visual system.
 */
export default function AppSurface({ children, className = "" }) {
  const pathname = usePathname() || "";
  const { isAuthenticated } = useAuth();
  const showFreePlayNotice =
    isAuthenticated && !isWorkflowTracksPath(pathname) && !isProfilePath(pathname);

  return (
    <div className={`app-surface${className ? ` ${className}` : ""}`}>
      <div className="app-surface__inner">
        {showFreePlayNotice ? (
          <div className="app-surface__chrome">
            <FreePlayNotice />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
