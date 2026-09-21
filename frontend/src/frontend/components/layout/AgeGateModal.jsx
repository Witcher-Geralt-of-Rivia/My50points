"use client";

import { ShieldAlert, X, Check, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { logoFile } from "@/frontend/lib/config/paths";

export default function AgeGateModal({ onConfirm }) {
  const { t } = useLanguage();
  const handleExit = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start sm:justify-center bg-black overflow-y-auto px-4 py-8 select-none">
      <div className="age-gate__purple-container">
        
        {/* Top Torneo Box (Static Loader) */}
        <div className="app-splash__glow-border-wrap">
          <div className="app-splash__stack">
            <div className="app-splash__head">
              <h1 className="app-splash__title">{t("hero.tournament")}</h1>
              <div className="app-splash__logo-wrap">
                <img
                  src={logoFile()}
                  alt="50points"
                  className="app-splash__logo"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </div>

            <p className="app-splash__slogan">
              <span className="app-splash__slogan-part app-splash__slogan-part--gold app-splash__slogan-part--1">
                {t("hero.sloganStrategy")}.
              </span>
              <span className="app-splash__slogan-part app-splash__slogan-part--purple app-splash__slogan-part--2">
                {t("hero.sloganPoints")}.
              </span>
              <span className="app-splash__slogan-part app-splash__slogan-part--cyan app-splash__slogan-part--3">
                {t("hero.sloganGame")}.
              </span>
            </p>

          </div>
        </div>

        {/* Bottom Disclaimer Card */}
        <div className="app-splash__glow-border-wrap">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="age-gate__card"
          >
            {/* Warning Shield Icon */}
            <div className="age-gate__icon-wrap">
              <ShieldAlert className="w-5 h-5 text-purple-light" />
            </div>

            {/* Spanish disclaimer header & block */}
            <div className="age-gate__header">
              <h2>Protección al Menor y Juego Responsable</h2>
            </div>
            <p className="text-zinc-300 text-[11px] sm:text-xs leading-relaxed mb-3 text-center">
              Este sitio web contiene simulaciones de carreras de caballos y contenido relacionado con juegos de azar que puede generar ludopatía. Al ingresar, declaras bajo juramento ser <span className="inline-block bg-white text-[#6320a0] font-black px-2.5 py-0.5 rounded-full border border-purple-light/50 text-[10px] sm:text-[11px] mx-1">mayor de 18 años</span> (o la edad legal en tu jurisdicción) y aceptas jugar de forma responsable.
            </p>

            {/* Divider line */}
            <div className="age-gate__divider" />

            {/* English disclaimer header & block */}
            <div className="mb-4 text-center">
              <h3 className="text-[10px] sm:text-[11px] font-black text-[#c084fc] uppercase tracking-wider mb-1.5">
                Underage Protection & Responsible Gaming
              </h3>
              <p className="text-zinc-400 text-[9.5px] sm:text-[10px] leading-normal">
                This website features horse racing simulations and content related to gambling which may lead to gambling addiction. By entering, you declare under penalty of perjury that you are <strong className="text-[#c084fc] font-bold">over 18 years of age</strong> and agree to play responsibly.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch justify-center">
              <button
                type="button"
                onClick={handleExit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white text-white bg-transparent font-bold text-xs hover:bg-white/10 transition-all duration-200"
              >
                <X className="w-4 h-4" />
                NO, SALIR / EXIT
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#7c3aed] border border-white text-white font-bold text-xs hover:bg-[#6d28d9] transition-all duration-200"
              >
                <Check className="w-4 h-4" />
                SÍ, SOY MAYOR / I ACCEPT
              </button>
            </div>

            {/* Privacy Lock Banner */}
            <div className="mt-5 flex gap-2.5 items-start text-left text-zinc-500 text-[10px] sm:text-[11px] leading-relaxed border-t border-[#27272a] pt-3">
              <Lock className="w-4 h-4 text-purple-light flex-shrink-0 mt-0.5" />
              <p>
                Tu privacidad y seguridad son importantes para nosotros. Protegemos tu información y fomentamos el juego responsable.
              </p>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
