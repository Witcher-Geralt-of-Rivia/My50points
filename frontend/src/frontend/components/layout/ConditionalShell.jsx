"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import FloatingMenuBar from "@/frontend/components/layout/FloatingMenuBar";
import AppSurface from "@/frontend/components/layout/AppSurface";
import LanguageToggle from "@/frontend/components/layout/LanguageToggle";
import { useAuth } from "@/frontend/contexts/AuthContext";

function isHomePath(pathname) {
  return pathname === "/" || pathname === "";
}

function isAuthPath(pathname) {
  return pathname === "/login" || pathname === "/register";
}

function isComenzarPath(pathname) {
  return pathname === "/comenzar";
}

function isInicioPath(pathname) {
  return pathname === "/inicio";
}

function isWorkflowTracksPath(pathname) {
  return /^\/modalidades\/(guest|free|paid|special)\/?$/.test(pathname);
}

function isProfilePath(pathname) {
  return pathname === "/profile" || /^\/profile\/[^/]+/.test(pathname || "");
}

function isGuiaTorneoPath(pathname) {
  return pathname === "/guia-torneo";
}

function isHowToPlayPath(pathname) {
  return pathname === "/how-to-play";
}

function isChromelessPath(pathname) {
  return isHomePath(pathname);
}

function isImmersiveBgPath(pathname) {
  return (
    isComenzarPath(pathname) ||
    isHowToPlayPath(pathname) ||
    isGuiaTorneoPath(pathname) ||
    isWorkflowTracksPath(pathname) ||
    isAuthPath(pathname) ||
    pathname.includes("/hall-of-fame")
  );
}

/**
 * Pages that never show the floating menu or any chrome.
 * - Cover "/" is chromeless (has its own full-screen layout)
 * - Auth pages /login /register have their own minimal chrome
 */
function hideMenuOnPath(pathname) {
  return isHomePath(pathname) || isAuthPath(pathname);
}

export default function ConditionalShell({ children }) {
  const pathname = usePathname() || "";
  const { isAuthenticated, loading } = useAuth();
  const onHome = isHomePath(pathname);
  const onAuth = isAuthPath(pathname);
  const onComenzar = isComenzarPath(pathname);
  const onInicio = isInicioPath(pathname);
  const onWorkflowTracks = isWorkflowTracksPath(pathname);
  const onHowToPlay = isHowToPlayPath(pathname);
  const onGuiaTorneo = isGuiaTorneoPath(pathname);
  const onProfile = isProfilePath(pathname);
  const hideChrome = isChromelessPath(pathname);
  const skipSurface = hideChrome || onAuth || onComenzar || onHowToPlay || onGuiaTorneo || onInicio;

  // Floating menu is visible on ALL pages for ALL users (guests and registered)
  // except: cover (/), login, and register
  const showFloatingMenu = !hideMenuOnPath(pathname);
  const showLanguageToggle = showFloatingMenu;

  if (loading) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Shared main class — same layout regardless of auth state
  const mainClass = (() => {
    if (hideChrome) return "min-h-screen";
    if (onAuth) return "app-main app-main--auth min-h-screen";
    if (onComenzar || onInicio)
      return `app-main app-main--with-menu app-main--immersive ${
        onInicio ? "app-main--inicio" : "app-main--comenzar"
      } min-h-screen`;
    if (onWorkflowTracks)
      return "app-main app-main--with-menu app-main--immersive app-main--workflow-tracks min-h-screen";
    if (onHowToPlay)
      return "app-main app-main--with-menu app-main--immersive app-main--how-to-play min-h-screen";
    if (onGuiaTorneo)
      return "app-main app-main--with-menu app-main--immersive app-main--tournament-guide min-h-screen";
    if (onProfile)
      return "app-main app-main--with-menu app-main--immersive app-main--profile-hub min-h-screen";
    return "app-main app-main--with-menu app-main--immersive min-h-screen";
  })();

  return (
    <>
      {/* Floating menu — shown for everyone (guest + registered) on all app pages */}
      {showFloatingMenu ? (
        <Suspense fallback={null}>
          <FloatingMenuBar />
        </Suspense>
      ) : null}
      {showLanguageToggle ? <LanguageToggle className="app-lang-toggle" /> : null}

      <main className={mainClass}>
        {skipSurface ? children : <AppSurface>{children}</AppSurface>}
      </main>
    </>
  );
}
