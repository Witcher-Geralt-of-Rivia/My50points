"use client";

/**
 * Legacy page wrapper for routes not yet rebuilt on the redesign primitives.
 *
 * The global FreePlayNotice ("3 TICKETS GRATIS / INDEPENDIENTES") used to be
 * rendered here above every page. It was removed from the shell (client
 * requirement); the three-ticket rule is now shown only in context, on the
 * ticket selector and the modality / help pages. Entitlement logic is
 * unaffected — it never depended on this banner.
 */
export default function AppSurface({ children, className = "" }) {
  return (
    <div className={`app-surface${className ? ` ${className}` : ""}`}>
      <div className="app-surface__inner">{children}</div>
    </div>
  );
}
