"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import {
  buildModalityReturnPath,
  buildTournamentEntryHref,
} from "@/frontend/lib/gameModalities";
import { isTrackTicketUsed } from "@/frontend/lib/trackTicketUsage";
import FreeTicketCard from "@/frontend/components/modalities/FreeTicketCard";

const TICKET_NUMS = [1, 2, 3];

export default function TicketFamilyGallery({
  open,
  onClose,
  track,
  modalityId,
  initialTicketIndex = 0,
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [index, setIndex] = useState(initialTicketIndex);

  useEffect(() => {
    if (open) setIndex(initialTicketIndex);
  }, [open, initialTicketIndex]);

  const go = useCallback(
    (ticketNum, playFirst) => {
      if (!track?.tournamentSlug) return;
      const returnPath = buildModalityReturnPath(modalityId, track.slug);
      router.push(
        buildTournamentEntryHref({
          tournamentSlug: track.tournamentSlug,
          modalityId,
          ticketNum,
          trackSlug: track.slug,
          returnPath,
          playFirst,
        }),
      );
      onClose?.();
    },
    [track, modalityId, router, onClose],
  );

  const step = (delta) => {
    setIndex((i) => (i + delta + 3) % 3);
  };

  if (!open || !track) return null;

  const ticketNum = TICKET_NUMS[index];
  const used = isTrackTicketUsed(track.slug, ticketNum);
  const returnPath = buildModalityReturnPath(modalityId, track.slug);
  const playHref = buildTournamentEntryHref({
    tournamentSlug: track.tournamentSlug,
    modalityId,
    ticketNum,
    trackSlug: track.slug,
    returnPath,
    playFirst: true,
  });

  return (
    <div
      className="ticket-family-gallery"
      role="dialog"
      aria-modal="true"
      aria-label={t("gameModalities.ticketGalleryTitle")}
    >
      <button
        type="button"
        className="ticket-family-gallery__backdrop"
        onClick={onClose}
        aria-label={t("gameModalities.ticketGalleryClose")}
      />
      <div className="ticket-family-gallery__panel">
        <header className="ticket-family-gallery__head">
          <div>
            <p className="ticket-family-gallery__eyebrow">{track.name}</p>
            <h2 className="ticket-family-gallery__title">{t("gameModalities.ticketGalleryTitle")}</h2>
          </div>
          <button
            type="button"
            className="ticket-family-gallery__close"
            onClick={onClose}
            aria-label={t("gameModalities.ticketGalleryClose")}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <p className="ticket-family-gallery__hint">{t("gameModalities.ticketGalleryHint")}</p>

        <div className="ticket-family-gallery__stage">
          <button
            type="button"
            className="ticket-family-gallery__nav"
            onClick={() => step(-1)}
            aria-label={t("gameModalities.ticketGalleryPrev")}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <FreeTicketCard
            className="ticket-family-gallery__card"
            num={ticketNum}
            used={used}
            playHref={playHref}
            onViewTicket={() => (used ? go(ticketNum, false) : go(ticketNum, true))}
          />

          <button
            type="button"
            className="ticket-family-gallery__nav"
            onClick={() => step(1)}
            aria-label={t("gameModalities.ticketGalleryNext")}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="ticket-family-gallery__dots" aria-hidden>
          {TICKET_NUMS.map((num, i) => (
            <span
              key={num}
              className={`ticket-family-gallery__dot${i === index ? " ticket-family-gallery__dot--active" : ""}${
                isTrackTicketUsed(track.slug, num) ? " ticket-family-gallery__dot--used" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
