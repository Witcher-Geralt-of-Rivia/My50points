"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/frontend/contexts/AuthContext";
import {
  applyModalityToDocument,
  getModality,
  persistModality,
  readPersistedModality,
  resolveActiveModality,
} from "@/frontend/lib/gameModalities";

const ModalityContext = createContext(null);

export function ModalityProvider({ children }) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [routeOverride, setRouteOverride] = useState(null);

  const searchModality = searchParams.get("modality");
  const persisted = typeof window !== "undefined" ? readPersistedModality() : null;

  const activeModalityId = useMemo(
    () =>
      resolveActiveModality({
        override: routeOverride,
        pathname,
        searchModality,
        user,
        persisted,
      }),
    [routeOverride, pathname, searchModality, user, persisted],
  );

  const modality = useMemo(() => getModality(activeModalityId), [activeModalityId]);

  useEffect(() => {
    applyModalityToDocument(activeModalityId);
    persistModality(activeModalityId);
  }, [activeModalityId]);

  const setActiveModality = useCallback((id) => {
    if (id == null) {
      setRouteOverride(null);
      return;
    }
    persistModality(id);
    setRouteOverride(id);
  }, []);

  return (
    <ModalityContext.Provider
      value={{
        activeModalityId,
        modality,
        setActiveModality,
        setRouteModalityOverride: setRouteOverride,
      }}
    >
      {children}
    </ModalityContext.Provider>
  );
}

export function useModality() {
  const ctx = useContext(ModalityContext);
  if (!ctx) {
    throw new Error("useModality must be used within ModalityProvider");
  }
  return ctx;
}
