"use client";

import RewardedAdSlot from "@/frontend/components/ads/RewardedAdSlot";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

export default function ProfileAdTorneoSlot({ slotLabel = "a", modalityId = "guest", onReward }) {
  const { t } = useLanguage();
  const rule = modalityId === "free" ? t("ads.m2Rule") : t("ads.m4Rule");

  return (
    <section
      className={`profile-hub-ad profile-hub-ad--slot-${String(slotLabel).toLowerCase()}`}
      aria-label={`${t("ads.slotLabel").replace("{slot}", String(slotLabel).toUpperCase())}`}
    >
      <RewardedAdSlot slotLabel={slotLabel} entitlementText={rule} onReward={onReward} />
    </section>
  );
}
