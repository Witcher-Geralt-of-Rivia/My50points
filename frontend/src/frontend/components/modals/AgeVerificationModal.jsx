"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

export default function AgeVerificationModal() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const verified = localStorage.getItem("age_verified_18");
      if (!verified) {
        setIsOpen(true);
      }
    } catch {
      // localStorage unavailable, keep open
      setIsOpen(true);
    }
  }, []);

  const handleConfirm = () => {
    try {
      localStorage.setItem("age_verified_18", "true");
    } catch {}
    setIsOpen(false);
  };

  const handleExit = () => {
    window.location.href = "https://www.google.com";
  };

  if (!isOpen) return null;

  return (
    <div
      id="age-verification-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-modal-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#1c122c] via-[#120a1f] to-[#0a0512] p-6 sm:p-8 shadow-[0_0_50px_rgba(245,168,36,0.25)] text-center text-white">
        {/* Neon decorative glow accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-600/30 border border-amber-400/50 shadow-[0_0_25px_rgba(245,168,36,0.3)]">
          <ShieldCheck className="h-11 w-11 text-amber-400" />
        </div>

        {/* Title */}
        <h2
          id="age-modal-title"
          className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 bg-clip-text text-transparent mb-2 font-display"
        >
          {t("modals.age.title")}
        </h2>
        <p className="text-xs uppercase tracking-widest text-amber-400/80 font-bold mb-4">
          {t("modals.age.subtitle")}
        </p>

        {/* Legal Disclaimer */}
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 text-left mb-6 space-y-2">
          <p className="text-sm text-zinc-200 leading-relaxed">
            {t("modals.age.disclaimer")}
          </p>
          <p className="text-xs text-zinc-400 italic">
            {t("modals.age.responsible")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            id="age-verify-confirm-btn"
            onClick={handleConfirm}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 shadow-[0_0_20px_rgba(245,168,36,0.4)] hover:shadow-[0_0_25px_rgba(245,168,36,0.6)] transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm tracking-wide uppercase"
          >
            <CheckCircle2 className="w-5 h-5" />
            {t("modals.age.confirmBtn")}
          </button>

          <button
            id="age-verify-exit-btn"
            onClick={handleExit}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-semibold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-700/50 transition-all text-sm cursor-pointer"
          >
            {t("modals.age.exitBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
