"use client";

import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { logoFile } from "@/frontend/lib/config/paths";

export default function AppSplashScreen({ exiting = false, animate = true }) {
  const { t } = useLanguage();

  return (
    <div
      className={`app-splash${exiting ? " app-splash--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label={t("splash.loading")}
    >
      <div className="app-splash__center">
        {/* Glow-border animated container */}
        <div className="app-splash__glow-border-wrap">
          <div className="app-splash__stack">
            <div className="app-splash__head">
              <h1 className="app-splash__title">{t("hero.tournament")}</h1>

              <div className="app-splash__logo-wrap">
                <img
                  src={logoFile()}
                  alt="50points"
                  className="app-splash__logo"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </div>

            <p className="app-splash__slogan">
              <span className="app-splash__slogan-part app-splash__slogan-part--gold app-splash__slogan-part--1">
                {t("hero.sloganStrategy")}.
              </span>
              <span className="app-splash__slogan-part app-splash__slogan-part--purple app-splash__slogan-part--2">
                {t("hero.sloganPoints")}.
              </span>
              <span className="app-splash__slogan-part app-splash__slogan-part--cyan app-splash__slogan-part--3">
                {t("hero.sloganGame")}.
              </span>
            </p>

            <div className="app-splash__loader" aria-hidden>
              <div className="app-splash__loader-track">
                <div
                  className={`app-splash__loader-fill${animate ? " app-splash__loader-fill--animate" : ""}${exiting ? " app-splash__loader-fill--complete" : ""}`}
                >
                  <span className="app-splash__loader-glow" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
