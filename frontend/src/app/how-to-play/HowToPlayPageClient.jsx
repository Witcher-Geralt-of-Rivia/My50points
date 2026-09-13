"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Trophy,
  Target,
  TrendingUp,
  Crosshair,
  Users,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Zap,
  Shield,
  Flame,
  Star,
} from "lucide-react";
import AnimateInView from "@/frontend/components/ui/AnimateInView";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { howToPlayAsset, howToPlayStepAsset } from "@/frontend/lib/config/howToPlayAssets";
import { ticketWorkflowAsset } from "@/frontend/lib/config/ticketWorkflowAssets";

const stepIcons = [Users, Target, Crosshair, Star, Trophy];
const strategyOrbs = [
  { key: "full", icon: Flame, color: "#ff3131", label: "Full" },
  { key: "dual", icon: Target, color: "#ffd700", label: "Dual" },
  { key: "smart", icon: Shield, color: "#39ff14", label: "Smart" },
];

export default function HowToPlayPageClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (section !== "modes" && section !== "faq") return undefined;
    const targetId = section === "modes" ? "modes" : "faq";
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [section]);

  const heroBg = howToPlayAsset("heroBg");
  const noise = ticketWorkflowAsset("noiseOverlayTile");
  const ctaIcon = howToPlayAsset("ctaIcon");

  const steps = [
    {
      number: 1,
      title: t("howToPlay.step1Title"),
      icon: stepIcons[0],
      description: t("howToPlay.step1Desc"),
      visual: howToPlayStepAsset(1),
    },
    {
      number: 2,
      title: t("howToPlay.step2Title"),
      icon: stepIcons[1],
      description: t("howToPlay.step2Desc"),
      visual: howToPlayStepAsset(2),
      strategies: t("howToPlay.step2Strats"),
    },
    {
      number: 3,
      title: t("howToPlay.step3Title"),
      icon: stepIcons[2],
      description: t("howToPlay.step3Desc"),
      visual: howToPlayStepAsset(3),
    },
    {
      number: 4,
      title: t("howToPlay.step4Title"),
      icon: stepIcons[3],
      description: t("howToPlay.step4Desc"),
      visual: howToPlayStepAsset(4),
    },
    {
      number: 5,
      title: t("howToPlay.step5Title"),
      icon: stepIcons[4],
      description: t("howToPlay.step5Desc"),
      visual: howToPlayStepAsset(5),
    },
  ];

  const faqs = t("howToPlay.faqs");

  return (
    <div className="how-to-play-surface">
      <div className="how-to-play-surface__ambient" aria-hidden>
        {heroBg ? (
          <img src={heroBg} alt="" className="how-to-play-surface__hero-bg" />
        ) : null}
        <div className="how-to-play-surface__fog" />
        <div className="how-to-play-surface__glow" />
        {noise ? (
          <div
            className="how-to-play-surface__noise"
            style={{ backgroundImage: `url(${noise})` }}
          />
        ) : null}
      </div>

      <div className="how-to-play__inner">
        <AnimateInView>
          <header className="how-to-play__hero">
            <div className="how-to-play__hero-scrim" aria-hidden />
            <div className="how-to-play__hero-horses" aria-hidden />
            <div className="how-to-play__hero-content">
              <p className="how-to-play__eyebrow">
                <span className="how-to-play__diamond" aria-hidden />
                {t("howToPlay.badge")}
                <span className="how-to-play__diamond" aria-hidden />
              </p>
              <h1 className="how-to-play__title">{t("howToPlay.title")}</h1>
              <p className="how-to-play__lead">{t("howToPlay.pageDesc")}</p>
            </div>
          </header>
        </AnimateInView>

        <AnimateInView delay={0.06}>
          <section className="how-to-play__steps" aria-label={t("howToPlay.stepsAria")}>
            <ol className="how-to-play__steps-list">
              {steps.map((step, index) => (
                <li
                  key={step.number}
                  id={step.number === 2 ? "modes" : undefined}
                  className="how-to-play__steps-item"
                >
                  <span className="how-to-play__timeline-node" aria-hidden>
                    {step.number}
                  </span>
                  <StepCard step={step} t={t} delay={0.04 * index} />
                </li>
              ))}
            </ol>
          </section>
        </AnimateInView>

        <AnimateInView delay={0.1}>
          <section id="faq" className="how-to-play__faq" aria-label={t("howToPlay.faqAria")}>
            <header className="how-to-play__faq-head">
              <h2 className="how-to-play__faq-title">{t("howToPlay.faqTitle")}</h2>
              <p className="how-to-play__faq-sub">{t("howToPlay.faqSubtitle")}</p>
            </header>
            <div className="how-to-play__faq-grid">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <article
                    key={faq.question}
                    className={`how-to-play__faq-card${isOpen ? " how-to-play__faq-card--open" : ""}`}
                  >
                    <button
                      type="button"
                      className="how-to-play__faq-trigger"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      <span className="how-to-play__faq-badge" aria-hidden>
                        <HelpCircle className="how-to-play__faq-badge-icon" />
                      </span>
                      <span className="how-to-play__faq-trigger-copy">
                        <span className="how-to-play__faq-q">{faq.question}</span>
                        {isOpen ? (
                          <span className="how-to-play__faq-a">{faq.answer}</span>
                        ) : null}
                      </span>
                      <ChevronDown
                        className={`how-to-play__faq-chevron${isOpen ? " how-to-play__faq-chevron--open" : ""}`}
                        aria-hidden
                      />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </AnimateInView>

        <AnimateInView delay={0.14}>
          <section className="how-to-play__cta-bar" aria-label={t("howToPlay.ctaAria")}>
            <div className="how-to-play__cta-art">
              {ctaIcon ? (
                <img src={ctaIcon} alt="" className="how-to-play__cta-art-img" />
              ) : (
                <Trophy className="how-to-play__cta-art-fallback" aria-hidden />
              )}
            </div>
            <div className="how-to-play__cta-copy">
              <h2 className="how-to-play__cta-title">{t("howToPlay.ctaTitle")}</h2>
              <p className="how-to-play__cta-desc">{t("howToPlay.ctaDesc")}</p>
            </div>
            <Link href="/register" className="how-to-play__cta-btn">
              <span className="how-to-play__cta-btn-shine" aria-hidden />
              {t("howToPlay.ctaButton")}
              <ChevronRight className="how-to-play__cta-btn-icon" aria-hidden />
            </Link>
          </section>
        </AnimateInView>
      </div>
    </div>
  );
}

function StepCard({ step, t, delay = 0 }) {
  const Icon = step.icon;
  const hasBg = Boolean(step.visual);

  return (
    <AnimateInView delay={delay}>
      <article className={`how-to-play-step${hasBg ? " how-to-play-step--has-bg" : ""}`}>
        {hasBg ? (
          <div className="how-to-play-step__bg-wrap" aria-hidden>
            <img src={step.visual} alt="" className="how-to-play-step__bg how-to-play-step__bg--blur" />
            <img src={step.visual} alt="" className="how-to-play-step__bg how-to-play-step__bg--sharp" />
          </div>
        ) : null}
        <div className="how-to-play-step__scrim" aria-hidden />
        <div className="how-to-play-step__edge-vignette" aria-hidden />

        <div className="how-to-play-step__body">
          <div className="how-to-play-step__copy">
            <div className="how-to-play-step__head">
              <div className="how-to-play-step__icon-stage">
                <Icon className="how-to-play-step__icon" strokeWidth={1.35} aria-hidden />
              </div>
              <div className="how-to-play-step__titles">
                <p className="how-to-play-step__label">
                  {t("howToPlay.step")} {step.number}
                </p>
                <h3 className="how-to-play-step__title">{step.title}</h3>
              </div>
            </div>
            <p className="how-to-play-step__desc">{step.description}</p>
          </div>

          {step.number === 2 && step.strategies ? (
            <div className="how-to-play-step__overlay">
              <div className="how-to-play-step__orbs">
                {strategyOrbs.map((orb, i) => {
                  const strat = step.strategies[i];
                  const OrbIcon = orb.icon;
                  return (
                    <div
                      key={orb.key}
                      className={`how-to-play-step__orb how-to-play-step__orb--${orb.key}`}
                      style={{ "--orb-color": orb.color }}
                    >
                      <span className="how-to-play-step__orb-ring" aria-hidden />
                      <OrbIcon className="how-to-play-step__orb-icon" aria-hidden />
                      <span className="how-to-play-step__orb-label">{orb.label}</span>
                      {strat ? (
                        <span className="how-to-play-step__orb-risk">{strat.risk}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="how-to-play-step__overlay how-to-play-step__overlay--scene" aria-hidden />
          )}
        </div>
      </article>
    </AnimateInView>
  );
}
