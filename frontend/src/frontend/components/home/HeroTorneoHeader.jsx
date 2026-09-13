"use client";

import { logoFile } from "@/frontend/lib/config/paths";

function capitalizePhrase(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function HeroTorneoHeader({ t }) {
  const logo = logoFile();

  return (
    <header className="hero-torneo-header">
      <div className="hero-torneo-header__title-row">
        <h2 className="hero-torneo-header__title">{t("modalityWorkspace.torneoTitle")}</h2>
        <img src={logo} alt="" className="hero-torneo-header__badge" />
      </div>
      <p className="hero-torneo-header__slogan">
        <span className="hero-torneo-header__slogan-part hero-torneo-header__slogan-part--purple">
          {capitalizePhrase(t("hero.sloganStrategy"))}.
        </span>{" "}
        <span className="hero-torneo-header__slogan-part hero-torneo-header__slogan-part--cyan">
          {capitalizePhrase(t("hero.sloganPoints"))}.
        </span>{" "}
        <span className="hero-torneo-header__slogan-part hero-torneo-header__slogan-part--gold">
          {capitalizePhrase(t("hero.sloganGame"))}.
        </span>
      </p>
      <div className="hero-torneo-header__flare" aria-hidden />
    </header>
  );
}
