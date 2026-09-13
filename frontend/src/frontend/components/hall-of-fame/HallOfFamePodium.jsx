"use client";

import { motion } from "framer-motion";
import { staticFile } from "@/frontend/lib/config/paths";
import { HOF_GOLD_WINNER_AVATAR_COLOR } from "@/frontend/lib/data/hallOfFameData";

const PEDESTAL_IMAGES = {
  gold: staticFile("/Img/hall-of-fame-gold.png"),
  silver: staticFile("/Img/hall-of-fame-silver.png"),
  bronze: staticFile("/Img/hall-of-fame-bronze.png"),
};

const GOLD_WINNER_FRAME = staticFile("/Img/hall-of-fame-gold circle.png");

function formatPoints(value, locale, pointsWord) {
  const n = Number(value) || 0;
  return `${n.toLocaleString(locale === "en" ? "en-US" : "es-ES")} ${pointsWord}`;
}

function avatarUrl(name, color) {
  const hex = (color || "#7c3aed").replace("#", "");
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${hex}&color=fff&size=256&bold=true`;
}

function GoldWinnerFrame({ name, pointsLabel }) {
  return (
    <div className="hof-winner-frame">
      <div className="hof-winner-frame__avatar-wrap">
        <img
          src={avatarUrl(name, HOF_GOLD_WINNER_AVATAR_COLOR)}
          alt=""
          className="hof-winner-frame__avatar"
        />
      </div>
      <img
        src={GOLD_WINNER_FRAME}
        alt=""
        className="hof-winner-frame__overlay"
        aria-hidden
      />
      <div className="hof-nameplate hof-nameplate--gold-winner">
        <p className="hof-nameplate__name">{name}</p>
        <p className="hof-nameplate__points hof-nameplate__points--gold">{pointsLabel}</p>
      </div>
    </div>
  );
}

function PodiumSlot({ player, variant, pointsWord, locale, delay }) {
  if (!player) return <div className="hof-podium-slot hof-podium-slot--empty" aria-hidden />;

  const isGold = variant === "gold";

  return (
    <motion.div
      className={`hof-podium-slot hof-podium-slot--${variant}`}
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`hof-player-stack${isGold ? " hof-player-stack--gold" : ""}`}>
        {isGold ? (
          <GoldWinnerFrame
            name={player.name}
            pointsLabel={formatPoints(player.points, locale, pointsWord)}
          />
        ) : (
          <>
            <div className={`hof-avatar-ring hof-avatar-ring--${variant}`}>
              <img
                src={avatarUrl(player.name, player.color)}
                alt=""
                className="hof-avatar-img"
              />
            </div>
            <div className="hof-nameplate">
              <p className="hof-nameplate__name">{player.name}</p>
              <p className={`hof-nameplate__points hof-nameplate__points--${variant}`}>
                {formatPoints(player.points, locale, pointsWord)}
              </p>
            </div>
          </>
        )}
      </div>
      <img
        src={PEDESTAL_IMAGES[variant]}
        alt=""
        className="hof-podium-img"
        aria-hidden
      />
    </motion.div>
  );
}

export default function HallOfFamePodium({ players, title, subtitle, pointsWord, locale, embedded = false }) {
  const second = players.find((p) => p.rank === 2);
  const first = players.find((p) => p.rank === 1);
  const third = players.find((p) => p.rank === 3);
  const headmarkSrc =
    locale === "en"
      ? staticFile("/Img/hall-of-fame-headmark-en.png")
      : staticFile("/Img/hall-of-fame-headmark-es.png");

  const bgSrc = staticFile("/Img/hall-of-fame-bg.png");

  return (
    <section className={`hof-scene${embedded ? " hof-scene--embedded" : ""}`}>
      {embedded ? (
        <img src={bgSrc} alt="" className="hof-scene__bg" aria-hidden />
      ) : (
        <div className="hof-scene__ambient" aria-hidden>
          <img src={bgSrc} alt="" className="hof-scene__bg hof-scene__bg--fixed" />
        </div>
      )}
      <div className="hof-scene__fade" aria-hidden />

      <motion.div
        className="hof-scene__header"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <img
          src={headmarkSrc}
          alt={`${title}. ${subtitle}`}
          className="hof-scene__headmark"
        />
      </motion.div>

      <div className="hof-podium-stage">
        <div className="hof-podium-row">
          <PodiumSlot
            player={second}
            variant="silver"
            pointsWord={pointsWord}
            locale={locale}
            delay={0.15}
          />
          <PodiumSlot
            player={first}
            variant="gold"
            pointsWord={pointsWord}
            locale={locale}
            delay={0.05}
          />
          <PodiumSlot
            player={third}
            variant="bronze"
            pointsWord={pointsWord}
            locale={locale}
            delay={0.25}
          />
        </div>
      </div>
    </section>
  );
}
