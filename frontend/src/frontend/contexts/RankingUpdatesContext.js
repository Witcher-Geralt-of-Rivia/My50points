"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/frontend/contexts/AuthContext";
import {
  detectRankImprovement,
  getNextRankGoal,
  getWeeklyPositionChange,
} from "@/frontend/lib/rankingUpdates";
import CurrentPositionModal from "@/frontend/components/ranking/CurrentPositionModal";
import StreakRankingModal from "@/frontend/components/ranking/StreakRankingModal";
import RankingRevealOverlay from "@/frontend/components/ranking/RankingRevealOverlay";
import ComebackVideoModal from "@/frontend/components/ranking/ComebackVideoModal";

const RankingUpdatesContext = createContext(null);

export function RankingUpdatesProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [positionModal, setPositionModal] = useState(null);
  const [streakModal, setStreakModal] = useState(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [comebackModal, setComebackModal] = useState(null);
  const [pendingPosition, setPendingPosition] = useState(null);

  const showPositionAfterReveal = useCallback((payload) => {
    setPositionModal(payload);
  }, []);

  const checkTournamentRank = useCallback(
    (entry, options = {}) => {
      if (!isAuthenticated || !userId || !entry) return;
      const change = entry.rankChange ?? 0;
      if (change < 1) return;

      setPendingPosition({
        rank: entry.rank,
        weeklyChange: change,
        positionsGained: change,
        racesWithGain: options.racesWithGain ?? Math.min(change, 3),
        pointsGained: entry.lastPointsChange ?? 0,
        tournamentName: options.tournamentName,
      });
      setRevealOpen(true);
    },
    [isAuthenticated, userId]
  );

  const checkGlobalRank = useCallback(
    (newRank, options = {}) => {
      if (!isAuthenticated || !userId || !newRank) return;
      const improvement = detectRankImprovement(userId, newRank);
      if (!improvement || improvement.positionsGained < 1) return;

      const weeklyChange = getWeeklyPositionChange(userId, newRank);
      const racesWithGain = options.racesWithGain ?? Math.min(improvement.positionsGained, 3);

      setPositionModal({
        rank: newRank,
        weeklyChange: weeklyChange > 0 ? weeklyChange : improvement.positionsGained,
        positionsGained: improvement.positionsGained,
        racesWithGain,
      });
    },
    [isAuthenticated, userId]
  );

  const dismissPosition = useCallback(() => {
    setPositionModal((prev) => {
      if (prev && prev.positionsGained >= 2) {
        setStreakModal({
          positionsGained: prev.positionsGained,
          racesWithGain: prev.racesWithGain,
          nextGoal: getNextRankGoal(prev.rank),
        });
      }
      return null;
    });
  }, []);

  const dismissStreak = useCallback(() => setStreakModal(null), []);

  const handleRevealComplete = useCallback(() => {
    setRevealOpen(false);
    if (pendingPosition) {
      showPositionAfterReveal(pendingPosition);
      setPendingPosition(null);
    }
  }, [pendingPosition, showPositionAfterReveal]);

  const value = useMemo(
    () => ({ checkGlobalRank, checkTournamentRank }),
    [checkGlobalRank, checkTournamentRank]
  );

  return (
    <RankingUpdatesContext.Provider value={value}>
      {children}
      <RankingRevealOverlay open={revealOpen} onComplete={handleRevealComplete} />
      <CurrentPositionModal
        open={Boolean(positionModal)}
        rank={positionModal?.rank}
        weeklyChange={positionModal?.weeklyChange ?? 0}
        onClose={dismissPosition}
        onViewVideo={
          positionModal?.positionsGained >= 3
            ? () => {
                setComebackModal({
                  rank: positionModal.rank,
                  positionsGained: positionModal.positionsGained,
                  pointsGained: positionModal.pointsGained ?? 0,
                  tournamentName: positionModal.tournamentName,
                });
                setPositionModal(null);
              }
            : undefined
        }
      />
      <ComebackVideoModal
        open={Boolean(comebackModal)}
        rank={comebackModal?.rank}
        positionsGained={comebackModal?.positionsGained}
        pointsGained={comebackModal?.pointsGained}
        tournamentName={comebackModal?.tournamentName}
        onClose={() => setComebackModal(null)}
      />
      <StreakRankingModal
        open={Boolean(streakModal)}
        positionsGained={streakModal?.positionsGained}
        racesWithGain={streakModal?.racesWithGain}
        nextGoal={streakModal?.nextGoal}
        onClose={dismissStreak}
      />
    </RankingUpdatesContext.Provider>
  );
}

export function useRankingUpdates() {
  const ctx = useContext(RankingUpdatesContext);
  if (!ctx) {
    throw new Error("useRankingUpdates must be used within RankingUpdatesProvider");
  }
  return ctx;
}
