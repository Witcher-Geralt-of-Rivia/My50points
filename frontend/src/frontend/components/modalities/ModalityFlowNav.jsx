"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getModality, modalityPath, withModalityQuery } from "@/frontend/lib/gameModalities";

const STEPS = ["hub", "tracks", "tickets", "play"];

export default function ModalityFlowNav({
  modalityId,
  currentStep,
  trackSlug: trackSlugParam,
  tournamentHref,
}) {
  const { t } = useLanguage();
  const mod = getModality(modalityId);

  const stepLinks = {
    hub: { href: "/modalidades", label: t("gameModalities.stepHub") },
    tracks: { href: modalityPath(modalityId, "tracks"), label: t("gameModalities.stepTracks") },
    tickets: trackSlugParam
      ? {
          href: modalityPath(modalityId, "tickets", { trackSlug: trackSlugParam }),
          label: t("gameModalities.stepTickets"),
        }
      : null,
    play: tournamentHref
      ? { href: withModalityQuery(tournamentHref, modalityId), label: t("gameModalities.stepPlay") }
      : null,
  };

  const activeIndex = STEPS.indexOf(currentStep);

  return (
    <nav
      className="modality-flow-nav modality-flow-nav--scroll"
      aria-label={t("gameModalities.flowAria")}
      style={{ "--modality-accent": mod.accent }}
    >
      {STEPS.map((step, index) => {
        const link = stepLinks[step];
        const isPast = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isFuture = index > activeIndex;
        if (step === "tickets" && !link) return null;
        if (step === "play" && !link) return null;

        return (
          <span key={step} className="modality-flow-nav__segment">
            {index > 0 ? (
              <ChevronRight className="modality-flow-nav__chevron" aria-hidden />
            ) : null}
            {isFuture ? (
              <span className="modality-flow-nav__item modality-flow-nav__item--muted">
                {link.label}
              </span>
            ) : (
              <Link
                href={link.href}
                className={`modality-flow-nav__item${
                  isCurrent ? " modality-flow-nav__item--active" : ""
                }${isPast ? " modality-flow-nav__item--done" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {link.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
