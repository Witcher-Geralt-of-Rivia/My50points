"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import SiteNav from "@/frontend/components/nav/SiteNav";
import SiteFooter from "@/frontend/components/nav/SiteFooter";
import AppSurface from "@/frontend/components/layout/AppSurface";

/**
 * Routes built on the redesign primitives. They own their layout (containers,
 * spacing) and render directly inside <main>. Every other route keeps the
 * legacy AppSurface wrapper so its existing spacing still works — but all
 * routes now share the same arena canvas and the same global navigation.
 */
function isRedesignedPath(pathname) {
  const p = pathname || "/";
  return (
    p === "/" ||
    p === "/tournaments" ||
    p.startsWith("/tournament/") ||
    p === "/leaderboard" ||
    // /profile/<id> is the legacy public profile: it keeps the legacy wrapper.
    p === "/profile" ||
    p === "/login" ||
    p === "/register" ||
    p === "/modalidades" ||
    p.startsWith("/modalidades/")
  );
}

/**
 * Global shell. The navigation (SiteNav) renders on EVERY route — including
 * home, login, register and 404 — as a client requirement. Theme is owned by
 * the route/components; the saved participation modality never repaints the
 * canvas (M4 uses pearl/silver components on the common dark arena).
 */
export default function ConditionalShell({ children }) {
  const pathname = usePathname() || "/";
  const isHome = pathname === "/";
  const redesigned = isRedesignedPath(pathname);

  return (
    <>
      <div className="my50-arena" aria-hidden>
        <div className="my50-arena__grid" />
      </div>
      <Suspense fallback={null}>
        <SiteNav overlay={isHome} />
      </Suspense>
      <main
        id="main"
        className={
          redesigned
            ? `my50-main${isHome ? " my50-main--home" : ""}`
            : "my50-main app-main app-main--immersive my50-main--legacy"
        }
      >
        {redesigned ? children : <AppSurface>{children}</AppSurface>}
      </main>
      <SiteFooter />
    </>
  );
}
