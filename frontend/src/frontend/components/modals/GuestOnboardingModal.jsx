"use client";

import { useState } from "react";
import { Clock, User, Globe, Calendar, Sparkles, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const COUNTRIES_ES = [
  { code: "ES", name: "España 🇪🇸" },
  { code: "US", name: "Estados Unidos 🇺🇸" },
  { code: "MX", name: "México 🇲🇽" },
  { code: "AR", name: "Argentina 🇦🇷" },
  { code: "CO", name: "Colombia 🇨🇴" },
  { code: "CL", name: "Chile 🇨🇱" },
  { code: "PE", name: "Perú 🇵🇪" },
  { code: "VE", name: "Venezuela 🇻🇪" },
  { code: "UY", name: "Uruguay 🇺🇾" },
  { code: "PA", name: "Panamá 🇵🇦" },
];

const COUNTRIES_EN = [
  { code: "US", name: "United States 🇺🇸" },
  { code: "ES", name: "Spain 🇪🇸" },
  { code: "MX", name: "Mexico 🇲🇽" },
  { code: "AR", name: "Argentina 🇦🇷" },
  { code: "CO", name: "Colombia 🇨🇴" },
  { code: "CL", name: "Chile 🇨🇱" },
  { code: "PE", name: "Peru 🇵🇪" },
  { code: "VE", name: "Venezuela 🇻🇪" },
  { code: "UY", name: "Uruguay 🇺🇾" },
  { code: "PA", name: "Panama 🇵🇦" },
];

const MONTHS_ES = [
  "01 - Ene", "02 - Feb", "03 - Mar", "04 - Abr", "05 - May", "06 - Jun",
  "07 - Jul", "08 - Ago", "09 - Sep", "10 - Oct", "11 - Nov", "12 - Dic"
];

const MONTHS_EN = [
  "01 - Jan", "02 - Feb", "03 - Mar", "04 - Apr", "05 - May", "06 - Jun",
  "07 - Jul", "08 - Aug", "09 - Sep", "10 - Oct", "11 - Nov", "12 - Dec"
];

export default function GuestOnboardingModal({ isOpen, onClose, onSuccess }) {
  const { playAsGuest } = useAuth();
  const { t, language } = useLanguage();
  const [alias, setAlias] = useState("");
  const [day, setDay] = useState("15");
  const [month, setMonth] = useState("06");
  const [year, setYear] = useState("1998");
  const [country, setCountry] = useState(language === "en" ? "US" : "ES");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const countries = language === "en" ? COUNTRIES_EN : COUNTRIES_ES;
  const monthLabels = language === "en" ? MONTHS_EN : MONTHS_ES;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmed = alias.trim();
    if (trimmed.length < 3) {
      setError(t("modals.guest.errAlias"));
      return;
    }

    const birthYear = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear < 18) {
      setError(t("modals.guest.errAge"));
      return;
    }

    setIsSubmitting(true);
    try {
      await playAsGuest(trimmed, {
        country,
        birthYear,
      });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err?.message || t("modals.guest.errGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 18; y >= currentYear - 90; y--) {
    years.push(y);
  }

  return (
    <div
      id="guest-onboarding-overlay"
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#1c122c] via-[#120a1f] to-[#0a0512] p-6 sm:p-7 shadow-[0_0_50px_rgba(168,85,247,0.25)] text-white">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 12h ephemeral badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-semibold mb-4">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          <span>{t("modals.guest.badge")}</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wide bg-gradient-to-r from-purple-200 via-purple-400 to-pink-300 bg-clip-text text-transparent font-display">
          {t("modals.guest.title")}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 mb-5">
          {t("modals.guest.desc")}
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Alias */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              {t("modals.guest.aliasLabel")}
            </label>
            <input
              id="guest-alias-input"
              type="text"
              required
              minLength={3}
              maxLength={20}
              placeholder={t("modals.guest.aliasPlaceholder")}
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-purple-800/40 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm text-white placeholder-zinc-500 transition-all"
            />
          </div>

          {/* Fecha de Nacimiento (DD/MM/YYYY) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              {t("modals.guest.dobLabel")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                id="guest-birth-day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="px-2 py-2.5 rounded-xl bg-zinc-900/80 border border-purple-800/40 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                  <option key={d} value={d} className="bg-zinc-900 text-white">
                    {d}
                  </option>
                ))}
              </select>
              <select
                id="guest-birth-month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-2 py-2.5 rounded-xl bg-zinc-900/80 border border-purple-800/40 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                {monthLabels.map((m, idx) => {
                  const val = String(idx + 1).padStart(2, "0");
                  return (
                    <option key={val} value={val} className="bg-zinc-900 text-white">
                      {m}
                    </option>
                  );
                })}
              </select>
              <select
                id="guest-birth-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="px-2 py-2.5 rounded-xl bg-zinc-900/80 border border-purple-800/40 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="bg-zinc-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* País */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              {t("modals.guest.countryLabel")}
            </label>
            <select
              id="guest-country-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-purple-800/40 focus:border-purple-400 focus:outline-none text-sm text-white"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code} className="bg-zinc-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            id="guest-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm tracking-wide uppercase flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            {isSubmitting ? t("modals.guest.submitting") : t("modals.guest.submitBtn")}
          </button>
        </form>
      </div>
    </div>
  );
}
