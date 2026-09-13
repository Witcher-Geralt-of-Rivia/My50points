"use client";

import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import ComenzarWorkflowPanel from "@/frontend/components/onboarding/ComenzarWorkflowPanel";

export default function ComenzarTracksAccess() {
  const { t } = useLanguage();

  return (
    <section
      className="comenzar-tracks-access"
      aria-label={t("ticketWorkflow.landingTracksAccessAria")}
    >
      <ComenzarWorkflowPanel />
    </section>
  );
}
