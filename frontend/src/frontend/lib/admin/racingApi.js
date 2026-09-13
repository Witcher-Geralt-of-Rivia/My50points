// Racing API Service - Fetches real horse racing data from public sources
// Primary: The Racing API (theracingapi.com) - Free tier covers racecards
// Fallback: RapidAPI Horse Racing endpoints
// Final fallback: Local admin-managed data

const DATA_SOURCES = {
  RACING_API: 'racing_api',
  RAPID_API: 'rapid_api',
  MANUAL: 'manual',
};

const RACING_API_BASE = 'https://api.theracingapi.com/v1';

const US_TRACKS = {
  'gulfstream-park': { name: 'Gulfstream Park', location: 'Hallandale Beach, FL', region: 'na' },
  'santa-anita': { name: 'Santa Anita Park', location: 'Arcadia, CA', region: 'na' },
  'churchill-downs': { name: 'Churchill Downs', location: 'Louisville, KY', region: 'na' },
  'belmont-park': { name: 'Belmont Park', location: 'Elmont, NY', region: 'na' },
  'saratoga': { name: 'Saratoga Race Course', location: 'Saratoga Springs, NY', region: 'na' },
  'keeneland': { name: 'Keeneland', location: 'Lexington, KY', region: 'na' },
  'del-mar': { name: 'Del Mar', location: 'Del Mar, CA', region: 'na' },
  'aqueduct': { name: 'Aqueduct Racetrack', location: 'Jamaica, NY', region: 'na' },
};

function normalizeRaceData(apiRace, source) {
  if (source === DATA_SOURCES.RACING_API) {
    return {
      id: apiRace.race_id || `api-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      number: apiRace.off_dt ? parseInt(apiRace.race_name?.match(/Race (\d+)/)?.[1] || '1') : 1,
      name: apiRace.race_name || 'Unknown Race',
      class: apiRace.race_class || 'Open',
      distance: apiRace.distance_f ? Math.round(parseFloat(apiRace.distance_f) * 201.168) : 1600,
      surface: apiRace.going || 'Dirt',
      purse: apiRace.prize ? parseInt(apiRace.prize.replace(/[^0-9]/g, '')) : 0,
      postTime: apiRace.off_dt || 'TBD',
      status: 'upcoming',
      horses: (apiRace.runners || []).map((runner, idx) => ({
        id: runner.horse_id || `h-${idx}`,
        postPosition: runner.draw || idx + 1,
        name: runner.horse || `Horse ${idx + 1}`,
        jockey: runner.jockey || 'Unknown',
        trainer: runner.trainer || 'Unknown',
        weight: runner.lbs ? Math.round(runner.lbs * 0.453592) : 56,
        odds: runner.odds ? parseFloat(runner.odds) : 5.0,
        silkColors: {
          primary: runner.silk_url ? '#7c3aed' : getDefaultColor(idx, 'primary'),
          secondary: runner.silk_url ? '#06b6d4' : getDefaultColor(idx, 'secondary'),
        },
      })),
    };
  }
  return apiRace;
}

const defaultColors = [
  { primary: '#e11d48', secondary: '#fbbf24' },
  { primary: '#2563eb', secondary: '#ffffff' },
  { primary: '#16a34a', secondary: '#000000' },
  { primary: '#7c3aed', secondary: '#f59e0b' },
  { primary: '#dc2626', secondary: '#1d4ed8' },
  { primary: '#0891b2', secondary: '#fde047' },
  { primary: '#ea580c', secondary: '#1e293b' },
  { primary: '#4f46e5', secondary: '#f43f5e' },
  { primary: '#059669', secondary: '#fbbf24' },
  { primary: '#be185d', secondary: '#e2e8f0' },
  { primary: '#d97706', secondary: '#1e3a5f' },
  { primary: '#7c3aed', secondary: '#06b6d4' },
];

function getDefaultColor(idx, type) {
  return defaultColors[idx % defaultColors.length][type];
}

export async function fetchRacesFromApi(trackId, date, apiKey) {
  if (!apiKey) return { success: false, error: 'No API key configured', source: DATA_SOURCES.MANUAL };

  try {
    const response = await fetch(`${RACING_API_BASE}/racecards?course=${trackId}&date=${date}`, {
      headers: { Authorization: `Basic ${btoa(apiKey + ':')}` },
    });

    if (!response.ok) {
      return { success: false, error: `API returned ${response.status}`, source: DATA_SOURCES.RACING_API };
    }

    const data = await response.json();
    const races = (data.racecards || []).map((race) => normalizeRaceData(race, DATA_SOURCES.RACING_API));

    return { success: true, races, source: DATA_SOURCES.RACING_API, trackInfo: US_TRACKS[trackId] };
  } catch (err) {
    return { success: false, error: err.message, source: DATA_SOURCES.RACING_API };
  }
}

export function getAvailableTracks() {
  return Object.entries(US_TRACKS).map(([id, info]) => ({ id, ...info }));
}

export function validateDataSource(races) {
  if (!Array.isArray(races) || races.length === 0) return { valid: false, issues: ['No races found'] };

  const issues = [];
  races.forEach((race, idx) => {
    if (!race.name) issues.push(`Race ${idx + 1}: missing name`);
    if (!race.horses || race.horses.length === 0) issues.push(`Race ${idx + 1}: no horses`);
    if (race.horses) {
      race.horses.forEach((h, hi) => {
        if (!h.name) issues.push(`Race ${idx + 1}, Horse ${hi + 1}: missing name`);
        if (!h.jockey) issues.push(`Race ${idx + 1}, Horse ${hi + 1}: missing jockey`);
        if (typeof h.odds !== 'number' || h.odds <= 0) issues.push(`Race ${idx + 1}, Horse ${hi + 1}: invalid odds`);
      });
    }
  });

  return { valid: issues.length === 0, issues, raceCount: races.length, horseCount: races.reduce((s, r) => s + (r.horses?.length || 0), 0) };
}

export { DATA_SOURCES, US_TRACKS };
