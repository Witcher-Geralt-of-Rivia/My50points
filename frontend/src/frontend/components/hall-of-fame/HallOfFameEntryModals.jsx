"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Crown,
  Trophy,
  Calendar,
  Target,
  Flame,
  BarChart3,
  Award,
  Star,
} from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchAuthJson } from "@/frontend/lib/api/client";
import { logoFile } from "@/frontend/lib/config/paths";
import { hofAsset } from "@/frontend/lib/config/hofAssets";
import { avatarForPlayer } from "@/frontend/lib/data/hallOfFameData";
import {
  buildHallOfFameEntry,
  HOF_ENTRY_STORAGE_KEY,
} from "@/frontend/lib/data/hallOfFameEntry";
import HofAssetImage from "./HofAssetImage";

const STEP_COUNT = 6;

function SectionNum({ n }) {
  return <span className="hof-entry-section-num">{n}</span>;
}

function Frame({ children, step, className = "", variant = "dark" }) {
  return (
    <div className={`hof-entry-card ${className}`.trim()} data-step={step}>
      <div className="hof-entry-card__glow" aria-hidden />
      <div className={`hof-entry-card__inner hof-entry-card__inner--${variant}`}>
        <HofAssetImage
          src={hofAsset(variant === "light" ? "cardBgLight" : "cardBgDark")}
          alt=""
          className="hof-entry-card__bg"
        />
        {children}
      </div>
    </div>
  );
}

function PointsBadge({ className = "" }) {
  return (
    <HofAssetImage
      src={hofAsset("pointsTicketBadge")}
      alt=""
      className={`hof-entry-points-badge ${className}`.trim()}
      fallback={<img src={logoFile()} alt="" className={`hof-entry-points-badge ${className}`.trim()} />}
    />
  );
}

function LaurelPair({ theme = "gold", className = "" }) {
  const left = theme === "silver" ? "laurelSilverLeft" : "laurelGoldLeft";
  const right = theme === "silver" ? "laurelSilverRight" : "laurelGoldRight";
  return (
    <div className={`hof-entry-laurels ${className}`.trim()} aria-hidden>
      <HofAssetImage src={hofAsset(left)} alt="" className="hof-entry-laurels__leaf hof-entry-laurels__leaf--l" />
      <HofAssetImage src={hofAsset(right)} alt="" className="hof-entry-laurels__leaf hof-entry-laurels__leaf--r" />
    </div>
  );
}

export default function HallOfFameEntryModals() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [entry, setEntry] = useState(() => buildHallOfFameEntry({ isEn }));

  // Never auto-open — user must click the trigger button.
  // (Previously used sessionStorage which re-opened on every new tab.)

  useEffect(() => {
    if (!isAuthenticated) {
      setEntry(buildHallOfFameEntry({ isEn }));
      return;
    }
    fetchAuthJson("/profile")
      .then((profile) => setEntry(buildHallOfFameEntry({ user, profile, isEn })))
      .catch(() => setEntry(buildHallOfFameEntry({ user, isEn })));
  }, [isAuthenticated, user, isEn]);

  const close = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(HOF_ENTRY_STORAGE_KEY, "1");
    }
  }, []);

  /** Public trigger so the HOF page can show a button to open this. */
  HallOfFameEntryModals.open = () => { setOpen(true); setStep(0); };

  const next = () => {
    if (step >= STEP_COUNT - 1) close();
    else setStep((s) => s + 1);
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  if (!open) return null;

  const avatar = avatarForPlayer(entry.username, entry.avatarColor);

  return (
    <div className="hof-entry-overlay" role="dialog" aria-modal="true" aria-labelledby="hof-entry-title">
      <button type="button" className="hof-entry-overlay__backdrop" onClick={close} aria-label={t("common.close")} />
      <div className="hof-entry-overlay__panel">
        <button type="button" className="hof-entry-overlay__close" onClick={close} aria-label={t("common.close")}>
          <X className="w-5 h-5" />
        </button>

        <div className="hof-entry-overlay__progress">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`hof-entry-overlay__dot${i === step ? " hof-entry-overlay__dot--active" : ""}${i < step ? " hof-entry-overlay__dot--done" : ""}`}
            />
          ))}
        </div>

        <div className="hof-entry-overlay__slide">
          {step === 0 && (
            <Frame step={0} className="hof-entry-card--official">
              <div className="hof-entry-official__vignette" aria-hidden />
              <header className="hof-entry-official__header">
                <h2 id="hof-entry-title" className="hof-entry-card__title hof-entry-card__title--official">
                  {t("hallOfFame.entry.hofTitle")}
                </h2>
                <p className="hof-entry-official__eyebrow">
                  <span className="hof-entry-official__eyebrow-star" aria-hidden>☆</span>
                  {t("hallOfFame.entry.officialConfirmed")}
                  <span className="hof-entry-official__eyebrow-star" aria-hidden>☆</span>
                </p>
              </header>

              <div className="hof-entry-official__profile">
                <div className="hof-entry-official__avatar-emblem">
                  <HofAssetImage
                    src={hofAsset("crownSilver")}
                    alt=""
                    className="hof-entry-official__crown"
                    fallback={<Crown className="hof-entry-official__crown-fallback" strokeWidth={1.25} />}
                  />
                  <HofAssetImage
                    src={hofAsset("laurelSilverLeft")}
                    alt=""
                    className="hof-entry-official__laurel-side hof-entry-official__laurel-side--l"
                    fallback={<span className="hof-entry-official__laurel-fallback hof-entry-official__laurel-fallback--l" aria-hidden />}
                  />
                  <div className="hof-entry-official__avatar-wrap">
                    <span className="hof-entry-official__avatar-halo" aria-hidden />
                    <HofAssetImage
                      src={hofAsset("avatarGlowPurple")}
                      alt=""
                      className="hof-entry-official__avatar-glow"
                    />
                    <img src={avatar} alt="" className="hof-entry-official__avatar" />
                  </div>
                  <HofAssetImage
                    src={hofAsset("laurelSilverRight")}
                    alt=""
                    className="hof-entry-official__laurel-side hof-entry-official__laurel-side--r"
                    fallback={<span className="hof-entry-official__laurel-fallback hof-entry-official__laurel-fallback--r" aria-hidden />}
                  />
                </div>
                <p className="hof-entry-official__name">{entry.username}</p>
              </div>

              <PointsBadge className="hof-entry-official__points" />

              <p className="hof-entry-official__message">{t("hallOfFame.entry.archivedMessage")}</p>

              <div className="hof-entry-official__feat-box">
                <HofAssetImage
                  src={hofAsset("trophyGold")}
                  alt=""
                  className="hof-entry-official__feat-trophy"
                  fallback={<Trophy className="hof-entry-official__feat-trophy-fallback" strokeWidth={1.5} />}
                />
                <div className="hof-entry-official__feat-copy">
                  <p className="hof-entry-official__feat-label">{t("hallOfFame.entry.playForEntry")}</p>
                  <p className="hof-entry-official__feat-name">{entry.feat.name.toUpperCase()}</p>
                </div>
              </div>

              <footer className="hof-entry-official__footer">
                <p className="hof-entry-official__first">
                  {t("hallOfFame.entry.firstToAchieve")} <strong>{entry.username}</strong>
                </p>
                <p className="hof-entry-official__date">
                  <HofAssetImage
                    src={hofAsset("calendarGold")}
                    alt=""
                    className="hof-entry-official__date-icon"
                    fallback={<Calendar className="hof-entry-official__date-icon-fallback" strokeWidth={1.5} />}
                  />
                  {entry.feat.date}
                </p>
                <p className="hof-entry-official__legend">{t("hallOfFame.entry.newLegend")}</p>
              </footer>
            </Frame>
          )}

          {step === 1 && (
            <Frame step={1} className="hof-entry-card--congrats">
              <div className="hof-entry-congrats__vignette" aria-hidden />
              <header className="hof-entry-congrats__header">
                <h2 className="hof-entry-card__title hof-entry-card__title--official">
                  {t("hallOfFame.entry.hofTitle")}
                </h2>
                <p className="hof-entry-congrats__eyebrow">{t("hallOfFame.entry.firstForever")}</p>
              </header>

              <div className="hof-entry-congrats__layout">
                <div className="hof-entry-congrats__left">
                  <div className="hof-entry-congrats__medallion">
                    <span className="hof-entry-congrats__medallion-halo" aria-hidden />
                    <HofAssetImage
                      src={hofAsset("avatarGlowGold")}
                      alt=""
                      className="hof-entry-congrats__avatar-glow"
                    />
                    <img src={avatar} alt="" className="hof-entry-congrats__avatar" />
                  </div>
                  <p className="hof-entry-congrats__name">{entry.username}</p>
                  <p className="hof-entry-congrats__role">{entry.title}</p>
                  <div className="hof-entry-congrats__badge">
                    <HofAssetImage
                      src={hofAsset("trophyGold")}
                      alt=""
                      className="hof-entry-congrats__badge-trophy"
                      fallback={<Trophy className="hof-entry-congrats__badge-trophy-fallback" strokeWidth={1.5} />}
                    />
                    <div className="hof-entry-congrats__badge-copy">
                      <p className="hof-entry-congrats__badge-feat">{entry.feat.name}</p>
                      <p className="hof-entry-congrats__badge-date">{entry.feat.date}</p>
                    </div>
                  </div>
                </div>

                <div className="hof-entry-congrats__right">
                  <p className="hof-entry-congrats__greet">
                    {t("hallOfFame.entry.congratsGreet")} {entry.username}
                  </p>
                  <p className="hof-entry-congrats__body">{t("hallOfFame.entry.congratsBody")}</p>
                  <HofAssetImage
                    src={hofAsset("dividerFiligree")}
                    alt=""
                    className="hof-entry-congrats__divider-img"
                    fallback={<div className="hof-entry-congrats__divider" aria-hidden />}
                  />
                  <p className="hof-entry-congrats__body hof-entry-congrats__body--closing">
                    {t("hallOfFame.entry.congratsClosing")}
                  </p>
                  <div className="hof-entry-congrats__reward">
                    <PointsBadge className="hof-entry-congrats__logo" />
                  </div>
                </div>
              </div>
            </Frame>
          )}

          {step === 2 && (
            <Frame step={2} className="hof-entry-card--ticket">
              <div className="hof-entry-ticket__vignette" aria-hidden />
              <header className="hof-entry-ticket__header">
                <SectionNum n={2} />
                <span className="hof-entry-ticket__header-title">{entry.ticket.label}</span>
              </header>

              <div className="hof-entry-ticket__split">
                <div className="hof-entry-ticket__detail">
                  <div className="hof-entry-ticket__paper">
                    <HofAssetImage src={hofAsset("ticketPaper")} alt="" className="hof-entry-ticket__paper-bg" />
                    <div className="hof-entry-ticket__paper-content">
                      <div className="hof-entry-ticket__paper-head">
                        <p className="hof-entry-ticket__brand">MY 50 POINTS</p>
                        <p className="hof-entry-ticket__play-type">{entry.ticket.play}</p>
                      </div>
                      <div className="hof-entry-ticket__paper-fields">
                        <p className="hof-entry-ticket__line">
                          {entry.ticket.track} · {entry.ticket.date}
                        </p>
                        <p className="hof-entry-ticket__line">{entry.ticket.race}</p>
                        <p className="hof-entry-ticket__line">
                          {isEn ? "HORSE #" : "CABALLO #"} {entry.ticket.horseNumber} — {entry.ticket.horse}
                        </p>
                        <p className="hof-entry-ticket__line">
                          {isEn ? "PLAY:" : "JUGADA:"} {entry.ticket.play}
                        </p>
                        <p className="hof-entry-ticket__line">
                          {isEn ? "VALUE:" : "VALOR:"} {entry.ticket.points} PTS
                        </p>
                      </div>
                      <div className="hof-entry-ticket__paper-foot">
                        <p className="hof-entry-ticket__ticket-no">TICKET Nº {entry.ticket.ticketNo}</p>
                        <HofAssetImage src={hofAsset("ticketBarcode")} alt="" className="hof-entry-ticket__barcode" />
                        <p className="hof-entry-ticket__tagline">{entry.ticket.tagline}</p>
                      </div>
                    </div>
                    <span className="hof-entry-ticket__perforation" aria-hidden />
                    <span className="hof-entry-ticket__notch" aria-hidden />
                  </div>
                </div>

                <div className="hof-entry-ticket__art">
                  <div className="hof-entry-ticket__horse-frame">
                    <HofAssetImage
                      src={hofAsset("horseAction")}
                      alt=""
                      className="hof-entry-ticket__horse"
                      fallback={<Trophy className="hof-entry-ticket__horse-fallback" />}
                    />
                  </div>
                  <p className="hof-entry-ticket__verse">
                    <span>{t("hallOfFame.entry.ticketVerse1")}</span>
                    <span>{t("hallOfFame.entry.ticketVerse2")}</span>
                    <span className="hof-entry-ticket__verse--accent">{t("hallOfFame.entry.ticketVerse3")}</span>
                  </p>
                  <PointsBadge className="hof-entry-ticket__logo-sm" />
                </div>
              </div>
            </Frame>
          )}

          {step === 3 && (
            <Frame step={3} className="hof-entry-card--feat">
              <div className="hof-entry-feat__vignette" aria-hidden />
              <header className="hof-entry-feat__header">
                <SectionNum n={1} />
                <span className="hof-entry-feat__header-title">{t("hallOfFame.entry.featReason")}</span>
              </header>

              <div className="hof-entry-feat__trophy-emblem">
                <HofAssetImage
                  src={hofAsset("laurelGoldLeft")}
                  alt=""
                  className="hof-entry-feat__laurel hof-entry-feat__laurel--l"
                  fallback={<span className="hof-entry-feat__laurel-fallback hof-entry-feat__laurel-fallback--l" aria-hidden />}
                />
                <div className="hof-entry-feat__trophy-wrap">
                  <span className="hof-entry-feat__trophy-ring" aria-hidden />
                  <HofAssetImage
                    src={hofAsset("trophyGoldStar")}
                    alt=""
                    className="hof-entry-feat__trophy-img"
                    fallback={<Trophy className="hof-entry-feat__trophy-fallback" strokeWidth={1.5} />}
                  />
                </div>
                <HofAssetImage
                  src={hofAsset("laurelGoldRight")}
                  alt=""
                  className="hof-entry-feat__laurel hof-entry-feat__laurel--r"
                  fallback={<span className="hof-entry-feat__laurel-fallback hof-entry-feat__laurel-fallback--r" aria-hidden />}
                />
              </div>

              <h3 className="hof-entry-feat__name">{entry.feat.name}</h3>
              <p className="hof-entry-feat__desc">{entry.feat.desc}</p>

              <div className="hof-entry-feat__meta">
                <span className="hof-entry-feat__meta-item hof-entry-feat__meta-item--bright">
                  <HofAssetImage
                    src={hofAsset("calendarGold")}
                    alt=""
                    className="hof-entry-feat__meta-icon"
                    fallback={<Calendar className="w-3.5 h-3.5" />}
                  />
                  {entry.feat.date}
                </span>
                <span className="hof-entry-feat__meta-item">
                  <HofAssetImage
                    src={hofAsset("horseshoeGold")}
                    alt=""
                    className="hof-entry-feat__meta-icon"
                    fallback={<Award className="w-3.5 h-3.5" />}
                  />
                  {entry.ticket.track}
                </span>
                <span className="hof-entry-feat__meta-item">
                  <Target className="w-3.5 h-3.5" />
                  {isEn ? "PLAY" : "JUGADA"} {entry.ticket.play}
                </span>
                <span className="hof-entry-feat__meta-item hof-entry-feat__meta-item--modality">
                  <span className="hof-entry-feat__meta-dot" />
                  {isEn ? "MODALITY" : "MODALIDAD"} {entry.ticket.play}
                </span>
              </div>

              <div className="hof-entry-feat__divider" aria-hidden />

              <blockquote className="hof-entry-feat__quote">
                <span>{entry.featQuote}</span>
              </blockquote>
            </Frame>
          )}

          {step === 4 && (
            <Frame step={4} className="hof-entry-card--profile">
              <div className="hof-entry-profile-grid">
                <div className="hof-entry-profile-col">
                  <p className="hof-entry-profile-col__title">
                    <SectionNum n={3} />
                    {t("hallOfFame.entry.playerProfile")}
                  </p>
                  <div className="hof-entry-profile-col__avatar-wrap">
                    <img src={avatar} alt="" className="hof-entry-profile-col__avatar" />
                  </div>
                  <p className="hof-entry-profile-col__name">{entry.username}</p>
                  <p className="hof-entry-profile-col__role">{entry.title}</p>
                  <p className="hof-entry-profile-col__since">
                    <Calendar className="w-3 h-3 inline" /> {t("hallOfFame.entry.memberSince")} {entry.memberSince}
                  </p>
                  <p className="hof-entry-profile-col__quote">&ldquo;{entry.quote}&rdquo;</p>
                  <div className="hof-entry-profile-stats">
                    <div>
                      <Trophy className="w-3.5 h-3.5" />
                      <span className="hof-entry-profile-stats__label">{t("hallOfFame.entry.statsTournaments")}</span>
                      <span>{entry.stats.tournamentsWon}</span>
                    </div>
                    <div>
                      <Target className="w-3.5 h-3.5" />
                      <span className="hof-entry-profile-stats__label">{t("hallOfFame.entry.statsWinningPlays")}</span>
                      <span>{entry.stats.winningPlays}</span>
                    </div>
                    <div>
                      <Award className="w-3.5 h-3.5" />
                      <span className="hof-entry-profile-stats__label">{t("hallOfFame.entry.statsAccumulated")}</span>
                      <span>{entry.stats.accumulatedPts.toLocaleString()}</span>
                    </div>
                    <div>
                      <Flame className="w-3.5 h-3.5" />
                      <span className="hof-entry-profile-stats__label">{t("hallOfFame.entry.statsMaxStreak")}</span>
                      <span>{entry.stats.maxStreak}</span>
                    </div>
                  </div>
                </div>
                <div className="hof-entry-profile-col">
                  <p className="hof-entry-profile-col__title">
                    <SectionNum n={4} />
                    {t("hallOfFame.entry.historicStats")}
                  </p>
                  <ul className="hof-entry-historic-list">
                    <li>
                      <span className="hof-entry-historic-list__icon hof-entry-historic-list__icon--purple">
                        <BarChart3 className="w-3.5 h-3.5" />
                      </span>
                      {t("hallOfFame.entry.bestPosition")}: {entry.stats.bestPosition}
                    </li>
                    <li>
                      <span className="hof-entry-historic-list__icon">
                        <Target className="w-3.5 h-3.5" />
                      </span>
                      {t("hallOfFame.entry.accuracy")}: {entry.stats.accuracy}
                    </li>
                    <li>
                      <span className="hof-entry-historic-list__icon hof-entry-historic-list__icon--purple">
                        <Award className="w-3.5 h-3.5" />
                      </span>
                      {t("hallOfFame.entry.favoritePlay")}: {entry.stats.favoritePlay}
                    </li>
                    <li>
                      <span className="hof-entry-historic-list__icon hof-entry-historic-list__icon--gold">
                        <HofAssetImage
                          src={hofAsset("horseAction")}
                          alt=""
                          className="hof-entry-historic-list__horse"
                          fallback={<Trophy className="w-3 h-3" />}
                        />
                      </span>
                      {t("hallOfFame.entry.starHorse")}: {entry.stats.starHorse}
                    </li>
                    <li>
                      <span className="hof-entry-historic-list__icon">
                        <HofAssetImage
                          src={hofAsset("horseshoeGold")}
                          alt=""
                          className="hof-entry-historic-list__horse"
                          fallback={<Award className="w-3 h-3" />}
                        />
                      </span>
                      {t("hallOfFame.entry.favoriteTrack")}: {entry.stats.favoriteTrack}
                    </li>
                  </ul>
                </div>
              </div>
            </Frame>
          )}

          {step === 5 && (
            <Frame step={5} className="hof-entry-card--thanks" variant="dark">
              <HofAssetImage src={hofAsset("confettiOverlay")} alt="" className="hof-entry-thanks__confetti" />
              <HofAssetImage
                src={hofAsset("ribbonTagPurple")}
                alt=""
                className="hof-entry-thanks__ribbon-img"
                fallback={<p className="hof-entry-thanks__ribbon">04</p>}
              />
              <div className="hof-entry-thanks__layout">
                <div className="hof-entry-thanks__copy">
                  <HofAssetImage
                    src={hofAsset("crownGold")}
                    alt=""
                    className="hof-entry-thanks__crown"
                    fallback={<Crown className="hof-entry-thanks__crown-fallback" />}
                  />
                  <h2 className="hof-entry-thanks__title">{t("hallOfFame.entry.thanksTitle")}</h2>
                  <p className="hof-entry-thanks__sub">
                    <Star className="w-3 h-3 inline" /> {t("hallOfFame.entry.thanksSubLead")}
                    <br />
                    {t("hallOfFame.entry.thanksSubTrail")}
                  </p>
                  <HofAssetImage
                    src={hofAsset("dividerFiligree")}
                    alt=""
                    className="hof-entry-thanks__divider-img"
                    fallback={<div className="hof-entry-thanks__divider-line" aria-hidden />}
                  />
                  <p className="hof-entry-card__body hof-entry-card__body--left">{t("hallOfFame.entry.thanksBody1")}</p>
                  <p className="hof-entry-card__body hof-entry-card__body--left">{t("hallOfFame.entry.thanksBody2")}</p>
                  <p className="hof-entry-card__body hof-entry-thanks__closing hof-entry-card__body--left">
                    {t("hallOfFame.entry.thanksClosing")}
                  </p>
                </div>
                <div className="hof-entry-thanks__visual">
                  <HofAssetImage
                    src={hofAsset("pointsLogoNeonRing")}
                    alt=""
                    className="hof-entry-thanks__logo-ring"
                    fallback={<img src={logoFile()} alt="" className="hof-entry-thanks__logo-fallback" />}
                  />
                </div>
              </div>
              <div className="hof-entry-thanks__emblem">
                <HofAssetImage
                  src={hofAsset("shieldGoldStar")}
                  alt=""
                  className="hof-entry-thanks__shield"
                  fallback={<span className="hof-entry-thanks__shield-fallback" aria-hidden />}
                />
              </div>
              <div className="hof-entry-thanks__footer-bar">
                <HofAssetImage
                  src={hofAsset("iconTrophyNeon")}
                  alt=""
                  className="hof-entry-thanks__footer-icon"
                  fallback={<Trophy className="hof-entry-thanks__footer-icon-fallback" />}
                />
                <p className="hof-entry-thanks__footer">{t("hallOfFame.entry.firstForever")}</p>
                <HofAssetImage
                  src={hofAsset("iconStarNeon")}
                  alt=""
                  className="hof-entry-thanks__footer-icon"
                  fallback={<Star className="hof-entry-thanks__footer-icon-fallback" />}
                />
              </div>
            </Frame>
          )}
        </div>

        <div className="hof-entry-overlay__nav">
          <button type="button" className="hof-entry-nav-btn" onClick={prev} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4" />
            {t("hallOfFame.entry.back")}
          </button>
          <button type="button" className="hof-entry-nav-btn hof-entry-nav-btn--primary" onClick={next}>
            {step >= STEP_COUNT - 1 ? t("hallOfFame.entry.enter") : t("hallOfFame.entry.next")}
            {step < STEP_COUNT - 1 ? <ChevronRight className="w-4 h-4" /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
