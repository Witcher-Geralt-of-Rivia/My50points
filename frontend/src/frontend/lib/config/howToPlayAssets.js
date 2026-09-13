import { staticFile } from "@/frontend/lib/config/paths";

/** Drop generated images into public/Img/how-to-play/ — see docs/HOW_TO_PLAY_ASSET_PROMPTS.md */
const HOW_TO_PLAY = "/Img/how-to-play";

export const HOW_TO_PLAY_ASSET_KEYS = {
  heroBg: "how-to-play-hero-bg.png",
  step1Join: "how-to-play-step-1-join.png",
  step2Strategy: "how-to-play-step-2-strategy.png",
  step3Pick: "how-to-play-step-3-pick.png",
  step4Points: "how-to-play-step-4-points.png",
  step5Rank: "how-to-play-step-5-rank.png",
  faqPanelBg: "how-to-play-faq-panel-bg.png",
  ctaBg: "how-to-play-cta-bg.png",
  ctaIcon: "how-to-play-cta-icon.png",
  stepConnector: "how-to-play-step-connector.png",
};

export const HOW_TO_PLAY_STEP_KEYS = [
  "step1Join",
  "step2Strategy",
  "step3Pick",
  "step4Points",
  "step5Rank",
];

/** @param {keyof typeof HOW_TO_PLAY_ASSET_KEYS} key */
export function howToPlayAsset(key) {
  const file = HOW_TO_PLAY_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${HOW_TO_PLAY}/${file}`);
}

/** Full-bleed step card background (1–5) for /how-to-play. */
export function howToPlayStepAsset(stepNum) {
  const key = HOW_TO_PLAY_STEP_KEYS[stepNum - 1];
  return key ? howToPlayAsset(key) : "";
}

export const HOW_TO_PLAY_ASSET_DIR = HOW_TO_PLAY;
