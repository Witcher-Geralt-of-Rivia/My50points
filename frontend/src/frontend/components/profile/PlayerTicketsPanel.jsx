"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileIcon from "@/frontend/components/profile/ProfileIcons";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import {
  normalizeStrategyLabel,
  strategyBadgeClass,
  displayTicketPoints,
} from "@/frontend/lib/strategyStyles";

export default function PlayerTicketsPanel({ tickets = [], tournamentId = null }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <section className="profile-tickets-panel">
      <button
        type="button"
        className="profile-tickets-panel__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <ProfileIcon name="ticket" className="w-5 h-5 text-cyan" />
          <div className="text-left">
            <h2>{t("profile.ticketsPanelTitle")}</h2>
            <p>
              {tournamentId
                ? t("profile.ticketsPanelHintFiltered")
                : t("profile.ticketsPanelHint")}
            </p>
          </div>
        </div>
        <div className="profile-tickets-panel__toggle-meta">
          <span>{tickets.length}</span>
          {open ? (
            <ProfileIcon name="chevron-up" className="w-5 h-5" />
          ) : (
            <ProfileIcon name="chevron-down" className="w-5 h-5" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="profile-tickets-panel__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {tickets.length === 0 ? (
              <p className="profile-tickets-panel__empty">{t("profile.ticketsPanelEmpty")}</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const pts = displayTicketPoints(ticket.pointsEarned);
                  const strategyLabel = normalizeStrategyLabel(ticket.strategy);
                  return (
                  <div key={ticket.id} className="profile-tickets-panel__row">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-sm text-zinc-200 truncate">{ticket.race}</p>
                        <span className="text-xs text-zinc-600">|</span>
                        <span className="text-xs text-zinc-500">{ticket.track}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${strategyBadgeClass(ticket.strategy)}`}>
                          {strategyLabel}
                        </span>
                        {ticket.tournamentName ? (
                          <span className="text-xs text-zinc-500">{ticket.tournamentName}</span>
                        ) : null}
                        <span className="text-xs text-zinc-500">{ticket.horses?.join(", ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:flex-shrink-0">
                      <span className={`text-sm font-bold ${pts.className}`}>
                        {pts.text}
                      </span>
                      <span className="text-xs text-zinc-600">{ticket.date}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
