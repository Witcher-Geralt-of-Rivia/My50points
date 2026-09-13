"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const LANGUAGE_OPTIONS = [
  { code: "es", labelKey: "hero.langSpanish" },
  { code: "en", labelKey: "hero.langEnglish" },
];

/**
 * Gradient-bordered LANGUAGE control (design spec).
 */
export default function LanguageToggle({ className = "" }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`hero-lang${className ? ` ${className}` : ""}`}>
      <div className="hero-lang__border">
        <button
          type="button"
          className="hero-lang__trigger"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={t("hero.language")}
        >
          <Globe className="hero-lang__icon" aria-hidden />
          <span>{t("hero.language")}</span>
        </button>
      </div>

      {open ? (
        <ul className="hero-lang__menu" role="listbox" aria-label={t("hero.language")}>
          {LANGUAGE_OPTIONS.map((option) => (
            <li key={option.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={language === option.code}
                className={`hero-lang__option${language === option.code ? " hero-lang__option--active" : ""}`}
                onClick={() => {
                  setLanguage(option.code);
                  setOpen(false);
                }}
              >
                {t(option.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
