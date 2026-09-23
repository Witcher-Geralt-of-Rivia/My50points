"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AgeGateModal from "@/frontend/components/layout/AgeGateModal";
import { persistModality, isValidModalityId } from "@/frontend/lib/gameModalities";

/** Single canonical 18+ key. `age_verified_18` was written by a second, now
 *  removed, gate on the home page; it is honoured once and migrated. */
export const AGE_KEY = "fiftypoints_age_verified";
const LEGACY_AGE_KEY = "age_verified_18";

function readAgeVerified() {
  try {
    if (localStorage.getItem(AGE_KEY) === "true") return true;
    if (localStorage.getItem(LEGACY_AGE_KEY) === "true") {
      localStorage.setItem(AGE_KEY, "true");
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Boot gate: the one 18+ confirmation for the whole app.
 *
 * The former cover-page redirect was removed: every route — including
 * bookmarks and deep links for signed-in players — opens directly. `/` is the
 * flagship home, not a mandatory cover.
 */
export default function AppBootGate({ children }) {
  const pathname = usePathname() || "";
  const [ageVerified, setAgeVerified] = useState(null);

  useEffect(() => {
    setAgeVerified(readAgeVerified());
  }, []);

  // A ?modality=X in the URL is the player's explicit choice: remember it.
  useEffect(() => {
    try {
      const m = new URLSearchParams(window.location.search).get("modality");
      if (m && isValidModalityId(m)) persistModality(m);
    } catch {
      /* ignore */
    }
  }, [pathname]);

  const handleConfirmAge = () => {
    try {
      localStorage.setItem(AGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setAgeVerified(true);
  };

  return (
    <>
      {ageVerified === false ? <AgeGateModal onConfirm={handleConfirmAge} /> : null}
      <div
        className={ageVerified === false ? "app-boot-gate__content--hidden" : "app-boot-gate__content"}
        aria-hidden={ageVerified === false}
      >
        {children}
      </div>
    </>
  );
}
