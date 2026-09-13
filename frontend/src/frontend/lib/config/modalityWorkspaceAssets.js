import { staticFile } from "@/frontend/lib/config/paths";

const BASE = "/images/modality-workspace";

export const MODALITY_WORKSPACE_ASSET_KEYS = {
  logoStrip: "logo-50-my-points-strip.svg",
  stripesBadge: "workspace-stripes-badge.png",
  iconModalityPaid: "icon-modality-paid.svg",
  iconModalityFree: "icon-modality-free.svg",
  iconModalitySpecial: "icon-modality-special.svg",
  iconModalityGuest: "icon-modality-guest.svg",
  liveRadar: "live-radar.svg",
  menuLines: "menu-lines.svg",
};

const MODALITY_ICON_MAP = {
  paid: "iconModalityPaid",
  free: "iconModalityFree",
  special: "iconModalitySpecial",
  guest: "iconModalityGuest",
};

/** @param {keyof typeof MODALITY_WORKSPACE_ASSET_KEYS} key */
export function modalityWorkspaceAsset(key) {
  const file = MODALITY_WORKSPACE_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${BASE}/${file}`);
}

export function modalityNavIconAsset(modalityId) {
  const key = MODALITY_ICON_MAP[modalityId];
  return key ? modalityWorkspaceAsset(key) : "";
}
