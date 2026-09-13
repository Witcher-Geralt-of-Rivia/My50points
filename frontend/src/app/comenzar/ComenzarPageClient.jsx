"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Sparkles, Shield, Layers } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useModality } from "@/frontend/contexts/ModalityContext";
import AnimateInView from "@/frontend/components/ui/AnimateInView";
import TicketWorkflowJourney from "@/frontend/components/onboarding/TicketWorkflowJourney";
import ComenzarTracksAccess from "@/frontend/components/onboarding/ComenzarTracksAccess";
import {
  onboardBenefitAsset,
  ticketWorkflowAsset,
} from "@/frontend/lib/config/ticketWorkflowAssets";

const BENEFIT_FALLBACK_ICONS = [Layers, Shield, Sparkles];

export default function ComenzarPageClient() {
  const { t } = useLanguage();
  const { activeModalityId } = useModality();

  const benefitTitles = t("ticketWorkflow.landingBenefitTitles");
  const benefitTitleList = Array.isArray(benefitTitles) ? benefitTitles : [];
  const benefitBodies = [
    t("ticketWorkflow.landingFactTickets"),
    t("ticketWorkflow.landingFactFree"),
    t("ticketWorkflow.landingFactModes"),
  ];

  const heroBg = ticketWorkflowAsset("landingHeroBg");
  const noise = ticketWorkflowAsset("noiseOverlayTile");

  return (
    <div className="ticket-landing-surface" data-modality={activeModalityId}>
      <div className="ticket-landing__bg-layer" aria-hidden>
        {heroBg ? <img src={heroBg} alt="" className="ticket-landing__hero-bg" /> : null}
        <div className="ticket-landing__shade" />
        {noise ? (
          <div
            className="ticket-landing__noise"
            style={{ backgroundImage: `url(${noise})` }}
          />
        ) : null}
      </div>

      <div className="ticket-landing">
        <TicketWorkflowJourney />

        <AnimateInView delay={0.12}>
          <section className="onboard-features" aria-label={t("ticketWorkflow.landingBenefitsAria")}>
            <div className="onboard-features__fog" aria-hidden />
            <div className="onboard-bento">
              {benefitBodies.map((body, index) => {
                const FallbackIcon = BENEFIT_FALLBACK_ICONS[index] || Sparkles;
                const title = benefitTitleList[index] || "";
                const cardBg = onboardBenefitAsset(index);
                return (
                  <article
                    key={body}
                    className={`onboard-bento__card onboard-bento__card--${index + 1}${
                      cardBg ? " onboard-bento__card--has-bg" : ""
                    }`}
                  >
                    {cardBg ? (
                      <img src={cardBg} alt="" className="onboard-bento__bg" />
                    ) : null}
                    <div className="onboard-bento__scrim" aria-hidden />
                    <div className="onboard-bento__glass" aria-hidden />
                    <div className="onboard-bento__particles" aria-hidden />
                    <div className="onboard-bento__icon-stage">
                      {!cardBg ? (
                        <FallbackIcon
                          className="onboard-bento__icon-fallback"
                          strokeWidth={1.35}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="onboard-bento__body">
                      {title ? <h3 className="onboard-bento__title">{title}</h3> : null}
                      <p className="onboard-bento__text">{body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </AnimateInView>

        <AnimateInView delay={0.16}>
          <section className="onboard-cta-block" aria-label={t("ticketWorkflow.landingCtaAria")}>
            <div className="onboard-cta-block__glow" aria-hidden />
            <div className="onboard-cta onboard-cta--solo">
              <Link href="/how-to-play" className="onboard-cta__btn onboard-cta__btn--ghost">
                {t("gameModalities.learnMore")}
              </Link>
            </div>
          </section>
        </AnimateInView>

        <AnimateInView delay={0.2}>
          <Suspense fallback={null}>
            <ComenzarTracksAccess />
          </Suspense>
        </AnimateInView>
      </div>
    </div>
  );
}
