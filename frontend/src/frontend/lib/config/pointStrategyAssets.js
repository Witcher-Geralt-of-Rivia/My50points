import { pointBtnAsset, strategyPointAsset } from "@/frontend/lib/config/pointModalityAssets";

/**
 * Strategy pick button art for tournament PickSelector / RaceCard.
 * Prefers plasma buttons in point-modality/, then ticket-workflow textures.
 */
export function strategyPickButtonAsset(strategyId) {
  return pointBtnAsset(strategyId) || strategyPointAsset(strategyId);
}
