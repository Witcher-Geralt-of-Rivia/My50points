"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import ModalityWelcomeDetail from "@/frontend/components/modality-welcome/ModalityWelcomeDetail";

/**
 * Workspace modality info — expanded detail first; 4 colored stripes collapses/expands it as an accordion.
 */
export default function ModalityWelcomeSummaryPanel({
  modalityId,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle: controlledOnToggle,
}) {
  const { t } = useLanguage();
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);

  const expanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;
  const handleToggle = controlledOnToggle || (() => setLocalExpanded((prev) => !prev));

  useEffect(() => {
    setLocalExpanded(defaultExpanded);
  }, [modalityId, defaultExpanded]);

  if (!modalityId) return null;

  return (
    <section
      className={`mw-welcome-summary mw-welcome-summary--${modalityId}${
        expanded ? " mw-welcome-summary--expanded" : ""
      }`}
      aria-label={t("modalityWelcome.summaryAria")}
      style={{ marginBottom: '1.25rem' }}
    >
      {/* Accordion Divider at the TOP using the 4 color stripes (Paid, Free, Special, Guest) */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex flex-col gap-2 py-3 cursor-pointer group bg-transparent border-none outline-none transition-all text-left"
        title={expanded ? "Haga clic para contraer información" : "Haga clic para expandir información"}
        style={{ paddingInline: 0 }}
      >
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors px-1 mb-1">
          <span>👉 PASO 1: REGLAS Y DETALLES DE LA MODALIDAD</span>
          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">
            {expanded ? "▲ CLIC PARA CONTRAER" : "▼ CLIC PARA EXPANDIR"}
          </span>
        </div>
        <div className="w-full flex flex-col gap-[2px]">
          <div className="h-[2.5px] w-full bg-[#7c3aed] transition-transform duration-300 group-hover:scale-y-[1.5]" />
          <div className="h-[2.5px] w-full bg-[#22d3ee] transition-transform duration-300 group-hover:scale-y-[1.5]" />
          <div className="h-[2.5px] w-full bg-[#fbbf24] transition-transform duration-300 group-hover:scale-y-[1.5]" />
          <div className="h-[2.5px] w-full bg-[#a855f7] transition-transform duration-300 group-hover:scale-y-[1.5]" />
        </div>
      </button>

      {expanded ? (
        <div className="mw-welcome-summary__body mt-2">
          <ModalityWelcomeDetail t={t} modalityId={modalityId} />
        </div>
      ) : null}
    </section>
  );
}
