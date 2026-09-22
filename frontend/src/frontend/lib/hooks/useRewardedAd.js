"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const AD_DURATION_SECONDS = 5;

/**
 * Mock rewarded-ad hook (frontend stand-in).
 *
 * Contract (per Phase 1 spec §9–10):
 * - M4 = 1 ad view per ticket; M2 = 1 ad view per tournament unlocking all 3 tickets.
 * - `onComplete(token)` fires only after the full ad view; the token is an
 *   opaque mock until the backend issues server-signed ad-verification JWTs.
 * - `onFail()` fires on early close/error and MUST NEVER block results,
 *   scoring, or ranking — callers proceed without the reward.
 */
export default function useRewardedAd({ durationSeconds = AD_DURATION_SECONDS, onComplete, onFail } = {}) {
  const [phase, setPhase] = useState("idle"); // idle | showing | completed | failed
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const timerRef = useRef(null);
  const callbacksRef = useRef({ onComplete, onFail });
  callbacksRef.current = { onComplete, onFail };

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setSecondsLeft(durationSeconds);
    setPhase("showing");
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearTimer();
          setPhase("completed");
          callbacksRef.current.onComplete?.(`mock-ad-${Date.now().toString(36)}`);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [clearTimer, durationSeconds]);

  const closeEarly = useCallback(() => {
    clearTimer();
    setPhase("failed");
    callbacksRef.current.onFail?.();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setSecondsLeft(durationSeconds);
    setPhase("idle");
  }, [clearTimer, durationSeconds]);

  return { phase, secondsLeft, start, closeEarly, reset };
}
