// 50POINTS - Ranking & Leaderboard Mock Data

const playerAvatars = [
  '🐎', '🏇', '🎯', '⚡', '🔥', '💎', '🦅', '🐆', '🌟', '🎭',
  '🏆', '👑', '🦁', '🐉', '🎪', '🗡️', '🛡️', '🎲', '🧿', '💫',
];

const playerNames = [
  'El Caballero', 'TurfMaster_BR', 'Jinete_Oscuro', 'RelámpagoVerde',
  'FullPoint_King', 'SmartPick_Pro', 'DualForce_99', 'Storm_Rider',
  'Golden_Track', 'HipódromoVIP', 'Pura_Sangre_X', 'Turf_Legend',
  'Speed_Demon', 'Lucky_Strike', 'Dark_Horse_BR', 'Royal_Bet',
  'Thunder_Run', 'Iron_Jockey', 'Phantom_Rider', 'Crown_Chaser',
  'Blaze_Runner', 'Night_Gallop', 'Silver_Whip', 'Diamond_Derby',
  'Rapid_Fire', 'Steel_Hooves', 'Mystic_Track', 'Victory_Lane',
  'Shadow_Bolt', 'Emerald_Run',
];

const strategies = ['full', 'dual', 'smart'];
const strategyLabels = { full: 'Full Point', dual: 'Dual Point', smart: 'Smart Pick' };
const strategyColors = {
  full: { dot: 'bg-purple', text: 'text-purple-light', border: 'border-purple' },
  dual: { dot: 'bg-cyan', text: 'text-cyan', border: 'border-cyan' },
  smart: { dot: 'bg-gold', text: 'text-gold', border: 'border-gold' },
};

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generatePlayers(count, seed = 42) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const r = seededRandom(seed + i * 7);
    const strategy = strategies[Math.floor(seededRandom(seed + i * 13) * 3)];
    const baseScore = Math.floor(4500 - i * 80 + seededRandom(seed + i * 3) * 200 - 100);
    const posChange = Math.floor(seededRandom(seed + i * 17) * 10) - 3;
    const ticketsUsed = 1 + Math.floor(seededRandom(seed + i * 23) * 3);

    players.push({
      id: `player-${i}`,
      position: i + 1,
      name: playerNames[i % playerNames.length] + (i >= playerNames.length ? `_${Math.floor(i / playerNames.length)}` : ''),
      avatar: playerAvatars[i % playerAvatars.length],
      score: Math.max(100, baseScore),
      strategy,
      strategyLabel: strategyLabels[strategy],
      posChange,
      isHot: i < 3 || (posChange >= 5),
      ticketsUsed,
      bestTicket: ticketsUsed > 1 ? Math.ceil(seededRandom(seed + i * 31) * ticketsUsed) : 1,
      racesConfirmed: 5 + Math.floor(seededRandom(seed + i * 37) * 3),
      mode: seededRandom(seed + i * 41) > 0.7 ? 'premium' : 'free',
    });
  }
  return players.sort((a, b) => b.score - a.score).map((p, i) => ({ ...p, position: i + 1 }));
}

function generateRecords(players, strategyFilter) {
  const filtered = strategyFilter
    ? players.filter(p => p.strategy === strategyFilter)
    : players;
  return filtered.slice(0, 3).map((p, i) => ({
    ...p,
    recordPosition: i + 1,
  }));
}

function generateUserTickets(seed = 99) {
  return [1, 2, 3].map(ticketNum => {
    const r = seededRandom(seed + ticketNum * 11);
    const strategy = strategies[Math.floor(seededRandom(seed + ticketNum * 7) * 3)];
    const position = 5 + Math.floor(r * 40);
    const score = Math.floor(3000 - position * 50 + seededRandom(seed + ticketNum * 19) * 300);
    const posChange = Math.floor(seededRandom(seed + ticketNum * 23) * 15) - 4;

    return {
      ticketNum,
      position,
      score: Math.max(200, score),
      strategy,
      strategyLabel: strategyLabels[strategy],
      posChange,
      racesConfirmed: 5 + Math.floor(seededRandom(seed + ticketNum * 29) * 3),
      totalRaces: 7,
      isHot: posChange >= 5,
      nearTop10: position <= 15 && position > 10,
    };
  });
}

export function getRankingData(tournamentId) {
  const seed = tournamentId ? tournamentId.length * 7 : 42;
  const players = generatePlayers(30, seed);

  return {
    players,
    allTimeRecords: generateRecords(players),
    dualPointRecords: generateRecords(players, 'dual'),
    smartPickRecords: generateRecords(players, 'smart'),
    fullPointRecords: generateRecords(players, 'full'),
    userTickets: generateUserTickets(seed),
    hotPlayer: players.reduce((best, p) => p.posChange > best.posChange ? p : best, players[0]),
    totalParticipants: players.length,
  };
}

export { strategyColors, strategyLabels };
