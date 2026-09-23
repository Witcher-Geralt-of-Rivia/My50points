"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, Check, X } from "lucide-react";
import BrandMark from "@/frontend/components/nav/BrandMark";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

/** The single 18+ gate (rendered by AppBootGate). */
export default function AgeGateModal({ onConfirm }) {
  const { language, setLanguage } = useLanguage();
  const isEn = language === "en";
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  const handleExit = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate__card ui-glass ui-edge" data-accent="m1">
        <div className="age-gate__top">
          <span className="age-gate__brand">
            <BrandMark size={34} />
            <span className="nav-brand__text">MY 50 <b>POINTS</b></span>
          </span>
          <div className="nav-lang nav-lang--compact" role="group" aria-label="Idioma / Language">
            {["es", "en"].map((code) => (
              <button key={code} type="button" className={`nav-lang__opt${language === code ? " is-on" : ""}`} aria-pressed={language === code} onClick={() => setLanguage(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="age-gate__seal" aria-hidden>
          <ShieldCheck size={30} />
          <span className="t-data">18+</span>
        </div>
        <h1 id="age-gate-title" className="t-section age-gate__title">
          {isEn ? "Adults only" : "Acceso solo para mayores de 18"}
        </h1>
        <p className="t-body age-gate__text">
          {isEn
            ? "MY 50 POINTS is a horse-racing points competition. By entering you confirm you are over 18 (or the legal age in your jurisdiction) and agree to play responsibly."
            : "MY 50 POINTS es una competición de carreras de caballos por puntos. Al entrar confirmas que eres mayor de 18 años (o la edad legal en tu jurisdicción) y que jugarás de forma responsable."}
        </p>
        <div className="age-gate__actions">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={handleExit}>
            <X size={18} aria-hidden />
            {isEn ? "No, exit" : "No, salir"}
          </button>
          <button type="button" ref={confirmRef} className="ui-btn ui-btn--primary" onClick={onConfirm}>
            <Check size={18} aria-hidden />
            {isEn ? "I am 18 or older" : "Soy mayor de 18 años"}
          </button>
        </div>
        <p className="t-meta age-gate__note">
          {isEn
            ? "We protect your information and promote responsible gaming."
            : "Protegemos tu información y fomentamos el juego responsable."}
        </p>
      </div>
    </div>
  );
}
