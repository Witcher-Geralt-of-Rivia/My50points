import { staticFile } from "@/frontend/lib/config/paths";

const BASE = "/images/brand";

export const BRAND_ASSET_KEYS = {
  ticketStripes: "brand-ticket-stripes.svg",
  ticketStripesFlat: "brand-ticket-stripes-flat.svg",
  heroTorneoTicket: "hero-torneo-ticket-badge.svg",
};

/** @param {keyof typeof BRAND_ASSET_KEYS} key */
export function brandAsset(key) {
  const file = BRAND_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${BASE}/${file}`);
}
