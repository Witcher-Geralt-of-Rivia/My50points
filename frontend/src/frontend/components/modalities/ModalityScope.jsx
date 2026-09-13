"use client";

import { useEffect } from "react";
import { useModality } from "@/frontend/contexts/ModalityContext";
import { isValidModalityId } from "@/frontend/lib/gameModalities";

/**
 * Temporarily forces modality ambient theme while this subtree is mounted.
 */
export default function ModalityScope({ modalityId, children, className = "" }) {
  const { setRouteModalityOverride } = useModality();
  const id = isValidModalityId(modalityId) ? modalityId : "free";

  useEffect(() => {
    setRouteModalityOverride(id);
    return () => setRouteModalityOverride(null);
  }, [id, setRouteModalityOverride]);

  return (
    <div className={`modality-scope modality-scope--${id}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
