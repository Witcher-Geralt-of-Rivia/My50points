"use client";

import { Megaphone } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useHallOfFameFeed } from "@/frontend/lib/hooks/useHallOfFameFeed";
import { avatarForPlayer } from "@/frontend/lib/data/hallOfFameData";

function NewsItem({ item, t, isEn }) {
  const labelKey =
    item.type === "entry"
      ? "hallOfFame.highlights.latestEntry"
      : item.type === "record"
        ? "hallOfFame.highlights.newRecord"
        : "hallOfFame.highlights.featUnlocked";

  let detail = null;
  if (item.type === "record" && item.points != null) {
    detail = `${t("hallOfFame.highlights.surpassedOn")} ${item.points.toLocaleString(isEn ? "en-US" : "es-ES")} ${t("hallOfFame.highlights.points")}`;
  } else if (item.type === "feat" && item.featName) {
    detail = item.featName;
  }

  return (
    <article className="hof-news-ticker__item" aria-label={`${t(labelKey)} ${item.player}`}>
      <img
        src={avatarForPlayer(item.player, item.playerColor)}
        alt=""
        className="hof-news-ticker__avatar"
      />
      <div className="hof-news-ticker__copy">
        <p className="hof-news-ticker__label">{t(labelKey)}</p>
        <p className="hof-news-ticker__player">{item.player}</p>
        {detail ? <p className="hof-news-ticker__detail">{detail}</p> : null}
        <p className="hof-news-ticker__date">
          {t("hallOfFame.highlights.onDate")} {item.date}
        </p>
      </div>
    </article>
  );
}

export default function HallOfFameNewsTicker({ className = "" }) {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const items = useHallOfFameFeed(isEn);
  const loop = items.length ? [...items, ...items] : [];

  return (
    <section
      className={`hof-news-ticker ${className}`.trim()}
      aria-label={t("hallOfFame.newsTitle")}
    >
      <div className="hof-news-ticker__head">
        <Megaphone className="w-4 h-4 text-purple-light shrink-0" aria-hidden />
        <span className="hof-news-ticker__title">{t("hallOfFame.newsTitle")}</span>
      </div>
      <div className="hof-news-ticker__viewport">
        <div className="hof-news-ticker__track" key={items.map((i) => i.id).join("-")}>
          {loop.map((item, index) => (
            <NewsItem
              key={`${item.id}-${index}`}
              item={item}
              t={t}
              isEn={isEn}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
