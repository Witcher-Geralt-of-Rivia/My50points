/**
 * 50points Modality Theme Configuration
 * Directly mapped from Figma design specs (Sin título.pdf / Sin título.fig)
 *
 * Modality 1: Torneo De Pago (~1€ / ticket) - Dark Luxury Gold/Amber
 * Modality 2: 3 Tickets Gratis (Historial/Ranking) - Dark Slate Cyan/Blue
 * Modality 3: Torneo Alto Nivel (~50€ / ticket) - Dark Bronze / Rose Gold
 * Modality 4: Gratuito Efímero 12h (Captación) - Clean White / Vibrant Purple
 */

export const MODALITY_THEMES = {
  1: {
    id: 1,
    name: "Modalidad 1",
    subtitle: "Torneo Oficial - 1€",
    color: "#F59E0B",
    primary: "amber",
    bgClass: "bg-slate-950",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/40",
    badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    accentGradient: "from-amber-500/20 to-yellow-600/10",
    ticketPill: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  2: {
    id: 2,
    name: "Modalidad 2",
    subtitle: "3 Tickets Gratis - Torneo Regular",
    color: "#06B6D4",
    primary: "cyan",
    bgClass: "bg-slate-950",
    textClass: "text-cyan-400",
    borderClass: "border-cyan-500/40",
    badgeBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    accentGradient: "from-cyan-500/20 to-blue-600/10",
    ticketPill: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  3: {
    id: 3,
    name: "Modalidad 3",
    subtitle: "Torneo High Stakes - 50€",
    color: "#EC4899",
    primary: "rose",
    bgClass: "bg-slate-950",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/40",
    badgeBg: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    accentGradient: "from-rose-500/20 to-orange-600/10",
    ticketPill: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  },
  4: {
    id: 4,
    name: "Modalidad 4",
    subtitle: "Pase Invitado Efímero (12 Horas)",
    color: "#8B5CF6",
    primary: "purple",
    bgClass: "bg-[#0b0c16]",
    textClass: "text-purple-300",
    borderClass: "border-purple-500/50",
    badgeBg: "bg-purple-500/20 text-purple-200 border-purple-400/40",
    accentGradient: "from-purple-900/40 to-indigo-950/60",
    ticketPill: "bg-purple-600/25 text-purple-200 border-purple-400/50",
  },
};

export function getModalityTheme(modeId = 2) {
  const num = Number(modeId) || 2;
  return MODALITY_THEMES[num] || MODALITY_THEMES[2];
}
