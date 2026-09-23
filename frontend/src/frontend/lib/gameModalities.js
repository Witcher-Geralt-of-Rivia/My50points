/**
 * Four platform modalities — each has a unique ambient color so players
 * always know where they are. Flow: Modalidades → Hipódromos → Tickets → Torneo.
 */

import {
  BRAND_BY_MODALITY,
  BRAND_TICKET_GUEST,
  brandCssCustomProperties,
  ticketPaletteToModality,
} from "@/frontend/lib/brandColors";
import { EXPOSED_MODALITIES, isModalityExposed } from "@/frontend/lib/productFlags";

export const MODALITY_IDS = ["guest", "free", "paid", "special"];

export const MODALITIES = {
  guest: {
    id: "guest",
    ...ticketPaletteToModality(BRAND_TICKET_GUEST, {
      hubInverted: true,
      gameMode: 1,
      available: true,
      icon: "user",
      badgeLabel: "INVITADO",
    }),
  },
  free: {
    id: "free",
    ...ticketPaletteToModality(BRAND_BY_MODALITY.free, {
      gameMode: 2,
      available: true,
      icon: "trophy",
      badgeLabel: "REGISTRADO",
    }),
  },
  paid: {
    id: "paid",
    ...ticketPaletteToModality(BRAND_BY_MODALITY.paid, {
      gameMode: 3,
      available: false,
      icon: "ticket",
      badgeLabel: "PAGO",
    }),
  },
  special: {
    id: "special",
    ...ticketPaletteToModality(BRAND_BY_MODALITY.special, {
      gameMode: 4,
      available: false,
      icon: "star",
      badgeLabel: "ESPECIAL",
    }),
  },
};

const GAME_MODE_TO_MODALITY = {
  1: "guest",
  2: "free",
  3: "paid",
  4: "special",
};

export function gameModeToModalityId(gameMode, isGuest = false) {
  if (isGuest) return "guest";
  const mode = Number(gameMode);
  return GAME_MODE_TO_MODALITY[mode] || "free";
}

export function modalityIdToGameMode(modalityId) {
  return getModality(modalityId).gameMode;
}

/** Default modality from account (guest → guest, registered → free). */
export function defaultModalityForUser(user) {
  if (!user) return null;
  if (user.isGuest) return "guest";
  return gameModeToModalityId(user.gameMode, false);
}

/**
 * Resolve active modality: route override > ?modality > path > persisted > user.
 */
export function resolveActiveModality({
  override = null,
  pathname = "",
  searchModality = null,
  user = null,
  persisted = null,
} = {}) {
  // A modality that is not exposed as a public entry (see productFlags) is never
  // activated from a URL or stale storage for guests/anonymous visitors. An
  // existing registered account keeps its own (internal) modality.
  const registered = Boolean(user && !user.isGuest);
  const usable = (id) => isValidModalityId(id) && (registered || isModalityExposed(normalizeModalityId(id)));
  if (usable(override)) return override;
  if (usable(searchModality)) return searchModality;
  const pathMatch = pathname.match(/\/modalidades\/([^/]+)/);
  if (pathMatch && usable(pathMatch[1])) return pathMatch[1];
  if (usable(persisted)) return persisted;
  const fromUser = defaultModalityForUser(user);
  if (fromUser) return fromUser;
  return isModalityExposed("free") ? "free" : EXPOSED_MODALITIES[0];
}

/** Tailwind badge classes for leaderboard / ranking rows */
export function getModalityBadgeClasses(gameMode, isGuest = false) {
  const mod = getModality(gameModeToModalityId(gameMode, isGuest));
  const id = mod.id;
  const map = {
    guest: "bg-zinc-200/15 text-zinc-200 border-zinc-300/35",
    free: "bg-cyan-600/20 text-cyan-300 border-cyan-500/40",
    paid: "bg-purple-600/20 text-purple-300 border-purple-500/40",
    special: "bg-amber-600/20 text-amber-300 border-amber-500/40",
  };
  return {
    className: map[id] || map.free,
    label: mod.badgeLabel || id.toUpperCase(),
  };
}

export function applyModalityToDocument(modalityId) {
  if (typeof document === "undefined") return;
  const id = isValidModalityId(modalityId) ? modalityId : "free";
  const root = document.documentElement;
  // M4 keeps the dark canvas everywhere (product decision). The legacy
  // stylesheet carries ~200 `html[data-modality="guest"]` rules that repaint
  // the page white, so the document uses a distinct value for guests and
  // none of those rules can match. The modality itself is still "guest".
  root.setAttribute("data-modality", id === "guest" ? "guest-m4" : id);
  const vars = brandCssCustomProperties(id);
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function clearModalityFromDocument() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.removeAttribute("data-modality");
  [
    "--modality-accent",
    "--modality-neon",
    "--modality-neon-line",
    "--modality-border",
    "--modality-glow",
    "--modality-matte-bg",
    "--modality-matte-panel",
    "--modality-matte-muted",
    "--modality-matte-fg",
    "--modality-bg",
    "--modality-ticket",
  ].forEach((key) => root.style.removeProperty(key));
}

const STORAGE_KEY = "50points_active_modality";
const COVER_PASSED_KEY = "50points_cover_passed";

export function normalizeModalityId(id) {
  if (!id) return "free";
  const s = String(id).toLowerCase().trim();
  // Numeric aliases follow the Figma numbering: M1 paid (prize), M2 free,
  // M3 special, M4 guest — NOT the internal gameMode enum.
  if (s === "1" || s === "paid" || s === "modalidad-1" || s === "modalidad-paid") return "paid";
  if (s === "2" || s === "free" || s === "modalidad-2" || s === "modalidad-free") return "free";
  if (s === "3" || s === "special" || s === "modalidad-3" || s === "modalidad-special") return "special";
  if (s === "4" || s === "guest" || s === "modalidad-4" || s === "modalidad-guest") return "guest";
  return MODALITY_IDS.includes(s) ? s : "free";
}

export function isValidModalityId(id) {
  if (!id) return false;
  const s = String(id).toLowerCase().trim();
  return (
    MODALITY_IDS.includes(s) ||
    ["1", "2", "3", "4", "modalidad-1", "modalidad-2", "modalidad-3", "modalidad-4"].includes(s)
  );
}

export function getModality(id) {
  const norm = normalizeModalityId(id);
  return MODALITIES[norm] || MODALITIES.free;
}

export function persistModality(id) {
  if (typeof window === "undefined" || !isValidModalityId(id)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    console.warn("sessionStorage write failed:", e);
  }
}

export function clearPersistedModality() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

/** Cover screen (homepage hero) was completed this load before entering /inicio. */
export function markCoverPassed() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(COVER_PASSED_KEY, "1");
  } catch (e) {
    console.warn("sessionStorage write failed:", e);
  }
}

export function hasCoverPassed() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(COVER_PASSED_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function clearCoverPassed() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(COVER_PASSED_KEY);
  } catch (e) {}
}

export function readPersistedModality() {
  if (typeof window === "undefined") return null;
  try {
    const id = sessionStorage.getItem(STORAGE_KEY);
    return isValidModalityId(id) ? id : null;
  } catch (e) {
    return null;
  }
}

/** Guest modality first for guests; otherwise free → guest → paid → special. */
export function hubModalityOrder(isGuest) {
  if (isGuest) return ["guest", "free", "paid", "special"];
  return ["free", "guest", "paid", "special"];
}

/** Hub sidebar order: paid (purple) → free (cyan) → special (gold) → guest (white). */
export const HUB_DISPLAY_ORDER = ["paid", "free", "special", "guest"];

export function trackSlug(trackName) {
  return encodeURIComponent(
    String(trackName || "track")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-"),
  );
}

export function trackFromSlug(slug, tracks) {
  const decoded = decodeURIComponent(slug || "").replace(/-/g, " ");
  return tracks.find(
    (t) => trackSlug(t) === slug || t.toLowerCase() === decoded.toLowerCase(),
  );
}

export function modalityPath(modalityId, segment, params = {}) {
  const base = `/modalidades/${modalityId}`;
  if (segment === "hub") return "/modalidades";
  if (segment === "tracks") return base;
  if (segment === "tickets" && params.trackSlug) return `${base}/${params.trackSlug}`;
  return base;
}

export function withModalityQuery(href, modalityId) {
  if (!href || typeof href !== "string") return href || "/";
  if (!modalityId || !href.startsWith("/")) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}modality=${modalityId}`;
}

/** Direct tournament entry from hipódromo ticket (free flow). */
export function buildTournamentEntryHref({
  tournamentSlug,
  modalityId,
  ticketNum,
  trackSlug,
  returnPath,
  playFirst = false,
}) {
  const params = new URLSearchParams();
  if (modalityId) params.set("modality", modalityId);
  if (ticketNum != null) params.set("ticket", String(ticketNum));
  if (trackSlug) params.set("track", trackSlug);
  if (returnPath) params.set("return", returnPath);
  if (playFirst) params.set("play", "1");
  const qs = params.toString();
  return `/tournament/${tournamentSlug}${qs ? `?${qs}` : ""}`;
}

export function buildModalityReturnPath(modalityId, trackSlug) {
  const base = `/modalidades/${modalityId}`;
  return trackSlug ? `${base}?track=${encodeURIComponent(trackSlug)}` : base;
}
