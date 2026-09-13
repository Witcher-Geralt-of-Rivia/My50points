"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { fetchJson } from "@/frontend/lib/api/client";
import HallOfFamePodium from "@/frontend/components/hall-of-fame/HallOfFamePodium";
import HallOfFameNewsTicker from "@/frontend/components/hall-of-fame/HallOfFameNewsTicker";
import HallOfFameAchievementGrid from "@/frontend/components/hall-of-fame/HallOfFameAchievementGrid";
import { HOF_FEATS, HOF_PODIUM_RANK_COLORS } from "@/frontend/lib/data/hallOfFameData";

const FALLBACK_PODIUM = [
  { rank: 1, name: "StarPicker", points: 608, color: HOF_PODIUM_RANK_COLORS[1] },
  { rank: 2, name: "DiamondEdge", points: 608, color: HOF_PODIUM_RANK_COLORS[2] },
  { rank: 3, name: "IronRider", points: 608, color: HOF_PODIUM_RANK_COLORS[3] },
];

function mapPodiumPlayer(entry) {
  return {
    rank: entry.rank,
    name: entry.username,
    points: entry.totalPoints ?? 0,
    color: entry.avatarColor || HOF_PODIUM_RANK_COLORS[entry.rank] || "#7c3aed",
  };
}

export default function HallOfFamePublicView() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [podiumPlayers, setPodiumPlayers] = useState(FALLBACK_PODIUM);

  const entryFeat = HOF_FEATS.find((a) => a.unlocked && a.holder) || HOF_FEATS[0];

  useEffect(() => {
    fetchJson("/leaderboard?limit=3")
      .then((data) => {
        const legends = data?.legends || [];
        if (legends.length >= 3) {
          setPodiumPlayers(legends.slice(0, 3).map(mapPodiumPlayer));
        } else if (legends.length > 0) {
          const mapped = legends.map(mapPodiumPlayer);
          const filled = [...mapped];
          for (let r = mapped.length + 1; r <= 3; r++) {
            const fb = FALLBACK_PODIUM.find((p) => p.rank === r);
            if (fb) filled.push(fb);
          }
          setPodiumPlayers(filled);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative text-white">
      <HallOfFamePodium
        players={podiumPlayers}
        title={t("hallOfFame.congratulationsTitle")}
        subtitle={t("hallOfFame.congratulationsSubtitle")}
        pointsWord={t("hallOfFame.pointsUnit")}
        locale={language}
      />

      <div className="relative z-10 app-page pb-16 -mt-2 sm:-mt-4">
        <HallOfFameNewsTicker className="mb-6" />

        <section className="hof-feat-reveal hof-feat-reveal--public" aria-label={t("hallOfFame.featReveal")}>
          <div className="hof-feat-reveal__intro">
            <h2 className="hof-feat-reveal__title">{t("hallOfFame.featReveal")}</h2>
            <p className="hof-feat-reveal__subtitle">{t("hallOfFame.featRevealSub")}</p>
            <p className="hof-feat-reveal__feat">
              {isEn ? entryFeat.nameEn : entryFeat.name}
            </p>
            {entryFeat.holder ? (
              <p className="hof-feat-reveal__holder">
                {entryFeat.holder} · {entryFeat.date}
              </p>
            ) : null}
          </div>
        </section>

        <HallOfFameAchievementGrid
          achievements={HOF_FEATS}
          isEn={isEn}
          lockedLabel={t("hallOfFame.locked")}
          title={t("hallOfFame.uniqueFeats")}
        />
      </div>
    </div>
  );
}
