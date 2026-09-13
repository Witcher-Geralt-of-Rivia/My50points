"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getModality } from "@/frontend/lib/gameModalities";

/**
 * Modalidades | Hipódromos | Tickets — top navigation.
 * Tickets tab can be a local button (no navigation) when onTicketsClick is passed.
 */
export default function ModalitySimpleTabs({ modalityId, active = "tracks", onTicketsClick }) {
  const { t } = useLanguage();
  const mod = getModality(modalityId);
  const base = `/modalidades/${modalityId}`;

  const tabs = [
    { id: "hub", href: "/modalidades", labelKey: "tabModalities", icon: null },
    { id: "tracks", href: base, labelKey: "tabTracks", icon: null },
    { id: "tickets", href: `${base}#tickets`, labelKey: "hubTabTickets", icon: Ticket },
  ];

  return (
    <nav
      className="modality-simple-tabs"
      aria-label={t("gameModalities.simpleTabsAria")}
      style={{ "--modality-accent": mod.accent }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        const className = `modality-simple-tabs__tab${isActive ? " modality-simple-tabs__tab--active" : ""}`;

        if (tab.id === "tickets" && onTicketsClick) {
          return (
            <button
              key={tab.id}
              type="button"
              className={className}
              aria-current={isActive ? "true" : undefined}
              onClick={onTicketsClick}
            >
              {Icon ? <Icon className="modality-simple-tabs__icon" aria-hidden strokeWidth={2} /> : null}
              {t(`gameModalities.${tab.labelKey}`)}
            </button>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={className}
            aria-current={isActive ? "page" : undefined}
          >
            {Icon ? <Icon className="modality-simple-tabs__icon" aria-hidden strokeWidth={2} /> : null}
            {t(`gameModalities.${tab.labelKey}`)}
          </Link>
        );
      })}
    </nav>
  );
}
