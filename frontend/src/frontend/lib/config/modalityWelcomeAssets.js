import { staticFile } from "@/frontend/lib/config/paths";

const BASE = "/images/modality-welcome";

/** AI PNG card icons — modality welcome modal (transparent bg after script) */
export const MODALITY_WELCOME_ASSET_KEYS = {
  cardPaid: "card-paid.png",
  cardFree: "card-free.png",
  cardSpecial: "card-special.png",
  cardGuest: "card-guest.png",
};

const CARD_KEY_BY_MODALITY = {
  paid: "cardPaid",
  free: "cardFree",
  special: "cardSpecial",
  guest: "cardGuest",
};

/** @param {keyof typeof MODALITY_WELCOME_ASSET_KEYS} key */
export function modalityWelcomeAsset(key) {
  const file = MODALITY_WELCOME_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${BASE}/${file}`);
}

export function modalityWelcomeCardAsset(modalityId) {
  const key = CARD_KEY_BY_MODALITY[modalityId];
  return key ? modalityWelcomeAsset(key) : "";
}
