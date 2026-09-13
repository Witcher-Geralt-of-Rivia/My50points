"use client";

import { useId } from "react";
import { Caveat } from "next/font/google";
import HeroTorneoHeader from "@/frontend/components/home/HeroTorneoHeader";
import ModalityEntryCards from "@/frontend/components/modalities/ModalityEntryCards";
import ModalityImportantNotice from "@/frontend/components/modalities/ModalityImportantNotice";
import LanguageToggle from "@/frontend/components/layout/LanguageToggle";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { staticFile } from "@/frontend/lib/config/paths";
import AnimateInView from "@/frontend/components/ui/AnimateInView";

function LaurelTrophy() {
  const frameGradId = `gold-cup-frame-${useId().replace(/:/g, "")}`;

  return (
    <div className="gold-cup-badge-wrap">
      <svg
        className="gold-cup-badge__frame"
        viewBox="0 0 72 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient
            id={frameGradId}
            x1="10"
            y1="6"
            x2="62"
            y2="82"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="38%" stopColor="#22d3ee" />
            <stop offset="68%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path
          d="M14 8 V62 L36 78 L58 62 V8"
          stroke={`url(#${frameGradId})`}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="gold-cup-badge__inner">
        <img
          src={staticFile("/Img/d_gold-cup.png")}
          alt=""
          className="gold-cup-badge"
        />
      </div>
    </div>
  );
}

const STRATEGY_IMAGES = {
  full: "/Img/FULL POINT.png",
  dual: "/Img/DUAL POINT.png",
  smart: "/Img/SMART POINT.png",
};

function StrategyDivider() {
  return (
    <>
      <div className="strategy-divider-v hidden sm:block" aria-hidden />
      <div className="strategy-divider-h sm:hidden" aria-hidden />
    </>
  );
}

function StrategyPointColumn({ variant, label, taglineLines, imageSrc }) {
  const accentText = {
    full: "text-[#b855f7]",
    dual: "text-[#22d3ee]",
    smart: "text-[#f5b942]",
  };

  return (
    <div className="flex flex-1 items-center gap-3 sm:gap-4 md:gap-5 min-w-0 px-2 sm:px-4 md:px-6 py-3 sm:py-4">
      <img
        src={imageSrc}
        alt={label}
        className="w-[70px] sm:w-[95px] md:w-[115px] lg:w-[130px] h-auto shrink-0 object-contain object-left"
      />
      <div className="flex flex-col justify-center text-left min-w-0">
        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-white uppercase tracking-wide leading-none mb-2 sm:mb-2.5">
          {label}
        </h3>
        {taglineLines.map((line) => (
          <p
            key={line}
            className={`text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wide leading-tight ${accentText[variant]}`}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function MyFiftyPointsBrand({ tagline }) {
  return (
    <div className="my-points-brand">
      <p className="my-points-brand-label">MY</p>

      <div className="my-points-brand-stack">
        <div className="my-points-fifty-row">
          <span className="my-points-digit my-points-fifty-num" aria-hidden>
            5
          </span>
          <span className="my-points-digit my-points-zero-mark-wrap" aria-hidden>
            <span className="my-points-zero-mark">
              <span className="my-points-zero-mark__bar my-points-zero-mark__bar--top" />
              <span className="my-points-zero-mark__bar my-points-zero-mark__bar--mid" />
              <span className="my-points-zero-mark__bar my-points-zero-mark__bar--bot" />
            </span>
          </span>
        </div>

        <h1 className="my-points-word" aria-label="MY 50 POINTS">
          P
          <span className="my-points-letter-o" aria-hidden>
            <span className="my-points-letter-o__outline" />
            <span className="my-points-letter-o__dot" />
          </span>
          INTS
        </h1>

        <div className="hero-tagline-divider" aria-hidden />
      </div>

      <p className={`my-points-tagline ${caveat.className}`}>
        <span className="my-points-tagline__phrase">{tagline}</span>
        <span className="inline-flex items-center gap-[0.22em] ml-1.5 align-middle" aria-hidden>
          <span className="my-points-tagline__dot my-points-tagline__dot--purple" />
          <span className="my-points-tagline__dot my-points-tagline__dot--cyan" />
          <span className="my-points-tagline__dot my-points-tagline__dot--gold" />
        </span>
      </p>
    </div>
  );
}

function HeroModalityPanel({ t }) {
  return (
    <div className="hero-modality-panel">
      <ModalityEntryCards t={t} />
      <ModalityImportantNotice t={t} className="hero-modality-panel__notice" />
      <p className="hero-cta-panel__slogan">
        <span className="text-purple-light">{t("hero.sloganStrategy")}</span>
        <span className="hero-slogan-dot hero-slogan-dot--purple" aria-hidden />
        <span className="text-cyan-light">{t("hero.sloganPoints")}</span>
        <span className="hero-slogan-dot hero-slogan-dot--cyan" aria-hidden />
        <span className="text-gold-light">{t("hero.sloganGame")}</span>
        <span className="hero-slogan-dot hero-slogan-dot--gold" aria-hidden />
      </p>
    </div>
  );
}

function starOutlinePath(cx, cy, outerR, innerR) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return `M${points.join(" L")} Z`;
}

function StatNestedStarsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d={starOutlinePath(16, 16, 13.2, 5.6)}
        stroke="#a855f7"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d={starOutlinePath(16, 16, 9.8, 4.1)}
        stroke="#22d3ee"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d={starOutlinePath(16, 16, 6.6, 2.75)}
        stroke="#fbbf24"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeroStatsBar({ t }) {
  const cells = [
    {
      variant: "purple",
      imageSrc: staticFile("/Img/1.png"),
      value: "7",
      label: t("hero.statRaces"),
    },
    {
      variant: "teal",
      imageSrc: staticFile("/Img/2.png"),
      value: "1",
      label: t("hero.statTournament"),
    },
    {
      variant: "gold",
      imageSrc: staticFile("/Img/3.png"),
      value: "50",
      label: t("hero.statPointsPerRace"),
    },
    {
      variant: "purple",
      icon: StatNestedStarsIcon,
      fame: true,
      value: t("hero.statFameTitle"),
      label: t("hero.statFameSub"),
    },
  ];

  return (
    <div className="hero-stats-bar">
      <div className="hero-stats-bar__inner">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className={`hero-stats-cell hero-stats-cell--${cell.variant}${
              cell.fame ? " hero-stats-cell--fame" : ""
            }`}
          >
            <div className="hero-stats-cell__icon-slot">
              {cell.icon ? (
                <cell.icon className="hero-stats-cell__icon hero-stats-cell__icon--stars" />
              ) : (
                <img
                  src={cell.imageSrc}
                  alt=""
                  aria-hidden
                  className="hero-stats-cell__icon hero-stats-cell__icon--img"
                />
              )}
            </div>
            <div className="hero-stats-cell__value-slot">
              <span
                className={
                  cell.fame ? "hero-stats-cell__value hero-stats-cell__value--word" : "hero-stats-cell__value"
                }
              >
                {cell.value}
              </span>
            </div>
            <div className="hero-stats-cell__label-slot">
              <span className="hero-stats-cell__label">{cell.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroStatsNav() {
  return (
    <div className="hero-stats-nav-wrap" aria-hidden>
      <div className="hero-stats-nav">
        <span className="hero-stats-nav__line hero-stats-nav__line--left" />
        <div className="hero-stats-nav__dots hero-stats-nav__dots--left">
          <span className="hero-stats-nav__dot hero-stats-nav__dot--fade-3" />
          <span className="hero-stats-nav__dot hero-stats-nav__dot--fade-2" />
          <span className="hero-stats-nav__dot hero-stats-nav__dot--fade-1" />
          <span className="hero-stats-nav__dot hero-stats-nav__dot--active" />
        </div>
        <span className="hero-stats-nav__brand">M</span>
        <div className="hero-stats-nav__dots hero-stats-nav__dots--right">
          <span className="hero-stats-nav__dot hero-stats-nav__dot--active" />
          <span className="hero-stats-nav__dot hero-stats-nav__dot--fade-1" />
          <span className="hero-stats-nav__dot hero-stats-nav__dot--fade-2" />
          <span className="hero-stats-nav__dot hero-stats-nav__dot--fade-3" />
        </div>
        <span className="hero-stats-nav__line hero-stats-nav__line--right" />
      </div>
    </div>
  );
}

export default function HomeLanding() {
  const { t } = useLanguage();

  const mainBg = staticFile("/Img/Main_bg.png");

  return (
    <section className="relative min-h-screen bg-[#030305] overflow-hidden">
      {/* Main background */}
      <div className="absolute inset-0 hero-main-bg" aria-hidden>
        <img src={mainBg} alt="" className="hero-main-bg__image" />
        <div className="absolute inset-0 hero-main-bg__shade" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-8">
        {/* Top bar + strategy points — spaced below TORNEO header, cluster high for jockey */}
        <AnimateInView>
          <div className="hero-top-cluster">
            <div className="hero-top-bar">
              <LaurelTrophy />
              <HeroTorneoHeader t={t} />
              <LanguageToggle />
            </div>

            <div className="hero-strategy-points flex flex-col sm:flex-row items-stretch bg-transparent">
              <StrategyPointColumn
                variant="full"
                label={t("hero.fullPointTitle")}
                taglineLines={[t("hero.fullPointTag1"), t("hero.fullPointTag2")]}
                imageSrc={staticFile(STRATEGY_IMAGES.full)}
              />
              <StrategyDivider />
              <StrategyPointColumn
                variant="dual"
                label={t("hero.dualPointTitle")}
                taglineLines={[t("hero.dualPointTag1"), t("hero.dualPointTag2")]}
                imageSrc={staticFile(STRATEGY_IMAGES.dual)}
              />
              <StrategyDivider />
              <StrategyPointColumn
                variant="smart"
                label={t("hero.smartPointTitle")}
                taglineLines={[t("hero.smartPointTag1"), t("hero.smartPointTag2")]}
                imageSrc={staticFile(STRATEGY_IMAGES.smart)}
              />
            </div>
          </div>
        </AnimateInView>

        {/* MY 50 POINTS branding */}
        <AnimateInView delay={0.15}>
          <div className="max-w-2xl text-left bg-transparent">
            <MyFiftyPointsBrand tagline={t("hero.tagline")} />
          </div>
        </AnimateInView>

        {/* REGISTER / ENTER + slogan — horizontal center, same vertical band */}
        <AnimateInView delay={0.2}>
          <div id="hero-cta" className="hero-cta-panel-wrap">
            <HeroModalityPanel t={t} />
          </div>
        </AnimateInView>

        {/* Stats bar + nav (unified gradient panel) */}
        <AnimateInView delay={0.35}>
          <div className="hero-stats-section">
            <HeroStatsBar t={t} />
            <HeroStatsNav />
          </div>
        </AnimateInView>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple/40 to-transparent" />
    </section>
  );
}
