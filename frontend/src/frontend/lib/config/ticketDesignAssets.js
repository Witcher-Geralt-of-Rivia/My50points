import { staticFile } from "@/frontend/lib/config/paths";

const BASE = "/images/tickets";

/** Prefer SVG in UI (lightweight, crisp). PNG variants are hi-fi mockup fallbacks. */
export const ticketDesignAssets = {
  horseHeadLogo: {
    svg: staticFile(`${BASE}/horse-head-logo.svg`),
    png: staticFile(`${BASE}/horse-head-logo.png`),
  },
  badge50MyPoints: {
    svg: staticFile(`${BASE}/badge-50-my-points.svg`),
    png: staticFile(`${BASE}/badge-50-my-points.png`),
  },
  strategy: {
    full: {
      svg: staticFile(`${BASE}/strategy-full-50.svg`),
      png: staticFile(`${BASE}/strategy-full-50.png`),
    },
    dual: {
      svg: staticFile(`${BASE}/strategy-dual-25.svg`),
      png: staticFile(`${BASE}/strategy-dual-25.png`),
    },
    smart: {
      svg: staticFile(`${BASE}/strategy-smart-30-15-5.svg`),
      png: staticFile(`${BASE}/strategy-smart-30-15-5.png`),
    },
  },
  tabs: {
    used: {
      svg: staticFile(`${BASE}/ticket-tab-used.svg`),
      png: staticFile(`${BASE}/ticket-tab-used.png`),
    },
    availableGreen: {
      svg: staticFile(`${BASE}/ticket-tab-available-green.svg`),
      png: staticFile(`${BASE}/ticket-tab-available-green.png`),
    },
    availableGray: {
      svg: staticFile(`${BASE}/ticket-tab-available-gray.svg`),
      png: staticFile(`${BASE}/ticket-tab-available-gray.png`),
    },
  },
  receiptTearEdge: staticFile(`${BASE}/receipt-tear-edge.svg`),
};

export function strategyTicketAsset(strategyId, format = "svg") {
  const map = {
    full: ticketDesignAssets.strategy.full,
    dual: ticketDesignAssets.strategy.dual,
    smart: ticketDesignAssets.strategy.smart,
  };
  const entry = map[strategyId];
  return entry?.[format] || entry?.svg || null;
}

export function ticketTabAsset({ used = false, available = true }, format = "svg") {
  if (used) return ticketDesignAssets.tabs.used[format] || ticketDesignAssets.tabs.used.svg;
  if (available) {
    return ticketDesignAssets.tabs.availableGreen[format] || ticketDesignAssets.tabs.availableGreen.svg;
  }
  return ticketDesignAssets.tabs.availableGray[format] || ticketDesignAssets.tabs.availableGray.svg;
}
