import { Crown, Star, Flame, Trophy, Target, TrendingUp, Shield } from "lucide-react";

/** 1st-place winner avatar fill — magenta per podium mockup. */
export const HOF_GOLD_WINNER_AVATAR_COLOR = "#d946ef";

/** Default podium avatar colors by rank (mockup: magenta / purple / cyan). */
export const HOF_PODIUM_RANK_COLORS = {
  1: HOF_GOLD_WINNER_AVATAR_COLOR,
  2: "#a855f7",
  3: "#06b6d4",
};

/** Unlocked Hall of Fame feats (first achievers). */
export const HOF_FEATS = [
  {
    id: "first-winner",
    category: "mythic",
    name: "Primer Ganador de la Historia",
    nameEn: "First Winner in History",
    desc: "Primer jugador en ganar un torneo oficial",
    descEn: "First player to win an official tournament",
    icon: Trophy,
    unlocked: true,
    holder: "ALEXRACER",
    holderColor: "#fbbf24",
    date: "28 ABR 2024",
    dateISO: "2024-04-28",
  },
  {
    id: "first-1k",
    category: "fullPoint",
    name: "Primer Jugador en Superar 1.000 Puntos",
    nameEn: "First Player Over 1,000 Points",
    desc: "Superar la barrera de mil puntos",
    descEn: "Break the thousand-point barrier",
    icon: Target,
    unlocked: true,
    holder: "NIGHTBOLT",
    holderColor: "#06b6d4",
    date: "10 MAY 2024",
    dateISO: "2024-05-10",
  },
  {
    id: "first-3-tournaments",
    category: "dominance",
    name: "Primer Jugador en Ganar 3 Torneos",
    nameEn: "First Player to Win 3 Tournaments",
    desc: "Tres victorias de torneo",
    descEn: "Three tournament victories",
    icon: Crown,
    unlocked: true,
    holder: "IRONCLAD",
    holderColor: "#ea580c",
    date: "20 MAY 2024",
    dateISO: "2024-05-20",
  },
  {
    id: "first-hot",
    category: "comebacks",
    name: "Primer Jugador Hot",
    nameEn: "First Hot Player",
    desc: "Racha caliente legendaria",
    descEn: "Legendary hot streak",
    icon: Flame,
    unlocked: true,
    holder: "GOLDENFLASH",
    holderColor: "#f97316",
    date: "02 JUN 2024",
    dateISO: "2024-06-02",
  },
  {
    id: "first-monthly",
    category: "mythic",
    name: "Primer Campeon Mensual",
    nameEn: "First Monthly Champion",
    desc: "Campeon del mes inaugural",
    descEn: "Inaugural monthly champion",
    icon: Star,
    unlocked: true,
    holder: "THUNDERX",
    holderColor: "#a855f7",
    date: "31 MAY 2024",
    dateISO: "2024-05-31",
  },
  {
    id: "perfect-tournament",
    category: "mythic",
    name: "Torneo Perfecto",
    nameEn: "Perfect Tournament",
    desc: "Anotar puntos en cada carrera",
    descEn: "Score points in every race",
    icon: Star,
    unlocked: false,
    holder: null,
  },
  {
    id: "eight-full",
    category: "fullPoint",
    name: "8 Full Points Consecutivos",
    nameEn: "8 Consecutive Full Points",
    desc: "8 Full Points seguidos",
    descEn: "8 Full Points in a row",
    icon: Target,
    unlocked: false,
    holder: null,
  },
  {
    id: "historic-comeback",
    category: "comebacks",
    name: "Remontada Historica",
    nameEn: "Historic Comeback",
    desc: "De ultimo a Top 3",
    descEn: "From last to Top 3",
    icon: TrendingUp,
    unlocked: false,
    holder: null,
  },
  {
    id: "six-dual",
    category: "dualPoint",
    name: "6 Dual Points Consecutivos",
    nameEn: "6 Consecutive Dual Points",
    desc: "6 Dual Points seguidos",
    descEn: "6 Dual Points in a row",
    icon: Shield,
    unlocked: false,
    holder: null,
  },
];

/** Build rotating news items from feats + extras. */
export function buildHallOfFameNewsFeed(isEn = false) {
  const feats = HOF_FEATS.filter((f) => f.unlocked && f.holder);
  const items = feats.map((feat) => ({
    id: `feat-${feat.id}`,
    type: "feat",
    player: feat.holder,
    playerColor: feat.holderColor,
    featName: isEn ? feat.nameEn : feat.name,
    date: feat.date,
    dateISO: feat.dateISO,
  }));

  items.push(
    {
      id: "record-alex",
      type: "record",
      player: "ALEXRACER",
      playerColor: "#fbbf24",
      points: 2580,
      date: isEn ? "28 APR 2024" : "28 ABR 2024",
      dateISO: "2024-04-28",
    },
    {
      id: "entry-night",
      type: "entry",
      player: "NIGHTBOLT",
      playerColor: "#06b6d4",
      date: isEn ? "10 MAY 2024" : "10 MAY 2024",
      dateISO: "2024-05-10",
    }
  );

  return items.sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
}

export function avatarForPlayer(name, color) {
  const hex = (color || "#7c3aed").replace("#", "");
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${hex}&color=fff&size=80&bold=true`;
}
