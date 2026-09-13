/**
 * MY 50 POINTS — brand ticket palette (logo source).
 * Purple · Cyan · Gold tickets + white guest stripe.
 * Use ticket/neon for accents; matte* for modality backgrounds.
 */

export const BRAND_TICKET_PURPLE = {
  ticket: "#7B2DBE",
  ticketDeep: "#5E1F96",
  ticketLight: "#9B4FD9",
  neon: "#C45CFF",
  neonLine: "rgba(196, 92, 255, 0.9)",
  accent: "#9333EA",
  matteBg: "#1A0E2E",
  mattePanel: "#24143A",
  matteMuted: "#2E1B48",
  matteForeground: "#F4F4F5",
  border: "rgba(147, 51, 234, 0.48)",
  glow: "rgba(196, 92, 255, 0.32)",
};

export const BRAND_TICKET_CYAN = {
  ticket: "#00C4DC",
  ticketDeep: "#0099AD",
  ticketLight: "#3DEAFF",
  neon: "#3DEAFF",
  neonLine: "rgba(61, 234, 255, 0.9)",
  accent: "#00C4DC",
  matteBg: "#0A2228",
  mattePanel: "#0F2E36",
  matteMuted: "#143A44",
  matteForeground: "#F4F4F5",
  border: "rgba(0, 196, 220, 0.48)",
  glow: "rgba(61, 234, 255, 0.28)",
};

export const BRAND_TICKET_GOLD = {
  ticket: "#F5A824",
  ticketDeep: "#D9890C",
  ticketLight: "#FFC85A",
  neon: "#FFD54A",
  neonLine: "rgba(255, 213, 74, 0.92)",
  accent: "#F5A824",
  matteBg: "#261C08",
  mattePanel: "#322608",
  matteMuted: "#3E300A",
  matteForeground: "#F4F4F5",
  border: "rgba(245, 168, 36, 0.5)",
  glow: "rgba(255, 213, 74, 0.3)",
};

/** Fourth stripe — sin registro (claro, mate) */
export const BRAND_TICKET_GUEST = {
  ticket: "#A855F7",
  ticketDeep: "#6D28D9",
  ticketLight: "#C084FC",
  neon: "#C084FC",
  neonLine: "rgba(192, 132, 252, 0.9)",
  accent: "#A855F7",
  matteBg: "#0D0B18",
  mattePanel: "#151226",
  matteMuted: "#201A38",
  matteForeground: "#F4F4F5",
  border: "rgba(168, 85, 247, 0.4)",
  glow: "rgba(168, 85, 247, 0.25)",
  hubInverted: false,
};

/** Logo badge — golden "my" dot */
export const BRAND_LOGO_MY = "#F5A824";

export const BRAND_STRIPES = [
  { id: "paid", ...BRAND_TICKET_PURPLE },
  { id: "free", ...BRAND_TICKET_CYAN },
  { id: "special", ...BRAND_TICKET_GOLD },
  { id: "guest", ...BRAND_TICKET_GUEST },
];

export const BRAND_BY_MODALITY = {
  paid: BRAND_TICKET_PURPLE,
  free: BRAND_TICKET_CYAN,
  special: BRAND_TICKET_GOLD,
  guest: BRAND_TICKET_GUEST,
};

/** CSS custom properties for :root / document theme */
export function brandCssCustomProperties(modalityId = null) {
  const base = {
    "--brand-purple-ticket": BRAND_TICKET_PURPLE.ticket,
    "--brand-purple-neon": BRAND_TICKET_PURPLE.neon,
    "--brand-purple-matte-bg": BRAND_TICKET_PURPLE.matteBg,
    "--brand-purple-accent": BRAND_TICKET_PURPLE.accent,
    "--brand-cyan-ticket": BRAND_TICKET_CYAN.ticket,
    "--brand-cyan-neon": BRAND_TICKET_CYAN.neon,
    "--brand-cyan-matte-bg": BRAND_TICKET_CYAN.matteBg,
    "--brand-cyan-accent": BRAND_TICKET_CYAN.accent,
    "--brand-gold-ticket": BRAND_TICKET_GOLD.ticket,
    "--brand-gold-neon": BRAND_TICKET_GOLD.neon,
    "--brand-gold-matte-bg": BRAND_TICKET_GOLD.matteBg,
    "--brand-gold-accent": BRAND_TICKET_GOLD.accent,
    "--brand-guest-ticket": BRAND_TICKET_GUEST.ticket,
    "--brand-guest-matte-bg": BRAND_TICKET_GUEST.matteBg,
    "--brand-logo-my": BRAND_LOGO_MY,
  };

  if (!modalityId || !BRAND_BY_MODALITY[modalityId]) return base;

  const t = BRAND_BY_MODALITY[modalityId];
  return {
    ...base,
    "--modality-accent": t.accent,
    "--modality-neon": t.neon,
    "--modality-neon-line": t.neonLine,
    "--modality-border": t.border,
    "--modality-glow": t.glow,
    "--modality-matte-bg": t.matteBg,
    "--modality-matte-panel": t.mattePanel,
    "--modality-matte-muted": t.matteMuted,
    "--modality-matte-fg": t.matteForeground,
    "--modality-bg": t.matteBg,
    "--modality-ticket": t.ticket,
  };
}

export function ticketPaletteToModality(ticket, extra = {}) {
  return {
    accent: ticket.accent,
    matteBg: ticket.matteBg,
    mattePanel: ticket.mattePanel,
    matteMuted: ticket.matteMuted,
    matteForeground: ticket.matteForeground,
    bgBase: ticket.matteBg,
    bgGradient: ticket.matteBg,
    border: ticket.border,
    glow: ticket.glow,
    neon: ticket.neon,
    neonLine: ticket.neonLine,
    ticket: ticket.ticket,
    ticketDeep: ticket.ticketDeep,
    ticketLight: ticket.ticketLight,
    ...extra,
  };
}
