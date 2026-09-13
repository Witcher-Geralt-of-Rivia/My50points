"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, TrendingUp, ChevronsUp } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

export default function StreakRankingModal({
  open,
  positionsGained,
  racesWithGain,
  nextGoal,
  onClose,
}) {
  const { t, language } = useLanguage();
  const races = racesWithGain || 1;
  const gainedInRaces =
    language === "en"
      ? `You gained positions in ${races} race${races === 1 ? "" : "s"}`
      : `Has ganado posiciones en ${races} carrera${races === 1 ? "" : "s"}`;
  const climbedText =
    language === "en"
      ? `And you moved up ${positionsGained || 0} positions in ${races} race${races === 1 ? "" : "s"}`
      : `Y has subido ${positionsGained || 0} posiciones en ${races} carrera${races === 1 ? "" : "s"}`;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="rank-update-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rank-update-streak"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rank-update-streak__header">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="rank-update-streak__title">
                {t("rankingUpdates.onStreak")}
              </span>
            </div>

            <div className="rank-update-streak__box rank-update-streak__box--sm">
              <Trophy className="w-4 h-4 text-cyan shrink-0" />
              <p>{gainedInRaces}</p>
            </div>

            <div className="rank-update-streak__box rank-update-streak__box--lg">
              <span className="rank-update-streak__big-num">{positionsGained || 0}</span>
              <p>{climbedText}</p>
              <ChevronsUp className="rank-update-streak__arrow" />
            </div>

            <p className="rank-update-streak__goal-label">★ {t("rankingUpdates.nextGoal")} ★</p>
            <div className="rank-update-streak__goal">{nextGoal || "TOP 1"}</div>

            <div className="rank-update-streak__footer">
              <span>
                <TrendingUp className="w-4 h-4" /> {t("rankingUpdates.keepClimbing")}
              </span>
              <span>
                <ChevronsUp className="w-4 h-4" /> {t("rankingUpdates.keepMoving")}
              </span>
            </div>

            <button type="button" className="rank-update-dismiss" onClick={onClose}>
              {t("rankingUpdates.continue")}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
