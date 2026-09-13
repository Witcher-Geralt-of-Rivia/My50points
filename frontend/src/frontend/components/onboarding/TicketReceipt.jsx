"use client";

import { useMemo, useRef, useState } from "react";
import { Calendar, Clock, Share2, Pencil, Check } from "lucide-react";
import { strategies } from "@/frontend/components/tournament/PickSelector";
import { buildTicketReviewData } from "@/frontend/lib/ticketRaceSummary";
import {
  strategyTicketAsset,
  ticketDesignAssets,
} from "@/frontend/lib/config/ticketDesignAssets";

function PointsStub({ strategyId }) {
  const tone =
    strategyId === "full"
      ? "ticket-receipt__stubs--full"
      : strategyId === "dual"
        ? "ticket-receipt__stubs--dual"
        : "ticket-receipt__stubs--smart";

  return (
    <div className={`ticket-receipt__stubs ${tone}`}>
      <img
        className="ticket-receipt__strategy-art"
        src={strategyTicketAsset(strategyId)}
        alt=""
        aria-hidden
      />
    </div>
  );
}

function ReceiptBarcode({ code }) {
  const bars = useMemo(() => {
    const seed = code.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return Array.from({ length: 48 }, (_, i) => {
      const w = ((seed + i * 7) % 3) + 1;
      return w;
    });
  }, [code]);

  return (
    <div className="ticket-receipt__barcode" aria-hidden>
      {bars.map((width, index) => (
        <span
          key={`bar-${index}`}
          className="ticket-receipt__barcode-bar"
          style={{ flexGrow: width }}
        />
      ))}
    </div>
  );
}

export default function TicketReceipt({
  trackName,
  trackLocation = "",
  tournamentName = "",
  ticketNum,
  tournament,
  submittedTickets,
  receiptCode,
  issuedAt = new Date(),
  onEdit,
  onShare,
  readOnly = false,
  t,
  isEn = false,
  isClaimed = false,
  claimedBy = null,
}) {
  const receiptRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const { rows } = buildTicketReviewData(tournament, submittedTickets, ticketNum);
  const displayTrack = (trackName || tournament?.track || tournament?.name || "Track").toUpperCase();
  const displayLocation = trackLocation || tournament?.location || "";
  const displayTournament =
    tournamentName || tournament?.name || trackName || tournament?.track || "";
  const ticketHeading = `${t("gameModalities.ticketLabel")} ${ticketNum}`;

  const handleShare = async () => {
    const lines = rows.map((row) => {
      const strat = row.strategyLabel || "—";
      const picks = row.posts.join(row.posts.length > 1 ? " - " : "") || "—";
      return `${t("gameModalities.raceLabel")} ${row.raceNumber}: ${strat} → ${picks}`;
    });
    const text = [
      displayTournament ? `${displayTournament} · ${ticketHeading}` : `${displayTrack} · ${ticketHeading}`,
      `${t("gameModalities.ticketReceiptCode")}: ${receiptCode}`,
      ...lines,
      t("gameModalities.ticketReceiptFooter"),
    ].join("\n");

    if (onShare) {
      onShare(text);
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: t("gameModalities.ticketReceiptShareTitle"),
          text,
        });
        return;
      }
    } catch {
      /* fallback to clipboard */
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="ticket-receipt-shell">
      <div className="ticket-receipt" ref={receiptRef}>
        <div
          className="ticket-receipt__tear ticket-receipt__tear--top"
          style={{ backgroundImage: `url(${ticketDesignAssets.receiptTearEdge})` }}
          aria-hidden
        />

        <header className="ticket-receipt__banner">
          <div className="ticket-receipt__banner-copy">
            <span className="ticket-receipt__banner-title">
              {t("gameModalities.ticketReviewTournament")}
            </span>
            {displayTournament ? (
              <p className="ticket-receipt__banner-sub">{displayTournament}</p>
            ) : null}
            <p className="ticket-receipt__banner-ticket">
              {ticketHeading}
              {readOnly ? (
                <span className="ticket-receipt__banner-used">
                  {t("gameModalities.ticketUsed")}
                </span>
              ) : null}
            </p>
          </div>
          <img
            className="ticket-receipt__logo"
            src={ticketDesignAssets.badge50MyPoints.svg}
            alt=""
            aria-hidden
          />
        </header>

        <section className="ticket-receipt__paper">
          {isClaimed && (
            <div className="mb-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl text-center flex items-center justify-center gap-1.5 animate-pulse select-none">
              <span>🏆</span> TICKET RECLAMADO POR: {claimedBy || "USUARIO REAL"}
            </div>
          )}
          <div className="ticket-receipt__venue">
            <img
              className="ticket-receipt__venue-logo"
              src={ticketDesignAssets.horseHeadLogo.svg}
              alt=""
              aria-hidden
            />
            <div>
              <p className="ticket-receipt__venue-name">{displayTrack}</p>
              {displayLocation ? (
                <p className="ticket-receipt__venue-loc">{displayLocation}</p>
              ) : null}
            </div>
          </div>

          <div className="ticket-receipt__meta">
            <p className="ticket-receipt__code-label">{t("gameModalities.ticketReceiptCode")}</p>
            <p className="ticket-receipt__code">{receiptCode}</p>
            <div className="ticket-receipt__datetime">
              <span>
                <Calendar size={12} aria-hidden />
                {issuedAt.toLocaleDateString(isEn ? "en-US" : "es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
              <span className="ticket-receipt__datetime-sep" aria-hidden />
              <span>
                <Clock size={12} aria-hidden />
                {issuedAt.toLocaleTimeString(isEn ? "en-US" : "es-ES", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          </div>

          <ul className="ticket-receipt__lines">
            {rows.map((row) => {
              const strategy = strategies.find((s) => s.id === row.strategyId);
              const pillClass = row.strategyId
                ? `ticket-receipt__race-pill--${row.strategyId}`
                : "";
              return (
                <li key={row.raceId} className="ticket-receipt__line">
                  <span className={`ticket-receipt__race-pill ${pillClass}`}>
                    {t("gameModalities.raceLabel")} {row.raceNumber}
                  </span>
                  <span className={`ticket-receipt__strategy-label${
                    row.strategyId ? ` ticket-receipt__strategy-label--${row.strategyId}` : ""
                  }`}>
                    {row.strategyLabel || "—"}
                  </span>
                  {strategy ? (
                    <PointsStub strategyId={row.strategyId} />
                  ) : (
                    <span className="ticket-receipt__stubs">—</span>
                  )}
                  <span className="ticket-receipt__arrow" aria-hidden>
                    →
                  </span>
                  <div className="ticket-receipt__picks">
                    {row.posts.map((post, index) => (
                      <span key={`${row.raceId}-pick-${index}`} className="ticket-receipt__pick">
                        {post}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          <ReceiptBarcode code={receiptCode} />

          <p className="ticket-receipt__footer-msg">{t("gameModalities.ticketReceiptLuck")}</p>
          <p className="ticket-receipt__footer-sub">{t("gameModalities.ticketReceiptStart")}</p>
        </section>

        <div
          className="ticket-receipt__tear ticket-receipt__tear--bottom"
          style={{ backgroundImage: `url(${ticketDesignAssets.receiptTearEdge})` }}
          aria-hidden
        />
      </div>

      <div className="ticket-receipt-shell__actions">
        {!readOnly && onEdit ? (
          <button type="button" className="ticket-receipt-shell__btn" onClick={onEdit}>
            <Pencil size={14} aria-hidden />
            {t("gameModalities.ticketReviewEdit")}
          </button>
        ) : null}
        <button type="button" className="ticket-receipt-shell__btn" onClick={handleShare}>
          {copied ? (
            <>
              <Check size={14} aria-hidden />
              {t("gameModalities.ticketReceiptCopied") || "Copiado"}
            </>
          ) : (
            <>
              <Share2 size={14} aria-hidden />
              {t("gameModalities.ticketReceiptShare")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
