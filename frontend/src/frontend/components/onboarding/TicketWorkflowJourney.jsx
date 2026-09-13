"use client";

import AnimateInView from "@/frontend/components/ui/AnimateInView";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { comenzarStepVisualAsset } from "@/frontend/lib/config/ticketWorkflowAssets";

export default function TicketWorkflowJourney() {
  const { t } = useLanguage();

  const steps = t("ticketWorkflow.landingSteps");
  const stepList = Array.isArray(steps) ? steps : [];
  const stepTitles = t("ticketWorkflow.landingStepTitles");
  const titleList = Array.isArray(stepTitles) ? stepTitles : [];

  return (
    <>
      <AnimateInView>
        <header className="ticket-landing__hero">
          <p className="ticket-landing__eyebrow">{t("ticketWorkflow.landingEyebrow")}</p>
          <h1 className="ticket-landing__title">{t("ticketWorkflow.landingTitle")}</h1>
          <div className="ticket-landing__lead-block">
            <p className="ticket-landing__lead">{t("ticketWorkflow.landingLead")}</p>
            <p className="ticket-landing__lead-flow">{t("ticketWorkflow.landingLeadFlow")}</p>
            <p className="ticket-landing__lead">{t("ticketWorkflow.landingLeadDetail1")}</p>
            <p className="ticket-landing__lead">{t("ticketWorkflow.landingLeadDetail2")}</p>
          </div>
        </header>
      </AnimateInView>

      <AnimateInView delay={0.08}>
        <section className="onboard-journey" aria-label={t("ticketWorkflow.landingJourneyAria")}>
          <div className="onboard-journey__connector" aria-hidden>
            <span className="onboard-journey__line" />
          </div>
          <ol className="onboard-journey__cards">
            {stepList.map((step, index) => {
              const stepNum = index + 1;
              const title = titleList[index] || `Step ${stepNum}`;
              const cardBg = comenzarStepVisualAsset(stepNum);
              return (
                <li key={step} className="onboard-journey-card">
                  <article
                    className={`onboard-journey-card__panel${
                      cardBg ? " onboard-journey-card__panel--has-bg" : ""
                    }`}
                  >
                    {cardBg ? (
                      <img src={cardBg} alt="" className="onboard-journey-card__bg" />
                    ) : null}
                    <div className="onboard-journey-card__scrim" aria-hidden />
                    <div className="onboard-journey-card__glass" aria-hidden />
                    <span className="onboard-journey-card__step">{stepNum}</span>
                    <div className="onboard-journey-card__content">
                      <h2 className="onboard-journey-card__title">{title}</h2>
                      <p className="onboard-journey-card__desc">{step}</p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      </AnimateInView>
    </>
  );
}
