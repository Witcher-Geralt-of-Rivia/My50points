"use client";

import { staticFile } from "@/frontend/lib/config/paths";

const HOW_IT_WORKS_ICON = staticFile("/Img/HOW IT WORKS.png");

function StrategyHorseIcons({ count }) {
  return (
    <div className="how-step-card__strategy-icons" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <img
          key={i}
          src={HOW_IT_WORKS_ICON}
          alt=""
          className="how-step-card__strategy-icon"
        />
      ))}
    </div>
  );
}

export default function HowItWorksStepCard({
  step,
  stepLabel,
  variant = "bullets",
  title,
  titleLead,
  titleAccent,
  intro,
  description,
  strategies,
  bullets,
}) {
  return (
    <article className="how-step-card">
      <div className="how-step-card__shell">
        <span className="how-step-card__bg-step" aria-hidden>
          {stepLabel}
        </span>
        <div className="how-step-card__gloss" aria-hidden />
        <div className="how-step-card__gloss-edge" aria-hidden />

        <p className="how-step-card__label">{stepLabel}</p>

        {variant === "strategy" && (
          <>
            <h3 className="how-step-card__title-split">
              <span className="how-step-card__title-lead">{titleLead}</span>{" "}
              <span className="how-step-card__title-accent">{titleAccent}</span>
            </h3>
            <p className="how-step-card__intro">{intro}</p>
            <ul className="how-step-card__strategies">
              {strategies.map((item) => (
                <li key={item.name} className="how-step-card__strategy-item">
                  <div className="how-step-card__strategy-icon-cell">
                    <StrategyHorseIcons count={item.iconCount} />
                  </div>
                  <p className="how-step-card__strategy-text">
                    <span className="how-step-card__strategy-name">
                      {item.name}:
                    </span>{" "}
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        {variant === "paragraph" && (
          <>
            <h3 className="how-step-card__title">{title}</h3>
            <p className="how-step-card__desc">{description}</p>
          </>
        )}

        {variant === "bullets" && (
          <>
            <h3 className="how-step-card__title">{title}</h3>
            <ul className="how-step-card__list">
              {bullets.map((item, i) => (
                <li key={i} className="how-step-card__list-item">
                  <p className="how-step-card__bullet-text">
                    <span className="how-step-card__bullet-lead">
                      {item.lead}
                    </span>{" "}
                    <span className="how-step-card__bullet-rest">
                      {item.text}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}
