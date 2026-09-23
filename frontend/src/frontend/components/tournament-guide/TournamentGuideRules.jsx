"use client";

import { SINGLE_GUEST_ENTRY, isModalityExposed } from "@/frontend/lib/productFlags";

// Order of tournamentGuide.modalities in the translations (Modalidad 1..4).
const GUIDE_MODALITY_IDS = ["paid", "free", "special", "guest"];

export default function TournamentGuideRules({ t }) {
  const strategies = t("tournamentGuide.strategies");
  const strategyList = Array.isArray(strategies) ? strategies : [];
  const rankingItems = t("tournamentGuide.rankingItems");
  const rankingList = Array.isArray(rankingItems) ? rankingItems : [];
  const modalities = t("tournamentGuide.modalities");
  // Only the modalities offered in this release are described (productFlags);
  // the copy for the others stays in the translations for later.
  const modalityList = (Array.isArray(modalities) ? modalities : []).filter((_, i) =>
    isModalityExposed(GUIDE_MODALITY_IDS[i]),
  );

  return (
    <div className="tg-rules">
      <section className="tg-rules__section">
        <h2 className="tg-rules__heading">{t("tournamentGuide.whatIsTitle")}</h2>
        <p className="tg-rules__text">{t("tournamentGuide.whatIsP1")}</p>
        <p className="tg-rules__text">{t("tournamentGuide.whatIsP2")}</p>
      </section>

      <section className="tg-rules__section">
        <h2 className="tg-rules__heading">{t("tournamentGuide.pointsTitle")}</h2>
        <p className="tg-rules__text">{t("tournamentGuide.pointsP1")}</p>
        <ul className="tg-rules__list">
          {strategyList.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong>
              {item.desc ? ` — ${item.desc}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="tg-rules__section">
        <h2 className="tg-rules__heading">{t("tournamentGuide.resultsTitle")}</h2>
        <p className="tg-rules__text">{t("tournamentGuide.resultsP1")}</p>
        <p className="tg-rules__text">{t("tournamentGuide.resultsP2")}</p>
      </section>

      <section className="tg-rules__section">
        <h2 className="tg-rules__heading">{t("tournamentGuide.scratchesTitle")}</h2>
        <p className="tg-rules__text">{t("tournamentGuide.scratchesP1")}</p>
      </section>

      <section className="tg-rules__section">
        <h2 className="tg-rules__heading">{t("tournamentGuide.rankingTitle")}</h2>
        <p className="tg-rules__text">{t("tournamentGuide.rankingP1")}</p>
        <ul className="tg-rules__list">
          {rankingList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="tg-rules__section">
        <h2 className="tg-rules__heading">{SINGLE_GUEST_ENTRY && modalityList[0] ? modalityList[0].title : t("tournamentGuide.modalitiesTitle")}</h2>
        {modalityList.map((mod) => (
          <article key={mod.title} className="tg-rules__modality">
            {SINGLE_GUEST_ENTRY ? null : <h3 className="tg-rules__modality-title">{mod.title}</h3>}
            <p className="tg-rules__modality-name">{mod.name}</p>
            <ul className="tg-rules__list">
              {(mod.items || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="tg-rules__section tg-rules__section--reminder">
        <h2 className="tg-rules__heading">{t("tournamentGuide.reminderTitle")}</h2>
        <p className="tg-rules__text">{t("tournamentGuide.reminderP1")}</p>
        <p className="tg-rules__text">{t("tournamentGuide.reminderP2")}</p>
      </section>
    </div>
  );
}