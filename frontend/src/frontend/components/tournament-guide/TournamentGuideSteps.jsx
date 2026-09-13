"use client";

import {
  tournamentGuideAsset,
  tournamentGuideStepAsset,
} from "@/frontend/lib/config/tournamentGuideAssets";
import { logoFile } from "@/frontend/lib/config/paths";

const STEP_THEMES = ["purple", "cyan", "blue", "gold", "purple", "cyan", "gold"];

export default function TournamentGuideSteps({ t, compact = false }) {
  const steps = t("tournamentGuide.steps");
  const items = Array.isArray(steps) ? steps : [];

  return (
    <ol className={`tg-steps${compact ? " tg-steps--compact" : ""}`}>
      {items.map((step, index) => {
        const stepNum = index + 1;
        const theme = STEP_THEMES[index] || "purple";
        const iconSrc = tournamentGuideStepAsset(stepNum);

        return (
          <li
            key={step.title}
            className={`tg-steps__item tg-steps__item--${theme}`}
            tabIndex={0}
          >
            <span className="tg-steps__num" aria-hidden>
              {stepNum}
            </span>
            <div className="tg-steps__icon-wrap">
              {iconSrc ? (
                <img src={iconSrc} alt="" className="tg-steps__icon" />
              ) : null}
            </div>
            <h4 className="tg-steps__title">{step.title}</h4>
            <p className="tg-steps__desc">{step.desc}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function TournamentGuidePath({ t, className = "" }) {
  return (
    <p className={`tg-path${className ? ` ${className}` : ""}`}>
      {t("tournamentGuide.pathSteps")}
    </p>
  );
}

export function TournamentGuideHeroArt({ className = "" }) {
  const horses = tournamentGuideAsset("heroHorses");
  const trophy = tournamentGuideAsset("heroTrophy");
  const logo = logoFile();

  return (
    <div className={`tg-hero-art${className ? ` ${className}` : ""}`} aria-hidden>
      {horses ? <img src={horses} alt="" className="tg-hero-art__horses" /> : null}
      <img src={logo} alt="" className="tg-hero-art__logo" />
      {trophy ? <img src={trophy} alt="" className="tg-hero-art__trophy" /> : null}
    </div>
  );
}
