"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translations } from "./translations";

const LanguageContext = createContext(null);

function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("es");
  const [mounted, setMounted] = useState(false);

  // Load saved language from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("50points-lang");
      if (saved === "en" || saved === "es") {
        setLanguageState(saved);
      }
    } catch {
      // localStorage unavailable, keep default
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("50points-lang", lang);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key) => {
      const value = getNestedValue(translations[language], key);
      if (value !== null) return value;
      // Fallback to Spanish
      const fallback = getNestedValue(translations.es, key);
      if (fallback !== null) return fallback;
      // Return the key itself as last resort
      return key;
    },
    [language]
  );

  // Prevent hydration mismatch: render children immediately with default 'es'
  // The useEffect will update to saved language on client after mount

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
