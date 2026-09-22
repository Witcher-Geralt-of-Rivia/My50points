"use client";

import { Play, X, CheckCircle2, RotateCcw } from "lucide-react";
import useRewardedAd from "@/frontend/lib/hooks/useRewardedAd";
import { profileHubAsset } from "@/frontend/lib/config/profileHubAssets";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

/**
 * Rewarded ad slot (Phase 1 §9–10, frontend hook).
 * Uses the advertiser creative from profile-hub assets. A failed/closed ad
 * never blocks the caller: results, scoring and ranking always proceed.
 */
export default function RewardedAdSlot({ slotLabel = "a", entitlementText, onReward }) {
  const { t } = useLanguage();
  const { phase, secondsLeft, start, closeEarly, reset } = useRewardedAd({
    onComplete: (token) => onReward?.(token),
    onFail: () => {},
  });
  const creative = profileHubAsset("adBannerStadium");

  return (
    <div className="rewarded-ad-slot" data-slot={slotLabel} data-phase={phase}>
      <div className="rewarded-ad-slot__media">
        {creative ? <img src={creative} alt="" aria-hidden className="rewarded-ad-slot__creative" /> : null}
        <span className="rewarded-ad-slot__tag">{t("ads.slotLabel").replace("{slot}", String(slotLabel).toUpperCase())}</span>
        {phase === "showing" && (
          <button type="button" onClick={closeEarly} className="rewarded-ad-slot__close" aria-label={t("common.close")}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="rewarded-ad-slot__body">
        {entitlementText ? <p className="rewarded-ad-slot__entitlement">{entitlementText}</p> : null}

        {phase === "idle" && (
          <button type="button" onClick={start} className="rewarded-ad-slot__cta">
            <Play className="w-4 h-4" />
            <span>{t("ads.watchAd")}</span>
          </button>
        )}

        {phase === "showing" && (
          <div className="rewarded-ad-slot__progress" role="status">
            <div className="rewarded-ad-slot__progress-track">
              <div
                className="rewarded-ad-slot__progress-fill"
                style={{ width: `${Math.round(((5 - secondsLeft) / 5) * 100)}%` }}
              />
            </div>
            <span className="rewarded-ad-slot__countdown">{t("ads.remaining").replace("{s}", String(secondsLeft))}</span>
          </div>
        )}

        {phase === "completed" && (
          <p className="rewarded-ad-slot__done">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t("ads.completed")}</span>
          </p>
        )}

        {phase === "failed" && (
          <div className="rewarded-ad-slot__failed">
            <p>{t("ads.failed")}</p>
            <button type="button" onClick={reset} className="rewarded-ad-slot__retry">
              <RotateCcw className="w-4 h-4" />
              <span>{t("ads.retry")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
