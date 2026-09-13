// 50POINTS - Race & Tournament Mock Data
// Realistic horse racing data for Gulfstream Park, Santa Anita, and Churchill Downs

const silkColors = [
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

const horseNames = [
  'Thunder Strike', 'Golden Spirit', 'Midnight Runner', 'Silver Blaze',
  'Iron Warrior', 'Royal Command', 'Storm Chaser', 'Dark Phantom',
  'Blazing Star', 'Noble Quest', 'Wild Fortune', 'Diamond Edge',
  'Crimson Bolt', 'Shadow Dance', 'Lucky Phoenix', 'Brave Heart',
  'Regal Prince', 'Fast Legend', 'Sea Whisper', 'Titan Force',
  'Velvet Storm', 'Crystal Arrow', 'Scarlet Fury', 'Emerald Dream',
  'Alpine Thunder', 'Desert Wind', 'Cosmic Flare', 'Neptune Rising',
  'Falcon Ridge', 'Amber Blaze', 'Pacific Tide', 'Victory Lane',
  'Rebel Spirit', 'Onyx Knight', 'Sapphire Sky', 'Burning Desire',
  'Phantom Rider', 'Crown Jewel', 'Steel Tempest', 'River Stone',
  'Quantum Leap', 'Night Fury', 'Golden Compass', 'Crimson Tide',
  'Silent Arrow', 'Thunderbolt', 'Stellar Drift', 'Wild Horizon',
  'Iron Crown', 'Blazing Trail', 'Dark Sovereign', 'Royal Anthem',
  'Storm Legacy', 'Silver Phantom', 'Diamond Rush', 'Noble Flame',
  'Scarlet Runner', 'Emerald Knight', 'Desert Storm', 'Lightning Bolt',
  'Brave Venture', 'Midnight Gold', 'Regal Storm', 'Wild Card',
  'Crystal Reign', 'Cosmic Thunder', 'Alpine Spirit', 'Falcon Blaze',
  'Pacific Dream', 'Amber Storm', 'Victory Bound', 'Steel Heart',
  'Shadow Reign', 'Night Rider', 'Golden Arrow', 'Thunder Peak',
  'Crimson Star', 'Neptune Force', 'Rebel Crown', 'Silent Storm',
  'Onyx Dream', 'Sapphire Blaze', 'Iron Legend', 'Burning Star',
  'Phantom Gold', 'Crown Royal', 'Steel Phoenix', 'River Gold',
  'Quantum Storm', 'Night Crown', 'Golden Reign', 'Dark Arrow',
  'Wild Spirit', 'Lightning Storm', 'Noble Knight', 'Blazing Arrow',
];

const jockeyNames = [
  'Luis Saez', 'Irad Ortiz Jr', 'Joel Rosario', 'Flavien Prat',
  'John Velazquez', 'Tyler Gaffalione', 'Jose Ortiz', 'Mike Smith',
  'Javier Castellano', 'Florent Geroux', 'Ricardo Santana Jr', 'Manny Franco',
  'Junior Alvarado', 'Jose Lezcano', 'Paco Lopez', 'Angel Cruz',
  'Dylan Davis', 'Brian Hernandez Jr', 'Corey Lanerie', 'Julien Leparoux',
  'Umberto Rispoli', 'Drayden Van Dyke', 'Abel Cedillo', 'Edwin Maldonado',
];

const trainerNames = [
  'Todd Pletcher', 'Bob Baffert', 'Chad Brown', 'Steve Asmussen',
  'Brad Cox', 'Bill Mott', 'Mark Casse', 'Christophe Clement',
  'Shug McGaughey', 'Dallas Stewart', 'Mike Maker', 'Jack Sisterson',
  'Jorge Navarro', 'Dale Romans', 'Ian Wilkes', 'John Sadler',
  'Doug O\'Neill', 'Peter Miller', 'Richard Mandella', 'Jerry Hollendorfer',
];

function generateOdds() {
  const ranges = [
    { min: 1.5, max: 3.0, weight: 15 },
    { min: 3.0, max: 6.0, weight: 30 },
    { min: 6.0, max: 12.0, weight: 30 },
    { min: 12.0, max: 25.0, weight: 25 },
  ];
  const total = ranges.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;
  for (const range of ranges) {
    rand -= range.weight;
    if (rand <= 0) {
      return parseFloat((range.min + Math.random() * (range.max - range.min)).toFixed(2));
    }
  }
  return 5.0;
}

function generateWeight() {
  return 54 + Math.floor(Math.random() * 8);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateHorsesForRace(count, raceIndex, tournamentIndex) {
  const offset = (tournamentIndex * 80 + raceIndex * 12) % horseNames.length;
  const horses = [];
  const usedNames = new Set();
  const usedJockeys = new Set();

  for (let i = 0; i < count; i++) {
    let nameIdx = (offset + i) % horseNames.length;
    while (usedNames.has(horseNames[nameIdx])) {
      nameIdx = (nameIdx + 1) % horseNames.length;
    }
    usedNames.add(horseNames[nameIdx]);

    let jockeyIdx = (offset + i * 3) % jockeyNames.length;
    while (usedJockeys.has(jockeyNames[jockeyIdx])) {
      jockeyIdx = (jockeyIdx + 1) % jockeyNames.length;
    }
    usedJockeys.add(jockeyNames[jockeyIdx]);

    horses.push({
      id: `h-${tournamentIndex}-${raceIndex}-${i}`,
      postPosition: i + 1,
      name: horseNames[nameIdx],
      jockey: jockeyNames[jockeyIdx],
      trainer: pickRandom(trainerNames),
      weight: generateWeight(),
      odds: generateOdds(),
      silkColors: silkColors[i % silkColors.length],
    });
  }
  return horses;
}

const distances = [1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
const surfaces = ['Dirt', 'Turf', 'Synthetic'];
const raceClasses = [
  'Maiden Special Weight',
  'Claiming $25,000',
  'Allowance Optional Claiming',
  'Graded Stakes III',
  'Graded Stakes II',
  'Graded Stakes I',
  'Claiming $50,000',
  'Allowance',
];

function generateRaces(tournamentIndex) {
  const races = [];
  const tournamentStart = 3;
  for (let i = 0; i < 10; i++) {
    const horseCount = 8 + Math.floor(Math.random() * 5);
    const distance = distances[i % distances.length];
    const surface = i < 5 ? surfaces[i % 2] : pickRandom(surfaces);
    const purse = [15000, 20000, 25000, 50000, 75000, 100000, 150000, 200000, 300000, 500000][i];
    const hour = 12 + Math.floor(i / 2);
    const minute = (i % 2) * 30;

    races.push({
      id: `race-${tournamentIndex}-${i}`,
      number: i + 1,
      name: i === 9
        ? ['Gulfstream Park Handicap', 'Santa Anita Derby', 'Kentucky Derby Prep'][tournamentIndex]
        : `Race ${i + 1}`,
      class: raceClasses[i % raceClasses.length],
      distance,
      surface,
      purse,
      postTime: `${hour}:${minute.toString().padStart(2, '0')} ET`,
      status: i < tournamentStart ? 'completed' : i === tournamentStart ? 'live' : 'upcoming',
      tournamentRace: i >= tournamentStart,
      horses: generateHorsesForRace(horseCount, i, tournamentIndex),
    });
  }
  return races;
}

export const tournaments = [
  {
    id: 'gulfstream-park-2026',
    name: 'Gulfstream Park Championship',
    track: 'Gulfstream Park',
    location: 'Hallandale Beach, FL',
    date: '2026-05-24',
    status: 'live',
    totalPlayers: 1247,
    playersJoined: 892,
    prizePool: 50000,
    entryFee: 50,
    racesCompleted: 3,
    totalRaces: 10,
    description: 'El evento de carreras mas importante del sur de Florida con los mejores pura sangre compitiendo en 8 emocionantes carreras.',
    races: generateRaces(0),
  },
  {
    id: 'santa-anita-spring-2026',
    name: 'Santa Anita Spring Classic',
    track: 'Santa Anita Park',
    location: 'Arcadia, CA',
    date: '2026-05-25',
    status: 'upcoming',
    totalPlayers: 2000,
    playersJoined: 1456,
    prizePool: 75000,
    entryFee: 75,
    racesCompleted: 0,
    totalRaces: 10,
    description: 'Vive las carreras de clase mundial en el gran hipodromo con impresionantes vistas a las montanas de San Gabriel.',
    races: generateRaces(1),
  },
  {
    id: 'churchill-downs-classic-2026',
    name: 'Churchill Downs Classic',
    track: 'Churchill Downs',
    location: 'Louisville, KY',
    date: '2026-05-31',
    status: 'upcoming',
    totalPlayers: 3000,
    playersJoined: 2103,
    prizePool: 100000,
    entryFee: 100,
    racesCompleted: 0,
    totalRaces: 10,
    description: 'Serie preparatoria para las Rosas en el historico hogar del Kentucky Derby.',
    races: generateRaces(2),
  },
];

export function getTournamentById(id) {
  return tournaments.find((t) => t.id === id) || null;
}

export function getRaceById(tournamentId, raceId) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) return null;
  return tournament.races.find((r) => r.id === raceId) || null;
}

export function getTournamentRaces(tournamentId) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) return [];
  return tournament.races;
}
