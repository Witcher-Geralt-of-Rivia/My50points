"use client";

import { X, Calendar, Trophy, Crown, Medal, Star } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { logoFile } from "@/frontend/lib/config/paths";
import { hofAsset } from "@/frontend/lib/config/hofAssets";
import { avatarForPlayer } from "@/frontend/lib/data/hallOfFameData";
import { CARD_TYPES } from "@/frontend/lib/achievementCards";
import HofAssetImage from "@/frontend/components/hall-of-fame/HofAssetImage";

export default function AchievementCardModal({ card, onClose, viewOnly = false }) {
  const { t, language } = useLanguage();
  const isEn = language === "en";

  if (!card) return null;

  const isWinner = card.type === CARD_TYPES.TOURNAMENT_WINNER;
  const isSecond =
    card.type === CARD_TYPES.TOURNAMENT_SECOND || card.type === CARD_TYPES.RECORD_EQUAL;
  const isThird = card.type === CARD_TYPES.TOURNAMENT_THIRD;

  const theme = isWinner ? "gold" : isSecond ? "silver" : isThird ? "bronze" : "gold";
  const avatar = avatarForPlayer(card.playerName, card.playerColor);
  const featLabel = isEn && card.featNameEn ? card.featNameEn : card.featName;

  const title = isWinner
    ? t("achievementCards.winnerTicket")
    : isThird
      ? t("achievementCards.thirdPlace")
      : card.type === CARD_TYPES.RECORD_EQUAL
        ? t("achievementCards.recordTied")
        : t("achievementCards.secondPlace");

  const subtitle = isWinner
    ? t("achievementCards.officialConfirmed")
    : isThird
      ? t("achievementCards.gotThird")
      : card.type === CARD_TYPES.RECORD_EQUAL
        ? t("achievementCards.matchedRecord")
        : t("achievementCards.gotSecond");

  const rankBanner = isWinner
    ? t("achievementCards.tournamentWinner")
    : isThird
      ? t("achievementCards.thirdInTournament")
      : card.type === CARD_TYPES.RECORD_EQUAL
        ? (featLabel || t("achievementCards.recordMatched")).toUpperCase()
        : t("achievementCards.secondInTournament");

  const pts = card.points ?? (isThird ? 25 : 50);
  const pointsLine = `${t("achievementCards.wonPointsPrefix")} ${pts} MY POINTS.`;

  const trophyKey = isWinner ? "trophyGoldStar" : isThird ? "trophyBronze3" : "trophySilver2";
  const bannerKey = isWinner ? "rankBannerGold" : isThird ? "rankBannerBronze" : "rankBannerSilver";
  const wreathTheme = isWinner ? "gold" : "silver";

  return (
    <div className="ach-card-overlay" role="dialog" aria-modal="true">
      <button type="button" className="ach-card-overlay__backdrop" onClick={onClose} aria-label={t("common.close")} />
      <div className={`ach-card ach-card--${theme}`}>
        <button type="button" className="ach-card__close" onClick={onClose} aria-label={t("common.close")}>
          <X className="w-5 h-5" />
        </button>

        {!viewOnly ? (
          <p className="ach-card__new">{t("achievementCards.addedToGallery")}</p>
        ) : null}

        <div className="ach-card__frame">
          <HofAssetImage
            src={hofAsset(isWinner ? "winnerSparkles" : "cardBgDark")}
            alt=""
            className="ach-card__bg"
          />

          {isWinner ? (
            <>
              <h2 className="ach-card__title ach-card__title--hero">{title}</h2>
              <p className="ach-card__eyebrow">
                <Star className="w-3 h-3 inline" />
                {subtitle}
                <Star className="w-3 h-3 inline" />
              </p>
            </>
          ) : (
            <>
              <h2 className="ach-card__title ach-card__title--congrats">{t("achievementCards.congrats")}</h2>
              <p className="ach-card__subtitle">
                <Star className="w-3 h-3 inline" />
                {subtitle}
                <Star className="w-3 h-3 inline" />
              </p>
            </>
          )}

          <div className="ach-card__event">
            <span>
              <HofAssetImage
                src={hofAsset("horseshoeGold")}
                alt=""
                className="ach-card__event-icon"
                fallback={<span>🏇</span>}
              />
              {card.track}
            </span>
            <span className="ach-card__event-sep" aria-hidden />
            <span>
              <HofAssetImage
                src={hofAsset("calendarGold")}
                alt=""
                className="ach-card__event-icon"
                fallback={<Calendar className="w-3 h-3 inline" />}
              />
              {card.date}
            </span>
          </div>

          <div className="ach-card__profile">
            <div className="ach-card__wreaths" aria-hidden>
              <HofAssetImage
                src={hofAsset(wreathTheme === "gold" ? "laurelGoldLeft" : "laurelSilverLeft")}
                alt=""
                className="ach-card__wreath-img ach-card__wreath-img--l"
                fallback={<span className="ach-card__wreath ach-card__wreath--l" />}
              />
              <div className="ach-card__avatar-wrap">
                <HofAssetImage src={hofAsset("profileSilhouette")} alt="" className="ach-card__avatar-glow" />
                <img src={avatar} alt="" className="ach-card__avatar" />
              </div>
              <HofAssetImage
                src={hofAsset(wreathTheme === "gold" ? "laurelGoldRight" : "laurelSilverRight")}
                alt=""
                className="ach-card__wreath-img ach-card__wreath-img--r"
                fallback={<span className="ach-card__wreath ach-card__wreath--r" />}
              />
            </div>
            <p className="ach-card__player">{card.playerName}</p>
          </div>

          {!isWinner ? (
            <div className={`ach-card__rank-banner-wrap ach-card__rank-banner-wrap--${theme}`}>
              <HofAssetImage src={hofAsset(bannerKey)} alt="" className="ach-card__rank-banner-bg" />
              <div className={`ach-card__rank-banner ach-card__rank-banner--${theme}`}>
                <span className="ach-card__rank-num">{card.place}°</span>
                <span>{rankBanner}</span>
              </div>
            </div>
          ) : (
            <p className="ach-card__winner-label">
              <Star className="w-3 h-3 inline" />
              {rankBanner}
              <Star className="w-3 h-3 inline" />
            </p>
          )}

          <p className="ach-card__body">
            {isWinner
              ? t("achievementCards.winnerBody")
              : isThird
                ? t("achievementCards.thirdBody")
                : card.type === CARD_TYPES.RECORD_EQUAL
                  ? t("achievementCards.recordBody")
                  : t("achievementCards.secondBody")}
          </p>
          <p className="ach-card__body ach-card__body--accent">{pointsLine}</p>
          <p className="ach-card__body">{t("achievementCards.archivedForever")}</p>

          <div className="ach-card__footer-box">
            <p className="ach-card__footer-tab">{t("achievementCards.officialResult")}</p>
            <div className="ach-card__footer-row">
              <HofAssetImage
                src={hofAsset(trophyKey)}
                alt=""
                className="ach-card__footer-trophy"
                fallback={
                  isWinner ? (
                    <Trophy className="w-8 h-8 text-amber-400" />
                  ) : isThird ? (
                    <Medal className="w-8 h-8 text-orange-400" />
                  ) : (
                    <Crown className="w-8 h-8 text-zinc-300" />
                  )
                }
              />
              <div className="ach-card__footer-copy">
                <p className="ach-card__footer-title">{rankBanner}</p>
                <p className="ach-card__footer-track">{card.track}</p>
                <p className="ach-card__footer-points">{pts} MY POINTS</p>
              </div>
              <HofAssetImage
                src={hofAsset("pointsTicketBadge")}
                alt=""
                className="ach-card__footer-badge"
                fallback={<img src={logoFile()} alt="" className="ach-card__footer-badge" />}
              />
              <div className="ach-card__footer-date">
                <HofAssetImage
                  src={hofAsset("calendarGold")}
                  alt=""
                  className="ach-card__footer-cal"
                  fallback={<Calendar className="w-4 h-4" />}
                />
                {card.date?.split(" ").slice(-3).join(" ") || card.date}
              </div>
            </div>
          </div>

          <p className="ach-card__tagline">
            {isWinner
              ? t("achievementCards.firstForever")
              : isThird
                ? t("achievementCards.keepGoing")
                : t("achievementCards.victoryCloser")}
          </p>

          <HofAssetImage
            src={hofAsset("shieldGoldStar")}
            alt=""
            className="ach-card__shield"
            fallback={<span className="ach-card__shield-fallback" aria-hidden />}
          />
        </div>

        <button type="button" className="ach-card__btn" onClick={onClose}>
          {viewOnly ? t("common.close") : t("achievementCards.awesome")}
        </button>
      </div>
    </div>
  );
}
