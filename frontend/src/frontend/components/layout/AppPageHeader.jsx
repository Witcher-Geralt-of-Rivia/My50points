"use client";

import Image from "next/image";
import Link from "next/link";
import { Home } from "lucide-react";
import { logoAsset } from "@/frontend/lib/config/paths";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

/**
 * Page header: home link above, ticket logo beside the page title.
 */
export default function AppPageHeader({
  title,
  subtitle,
  filters,
  actions,
  className = "",
  showHomeLink = true,
}) {
  const { t } = useLanguage();

  return (
    <header className={`mis-stats-header app-page-header${className ? ` ${className}` : ""}`}>
      <div className="app-page-header__top">
        <div className="app-page-header__leading">
          {showHomeLink ? (
            <Link href="/" className="app-brand-header__home">
              <Home className="app-brand-header__home-icon" aria-hidden />
              <span>{t("appBrand.homeLink")}</span>
            </Link>
          ) : null}
          {title ? (
            <div className="mis-stats-header__brand app-page-header__brand">
              <Image
                src={logoAsset()}
                alt="50 POINTS"
                width={44}
                height={44}
                className="mis-stats-header__logo"
                priority
              />
              <h1 className="mis-stats-header__title">{title}</h1>
            </div>
          ) : null}
          {subtitle ? <p className="app-page-header__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="app-page-header__actions">{actions}</div> : null}
      </div>
      {filters ? <div className="mis-stats-filters app-page-header__filters">{filters}</div> : null}
    </header>
  );
}
