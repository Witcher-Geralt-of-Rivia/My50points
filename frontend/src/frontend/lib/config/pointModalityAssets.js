import { staticFile } from "@/frontend/lib/config/paths";
import { ticketWorkflowAsset } from "@/frontend/lib/config/ticketWorkflowAssets";

/** Drop generated images into public/Img/point-modality/ — see docs/POINT_MODALITY_ASSET_PROMPTS.md */
const POINT_MODALITY = "/Img/point-modality";

export const POINT_MODALITY_ASSET_KEYS = {
  masterReference: "point-master-reference-mockup.png",
  heroFullPoint: "point-hero-full-point.png",
  hero50FullPointDecides: "point-hero-50-full-point-decides.png",
  heroUnaDecision: "point-hero-una-decision.png",
  selectorBarHorizontal: "point-selector-bar-horizontal.png",
  selectorBarStacked: "point-selector-bar-stacked.png",
  selectorBarSciFiFrame: "point-selector-bar-scifi-frame.png",
  selectorBarChevron: "point-selector-bar-chevron.png",
  selectorBarEnergyAura: "point-selector-bar-energy-aura.png",
  btnFullPoint: "point-btn-full-point.png",
  btnDualPoint: "point-btn-dual-point.png",
  btnSmartPoint: "point-btn-smart-point.png",
  splash50Metallic: "point-splash-50-metallic.png",
  raceCyberpunkFinish: "point-race-cyberpunk-finish.png",
  raceUltimateLeaderboard: "point-race-ultimate-leaderboard.png",
  raceCircularBadge: "point-race-circular-badge.png",
  hudTriEnergy: "point-hud-tri-energy.png",
};

/** @type {Record<string, keyof typeof POINT_MODALITY_ASSET_KEYS>} */
export const POINT_BTN_ASSET_KEY = {
  full: "btnFullPoint",
  dual: "btnDualPoint",
  smart: "btnSmartPoint",
};

/** Legacy ticket-workflow strategy textures (no baked text). */
const STRATEGY_TICKET_WORKFLOW_KEY = {
  full: "strategyFullPointBtn",
  dual: "strategyDualPointBtn",
  smart: "strategySmartPointBtn",
};

/** @param {keyof typeof POINT_MODALITY_ASSET_KEYS} key */
export function pointModalityAsset(key) {
  const file = POINT_MODALITY_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${POINT_MODALITY}/${file}`);
}

/** Enhanced plasma button in point-modality/, or "" if missing. */
export function pointBtnAsset(strategyId) {
  const key = POINT_BTN_ASSET_KEY[strategyId];
  return key ? pointModalityAsset(key) : "";
}

/** Strategy picker texture from ticket-workflow/ (used by RaceCard). */
export function strategyPointAsset(strategyId) {
  const key = STRATEGY_TICKET_WORKFLOW_KEY[strategyId];
  return key ? ticketWorkflowAsset(key) : "";
}

export const POINT_MODALITY_ASSET_DIR = POINT_MODALITY;
