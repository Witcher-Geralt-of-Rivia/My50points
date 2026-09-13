// Admin Data Manager - Manual fallback for race data management
// Uses localStorage in browser, JSON file export for production builds

const STORAGE_KEY = '50points_admin_data';

const defaultTournamentTemplate = {
  id: '',
  name: '',
  track: '',
  location: '',
  date: '',
  status: 'upcoming',
  totalPlayers: 0,
  playersJoined: 0,
  racesCompleted: 0,
  totalRaces: 0,
  description: '',
  races: [],
};

const defaultRaceTemplate = {
  id: '',
  number: 1,
  name: '',
  class: '',
  distance: 1600,
  surface: 'Dirt',
  purse: 0,
  postTime: '',
  status: 'upcoming',
  horses: [],
};

const defaultHorseTemplate = {
  id: '',
  postPosition: 1,
  name: '',
  jockey: '',
  trainer: '',
  weight: 56,
  odds: 5.0,
  silkColors: { primary: '#7c3aed', secondary: '#06b6d4' },
};

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getStoredData() {
  if (typeof window === 'undefined') return { tournaments: [], lastUpdated: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { tournaments: [], lastUpdated: null };
  } catch {
    return { tournaments: [], lastUpdated: null };
  }
}

export function saveData(data) {
  if (typeof window === 'undefined') return;
  data.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createTournament(fields) {
  const data = getStoredData();
  const tournament = {
    ...defaultTournamentTemplate,
    ...fields,
    id: fields.id || generateId('t'),
    races: [],
  };
  data.tournaments.push(tournament);
  saveData(data);
  return tournament;
}

export function updateTournament(id, fields) {
  const data = getStoredData();
  const idx = data.tournaments.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  data.tournaments[idx] = { ...data.tournaments[idx], ...fields };
  saveData(data);
  return data.tournaments[idx];
}

export function deleteTournament(id) {
  const data = getStoredData();
  data.tournaments = data.tournaments.filter((t) => t.id !== id);
  saveData(data);
}

export function addRaceToTournament(tournamentId, raceFields) {
  const data = getStoredData();
  const tournament = data.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return null;

  const race = {
    ...defaultRaceTemplate,
    ...raceFields,
    id: raceFields.id || generateId('r'),
    number: tournament.races.length + 1,
    horses: [],
  };
  tournament.races.push(race);
  tournament.totalRaces = tournament.races.length;
  saveData(data);
  return race;
}

export function updateRace(tournamentId, raceId, fields) {
  const data = getStoredData();
  const tournament = data.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return null;
  const idx = tournament.races.findIndex((r) => r.id === raceId);
  if (idx === -1) return null;
  tournament.races[idx] = { ...tournament.races[idx], ...fields };
  saveData(data);
  return tournament.races[idx];
}

export function deleteRace(tournamentId, raceId) {
  const data = getStoredData();
  const tournament = data.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return;
  tournament.races = tournament.races.filter((r) => r.id !== raceId);
  tournament.totalRaces = tournament.races.length;
  tournament.races.forEach((r, i) => { r.number = i + 1; });
  saveData(data);
}

export function addHorseToRace(tournamentId, raceId, horseFields) {
  const data = getStoredData();
  const tournament = data.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return null;
  const race = tournament.races.find((r) => r.id === raceId);
  if (!race) return null;

  const horse = {
    ...defaultHorseTemplate,
    ...horseFields,
    id: horseFields.id || generateId('h'),
    postPosition: race.horses.length + 1,
  };
  race.horses.push(horse);
  saveData(data);
  return horse;
}

export function updateHorse(tournamentId, raceId, horseId, fields) {
  const data = getStoredData();
  const tournament = data.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return null;
  const race = tournament.races.find((r) => r.id === raceId);
  if (!race) return null;
  const idx = race.horses.findIndex((h) => h.id === horseId);
  if (idx === -1) return null;
  race.horses[idx] = { ...race.horses[idx], ...fields };
  saveData(data);
  return race.horses[idx];
}

export function deleteHorse(tournamentId, raceId, horseId) {
  const data = getStoredData();
  const tournament = data.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return;
  const race = tournament.races.find((r) => r.id === raceId);
  if (!race) return;
  race.horses = race.horses.filter((h) => h.id !== horseId);
  race.horses.forEach((h, i) => { h.postPosition = i + 1; });
  saveData(data);
}

export function importTournamentData(jsonData) {
  try {
    const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    const data = getStoredData();

    if (Array.isArray(parsed)) {
      parsed.forEach((t) => {
        const existing = data.tournaments.findIndex((e) => e.id === t.id);
        if (existing >= 0) data.tournaments[existing] = t;
        else data.tournaments.push(t);
      });
    } else if (parsed.id) {
      const existing = data.tournaments.findIndex((e) => e.id === parsed.id);
      if (existing >= 0) data.tournaments[existing] = parsed;
      else data.tournaments.push(parsed);
    }

    saveData(data);
    return { success: true, count: Array.isArray(parsed) ? parsed.length : 1 };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function exportDataAsJson() {
  const data = getStoredData();
  return JSON.stringify(data.tournaments, null, 2);
}

export { defaultTournamentTemplate, defaultRaceTemplate, defaultHorseTemplate };
