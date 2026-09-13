const STORAGE_KEY = "50points_free_track_tickets_v1";

function readAll() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function getCurrentSessionToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("50points_guest_token") || localStorage.getItem("50points_token") || null;
  } catch {
    return null;
  }
}

export function clearTrackTicketUsage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("50points-tickets-updated"));
  } catch {}
}

/** Fecha (YYYY-MM-DD) que lleva al final el slug del torneo, ej. "woodbine-2026-07-25". */
function tournamentDateOf(slug) {
  const m = /(\d{4})-(\d{2})-(\d{2})$/.exec(slug || "");
  return m ? m[0] : null;
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Un ticket usado pertenece a UN torneo (un torneo = un día en ese hipódromo).
 * El registro se guarda por hipódromo, así que hay que descartar el de días
 * anteriores: si no, haber gastado los 3 tickets ayer en Woodbine dejaba el
 * torneo de HOY en Woodbine marcado como agotado y sin poder apostar.
 */
function isStaleUsage(entry, ticketNum) {
  const slug =
    entry?.tickets?.[String(ticketNum)]?.tournamentSlug || entry?.tournamentSlug || null;
  const date = tournamentDateOf(slug);
  // Sin fecha registrada no se puede saber a qué torneo pertenece: no bloquear.
  if (!date) return true;
  return date < todayISO();
}

/** Un registro sin sesión asociada no puede atribuirse a nadie: se ignora. */
function belongsToCurrentSession(entry) {
  const activeToken = getCurrentSessionToken();
  if (!activeToken) return false;
  if (!entry?.guestToken) return false;
  return entry.guestToken === activeToken;
}

/** @returns {number[]} Used ticket numbers (1–3) for this track's CURRENT tournament. */
export function getUsedTicketsForTrack(trackSlug) {
  const entry = readAll()[trackSlug];
  if (!entry || !belongsToCurrentSession(entry)) return [];
  const used = Array.isArray(entry.used) ? entry.used : [];
  return used.filter((num) => !isStaleUsage(entry, num));
}

export function getUsedTicketMeta(trackSlug, ticketNum) {
  const entry = readAll()[trackSlug];
  if (!entry || !belongsToCurrentSession(entry)) return null;
  if (isStaleUsage(entry, ticketNum)) return null;
  return entry.tickets?.[String(ticketNum)] || null;
}

export function isTrackTicketUsed(trackSlug, ticketNum) {
  return getUsedTicketsForTrack(trackSlug).includes(Number(ticketNum));
}

export function markTrackTicketUsed(
  trackSlug,
  ticketNum,
  tournamentSlug,
  tournamentName = "",
  guestToken = null
) {
  if (!trackSlug || !ticketNum) return;
  const all = readAll();
  const prev = all[trackSlug] || { used: [], tournamentSlug: null, tickets: {} };
  const used = new Set(prev.used || []);
  used.add(Number(ticketNum));
  const tickets = { ...(prev.tickets || {}) };
  tickets[String(ticketNum)] = {
    tournamentSlug: tournamentSlug || prev.tournamentSlug || tickets[String(ticketNum)]?.tournamentSlug,
    tournamentName:
      tournamentName ||
      tickets[String(ticketNum)]?.tournamentName ||
      prev.tournamentName ||
      "",
  };
  const activeToken = guestToken || (typeof window !== "undefined" ? localStorage.getItem("50points_guest_token") : null);
  all[trackSlug] = {
    used: [...used].sort((a, b) => a - b),
    tournamentSlug: tournamentSlug || prev.tournamentSlug,
    guestToken: activeToken,
    tickets,
  };
  writeAll(all);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("50points-tickets-updated"));
  }
}

export function unmarkTrackTicketUsed(trackSlug, ticketNum) {
  if (!trackSlug || !ticketNum) return;
  const all = readAll();
  const prev = all[trackSlug];
  if (!prev) return;
  const used = (prev.used || []).filter((n) => n !== Number(ticketNum));
  const tickets = { ...(prev.tickets || {}) };
  delete tickets[String(ticketNum)];
  if (used.length === 0) {
    delete all[trackSlug];
  } else {
    all[trackSlug] = { ...prev, used, tickets };
  }
  writeAll(all);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("50points-tickets-updated"));
  }
}
