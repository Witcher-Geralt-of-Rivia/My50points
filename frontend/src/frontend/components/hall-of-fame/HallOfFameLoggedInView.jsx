"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { fetchJson, fetchAuthJson } from "@/frontend/lib/api/client";
import { staticFile } from "@/frontend/lib/config/paths";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import HallOfFamePodium from "@/frontend/components/hall-of-fame/HallOfFamePodium";
import HallOfFameEntryModals from "@/frontend/components/hall-of-fame/HallOfFameEntryModals";
import HallOfFameAchievementGrid from "@/frontend/components/hall-of-fame/HallOfFameAchievementGrid";
import HallOfFameNewsTicker from "@/frontend/components/hall-of-fame/HallOfFameNewsTicker";
import { HOF_FEATS, HOF_PODIUM_RANK_COLORS } from "@/frontend/lib/data/hallOfFameData";

const FALLBACK_PODIUM = [
  { rank: 1, name: "StarPicker", points: 608, color: HOF_PODIUM_RANK_COLORS[1] },
  { rank: 2, name: "DiamondEdge", points: 608, color: HOF_PODIUM_RANK_COLORS[2] },
  { rank: 3, name: "IronRider", points: 608, color: HOF_PODIUM_RANK_COLORS[3] },
];

const LEGENDARY_HORSES = [
  { name: "Thunder Strike", track: "Gulfstream" },
  { name: "Midnight Run", track: "Santa Anita" },
  { name: "Golden Hoof", track: "Churchill" },
  { name: "Storm Chaser", track: "Belmont" },
];

function mapPodiumPlayer(entry) {
  return {
    rank: entry.rank,
    name: entry.username,
    points: entry.totalPoints ?? 0,
    color: entry.avatarColor || HOF_PODIUM_RANK_COLORS[entry.rank] || "#7c3aed",
  };
}

export default function HallOfFameLoggedInView() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [podiumPlayers, setPodiumPlayers] = useState(FALLBACK_PODIUM);
  const [profile, setProfile] = useState(null);

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

    fetchAuthJson("/profile")
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const totalPoints = profile?.user?.stats?.totalPoints ?? 2580;
  const globalRank = profile?.user?.globalRank ?? 12;
  const wins = profile?.user?.stats?.titles ?? profile?.user?.stats?.totalRaces ?? 0;
  const entryFeat = HOF_FEATS.find((a) => a.unlocked && a.holder) || HOF_FEATS[0];

  return (
    <div className="hof-app hof-app--embedded-nav">
      <main className="hof-app__main">
        <AppPageHeader
          title={t("hallOfFame.pageTitle")}
          actions={
            <img
              src={staticFile("/images/icons/icon-horse.png")}
              alt=""
              className="hof-app__page-art"
              aria-hidden
            />
          }
        />

        <HallOfFameNewsTicker className="hof-app__news" />

        {/* Manual trigger — wizard no longer opens automatically */}
        <div className="hof-entry-trigger-row">
          <button
            type="button"
            className="hof-entry-trigger-btn"
            onClick={() => HallOfFameEntryModals.open?.()}
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {t("hallOfFame.viewMyEntry") || "Ver mi presentación oficial"}
          </button>
        </div>

        <section className="hof-feat-reveal" aria-label={t("hallOfFame.featReveal")}>
          <div className="hof-feat-reveal__intro">
            <h2 className="hof-feat-reveal__title">{t("hallOfFame.featReveal")}</h2>
            <p className="hof-feat-reveal__subtitle">{t("hallOfFame.featRevealSub")}</p>
            <p className="hof-feat-reveal__feat">
              {isEn ? entryFeat.nameEn : entryFeat.name}
            </p>
          </div>
          <HallOfFamePodium
            embedded
            players={podiumPlayers}
            title={t("hallOfFame.congratulationsTitle")}
            subtitle={t("hallOfFame.congratulationsSubtitle")}
            pointsWord={t("hallOfFame.pointsUnit")}
            locale={language}
          />
        </section>

        <HallOfFameAchievementGrid
          achievements={HOF_FEATS}
          isEn={isEn}
          lockedLabel={t("hallOfFame.locked")}
          title={t("hallOfFame.uniqueFeats")}
        />
      </main>

      <aside className="hof-app__aside">
        <section className="hof-season-panel">
          <h2 className="hof-season-panel__title">{t("hallOfFame.seasonTitle")}</h2>
          <dl className="hof-season-panel__stats">
            <div>
              <dt>{t("hallOfFame.seasonPoints")}</dt>
              <dd>{totalPoints.toLocaleString(isEn ? "en-US" : "es-ES")}</dd>
            </div>
            <div>
              <dt>{t("hallOfFame.seasonRank")}</dt>
              <dd>#{globalRank}</dd>
            </div>
            <div>
              <dt>{t("hallOfFame.seasonWins")}</dt>
              <dd>{wins}</dd>
            </div>
          </dl>
        </section>

        <section className="hof-legend-horses">
          <h2 className="hof-legend-horses__title">{t("hallOfFame.legendaryHorses")}</h2>
          <ul className="hof-legend-horses__list">
            {LEGENDARY_HORSES.map((horse) => (
              <li key={horse.name} className="hof-legend-horses__item">
                <span className="hof-legend-horses__name">{horse.name}</span>
                <span className="hof-legend-horses__track">{horse.track}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
