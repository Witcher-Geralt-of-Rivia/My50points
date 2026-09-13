const RACES_PER_TOURNAMENT = 7;

function normalizeHorse(h) {
  return {
    ...h,
    silkColors: { primary: h.silkPrimary || "#7c3aed", secondary: h.silkSecondary || "#ffffff" },
    weight: 54 + (h.postPosition % 8),
  };
}

export function normalizeRace(race) {
  let etTime = "TBD";
  if (race.scheduledTime && race.scheduledTime !== "TBD") {
    const match = race.scheduledTime.match(/T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      etTime = `${hours}:${minutes} ${ampm}`;
    } else {
      etTime = race.scheduledTime;
    }
  } else {
    etTime = race.scheduledTime || "";
  }
  return {
    ...race,
    number: race.raceNumber,
    class: race.raceClass || "",
    postTime: etTime,
    surface: race.surface || "Dirt",
    distance: race.distance || 1200,
    tournamentRace: true,
    horses: (race.horses || []).map(normalizeHorse),
  };
}

export function normalizeTournament(t) {
  const races = (t.races || [])
    .slice()
    .sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0))
    .slice(0, RACES_PER_TOURNAMENT);
  return {
    ...t,
    totalRaces: RACES_PER_TOURNAMENT,
    races: races.map(normalizeRace),
  };
}

export { RACES_PER_TOURNAMENT };
