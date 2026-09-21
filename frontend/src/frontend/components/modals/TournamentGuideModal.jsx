"use client";

import { X, Trophy, Sparkles } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

export default function TournamentGuideModal({ isOpen, onClose }) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: t("modals.guide.step1Title"),
      desc: t("modals.guide.step1Desc"),
      color: "from-purple-500 to-indigo-500",
    },
    {
      step: 2,
      title: t("modals.guide.step2Title"),
      desc: t("modals.guide.step2Desc"),
      color: "from-cyan-500 to-blue-500",
    },
    {
      step: 3,
      title: t("modals.guide.step3Title"),
      desc: t("modals.guide.step3Desc"),
      color: "from-amber-500 to-yellow-500",
    },
    {
      step: 4,
      title: t("modals.guide.step4Title"),
      desc: t("modals.guide.step4Desc"),
      color: "from-emerald-500 to-teal-500",
    },
    {
      step: 5,
      title: t("modals.guide.step5Title"),
      desc: t("modals.guide.step5Desc"),
      color: "from-pink-500 to-rose-500",
    },
    {
      step: 6,
      title: t("modals.guide.step6Title"),
      desc: t("modals.guide.step6Desc"),
      color: "from-violet-500 to-purple-600",
    },
    {
      step: 7,
      title: t("modals.guide.step7Title"),
      desc: t("modals.guide.step7Desc"),
      color: "from-amber-400 to-yellow-300",
    },
  ];

  return (
    <div
      id="tournament-guide-overlay"
      className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#131d2e] via-[#0b1220] to-[#060a12] p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-4 h-4 text-cyan-400" />
            {t("modals.guide.badge")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wide bg-gradient-to-r from-cyan-200 via-cyan-400 to-teal-300 bg-clip-text text-transparent font-display">
            {t("modals.guide.title")}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {t("modals.guide.subtitle")}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="space-y-3 mb-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="flex items-start gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 transition-all hover:bg-white/[0.06]"
            >
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center font-black text-black text-sm shrink-0 shadow-md`}
              >
                {s.step}
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-bold text-white mb-0.5">{s.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          id="guide-dismiss-btn"
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-black bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm tracking-wide uppercase flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {t("modals.guide.dismissBtn")}
        </button>
      </div>
    </div>
  );
}
