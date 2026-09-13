import { HOF_FEATS } from "./hallOfFameData";

const DEFAULT_FEAT = HOF_FEATS.find((f) => f.id === "first-winner") || HOF_FEATS[0];

/** Build Hall of Fame entry popup payload (user profile or demo). */
export function buildHallOfFameEntry({ user, profile, isEn = false } = {}) {
  const username = (user?.username || profile?.user?.username || "ALEXRACER").toUpperCase();
  const feat = DEFAULT_FEAT;
  const totalPoints = profile?.user?.stats?.totalPoints ?? 2580;
  const wins = profile?.user?.stats?.titles ?? 12;

  return {
    username,
    displayName: username,
    title: isEn ? "FOUNDER OF HISTORY" : "FUNDADOR DE LA HISTORIA",
    memberSince: isEn ? "20 MAY 2026" : "20 MAY 2026",
    avatarColor: user?.avatarColor || feat.holderColor || "#fbbf24",
    feat: {
      id: feat.id,
      name: isEn ? feat.nameEn : feat.name,
      desc: isEn ? feat.descEn : feat.desc,
      date: isEn ? "28 MAY 2026" : "28 MAY 2026",
    },
    ticket: {
      label: isEn ? "THE VICTORY TICKET" : "EL TIQUE DE LA VICTORIA",
      track: "LA RINCONADA",
      date: isEn ? "28 MAY 2026" : "28 MAY 2026",
      race: isEn ? "5TH RACE" : "5TA CARRERA",
      horseNumber: "07",
      horse: "THUNDER ROAD",
      play: "FULL POINT",
      points: 50,
      ticketNo: "25052807FPAlex",
      tagline: isEn ? "FIRST FOREVER!" : "¡PRIMERO PARA SIEMPRE!",
    },
    stats: {
      tournamentsWon: wins || 12,
      winningPlays: 37,
      accumulatedPts: totalPoints,
      maxStreak: 7,
      bestPosition: isEn ? "1ST PLACE" : "1° LUGAR",
      accuracy: "68.4%",
      favoritePlay: "FULL POINT",
      starHorse: "THUNDER ROAD",
      favoriteTrack: "LA RINCONADA",
    },
    quote: isEn
      ? "It's not about winning. It's about being the first."
      : "No se trata de ganar. Se trata de ser el primero.",
    featQuote: isEn
      ? "Today you made history. Tomorrow, others will try to match it. But you will always be the first."
      : "Hoy hiciste historia. Mañana, otros intentarán igualarla. Pero tú siempre serás el primero.",
  };
}

export const HOF_ENTRY_STORAGE_KEY = "50points-hof-entry-wizard";
