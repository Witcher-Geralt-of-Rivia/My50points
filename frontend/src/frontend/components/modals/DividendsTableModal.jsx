"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, RefreshCw } from "lucide-react";
import { fetchJson } from "@/frontend/lib/api/client";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const SADDLE_COLORS = {
  1: { bg: "#dc2626", text: "#ffffff" }, // Red
  2: { bg: "#ffffff", text: "#000000" }, // White
  3: { bg: "#2563eb", text: "#ffffff" }, // Blue
  4: { bg: "#facc15", text: "#000000" }, // Yellow
  5: { bg: "#16a34a", text: "#ffffff" }, // Green
  6: { bg: "#000000", text: "#ffffff" }, // Black
  7: { bg: "#ea580c", text: "#ffffff" }, // Orange
  8: { bg: "#ec4899", text: "#ffffff" }, // Pink
  9: { bg: "#06b6d4", text: "#000000" }, // Turquoise
  10: { bg: "#9333ea", text: "#ffffff" }, // Purple
  11: { bg: "#9ca3af", text: "#000000" }, // Grey
  12: { bg: "#84cc16", text: "#000000" }, // Lime
  13: { bg: "#78350f", text: "#ffffff" }, // Brown
  14: { bg: "#881337", text: "#ffffff" }, // Maroon
};

export default function DividendsTableModal({ isOpen, onClose, tournamentSlug }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!isOpen || !tournamentSlug) return;
    setLoading(true);
    fetchJson(`/tournaments/${tournamentSlug}/dividends`)
      .then((res) => {
        if (res && res.races) setData(res);
      })
      .catch((err) => console.error("Error fetching dividends:", err))
      .finally(() => setLoading(false));
  }, [isOpen, tournamentSlug]);

  if (!isOpen) return null;

  const currentRace = data?.races?.[activeTab] || null;

  return (
    <div
      id="dividends-table-overlay"
      className="fixed inset-0 z-[9996] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-[#102419] via-[#0b1710] to-[#050c08] p-5 sm:p-7 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-white overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={t("modals.dividends.close")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            {t("modals.dividends.title")} (Base $2.00 Win)
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-300 bg-clip-text text-transparent font-display">
            {data?.tournamentName || (language === "en" ? "50points Tournament" : "Torneo 50points")} — {t("figmaUI.slips.frozenDiv")}
          </h2>
          <p className="text-xs text-zinc-400">
            {language === "en" ? "Racetrack" : "Hipódromo"}: <span className="text-white font-semibold">{data?.track || (language === "en" ? "Official" : "Oficial")}</span> • {t("modals.dividends.subtitle")}
          </p>
        </div>

        {/* Race Tabs (Carreras 1 a 7) */}
        {data?.races && data.races.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-emerald-900/40 mb-4 scrollbar-thin">
            {data.races.map((r, idx) => (
              <button
                key={r.raceNumber}
                onClick={() => setActiveTab(idx)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === idx
                    ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                {t("modals.dividends.race")} {r.raceNumber} ({idx + 1}/7)
              </button>
            ))}
          </div>
        )}

        {/* Race Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-emerald-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>{t("modals.dividends.loading")}</span>
            </div>
          ) : currentRace ? (
            <div>
              {/* Race Meta */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-3 text-xs">
                <div className="font-bold text-emerald-300 uppercase">
                  {currentRace.name}
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <span>{language === "en" ? "Distance" : "Distancia"}: <strong className="text-white">{currentRace.distance}</strong></span>
                  <span>{language === "en" ? "Surface" : "Superficie"}: <strong className="text-white">{currentRace.surface}</strong></span>
                  <span>{language === "en" ? "Time" : "Hora"}: <strong className="text-white">{currentRace.scheduledTime}</strong></span>
                </div>
              </div>

              {/* Runners Table */}
              <div className="overflow-x-auto rounded-xl border border-emerald-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-950/60 text-emerald-300 font-bold uppercase tracking-wider border-b border-emerald-900/50">
                    <tr>
                      <th className="p-2.5 text-center w-12">#</th>
                      <th className="p-2.5">{t("modals.dividends.horse")}</th>
                      <th className="p-2.5">{t("figmaUI.carousel.jockey")} / {t("figmaUI.carousel.trainer")}</th>
                      <th className="p-2.5 text-center">{language === "en" ? "Weight" : "Peso"}</th>
                      <th className="p-2.5 text-center">Odds</th>
                      <th className="p-2.5 text-right font-black text-emerald-400">{t("modals.dividends.odds")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(currentRace.runners || []).map((runner) => {
                      const saddle = SADDLE_COLORS[runner.postPosition] || { bg: "#374151", text: "#ffffff" };
                      return (
                        <tr
                          key={runner.horseId}
                          className={`hover:bg-white/[0.04] transition-colors ${runner.scratched ? "opacity-40 line-through" : ""}`}
                        >
                          <td className="p-2.5 text-center">
                            <span
                              className="inline-flex w-7 h-7 rounded-lg items-center justify-center font-black text-xs shadow"
                              style={{ backgroundColor: saddle.bg, color: saddle.text }}
                            >
                              {runner.programNumber || runner.postPosition}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-white">
                            {runner.name}
                            {runner.scratched && (
                              <span className="ml-2 text-[10px] uppercase font-bold text-red-400 border border-red-500/40 px-1.5 py-0.5 rounded">
                                {t("figmaUI.carousel.scratched")}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-zinc-400">
                            <div>{runner.jockey}</div>
                            <div className="text-[10px] text-zinc-500">{runner.trainer}</div>
                          </td>
                          <td className="p-2.5 text-center text-zinc-400">
                            {runner.weight} lbs
                          </td>
                          <td className="p-2.5 text-center font-mono text-zinc-300">
                            {runner.odds ? `${runner.odds.toFixed(1)}/1` : "3/1"}
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-400 text-sm">
                            ${runner.dividend ? runner.dividend.toFixed(2) : "2.00"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 text-xs">
              {t("modals.dividends.noData")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-emerald-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            {t("modals.dividends.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
