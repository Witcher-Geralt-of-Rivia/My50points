"use client";

import { Lock } from "lucide-react";
import { avatarForPlayer } from "@/frontend/lib/data/hallOfFameData";

const UNLOCKED_STYLES = [
  { border: "#fbbf24", glow: "rgba(251, 191, 36, 0.35)" },
  { border: "#06b6d4", glow: "rgba(6, 182, 212, 0.35)" },
  { border: "#f97316", glow: "rgba(249, 115, 22, 0.35)" },
  { border: "#ef4444", glow: "rgba(239, 68, 68, 0.35)" },
  { border: "#a855f7", glow: "rgba(168, 85, 247, 0.35)" },
];

export default function HallOfFameAchievementGrid({
  achievements,
  isEn,
  lockedLabel,
  title,
}) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const lockedSlots = Math.max(24, locked.length);

  return (
    <section className="hof-achievements">
      {title ? <h2 className="hof-achievements__section-title">{title}</h2> : null}

      <div className="hof-achievements__unlocked">
        {unlocked.map((item, index) => {
          const style = UNLOCKED_STYLES[index % UNLOCKED_STYLES.length];
          const Icon = item.icon;
          const featLabel = (isEn ? item.nameEn : item.name) || "";
          const displayFeat = featLabel.toUpperCase();

          return (
            <article
              key={item.id}
              className="hof-achievements__card hof-achievements__card--unlocked"
              style={{
                borderColor: style.border,
                boxShadow: `0 0 24px ${style.glow}, inset 0 0 20px ${style.glow}`,
              }}
            >
              <div className="hof-achievements__icon-wrap" style={{ color: style.border }}>
                <Icon className="w-7 h-7" strokeWidth={1.75} />
              </div>
              <h3 className="hof-achievements__card-title">{displayFeat}</h3>
              {item.holder ? (
                <div className="hof-achievements__holder">
                  <img
                    src={avatarForPlayer(item.holder, item.holderColor || style.border)}
                    alt=""
                    className="hof-achievements__holder-avatar"
                  />
                  <div>
                    <p className="hof-achievements__holder-name">{item.holder}</p>
                    {item.date ? (
                      <p className="hof-achievements__holder-date">{item.date}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="hof-achievements__card-desc">{isEn ? item.descEn : item.desc}</p>
              )}
            </article>
          );
        })}
      </div>

      <div className="hof-achievements__locked-grid">
        {Array.from({ length: lockedSlots }).map((_, i) => {
          const item = locked[i];
          return (
            <div
              key={item?.id ?? `locked-${i}`}
              className="hof-achievements__card hof-achievements__card--locked"
            >
              <Lock className="w-5 h-5 text-zinc-600" aria-hidden />
              <span className="sr-only">{lockedLabel}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
