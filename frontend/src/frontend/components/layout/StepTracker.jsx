"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const STEPS_CONFIG = [
  { id: "modalidad", label: "Modalidad", color: "text-[#a855f7] border-[#a855f7]/30", hoverColor: "hover:text-[#a855f7]", baseColor: "#a855f7", href: "/modalidades" },
  { id: "hipodromo", label: "Hipódromo", color: "text-[#22d3ee] border-[#22d3ee]/30", hoverColor: "hover:text-[#22d3ee]", baseColor: "#22d3ee", href: "/modalidades" },
  { id: "ticket", label: "Ticket", color: "text-white border-white/30", hoverColor: "hover:text-white", baseColor: "#ffffff", href: null },
  { id: "estrategias", label: "Estrategias", color: "text-[#10b981] border-[#10b981]/30", hoverColor: "hover:text-[#10b981]", baseColor: "#10b981", href: null },
  { id: "confirmacion", label: "Confirmación", color: "text-[#a855f7] border-[#a855f7]/30", hoverColor: "hover:text-[#a855f7]", baseColor: "#a855f7", href: null },
  { id: "torneo", label: "Torneo", color: "text-zinc-500 border-zinc-500/30", hoverColor: "hover:text-zinc-400", baseColor: "#71717a", href: "/leaderboard" }
];

export default function StepTracker({ currentStep = "modalidad", modalityId = null }) {
  const { t } = useLanguage();

  // Find index of current step
  const activeIndex = STEPS_CONFIG.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 sm:p-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 backdrop-blur-md relative overflow-hidden my-4">
      {/* Glow highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple via-cyan to-green-500 opacity-50" />

      {/* Title block */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="w-1 h-5 bg-gradient-to-b from-purple to-cyan rounded-full" />
        <div>
          <h4 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider">
            Tu camino al torneo
          </h4>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
            Progreso lineal
          </p>
        </div>
      </div>

      {/* Steps horizontal list */}
      <div className="flex flex-wrap items-center gap-x-1 sm:gap-x-1.5 gap-y-1 text-[10px] sm:text-xs font-bold select-none max-w-full overflow-x-auto py-1">
        {STEPS_CONFIG.map((step, idx) => {
          const isCurrent = idx === activeIndex;
          const isPassed = idx < activeIndex;
          const isPending = idx > activeIndex;

          // Determine navigation href
          let stepHref = step.href;
          if (step.id === "hipodromo" && modalityId) {
            stepHref = `/modalidades/${modalityId}`;
          }

          const renderContent = () => (
            <span
              className={`transition-all duration-200 uppercase tracking-wide px-2 py-0.5 rounded-md border ${
                isCurrent
                  ? `${step.color} bg-white/[0.03] shadow-[0_0_15px_rgba(255,255,255,0.02)] scale-[1.02]`
                  : isPassed
                  ? `${step.color} opacity-85 hover:opacity-100`
                  : "text-zinc-600 border-transparent opacity-40 cursor-not-allowed"
              }`}
              style={isCurrent ? { textShadow: `0 0 10px ${step.baseColor}44` } : undefined}
            >
              {step.label}
            </span>
          );

          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              {idx > 0 && (
                <span className="text-zinc-700 mx-0.5 font-normal select-none">→</span>
              )}
              {isPassed && stepHref ? (
                <Link href={stepHref} className={`${step.hoverColor}`}>
                  {renderContent()}
                </Link>
              ) : (
                renderContent()
              )}
            </div>
          );
        })}
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg self-start md:self-auto">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 uppercase tracking-wider">
          {activeIndex >= 4 ? "MODALIDAD COMPLETA" : "MODALIDAD EN CURSO"}
        </span>
      </div>
    </div>
  );
}
