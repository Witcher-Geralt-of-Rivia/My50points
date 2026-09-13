"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Share2, X } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const SHARE_LINKS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X" },
];

export default function ComebackVideoModal({
  open,
  rank,
  pointsGained,
  positionsGained,
  tournamentName,
  onClose,
}) {
  const { t } = useLanguage();

  const shareText = encodeURIComponent(
    `MY 50 POINTS — ${tournamentName || "Torneo"}: #${rank}, +${positionsGained} posiciones, +${pointsGained} pts`
  );

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
            className="rank-update-streak max-w-md w-full mx-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="rank-update-streak__title text-sm">
                {t("rankingUpdates.comebackVideo")}
              </p>
              <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-purple/40 bg-gradient-to-br from-purple/20 to-cyan/10 p-6 text-center mb-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">
                {tournamentName}
              </p>
              <p className="text-4xl font-black text-white mb-1">#{rank}</p>
              <p className="text-cyan font-bold">
                +{positionsGained} {t("rankingUpdates.positions")}
              </p>
              <p className="text-gold text-sm mt-2">+{pointsGained} pts</p>
              <p className="text-[10px] text-zinc-500 mt-4">
                {t("rankingUpdates.videoPlaceholder")}
              </p>
            </div>

            <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              {t("rankingUpdates.share")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SHARE_LINKS.map((s) => (
                <a
                  key={s.id}
                  href={
                    s.id === "whatsapp"
                      ? `https://wa.me/?text=${shareText}`
                      : `https://twitter.com/intent/tweet?text=${shareText}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10"
                >
                  {s.label}
                </a>
              ))}
            </div>
            <button type="button" className="rank-update-dismiss mt-3" onClick={onClose}>
              {t("rankingUpdates.close")}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
