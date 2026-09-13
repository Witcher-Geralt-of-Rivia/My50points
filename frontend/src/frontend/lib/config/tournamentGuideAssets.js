import { staticFile } from "@/frontend/lib/config/paths";

const BASE = "/images/tournament-guide";

/** AI-generated PNG icons — modern glass/neon horse-racing tournament art */
export const TOURNAMENT_GUIDE_ASSET_KEYS = {
  heroHorses: "hero-horses-racing.png",
  heroTrophy: "hero-trophy-badge.png",
  step1: "step-1-modality.png",
  step2: "step-2-hipodromo.png",
  step3: "step-3-ticket.png",
  step4: "step-4-strategies.png",
  step5: "step-5-confirm.png",
  step6: "step-6-tournament.png",
  step7: "step-7-ranking.png",
};

/** Quick summary reuses step icons at chip size */
export const TOURNAMENT_GUIDE_SUMMARY_KEYS = [
  "step1",
  "step2",
  "step3",
  "step4",
  "step5",
  "step6",
  "step7",
];

export const TOURNAMENT_GUIDE_STEP_KEYS = [
  "step1",
  "step2",
  "step3",
  "step4",
  "step5",
  "step6",
  "step7",
];

/** @param {keyof typeof TOURNAMENT_GUIDE_ASSET_KEYS} key */
export function tournamentGuideAsset(key) {
  const file = TOURNAMENT_GUIDE_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${BASE}/${file}`);
}

export function tournamentGuideStepAsset(stepNum) {
  const key = TOURNAMENT_GUIDE_STEP_KEYS[stepNum - 1];
  return key ? tournamentGuideAsset(key) : "";
}
