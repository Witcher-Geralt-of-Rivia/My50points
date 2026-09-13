"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronsUp } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

export default function CurrentPositionModal({ open, rank, weeklyChange, onClose, onViewVideo }) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && rank ? (
        <motion.div
          className="rank-update-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rank-update-position"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="rank-update-position__label">{t("rankingUpdates.currentPosition")}</p>
            <p className="rank-update-position__rank">#{rank}</p>
            {weeklyChange > 0 ? (
              <div className="rank-update-position__badge">
                <ChevronsUp className="w-5 h-5 text-cyan shrink-0" />
                <div>
                  <p className="rank-update-position__delta">
                    +{weeklyChange} {t("rankingUpdates.positions")}
                  </p>
                  <p className="rank-update-position__period">{t("rankingUpdates.thisWeek")}</p>
                </div>
              </div>
            ) : null}
            {onViewVideo ? (
              <button type="button" className="rank-update-dismiss mb-2" onClick={onViewVideo}>
                {t("rankingUpdates.viewVideo")}
              </button>
            ) : null}
            <button type="button" className="rank-update-dismiss" onClick={onClose}>
              {t("rankingUpdates.continue")}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
