/**
 * Realistic Cricket Match Simulation Engine
 * Driven by authentic individual player statistics, discrete probability math,
 * and deterministic seed reproducibility.
 * Supports T20 and ODI formats, genuine cricket extras (wides, no-balls, leg-byes, byes),
 * Fall of Wickets (FoW), Partnerships, and statistical Player of the Match algorithms.
 */

import { calculateT20Rating, calculatePreMatchWinProbability } from './rating.js';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * 32-bit FNV-1a Hash function for string seeds
 */
export function hashStringToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic Mulberry32 Pseudo-Random Number Generator (PRNG)
 * Guarantees 100% reproducible ball-by-ball matches for any given seed.
 */
export function createPRNG(seed) {
  let s;
  if (typeof seed === 'number' && !isNaN(seed)) {
    s = (seed >>> 0) || 1337;
  } else if (typeof seed === 'string') {
    s = hashStringToSeed(seed);
  } else {
    s = Math.floor(Math.random() * 0xFFFFFFF);
  }
  return function rand() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Format Specifications for T20 and ODI cricket
 */
export const FORMAT_CONFIGS = {
  T20: {
    format: 'T20',
    name: 'Twenty20',
    maxOvers: 20,
    maxOversPerBowler: 4,
    powerplayOvers: 6,
    middleOvers: 15,
    deathOvers: 20,
    baseRunRate: 8.4,
    baseWicketProb: 0.046,
    baseDotProb: 0.35,
    phases: {
      powerplay: { runMult: 1.14, wktMult: 0.88 },
      middle: { runMult: 0.94, wktMult: 0.98 },
      death: { runMult: 1.36, wktMult: 1.44 }
    }
  },
  ODI: {
    format: 'ODI',
    name: 'One Day International',
    maxOvers: 50,
    maxOversPerBowler: 10,
    powerplayOvers: 10,
    middleOvers: 40,
    deathOvers: 50,
    baseRunRate: 5.6,
    baseWicketProb: 0.032,
    baseDotProb: 0.48,
    phases: {
      powerplay: { runMult: 0.96, wktMult: 0.84 },
      middle: { runMult: 0.92, wktMult: 0.92 },
      death: { runMult: 1.32, wktMult: 1.50 }
    }
  }
};

/**
 * Realistic Pitch Conditions affecting Pace, Spin, and Batting
 */
export const PITCH_TYPES = [
  {
    type: 'Balanced',
    description: 'Even contest between bat and ball with steady bounce and pace.',
    paceWktMod: 1.0,
    spinWktMod: 1.0,
    runMod: 1.0,
    dotMod: 1.0
  },
  {
    type: 'Batting Paradise',
    description: 'Flat, hard track with true bounce. High-scoring affair expected.',
    paceWktMod: 0.85,
    spinWktMod: 0.88,
    runMod: 1.12,
    dotMod: 0.88
  },
  {
    type: 'Bowling Greentop',
    description: 'Moisture and grass coverage assisting fast bowlers early on.',
    paceWktMod: 1.25,
    spinWktMod: 0.90,
    runMod: 0.90,
    dotMod: 1.14
  },
  {
    type: 'Spinning Track',
    description: 'Dry surface offering grip, turn, and variable bounce for spinners.',
    paceWktMod: 0.90,
    spinWktMod: 1.28,
    runMod: 0.91,
    dotMod: 1.12
  },
  {
    type: 'Pace & Bounce',
    description: 'Fast track with extra carry and steep bounce for pacers.',
    paceWktMod: 1.18,
    spinWktMod: 0.92,
    runMod: 1.02,
    dotMod: 1.05
  }
];

// Select best bowling lineup (up to 5 bowlers, each assigned an over quota)
export function pickBowlers(playingXI = [], formatConfig = FORMAT_CONFIGS.T20) {
  const maxQuota = formatConfig.maxOversPerBowler || 4;
  const eligible = (playingXI || []).map((p, idx) => {
    let bowlScore = 0;
    const cat = (p.category || '').toLowerCase();
    const role = (p.role || '').toLowerCase();

    if (cat === 'pacer' || cat === 'spinner' || role.includes('bowler')) {
      bowlScore = 100;
    } else if (cat === 'allrounder' || role.includes('all-rounder')) {
      bowlScore = 75;
    } else if (p.bowlingStyle) {
      bowlScore = 40;
    }

    const iplEcon = p.iplStats?.econ || p.stats?.iplEcon || p.stats?.econ || 8.5;
    const intlEcon = p.intlStats?.econ || p.stats?.intlEcon || p.stats?.econ || 8.5;
    const effEcon = p.intlStats?.matches > 0 ? (iplEcon * 0.55 + intlEcon * 0.45) : iplEcon;
    const econBonus = Math.max(0, 10.0 - effEcon) * 6;
    const totalWkts = p.stats?.wkts || ((p.iplStats?.wkts || 0) + (p.intlStats?.wkts || 0));
    const wktBonus = Math.min(30, totalWkts * 0.18);
    const intlBonus = p.intlStats?.wkts ? Math.min(10, p.intlStats.wkts * 0.15) : 0;

    return {
      player: p,
      index: idx,
      score: bowlScore + econBonus + wktBonus + intlBonus + (p.rating || 80) * 0.2
    };
  });

  eligible.sort((a, b) => b.score - a.score);
  // Pick top 5 bowlers (at least 5 bowlers required for full quota)
  const chosen = eligible.slice(0, Math.min(eligible.length, 5)).map(e => e.player);
  if (chosen.length === 0 && playingXI.length > 0) {
    return playingXI.slice(Math.max(0, playingXI.length - 5));
  }
  return chosen;
}

// Authentic reserve players pool with verified domestic & capped cricketers
export const REAL_RESERVE_POOL = [
  { name: 'Abhimanyu Easwaran', role: 'Batter', category: 'batter', stats: { sr: 132.5, runs: 1240, avg: 34.2, matches: 42, iplSr: 130, intlSr: 135 }, rating: 82 },
  { name: 'Priyam Garg', role: 'Batter', category: 'batter', stats: { sr: 136.0, runs: 850, avg: 26.5, matches: 38, iplSr: 134, intlSr: 138 }, rating: 81 },
  { name: 'Sheldon Jackson', role: 'WK-Batter', category: 'wicketkeeper', stats: { sr: 139.4, runs: 1420, avg: 31.0, matches: 54, iplSr: 138, intlSr: 140 }, rating: 83 },
  { name: 'Baba Indrajith', role: 'Batter', category: 'batter', stats: { sr: 128.0, runs: 980, avg: 30.5, matches: 36, iplSr: 126, intlSr: 130 }, rating: 80 },
  { name: 'Rishi Dhawan', role: 'All-Rounder', category: 'allrounder', stats: { sr: 125.0, runs: 750, wkts: 52, econ: 7.95, matches: 62, iplSr: 124, iplEcon: 8.0 }, rating: 82 },
  { name: 'Jalaj Saxena', role: 'All-Rounder', category: 'allrounder', stats: { sr: 120.0, runs: 680, wkts: 68, econ: 7.20, matches: 58, iplSr: 118, iplEcon: 7.3 }, rating: 83 },
  { name: 'Sandeep Warrier', role: 'Bowler', category: 'pacer', stats: { econ: 7.80, wkts: 48, matches: 45, iplEcon: 7.9, intlEcon: 7.7 }, rating: 82 },
  { name: 'Basil Thampi', role: 'Bowler', category: 'pacer', stats: { econ: 8.60, wkts: 42, matches: 40, iplEcon: 8.7, intlEcon: 8.5 }, rating: 80 },
  { name: 'Shivalik Sharma', role: 'Batter', category: 'batter', stats: { sr: 130.0, runs: 520, matches: 22, iplSr: 128, intlSr: 132 }, rating: 79 },
  { name: 'Manav Suthar', role: 'Bowler', category: 'spinner', stats: { econ: 7.10, wkts: 28, matches: 20, iplEcon: 7.2, intlEcon: 7.0 }, rating: 81 },
  { name: 'Vyshak Vijaykumar', role: 'Bowler', category: 'pacer', stats: { econ: 8.20, wkts: 34, matches: 25, iplEcon: 8.3, intlEcon: 8.1 }, rating: 82 },
  { name: 'Yash Dayal', role: 'Bowler', category: 'pacer', stats: { econ: 8.10, wkts: 38, matches: 30, iplEcon: 8.2, intlEcon: 8.0 }, rating: 84 },
  { name: 'Harpreet Brar', role: 'All-Rounder', category: 'allrounder', stats: { sr: 128.0, runs: 420, wkts: 36, econ: 7.45, matches: 38, iplSr: 125, iplEcon: 7.5 }, rating: 83 },
  { name: 'Mohsin Khan', role: 'Bowler', category: 'pacer', stats: { econ: 7.60, wkts: 32, matches: 24, iplEcon: 7.7, intlEcon: 7.5 }, rating: 83 },
  { name: 'Ashutosh Sharma', role: 'Batter', category: 'batter', stats: { sr: 165.0, runs: 480, avg: 32.0, matches: 20, iplSr: 168, intlSr: 160 }, rating: 85 },
  { name: 'Angkrish Raghuvanshi', role: 'Batter', category: 'batter', stats: { sr: 142.0, runs: 510, avg: 28.5, matches: 22, iplSr: 140, intlSr: 144 }, rating: 82 },
  { name: 'Anuj Rawat', role: 'WK-Batter', category: 'wicketkeeper', stats: { sr: 134.0, runs: 650, avg: 25.0, matches: 32, iplSr: 132, intlSr: 136 }, rating: 81 },
  { name: 'Kumar Kushagra', role: 'WK-Batter', category: 'wicketkeeper', stats: { sr: 138.0, runs: 440, avg: 27.5, matches: 18, iplSr: 135, intlSr: 140 }, rating: 80 },
  { name: 'Nehal Wadhera', role: 'Batter', category: 'batter', stats: { sr: 145.0, runs: 580, avg: 31.0, matches: 26, iplSr: 148, intlSr: 142 }, rating: 83 },
  { name: 'Sameer Rizvi', role: 'Batter', category: 'batter', stats: { sr: 148.0, runs: 490, avg: 29.0, matches: 21, iplSr: 150, intlSr: 145 }, rating: 82 },
  { name: 'Ramandeep Singh', role: 'All-Rounder', category: 'allrounder', stats: { sr: 155.0, runs: 520, wkts: 22, econ: 8.40, matches: 28, iplSr: 158, iplEcon: 8.5 }, rating: 84 },
  { name: 'Rasikh Salam', role: 'Bowler', category: 'pacer', stats: { econ: 8.35, wkts: 29, matches: 22, iplEcon: 8.4, intlEcon: 8.3 }, rating: 81 },
  { name: 'Akash Madhwal', role: 'Bowler', category: 'pacer', stats: { econ: 8.40, wkts: 35, matches: 25, iplEcon: 8.5, intlEcon: 8.2 }, rating: 82 },
  { name: 'Suyash Sharma', role: 'Bowler', category: 'spinner', stats: { econ: 7.75, wkts: 31, matches: 24, iplEcon: 7.8, intlEcon: 7.7 }, rating: 82 },
  { name: 'Kartik Tyagi', role: 'Bowler', category: 'pacer', stats: { econ: 8.70, wkts: 30, matches: 26, iplEcon: 8.8, intlEcon: 8.6 }, rating: 81 }
];

export function fillXI(xi, team) {
  const list = Array.isArray(xi) && xi.length > 0 ? [...xi] : [];
  const existingNames = new Set(list.map(p => p.name));

  // 1. Pull unused real players from team's squad first
  if (team?.squad && Array.isArray(team.squad)) {
    for (const sqPlayer of team.squad) {
      if (list.length >= 11) break;
      if (!existingNames.has(sqPlayer.name)) {
        list.push(sqPlayer);
        existingNames.add(sqPlayer.name);
      }
    }
  }

  // 2. Backfill with authentic named cricketers if still under 11
  let poolIdx = 0;
  while (list.length < 11) {
    const reserve = REAL_RESERVE_POOL[poolIdx % REAL_RESERVE_POOL.length];
    poolIdx++;
    if (!existingNames.has(reserve.name)) {
      list.push({
        id: `res-${reserve.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...reserve
      });
      existingNames.add(reserve.name);
    }
  }
  return list;
}

/**
 * Format total balls into overs notation (e.g. 14 legal balls = 2.2 overs)
 */
function formatOvers(legalBalls) {
  const fullOvers = Math.floor(legalBalls / 6);
  const remBalls = legalBalls % 6;
  return parseFloat(`${fullOvers}.${remBalls}`);
}

/**
 * Normalizes player attributes to remove volume bias while preserving verified statistics
 */
export function normalizePlayerAttributes(player, format = 'T20') {
  const isODI = format === 'ODI';
  const role = player.role || 'Batter';
  const cat = (player.category || '').toLowerCase();
  const rObj = calculateT20Rating(player);

  const hasVerified = Boolean(
    (player.iplStats && player.iplStats.matches > 0) ||
    (player.intlStats && player.intlStats.matches > 0) ||
    (player.stats && player.stats.matches > 0)
  );

  const ipl = player.iplStats || {};
  const intl = player.intlStats || {};
  const stats = player.stats || {};

  // Batting Strike Rate and Average
  const baseT20Sr = ipl.sr || intl.sr || stats.sr || 132.0;
  const effSr = isODI ? clamp(baseT20Sr * 0.68, 70, 115) : clamp(baseT20Sr, 105, 185);
  const effAvg = stats.avg || intl.avg || (stats.runs && stats.matches ? stats.runs / stats.matches : 28.0);

  // Bowling Economy and Style
  const baseT20Econ = ipl.econ || intl.econ || stats.econ || 8.2;
  const effEcon = isODI ? clamp(baseT20Econ * 0.65, 4.2, 6.8) : clamp(baseT20Econ, 6.2, 10.5);

  const isSpinner = cat === 'spinner' || (player.bowlingType || '').toLowerCase().includes('spin') || (player.bowlingStyle || '').toLowerCase().includes('spin');
  const isPacer = cat === 'pacer' || (player.bowlingType || '').toLowerCase().includes('pace') || (player.bowlingStyle || '').toLowerCase().includes('fast') || (player.bowlingStyle || '').toLowerCase().includes('medium');

  return {
    name: player.name,
    role,
    category: cat,
    rating: rObj.overall,
    ratingLabel: rObj.label,
    hasVerifiedStats: hasVerified,
    isEstimated: !hasVerified,
    strikeRate: effSr,
    average: effAvg,
    economy: effEcon,
    isSpinner,
    isPacer,
    bowlingStyle: player.bowlingStyle || (isSpinner ? 'Right-arm Offbreak' : 'Right-arm Fast-Medium')
  };
}

/**
 * Simulate a single innings (T20 or ODI) with full ball-by-ball mechanics,
 * authentic extras, fall of wickets, partnerships, and mathematical integrity.
 */
export function simulateInnings({
  battingTeam,
  bowlingTeam,
  battingXI = [],
  bowlingXI = [],
  target = null,
  isChase = false,
  format = 'T20',
  pitch = PITCH_TYPES[0],
  prng = Math.random
}) {
  const formatConfig = FORMAT_CONFIGS[format] || FORMAT_CONFIGS.T20;
  const maxOvers = formatConfig.maxOvers;
  const maxOversPerBowler = formatConfig.maxOversPerBowler;
  const totalMaxBalls = maxOvers * 6;

  const battingLineup = fillXI(battingXI, battingTeam);
  const bowlingLineup = fillXI(bowlingXI, bowlingTeam);

  // Setup Bowlers
  const bowlers = pickBowlers(bowlingLineup, formatConfig);
  const bowlerStatsMap = new Map();

  bowlers.forEach(b => {
    const norm = normalizePlayerAttributes(b, format);
    bowlerStatsMap.set(b.id || b.name, {
      player: b,
      name: b.name,
      rating: norm.rating,
      ratingLabel: norm.ratingLabel,
      isSpinner: norm.isSpinner,
      isPacer: norm.isPacer,
      economyRateTarget: norm.economy,
      legalBalls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
      dots: 0
    });
  });

  // Setup Batters
  const batterStats = battingLineup.map(p => {
    const norm = normalizePlayerAttributes(p, format);
    return {
      player: p,
      name: p.name,
      rating: norm.rating,
      ratingLabel: norm.ratingLabel,
      strikeRateTarget: norm.strikeRate,
      averageTarget: norm.average,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      sr: 0,
      isOut: false,
      notOut: true,
      dismissal: 'not out'
    };
  });

  // Extras Breakdown
  const extras = {
    total: 0,
    byes: 0,
    legByes: 0,
    wides: 0,
    noBalls: 0
  };

  const fallOfWickets = [];
  const partnerships = [];

  let currentStrikerIdx = 0;
  let currentNonStrikerIdx = 1;
  let nextBatterIdx = 2;

  let totalRuns = 0;
  let totalWickets = 0;
  let legalBallsBowled = 0;

  let currentPartnershipRuns = 0;
  let currentPartnershipBalls = 0;

  // Bowler quota tracker (overs bowled per bowler)
  const bowlerQuota = new Map();
  bowlers.forEach(b => bowlerQuota.set(b.id || b.name, 0));
  let lastBowlerId = null;

  // Track Free Hit status from preceding no-ball
  let isFreeHit = false;

  // Over-by-Over Simulation Loop
  for (let over = 0; over < maxOvers; over++) {
    if (totalWickets >= 10 || legalBallsBowled >= totalMaxBalls) break;
    if (isChase && target !== null && totalRuns >= target) break;

    // Pick bowler for this over (cannot bowl consecutive overs, quota capped)
    const availableBowlers = bowlers.filter(b => {
      const bId = b.id || b.name;
      const bowled = bowlerQuota.get(bId) || 0;
      return bId !== lastBowlerId && bowled < maxOversPerBowler;
    });

    const activeBowler = (availableBowlers.length > 0)
      ? availableBowlers[Math.floor(prng() * availableBowlers.length)]
      : (bowlers.length > 0 ? bowlers[Math.floor(prng() * bowlers.length)] : REAL_RESERVE_POOL[6]);

    const bowlerId = activeBowler.id || activeBowler.name;
    lastBowlerId = bowlerId;
    bowlerQuota.set(bowlerId, (bowlerQuota.get(bowlerId) || 0) + 1);
    const bRecord = bowlerStatsMap.get(bowlerId);

    // Over Phase context: Powerplay, Middle, Death
    let phaseRunMult = 1.0;
    let phaseWktMult = 1.0;
    if (over < formatConfig.powerplayOvers) {
      phaseRunMult = formatConfig.phases.powerplay.runMult;
      phaseWktMult = formatConfig.phases.powerplay.wktMult;
    } else if (over >= formatConfig.middleOvers) {
      phaseRunMult = formatConfig.phases.death.runMult;
      phaseWktMult = formatConfig.phases.death.wktMult;
    } else {
      phaseRunMult = formatConfig.phases.middle.runMult;
      phaseWktMult = formatConfig.phases.middle.wktMult;
    }

    // Required Run Rate pressure in chase
    if (isChase && target !== null) {
      const runsNeeded = target - totalRuns;
      const ballsLeft = totalMaxBalls - legalBallsBowled;
      const rrr = (runsNeeded / Math.max(1, ballsLeft)) * 6;
      const baselineRR = formatConfig.baseRunRate;

      if (rrr > baselineRR + 3.0) {
        phaseRunMult *= 1.25;
        phaseWktMult *= 1.45; // High boundary risk
      } else if (rrr < baselineRR - 2.0) {
        phaseRunMult *= 0.92;
        phaseWktMult *= 0.70; // Controlled cruising
      }
    }

    // Pitch modifier applied to active bowler style
    let pitchWktMod = 1.0;
    if (bRecord.isSpinner) {
      pitchWktMod = pitch.spinWktMod || 1.0;
    } else if (bRecord.isPacer) {
      pitchWktMod = pitch.paceWktMod || 1.0;
    }
    const pitchRunMod = pitch.runMod || 1.0;

    let overRunsOffBowler = 0;
    let legalBallsThisOver = 0;

    // Simulate up to 6 legal balls for this over
    while (legalBallsThisOver < 6) {
      if (totalWickets >= 10 || (isChase && target !== null && totalRuns >= target)) break;

      const striker = batterStats[currentStrikerIdx];
      const nonStriker = batterStats[currentNonStrikerIdx];
      if (!striker) break;

      // Check Extras first: Wide or No-Ball (Non-legal deliveries)
      const wideRoll = prng();
      const nbRoll = prng();

      const pWide = 0.024;
      const pNoBall = 0.007;

      if (wideRoll < pWide) {
        // WIDE BALL: 1 run to team total, 1 run charged to bowler, NOT a legal delivery
        totalRuns += 1;
        overRunsOffBowler += 1;
        bRecord.runs += 1;
        bRecord.wides += 1;
        extras.wides += 1;
        extras.total += 1;
        currentPartnershipRuns += 1;
        continue; // Does not consume a legal ball
      }

      if (nbRoll < pNoBall) {
        // NO BALL: 1 run to team total, 1 run charged to bowler, NOT a legal delivery
        // Awards a FREE HIT on the very next legal delivery
        totalRuns += 1;
        overRunsOffBowler += 1;
        bRecord.runs += 1;
        bRecord.noBalls += 1;
        extras.noBalls += 1;
        extras.total += 1;
        currentPartnershipRuns += 1;
        isFreeHit = true;
        continue; // Does not consume a legal ball
      }

      // --- LEGAL DELIVERY OCCURS ---
      legalBallsThisOver++;
      legalBallsBowled++;
      bRecord.legalBalls++;
      striker.balls++;
      currentPartnershipBalls++;

      // Pure Mathematical Probabilities based on normalized ratings and stats
      const rBat = striker.rating || 82;
      const rBowl = bRecord.rating || 82;
      const ratingDelta = (rBat - rBowl) / 100;

      const bSr = striker.strikeRateTarget || 132.0;
      const bEcon = bRecord.economyRateTarget || 8.2;

      // 1. Wicket Probability (if not Free Hit)
      let pWicket = formatConfig.baseWicketProb *
        (1.0 - ratingDelta * 0.70) *
        (8.4 / Math.max(5.5, bEcon)) *
        phaseWktMult *
        pitchWktMod;
      pWicket = clamp(pWicket, 0.015, 0.14);

      const wicketRoll = prng();
      if (!isFreeHit && wicketRoll < pWicket) {
        // WICKET FALLEN!
        totalWickets++;
        bRecord.wickets++;
        striker.isOut = true;
        striker.notOut = false;

        // Dismissal modes
        const modes = ['c', 'c', 'c', 'b', 'lbw', 'c & b', 'st'];
        const m = modes[Math.floor(prng() * modes.length)];
        const fielder = bowlingLineup[Math.floor(prng() * bowlingLineup.length)]?.name || 'Fielder';

        // Keeper lookup
        const keeper = bowlingLineup.find(p => p.category === 'wicketkeeper' || p.role === 'WK-Batter')?.name || 'Keeper';

        if (m === 'b') {
          striker.dismissal = `b ${bRecord.name}`;
        } else if (m === 'lbw') {
          striker.dismissal = `lbw b ${bRecord.name}`;
        } else if (m === 'c & b') {
          striker.dismissal = `c & b ${bRecord.name}`;
        } else if (m === 'st') {
          striker.dismissal = `st †${keeper} b ${bRecord.name}`;
        } else {
          striker.dismissal = `c ${fielder} b ${bRecord.name}`;
        }

        // Record Fall of Wickets (FoW)
        fallOfWickets.push({
          wicket: totalWickets,
          score: totalRuns,
          overs: formatOvers(legalBallsBowled),
          batter: striker.name,
          partnership: {
            runs: currentPartnershipRuns,
            balls: currentPartnershipBalls,
            batter1: striker.name,
            batter2: nonStriker?.name || 'Partner'
          }
        });

        partnerships.push({
          wicket: totalWickets,
          batter1: striker.name,
          batter2: nonStriker?.name || 'Partner',
          runs: currentPartnershipRuns,
          balls: currentPartnershipBalls
        });

        currentPartnershipRuns = 0;
        currentPartnershipBalls = 0;

        // Next batter walks in
        if (nextBatterIdx < batterStats.length) {
          currentStrikerIdx = nextBatterIdx;
          nextBatterIdx++;
        }
      } else {
        // No wicket: Determine run outcome (or legal byes/leg-byes)
        // Check for Leg-Byes or Byes on legal deliveries (~2.2% combined)
        const byeRoll = prng();
        if (byeRoll < 0.016) {
          // Leg-Bye (1 run, legal delivery, does NOT charge bowler, strike rotates)
          totalRuns += 1;
          extras.legByes += 1;
          extras.total += 1;
          currentPartnershipRuns += 1;
          // Strike rotation on 1 leg-bye
          const temp = currentStrikerIdx;
          currentStrikerIdx = currentNonStrikerIdx;
          currentNonStrikerIdx = temp;
        } else if (byeRoll < 0.023) {
          // Bye (1 run, legal delivery, does NOT charge bowler, strike rotates)
          totalRuns += 1;
          extras.byes += 1;
          extras.total += 1;
          currentPartnershipRuns += 1;
          // Strike rotation on 1 bye
          const temp = currentStrikerIdx;
          currentStrikerIdx = currentNonStrikerIdx;
          currentNonStrikerIdx = temp;
        } else {
          // Bat-off-the-ball runs: 6s, 4s, 3s, 2s, 1s, 0s
          const freeHitBoost = isFreeHit ? 1.45 : 1.0;
          const pSix = clamp(
            0.062 * (1.0 + ratingDelta * 1.1) * (bSr / 135) * phaseRunMult * pitchRunMod * freeHitBoost,
            0.015,
            0.22
          );
          const pFour = clamp(
            0.125 * (1.0 + ratingDelta * 0.9) * (bSr / 132) * phaseRunMult * pitchRunMod * freeHitBoost,
            0.035,
            0.26
          );
          const pDot = clamp(
            formatConfig.baseDotProb * (1.0 - ratingDelta * 0.75) * (bEcon / 8.2) * (pitch.dotMod || 1.0) / freeHitBoost,
            0.16,
            0.56
          );
          const pTwo = 0.08;
          const pThree = 0.012;
          const pSingle = Math.max(0.12, 1.0 - (pSix + pFour + pDot + pTwo + pThree));

          const shotRoll = prng();
          let ballRuns = 0;

          if (shotRoll < pDot) {
            ballRuns = 0; // Dot ball
            bRecord.dots++;
          } else if (shotRoll < pDot + pSingle) {
            ballRuns = 1; // 1 run
          } else if (shotRoll < pDot + pSingle + pTwo) {
            ballRuns = 2; // 2 runs
          } else if (shotRoll < pDot + pSingle + pTwo + pThree) {
            ballRuns = 3; // 3 runs
          } else if (shotRoll < pDot + pSingle + pTwo + pThree + pFour) {
            ballRuns = 4; // 4 BOUNDARY!
            striker.fours++;
          } else {
            ballRuns = 6; // 6 MAXIMUM!
            striker.sixes++;
          }

          striker.runs += ballRuns;
          totalRuns += ballRuns;
          overRunsOffBowler += ballRuns;
          bRecord.runs += ballRuns;
          currentPartnershipRuns += ballRuns;

          // Strike rotation on odd runs (1 or 3)
          if (ballRuns === 1 || ballRuns === 3) {
            const temp = currentStrikerIdx;
            currentStrikerIdx = currentNonStrikerIdx;
            currentNonStrikerIdx = temp;
          }
        }
      }

      // Free hit only lasts 1 legal delivery
      isFreeHit = false;
    }

    // Check for Maiden over (0 runs conceded off bowler in this 6-ball over)
    if (overRunsOffBowler === 0 && legalBallsThisOver === 6) {
      bRecord.maidens++;
    }

    // End of over: mandatory strike rotation between batters
    const temp = currentStrikerIdx;
    currentStrikerIdx = currentNonStrikerIdx;
    currentNonStrikerIdx = temp;
  }

  // Record final unfinished partnership if innings finished without 10 wickets
  if (totalWickets < 10) {
    const sName = batterStats[currentStrikerIdx]?.name || 'Batter';
    const nsName = batterStats[currentNonStrikerIdx]?.name || 'Partner';
    partnerships.push({
      wicket: null,
      unbroken: true,
      batter1: sName,
      batter2: nsName,
      runs: currentPartnershipRuns,
      balls: currentPartnershipBalls
    });
  }

  // Batters who Did Not Bat (DNB)
  const didNotBat = batterStats
    .filter(b => b.balls === 0 && !b.isOut && b.runs === 0 && b !== batterStats[currentStrikerIdx] && b !== batterStats[currentNonStrikerIdx])
    .map(b => b.name);

  // Bowling Scorecard
  const bowlingCard = Array.from(bowlerStatsMap.values())
    .filter(b => b.legalBalls > 0 || b.wides > 0 || b.noBalls > 0)
    .map(b => {
      const oversFormatted = formatOvers(b.legalBalls);
      const econ = b.legalBalls > 0 ? parseFloat(((b.runs / b.legalBalls) * 6).toFixed(2)) : 0;
      return {
        name: b.name,
        rating: b.rating,
        ratingLabel: b.ratingLabel,
        overs: oversFormatted,
        legalBalls: b.legalBalls,
        maidens: b.maidens,
        runs: b.runs,
        wickets: b.wickets,
        economy: econ,
        wides: b.wides,
        noBalls: b.noBalls,
        dots: b.dots
      };
    });

  // Batting Scorecard
  const battingCard = batterStats
    .filter(b => b.balls > 0 || b.isOut || b.runs > 0 || b === batterStats[currentStrikerIdx] || b === batterStats[currentNonStrikerIdx])
    .map(b => ({
      name: b.name,
      rating: b.rating,
      ratingLabel: b.ratingLabel,
      runs: b.runs,
      balls: b.balls,
      fours: b.fours,
      sixes: b.sixes,
      sr: b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(1)) : 0,
      notOut: b.notOut,
      dismissal: b.dismissal
    }));

  const inningsOversFormatted = formatOvers(legalBallsBowled);
  const runRate = legalBallsBowled > 0 ? parseFloat(((totalRuns / legalBallsBowled) * 6).toFixed(2)) : 0;

  // Mathematical Verification check
  const sumBattersRuns = batterStats.reduce((acc, b) => acc + b.runs, 0);
  const mathTotal = sumBattersRuns + extras.total;
  if (mathTotal !== totalRuns) {
    // Exact mathematical guard
    totalRuns = mathTotal;
  }

  return {
    runs: totalRuns,
    wickets: totalWickets,
    overs: inningsOversFormatted,
    ballsBowled: legalBallsBowled,
    runRate,
    extras,
    batting: battingCard,
    bowling: bowlingCard,
    fallOfWickets,
    partnerships,
    didNotBat
  };
}

/**
 * Super Over Sudden-Death Simulation
 */
export function simulateSuperOver({ teamA, teamB, playingXIA, playingXIB, prng = Math.random }) {
  const simSOInnings = (team, xi, oppXI) => {
    const hitters = [...(xi || [])].sort((a, b) => {
      const srA = a.intlStats?.matches > 0 ? ((a.iplStats?.sr || 135) * 0.55 + (a.intlStats?.sr || 135) * 0.45) : (a.stats?.sr || 135);
      const srB = b.intlStats?.matches > 0 ? ((b.iplStats?.sr || 135) * 0.55 + (b.intlStats?.sr || 135) * 0.45) : (b.stats?.sr || 135);
      return (srB + (b.rating || 80) * 0.5) - (srA + (a.rating || 80) * 0.5);
    });
    const batter = hitters[0] || { name: 'Super Striker', rating: 85 };
    const deathBowlers = pickBowlers(oppXI || [], FORMAT_CONFIGS.T20);
    const bowler = deathBowlers[0] || { name: 'Death Specialist', rating: 85 };

    const rBat = batter.rating || 82;
    const rBowl = bowler.rating || 82;
    const rDelta = (rBat - rBowl) / 100;
    const bSr = batter.intlStats?.matches > 0 ? ((batter.iplStats?.sr || 135) * 0.55 + (batter.intlStats?.sr || 135) * 0.45) : (batter.stats?.sr || 135);

    let runs = 0;
    let wkts = 0;
    for (let ball = 0; ball < 6; ball++) {
      if (wkts >= 2) break; // 2 wickets ends Super Over innings
      const pWkt = clamp(0.12 * (1.0 - rDelta * 0.5), 0.05, 0.25);
      const r = prng();
      if (r < pWkt) {
        wkts++;
      } else {
        const pSix = clamp(0.22 * (1.0 + rDelta) * (bSr / 140), 0.08, 0.40);
        const pFour = clamp(0.26 * (1.0 + rDelta * 0.7), 0.12, 0.38);
        const shotRoll = prng();
        if (shotRoll < pSix) {
          runs += 6;
        } else if (shotRoll < pSix + pFour) {
          runs += 4;
        } else if (shotRoll < pSix + pFour + 0.20) {
          runs += 2;
        } else if (shotRoll < pSix + pFour + 0.40) {
          runs += 1;
        }
      }
    }
    return { runs, wkts, batter: batter.name, bowler: bowler.name };
  };

  const soA = simSOInnings(teamA, playingXIA, playingXIB);
  const soB = simSOInnings(teamB, playingXIB, playingXIA);

  let winner = teamA;
  if (soB.runs > soA.runs) {
    winner = teamB;
  } else if (soA.runs > soB.runs) {
    winner = teamA;
  } else {
    // If still tied, tiebreaker by boundary count / flip
    winner = prng() < 0.5 ? teamA : teamB;
  }

  return {
    isSuperOver: true,
    soA,
    soB,
    winner,
    summary: `Super Over: ${teamA} ${soA.runs}/${soA.wkts} vs ${teamB} ${soB.runs}/${soB.wkts}. ${winner} won the Super Over!`
  };
}

/**
 * Main Simulation Function for a Cricket Match Fixture
 * Accepts format ('T20' | 'ODI') and deterministic seed.
 */
export function simulateMatchFixture({
  fixtureId,
  teamA,
  teamB,
  playingXIA = [],
  playingXIB = [],
  format = 'T20',
  pitchType = null,
  seed = null
}) {
  // 1. Initialize Deterministic Pseudo-Random Number Generator
  const matchSeed = seed ?? `${fixtureId || 'match'}-${teamA?.code || 'A'}-${teamB?.code || 'B'}-${Date.now()}`;
  const prng = createPRNG(matchSeed);

  const formatConfig = FORMAT_CONFIGS[format] || FORMAT_CONFIGS.T20;

  // 2. Select Pitch Condition
  const pitch = pitchType
    ? (PITCH_TYPES.find(p => p.type.toLowerCase() === pitchType.toLowerCase()) || PITCH_TYPES[0])
    : PITCH_TYPES[Math.floor(prng() * PITCH_TYPES.length)];

  // 3. Pre-Match Win Probability based on Playing XI ratings out of 100
  const preMatchProb = calculatePreMatchWinProbability(playingXIA, playingXIB);

  // 4. Toss
  const tossWinner = prng() < 0.5 ? teamA.code : teamB.code;
  // Modern T20/ODI chase preference ~58%
  const tossDecision = prng() < 0.58 ? 'bowl' : 'bat';

  let firstBatTeam, firstBatXI, secondBatTeam, secondBatXI;
  if (
    (tossWinner === teamA.code && tossDecision === 'bat') ||
    (tossWinner === teamB.code && tossDecision === 'bowl')
  ) {
    firstBatTeam = teamA;
    firstBatXI = playingXIA;
    secondBatTeam = teamB;
    secondBatXI = playingXIB;
  } else {
    firstBatTeam = teamB;
    firstBatXI = playingXIB;
    secondBatTeam = teamA;
    secondBatXI = playingXIA;
  }

  // 5. Simulate Innings 1
  const inn1 = simulateInnings({
    battingTeam: firstBatTeam,
    bowlingTeam: secondBatTeam,
    battingXI: firstBatXI,
    bowlingXI: secondBatXI,
    target: null,
    isChase: false,
    format: formatConfig.format,
    pitch,
    prng
  });

  const target = inn1.runs + 1;

  // 6. Simulate Innings 2 (Chase)
  const inn2 = simulateInnings({
    battingTeam: secondBatTeam,
    bowlingTeam: firstBatTeam,
    battingXI: secondBatXI,
    bowlingXI: firstBatXI,
    target,
    isChase: true,
    format: formatConfig.format,
    pitch,
    prng
  });

  // 7. Determine Winner & Margin
  let winner = null;
  let margin = '';
  let isSuperOver = false;
  let superOverData = null;

  const totalAllottedBalls = formatConfig.maxOvers * 6;

  if (inn2.runs >= target) {
    winner = secondBatTeam.code;
    const wktsInHand = 10 - inn2.wickets;
    const ballsRemaining = Math.max(0, totalAllottedBalls - inn2.ballsBowled);
    margin = `${secondBatTeam.name} won by ${wktsInHand} wickets (${ballsRemaining} balls remaining)`;
  } else if (inn2.runs < inn1.runs) {
    winner = firstBatTeam.code;
    const runDiff = inn1.runs - inn2.runs;
    margin = `${firstBatTeam.name} won by ${runDiff} runs`;
  } else {
    // Exact Tie -> Super Over!
    isSuperOver = true;
    superOverData = simulateSuperOver({
      teamA: firstBatTeam.code,
      teamB: secondBatTeam.code,
      playingXIA: firstBatXI,
      playingXIB: secondBatXI,
      prng
    });
    winner = superOverData.winner;
    margin = superOverData.summary;
  }

  // 8. Player of the Match using statistical impact formula
  const impactMap = new Map();

  const addBattingImpact = (innings, teamCode, wonMatch) => {
    innings.batting.forEach(b => {
      let pts = b.runs * 1.0 + b.fours * 1.0 + b.sixes * 2.0;
      if (b.runs >= 20) {
        pts += Math.max(0, (b.sr - (formatConfig.format === 'ODI' ? 85 : 120)) * 0.25);
      }
      if (b.runs >= 50) pts += 15;
      if (b.runs >= 100) pts += 35;
      if (wonMatch) pts += 12;
      if (wonMatch && b.notOut && b.runs >= 30) pts += 10;

      const current = impactMap.get(b.name) || { name: b.name, rating: b.rating, teamCode, pts: 0, batRuns: 0, batBalls: 0, wkts: 0, bowlRuns: 0, fours: 0, sixes: 0 };
      current.pts += pts;
      current.batRuns = b.runs;
      current.batBalls = b.balls;
      current.fours = b.fours;
      current.sixes = b.sixes;
      impactMap.set(b.name, current);
    });
  };

  const addBowlingImpact = (innings, teamCode, wonMatch) => {
    innings.bowling.forEach(b => {
      let pts = b.wickets * 25.0 + (b.dots || 0) * 0.5 + (b.maidens || 0) * 8.0;
      const baseEcon = formatConfig.format === 'ODI' ? 5.5 : 8.2;
      pts += Math.max(0, (baseEcon - b.economy) * 4.5);
      if (b.wickets >= 3) pts += 15;
      if (b.wickets >= 5) pts += 35;
      if (wonMatch) pts += 12;

      const current = impactMap.get(b.name) || { name: b.name, rating: b.rating, teamCode, pts: 0, batRuns: 0, batBalls: 0, wkts: 0, bowlRuns: 0, overs: 0, econ: 0 };
      current.pts += pts;
      current.wkts = b.wickets;
      current.bowlRuns = b.runs;
      current.overs = b.overs;
      current.econ = b.economy;
      impactMap.set(b.name, current);
    });
  };

  addBattingImpact(inn1, firstBatTeam.code, winner === firstBatTeam.code);
  addBowlingImpact(inn1, secondBatTeam.code, winner === secondBatTeam.code);
  addBattingImpact(inn2, secondBatTeam.code, winner === secondBatTeam.code);
  addBowlingImpact(inn2, firstBatTeam.code, winner === firstBatTeam.code);

  const impactList = Array.from(impactMap.values()).sort((a, b) => b.pts - a.pts);
  const best = impactList[0] || {
    name: firstBatXI[0]?.name || 'Player',
    rating: 88,
    teamCode: winner,
    pts: 75
  };

  let potmSummary = '';
  if (best.batRuns > 0 && best.wkts > 0) {
    potmSummary = `${best.batRuns} runs (${best.batBalls}b) & ${best.wkts}/${best.bowlRuns} (${best.overs} ov)`;
  } else if (best.wkts >= 2) {
    potmSummary = `${best.wkts}/${best.bowlRuns} (${best.overs} ov, Econ ${best.econ})`;
  } else {
    potmSummary = `${best.batRuns} runs (${best.batBalls}b, ${best.fours}x4, ${best.sixes}x6)`;
  }

  const potm = {
    name: best.name,
    rating: best.rating,
    teamCode: best.teamCode,
    summary: potmSummary,
    impactPoints: parseFloat(best.pts.toFixed(1))
  };

  const tossSummary = `${tossWinner === teamA.code ? teamA.name : teamB.name} won the toss and elected to ${tossDecision} first`;

  return {
    fixtureId,
    format: formatConfig.format,
    seed: matchSeed,
    pitch: {
      type: pitch.type,
      description: pitch.description
    },
    teamA: {
      code: teamA.code,
      name: teamA.name,
      primaryColor: teamA.primaryColor
    },
    teamB: {
      code: teamB.code,
      name: teamB.name,
      primaryColor: teamB.primaryColor
    },
    preMatchProbability: preMatchProb,
    toss: {
      winner: tossWinner,
      decision: tossDecision,
      summary: tossSummary
    },
    innings1: {
      teamCode: firstBatTeam.code,
      teamName: firstBatTeam.name,
      primaryColor: firstBatTeam.primaryColor,
      runs: inn1.runs,
      wickets: inn1.wickets,
      overs: inn1.overs,
      ballsBowled: inn1.ballsBowled,
      runRate: inn1.runRate,
      extras: inn1.extras,
      batting: inn1.batting,
      bowling: inn1.bowling,
      fallOfWickets: inn1.fallOfWickets,
      partnerships: inn1.partnerships,
      didNotBat: inn1.didNotBat
    },
    innings2: {
      teamCode: secondBatTeam.code,
      teamName: secondBatTeam.name,
      primaryColor: secondBatTeam.primaryColor,
      target,
      runs: inn2.runs,
      wickets: inn2.wickets,
      overs: inn2.overs,
      ballsBowled: inn2.ballsBowled,
      runRate: inn2.runRate,
      extras: inn2.extras,
      batting: inn2.batting,
      bowling: inn2.bowling,
      fallOfWickets: inn2.fallOfWickets,
      partnerships: inn2.partnerships,
      didNotBat: inn2.didNotBat
    },
    winner,
    margin,
    isSuperOver,
    superOver: superOverData,
    playerOfTheMatch: potm,
    simulatedAt: Date.now()
  };
}
