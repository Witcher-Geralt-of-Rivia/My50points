"use client";

import { useEffect, useMemo, useState } from "react";
import ProfileIcon from "@/frontend/components/profile/ProfileIcons";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useAchievementCards } from "@/frontend/contexts/AchievementCardsContext";
import { CARD_TYPES, getAchievementCards } from "@/frontend/lib/achievementCards";

const TYPE_LABELS = {
  [CARD_TYPES.TOURNAMENT_WINNER]: { es: "Ticket Ganador", en: "Winner Ticket", color: "#fbbf24" },
  [CARD_TYPES.TOURNAMENT_SECOND]: { es: "2° Lugar", en: "2nd Place", color: "#d4d4d8" },
  [CARD_TYPES.TOURNAMENT_THIRD]: { es: "3° Lugar", en: "3rd Place", color: "#fb923c" },
  [CARD_TYPES.RECORD_EQUAL]: { es: "Record Igualado", en: "Record Tied", color: "#06b6d4" },
};

function MiniCard({ card, isEn, onClick, disabled }) {
  const meta = TYPE_LABELS[card.type] || TYPE_LABELS[CARD_TYPES.TOURNAMENT_WINNER];
  const label = isEn ? meta.en : meta.es;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="ach-gallery__item"
    >
      <div
        className="ach-gallery__thumb"
        style={{ borderColor: meta.color, boxShadow: `0 0 16px ${meta.color}33` }}
      >
        <ProfileIcon name="trophy" className="w-6 h-6" style={{ color: meta.color }} />
        <span className="ach-gallery__place">{card.place ? `${card.place}°` : "★"}</span>
      </div>
      <p className="ach-gallery__label">{label}</p>
      <p className="ach-gallery__track">{card.track}</p>
      <p className="ach-gallery__date">{card.date}</p>
    </button>
  );
}

export default function AchievementGallery({
  userId,
  cardsFromApi = null,
  canOpenCards = true,
}) {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const { user } = useAuth();
  const { cards: ownCards, refresh, showCard } = useAchievementCards();
  const [localCards, setLocalCards] = useState([]);

  const isOwn = user?.id && userId && String(user.id) === String(userId);

  useEffect(() => {
    if (isOwn) {
      refresh();
      return;
    }
    if (cardsFromApi?.length) {
      setLocalCards(cardsFromApi);
      return;
    }
    setLocalCards(getAchievementCards(userId));
  }, [isOwn, refresh, userId, cardsFromApi]);

  const cards = useMemo(() => {
    if (isOwn) return ownCards;
    if (cardsFromApi?.length) return cardsFromApi;
    return localCards;
  }, [isOwn, ownCards, cardsFromApi, localCards]);

  return (
    <section className="profile-gallery">
      <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
        <ProfileIcon name="achievements" className="w-5 h-5 text-amber-400" />
        {t("profile.achievementGallery")}
      </h2>
      <p className="text-xs text-zinc-500 mb-5">{t("profile.achievementGalleryHint")}</p>

      {cards.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">
          {t("profile.achievementGalleryEmpty")}
        </p>
      ) : (
        <div className="ach-gallery__grid">
          {cards.map((card) => (
            <MiniCard
              key={card.id}
              card={card}
              isEn={isEn}
              disabled={!canOpenCards}
              onClick={() => {
                if (canOpenCards) showCard(card);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
