'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/frontend/contexts/AuthContext';
import {
  getAchievementCards,
  awardTournamentPlace,
  awardRecordEqual,
  getUserTournamentPlace,
} from '@/frontend/lib/achievementCards';
import { HOF_FEATS } from '@/frontend/lib/data/hallOfFameData';
import AchievementCardModal from '@/frontend/components/achievements/AchievementCardModal';

const AchievementCardsContext = createContext(null);

export function AchievementCardsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const [cards, setCards] = useState([]);
  const [queue, setQueue] = useState([]);
  const [viewCard, setViewCard] = useState(null);

  const refresh = useCallback(() => {
    if (!userId) {
      setCards([]);
      return;
    }
    setCards(getAchievementCards(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enqueue = useCallback((card) => {
    if (!card) return;
    setQueue((q) => [...q, card]);
    refresh();
  }, [refresh]);

  const showCard = useCallback((card) => {
    if (card) setViewCard(card);
  }, []);

  const tryAwardTournament = useCallback(
    (tournament, rankingData) => {
      if (!userId || !user || !tournament || !rankingData) return;
      const place = getUserTournamentPlace(rankingData, userId);
      if (!place || place > 3) return;
      const added = awardTournamentPlace({
        userId,
        user,
        tournament,
        place,
      });
      if (added) enqueue(added);
    },
    [userId, user, enqueue]
  );

  const tryAwardRecordTies = useCallback(
    (totalPoints) => {
      if (!userId || !user || totalPoints == null) return;
      const thresholds = [
        { feat: HOF_FEATS.find((f) => f.id === 'first-1k'), points: 1000 },
        { feat: HOF_FEATS.find((f) => f.id === 'first-winner'), points: 2500 },
      ];
      thresholds.forEach(({ feat, points }) => {
        if (!feat || totalPoints < points) return;
        const added = awardRecordEqual({ userId, user, feat, points });
        if (added) enqueue(added);
      });
    },
    [userId, user, enqueue]
  );

  const activePopup = queue[0] || null;

  const dismissPopup = useCallback(() => {
    setQueue((q) => q.slice(1));
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      cards,
      refresh,
      enqueue,
      showCard,
      tryAwardTournament,
      tryAwardRecordTies,
    }),
    [cards, refresh, enqueue, showCard, tryAwardTournament, tryAwardRecordTies]
  );

  return (
    <AchievementCardsContext.Provider value={value}>
      {children}
      {activePopup ? (
        <AchievementCardModal card={activePopup} onClose={dismissPopup} />
      ) : null}
      {viewCard ? (
        <AchievementCardModal
          card={viewCard}
          onClose={() => setViewCard(null)}
          viewOnly
        />
      ) : null}
    </AchievementCardsContext.Provider>
  );
}

export function useAchievementCards() {
  const ctx = useContext(AchievementCardsContext);
  if (!ctx) {
    throw new Error('useAchievementCards must be used within AchievementCardsProvider');
  }
  return ctx;
}
