/**
 * 50points Modality Theme Configuration
 *
 * Colour rules confirmed by the client and aligned with the live palette in
 * lib/brandColors.js (paid=purple, free=cyan, special=gold, guest=white/purple):
 *
 *   Modality 1: Torneo De Pago            -> PURPLE
 *   Modality 2: 3 Tickets Gratis           -> AQUAMARINE / CYAN
 *   Modality 3: Torneo Alto Nivel          -> YELLOW / GOLD
 *   Modality 4: Invitado (guest, 12h)      -> WHITE + PURPLE
 *
 * Modality IDs and the exported shape are unchanged — colours only.
 */

export const MODALITY_THEMES = {
  1: {
    id: 1,
    name: "Modalidad 1",
    subtitle: "Torneo Oficial - 1€",
    color: "#7B2DBE",
    primary: "purple",
    bgClass: "bg-slate-950",
    textClass: "text-purple-300",
    borderClass: "border-purple-500/40",
    badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    accentGradient: "from-purple-500/20 to-fuchsia-600/10",
    ticketPill: "bg-purple-500/20 text-purple-200 border-purple-500/40",
  },
  2: {
    id: 2,
    name: "Modalidad 2",
    subtitle: "3 Tickets Gratis - Torneo Regular",
    color: "#00C4DC",
    primary: "cyan",
    bgClass: "bg-slate-950",
    textClass: "text-cyan-400",
    borderClass: "border-cyan-500/40",
    badgeBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    accentGradient: "from-cyan-500/20 to-teal-600/10",
    ticketPill: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  3: {
    id: 3,
    name: "Modalidad 3",
    subtitle: "Torneo High Stakes - 50€",
    color: "#F5C518",
    primary: "yellow",
    bgClass: "bg-slate-950",
    textClass: "text-yellow-300",
    borderClass: "border-yellow-500/40",
    badgeBg: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    accentGradient: "from-yellow-500/20 to-amber-600/10",
    ticketPill: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40",
  },
  4: {
    id: 4,
    name: "Modalidad 4",
    subtitle: "Pase Invitado Efímero (12 Horas)",
    color: "#FFFFFF",
    primary: "white",
    bgClass: "bg-[#0b0c16]",
    textClass: "text-white",
    borderClass: "border-purple-400/50",
    badgeBg: "bg-white/10 text-white border-purple-400/40",
    accentGradient: "from-white/10 to-purple-700/25",
    ticketPill: "bg-white/15 text-white border-purple-400/50",
  },
};

export function getModalityTheme(modeId = 2) {
  const num = Number(modeId) || 2;
  return MODALITY_THEMES[num] || MODALITY_THEMES[2];
}
