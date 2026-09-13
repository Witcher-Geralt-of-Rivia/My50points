"use client";

import {
  TOURNAMENT_GUIDE_SUMMARY_KEYS,
  tournamentGuideAsset,
} from "@/frontend/lib/config/tournamentGuideAssets";

export default function TournamentGuideQuickSummary({ t }) {
  const labels = t("tournamentGuide.summaryLabels");
  const labelList = Array.isArray(labels) ? labels : [];

  return (
    <div className="tg-quick-summary">
      <p className="tg-quick-summary__title">{t("tournamentGuide.quickSummary")}</p>
      <div className="tg-quick-summary__row" aria-hidden>
        {TOURNAMENT_GUIDE_SUMMARY_KEYS.map((key, index) => {
          const src = tournamentGuideAsset(key);
          const label = labelList[index] || "";
          return (
            <span key={key} className="tg-quick-summary__chip">
              {src ? <img src={src} alt="" className="tg-quick-summary__icon" /> : null}
              <span className="tg-quick-summary__label">{label}</span>
              {index < TOURNAMENT_GUIDE_SUMMARY_KEYS.length - 1 ? (
                <span className="tg-quick-summary__arrow">→</span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
