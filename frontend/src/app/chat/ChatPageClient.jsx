"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ChevronDown } from "lucide-react";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import GlobalLeaderboardChat from "@/frontend/components/leaderboard/GlobalLeaderboardChat";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import ModalityFlowNav from "@/frontend/components/modalities/ModalityFlowNav";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import {
  readPersistedModality,
  isValidModalityId,
  withModalityQuery,
} from "@/frontend/lib/gameModalities";

const STRATEGY_RECORDS = [
  { key: "fp", color: "#fbbf24", label: "FP", nameKey: "fullPoint" },
  { key: "dp", color: "#a855f7", label: "DP", nameKey: "dualPoint" },
  { key: "sp", color: "#22d3ee", label: "SP", nameKey: "smartPoint" },
];

export default function ChatPageClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("modality");
  const modalityId = isValidModalityId(fromQuery)
    ? fromQuery
    : readPersistedModality() || "free";

  return (
    <ModalityPageShell modalityId={modalityId} className="chat-page">
      <ModalityFlowNav modalityId={modalityId} currentStep="hub" />

      <AppPageHeader
        className="chat-page__header"
        title={t("chatPage.title")}
        subtitle={t("chatPage.subtitle")}
        filters={
          <span className="mis-stats-filter chat-page__live-badge">
            <span className="chat-page__live-dot" aria-hidden />
            {t("chatPage.live")}
          </span>
        }
      />

      <div className="chat-page__records" role="list">
        {STRATEGY_RECORDS.map((rec) => (
          <div
            key={rec.key}
            role="listitem"
            className="chat-record-card"
            style={{ "--record-accent": rec.color }}
          >
            <span className="chat-record-card__badge">{rec.label}</span>
            <p className="chat-record-card__title">{t(`chatPage.record.${rec.nameKey}`)}</p>
            <p className="chat-record-card__user">—</p>
            <p className="chat-record-card__pts">—</p>
          </div>
        ))}
      </div>

      <div className="chat-page__layout">
        <section className="chat-page__feed modality-panel" aria-label={t("chatPage.feedTitle")}>
          <div className="chat-page__feed-head">
            <MessageCircle className="chat-page__feed-icon" aria-hidden />
            <span>{t("chatPage.feedTitle")}</span>
            <button type="button" className="chat-page__filter">
              {t("chatPage.filterAll")}
              <ChevronDown className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <div className="chat-page__feed-body">
            <GlobalLeaderboardChat />
          </div>
        </section>

        <aside className="chat-page__side modality-panel">
          <div className="chat-tournament-card">
            <p className="chat-tournament-card__label">{t("chatPage.nextTournament")}</p>
            <p className="chat-tournament-card__name">—</p>
            <p className="chat-tournament-card__timer">—</p>
            <Link
              href={withModalityQuery("/modalidades", modalityId)}
              className="chat-tournament-card__cta"
            >
              {t("chatPage.viewTournament")}
            </Link>
          </div>
        </aside>
      </div>

      <nav className="modality-cross-links" aria-label={t("gameModalities.flowAria")}>
        <Link href={withModalityQuery(`/modalidades/${modalityId}`, modalityId)}>
          {t("floatingMenu.gameModes")}
        </Link>
        <Link href={withModalityQuery("/leaderboard", modalityId)}>
          {t("floatingMenu.ranking")}
        </Link>
        <Link href={withModalityQuery("/statistics", modalityId)}>
          {t("floatingMenu.tickets")}
        </Link>
      </nav>
    </ModalityPageShell>
  );
}
