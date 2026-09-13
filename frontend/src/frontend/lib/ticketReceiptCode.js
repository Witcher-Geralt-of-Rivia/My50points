const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function segment(seed, length) {
  let out = "";
  let state = seed;
  for (let i = 0; i < length; i += 1) {
    state = Math.imul(state ^ (i + 1), 1103515245) + 12345;
    out += CHARSET[Math.abs(state) % CHARSET.length];
  }
  return out;
}

/** Stable receipt code e.g. PRX7-25A4-9K2D */
export function buildTicketReceiptCode({
  tournamentId,
  ticketNum,
  trackSlug,
  raceIds = [],
}) {
  const seed = hashString(`${tournamentId}:${ticketNum}:${trackSlug}:${raceIds.join(",")}`);
  const a = segment(seed, 4);
  const b = segment(seed ^ 0x9e3779b9, 4);
  return `PRX${ticketNum}-${a}-${b}`;
}

const RECEIPT_CODE_KEY = "50points_ticket_receipt_codes_v1";

export function persistTicketReceiptCode(trackSlug, ticketNum, tournamentSlug, code) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RECEIPT_CODE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[`${trackSlug}:${ticketNum}:${tournamentSlug}`] = code;
    localStorage.setItem(RECEIPT_CODE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function readTicketReceiptCode(trackSlug, ticketNum, tournamentSlug) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RECEIPT_CODE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data[`${trackSlug}:${ticketNum}:${tournamentSlug}`] || null;
  } catch {
    return null;
  }
}

export function formatReceiptDate(date = new Date(), isEn = false) {
  const locale = isEn ? "en-US" : "es-ES";
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatReceiptTime(date = new Date(), isEn = false) {
  const locale = isEn ? "en-US" : "es-ES";
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
