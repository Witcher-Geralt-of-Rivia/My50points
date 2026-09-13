"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const SHARDS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${(i * 17) % 100}%`,
  top: `${(i * 13) % 60}%`,
  delay: (i % 6) * 0.05,
}));

export default function RankingRevealOverlay({ open, onComplete }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("countdown");
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (!open) {
      setPhase("countdown");
      setCount(3);
      return undefined;
    }
    setPhase("countdown");
    setCount(3);
    const timers = [
      setTimeout(() => setCount(2), 1000),
      setTimeout(() => setCount(1), 2000),
      setTimeout(() => setPhase("shatter"), 3000),
      setTimeout(() => {
        setPhase("done");
        onComplete?.();
      }, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [open, onComplete]);

  return (
    <AnimatePresence>
      {open && phase !== "done" ? (
        <motion.div
          className="ranking-reveal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {phase === "shatter" ? (
            <div className="ranking-reveal__shatter" aria-hidden>
              {SHARDS.map((s) => (
                <span
                  key={s.id}
                  className="ranking-reveal__shard"
                  style={{ left: s.left, top: s.top, animationDelay: `${s.delay}s` }}
                />
              ))}
            </div>
          ) : null}

          <div className="ranking-reveal__panel">
            <p className="ranking-reveal__banner">
              {t("rankingUpdates.updatingRanking")}
            </p>
            {phase === "countdown" ? (
              <motion.p
                key={count}
                className="ranking-reveal__countdown"
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {count}
              </motion.p>
            ) : (
              <p className="ranking-reveal__countdown text-purple-light text-2xl">
                {t("rankingUpdates.newPositions")}
              </p>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
