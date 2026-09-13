import { staticFile } from "@/frontend/lib/config/paths";

/** Strategy ticket art for home / how-to-play cards — public/Img/strategies/ */
const STRATEGIES = "/Img/strategies";

export const STRATEGY_ASSET_KEYS = {
  ticketFullPoint: "strategy-ticket-full-point.png",
  ticketDualPoint: "strategy-ticket-dual-point.png",
  ticketSmartPoint: "strategy-ticket-smart-point.png",
};

/** @type {Record<string, keyof typeof STRATEGY_ASSET_KEYS>} */
export const STRATEGY_TICKET_ASSET_KEY = {
  full: "ticketFullPoint",
  dual: "ticketDualPoint",
  smart: "ticketSmartPoint",
};

/** @param {keyof typeof STRATEGY_ASSET_KEYS} key */
export function strategyAsset(key) {
  const file = STRATEGY_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${STRATEGIES}/${file}`);
}

/** Vertical ticket illustration for Full / Dual / Smart Point cards. */
export function strategyTicketAsset(variant) {
  const key = STRATEGY_TICKET_ASSET_KEY[variant];
  return key ? strategyAsset(key) : "";
}

export const STRATEGY_ASSET_DIR = STRATEGIES;
