"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/frontend/contexts/AuthContext";
import AppSplashScreen from "@/frontend/components/layout/AppSplashScreen";
import AgeGateModal from "@/frontend/components/layout/AgeGateModal";
import {
  clearCoverPassed,
  hasCoverPassed,
  persistModality,
  isValidModalityId,
} from "@/frontend/lib/gameModalities";

/** Match CSS loader animation (--splash-loader-duration: 2.4s). */
const MIN_SPLASH_MS = 2400;
const EXIT_MS = 520;

/**
 * Pages that bypass the cover-page gate.
 * Auth routes and the cover itself are always accessible directly.
 */
const BYPASS_PATHS = ["/", "/login", "/register", "/modalidades", "/how-to-play", "/guia-torneo"];
function shouldBypassCover(pathname) {
  return (
    BYPASS_PATHS.includes(pathname) ||
    pathname.startsWith("/api/")
  );
}

/**
 * Full-screen TORNEO splash on cold load → always lands on cover (/) first.
 * After the user interacts with the cover, navigation is unrestricted.
 */
export default function AppBootGate({ children }) {
  const { loading } = useAuth();
  const pathname = usePathname() || "";
  const router = useRouter();
  const mountAt = useRef(performance.now());

  const [ageVerified, setAgeVerified] = useState(null); // null = verificando localStorage (evita destello del logo)
  const [showSplash, setShowSplash] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Check verification on mount
  useEffect(() => {
    try {
      const verified = localStorage.getItem("fiftypoints_age_verified") === "true";
      setAgeVerified(verified);
      // Regla del cliente: PRIMERO el aviso de mayor de edad, NUNCA el logo antes.
      // El splash (logo animado) solo aparece tras verificar la edad y al caer en la portada ("/").
      setShowSplash(verified && pathname === "/");
    } catch (e) {
      console.warn("Age verification storage check failed:", e);
      setAgeVerified(false);
    }
  }, [pathname]);

  // Reset cover-passed on fresh page load if landing on cover page so splash always shows.
  // If a ?modality=X param is in the URL, persist it so the blue card is
  // highlighted when the user arrives at /inicio after the cover.
  useEffect(() => {
    try {
      if (pathname === "/") {
        clearCoverPassed();
      }
      const params = new URLSearchParams(window.location.search);
      const m = params.get("modality");
      if (m && isValidModalityId(m)) {
        persistModality(m);
      }
    } catch (e) {
      console.warn("Storage reset failed:", e);
    }
  }, [pathname]);

  // Safety fallback: force hide splash screen after 4.5 seconds regardless of loading state
  useEffect(() => {
    if (!showSplash || !ageVerified) return undefined;
    const safetyTimer = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => {
        setShowSplash(false);
      }, EXIT_MS);
    }, 4500);

    return () => window.clearTimeout(safetyTimer);
  }, [showSplash, ageVerified]);

  useEffect(() => {
    if (!showSplash || loading || !ageVerified) return undefined;

    const waitMs = Math.max(0, MIN_SPLASH_MS - (performance.now() - mountAt.current));
    const hideTimer = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => {
        setShowSplash(false);
      }, EXIT_MS);
    }, waitMs);

    return () => window.clearTimeout(hideTimer);
  }, [loading, showSplash, ageVerified]);

  // After splash: if the user hasn't passed the cover yet, redirect to portada (/)
  useEffect(() => {
    if (loading || showSplash || !ageVerified) return undefined;
    try {
      if (!hasCoverPassed() && !shouldBypassCover(pathname)) {
        router.replace("/");
      }
    } catch (e) {
      console.warn("Redirect check failed:", e);
    }
    return undefined;
  }, [loading, showSplash, ageVerified, pathname, router]);

  useEffect(() => {
    if (!showSplash) {
      document.body.style.overflow = "";
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showSplash]);

  const handleConfirmAge = () => {
    try {
      localStorage.setItem("fiftypoints_age_verified", "true");
      mountAt.current = performance.now(); // Reset mount time to start the loader animation now
      setAgeVerified(true);
      setShowSplash(true);
    } catch (e) {
      console.warn("Saving age verification failed:", e);
    }
  };

  return (
    <>
      {/* Estado "verificando": pantalla neutra oscura, sin logo ni age-gate, hasta leer localStorage */}
      {ageVerified === null ? <div className="app-boot-gate__checking" aria-hidden /> : null}
      {showSplash ? <AppSplashScreen exiting={exiting} animate={true} /> : null}
      {ageVerified === false ? <AgeGateModal onConfirm={handleConfirmAge} /> : null}
      <div
        className={
          ageVerified !== true || (showSplash && !exiting)
            ? "app-boot-gate__content--hidden"
            : "app-boot-gate__content"
        }
        aria-hidden={ageVerified !== true || (showSplash && !exiting)}
      >
        {children}
      </div>
    </>
  );
}
