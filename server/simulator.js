/**
 * Cricket Match Simulation Engine based on Mathematics, Player Stats & Probability
 * Calculates realistic 20-over T20 cricket matches, generates authentic scorecards,
 * and determines Player of the Match using statistical impact algorithms.
 */

import { calculateT20Rating, calculatePreMatchWinProbability } from './rating.js';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Select best bowling lineup (up to 5 bowlers, at least 4 overs each in a 20-over game)
export function pickBowlers(playingXI = []) {
  const eligible = (playingXI || []).map((p, idx) => {
    let bowlScore = 0;
    if (p.category === 'pacer' || p.category === 'spinner' || p.role === 'Bowler') {
      bowlScore = 100;
    } else if (p.category === 'allrounder' || p.role === 'All-Rounder') {
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
  // Pick top 5 bowlers (or at least 4)
  const chosen = eligible.slice(0, Math.min(eligible.length, 5)).map(e => e.player);
  if (chosen.length === 0 && playingXI.length > 0) {
    return playingXI.slice(Math.max(0, playingXI.length - 5));
  }
  return chosen;
}

// Authentic reserve players pool to ensure real cricket player names are always used (NEVER generic names like "CSK Player 1")
const REAL_RESERVE_POOL = [
  { name: 'Abhimanyu Easwaran', role: 'Batter', category: 'batter', stats: { sr: 132.5, runs: 1240, avg: 34.2, matches: 42 }, rating: 80 },
  { name: 'Priyam Garg', role: 'Batter', category: 'batter', stats: { sr: 136.0, runs: 850, avg: 26.5, matches: 38 }, rating: 80 },
  { name: 'Sheldon Jackson', role: 'WK-Batter', category: 'wicketkeeper', stats: { sr: 139.4, runs: 1420, avg: 31.0, matches: 54 }, rating: 81 },
  { name: 'Baba Indrajith', role: 'Batter', category: 'batter', stats: { sr: 128.0, runs: 980, avg: 30.5, matches: 36 }, rating: 79 },
  { name: 'Rishi Dhawan', role: 'All-Rounder', category: 'allrounder', stats: { sr: 125.0, runs: 750, wkts: 52, econ: 7.95, matches: 62 }, rating: 81 },
  { name: 'Jalaj Saxena', role: 'All-Rounder', category: 'allrounder', stats: { sr: 120.0, runs: 680, wkts: 68, econ: 7.20, matches: 58 }, rating: 82 },
  { name: 'Sandeep Warrier', role: 'Bowler', category: 'pacer', stats: { econ: 7.80, wkts: 48, matches: 45 }, rating: 81 },
  { name: 'Basil Thampi', role: 'Bowler', category: 'pacer', stats: { econ: 8.60, wkts: 42, matches: 40 }, rating: 79 },
  { name: 'Shivalik Sharma', role: 'Batter', category: 'batter', stats: { sr: 130.0, runs: 520, matches: 22 }, rating: 78 },
  { name: 'Manav Suthar', role: 'Bowler', category: 'spinner', stats: { econ: 7.10, wkts: 28, matches: 20 }, rating: 80 },
  { name: 'Vyshak Vijaykumar', role: 'Bowler', category: 'pacer', stats: { econ: 8.20, wkts: 34, matches: 25 }, rating: 80 }
];

// Ensure at least 11 players in any playing XI with real authentic cricket player names
function fillXI(xi, team) {
  const list = Array.isArray(xi) && xi.length > 0 ? [...xi] : [];
  const existingNames = new Set(list.map(p => p.name));

  // 1. Try to pull unused real players from team's squad first
  if (team?.squad && Array.isArray(team.squad)) {
    for (const sqPlayer of team.squad) {
      if (list.length >= 11) break;
      if (!existingNames.has(sqPlayer.name)) {
        list.push(sqPlayer);
        existingNames.add(sqPlayer.name);
      }
    }
  }

  // 2. If still under 11, backfill using authentic named domestic cricketers
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
 * Simulate a single innings (up to 20 overs, or target chased / 10 wickets)
 * Driven purely by ball-by-ball probability calculations between batter & bowler ratings.
 */
function simulateInnings({
  battingTeam,
  bowlingTeam,
  battingXI,
  bowlingXI,
  target = null,
  isChase = false
}) {
  const battingLineup = fillXI(battingXI, battingTeam);
  const bowlingLineup = fillXI(bowlingXI, bowlingTeam);
  const bowlers = pickBowlers(bowlingLineup);
  const bowlerStatsMap = new Map();

  bowlers.forEach(b => {
    const bRating = calculateT20Rating(b);
    bowlerStatsMap.set(b.id || b.name, {
      player: b,
      name: b.name,
      rating: bRating.overall,
      ratingLabel: bRating.label,
      overs: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      balls: 0
    });
  });

  const batterStats = [];
  let currentStrikerIdx = 0;
  let currentNonStrikerIdx = 1;
  let nextBatterIdx = 2;

  const initBatter = (player) => {
    const rObj = calculateT20Rating(player);
    return {
      player,
      name: player.name,
      rating: rObj.overall,
      ratingLabel: rObj.label,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      sr: 0,
      isOut: false,
      notOut: true,
      dismissal: 'not out'
    };
  };

  for (let i = 0; i < battingLineup.length; i++) {
    batterStats.push(initBatter(battingLineup[i]));
  }

  let totalRuns = 0;
  let totalWickets = 0;
  let ballsBowled = 0;
  const maxOvers = 20;
  const totalMaxBalls = maxOvers * 6;

  // Bowler quota tracker (max 4 overs = 24 balls per bowler)
  const bowlerQuota = new Map();
  bowlers.forEach(b => bowlerQuota.set(b.id || b.name, 0));

  let lastBowlerId = null;

  // Simulate Over-by-Over
  for (let over = 0; over < maxOvers; over++) {
    if (totalWickets >= 10 || ballsBowled >= totalMaxBalls) break;
    if (isChase && target !== null && totalRuns >= target) break;

    // Pick bowler for this over (cannot bowl consecutive overs, max 4 overs)
    const availableBowlers = bowlers.filter(b => {
      const bId = b.id || b.name;
      const bowled = bowlerQuota.get(bId) || 0;
      return bId !== lastBowlerId && bowled < 4;
    });

    const activeBowler = (availableBowlers.length > 0)
      ? availableBowlers[Math.floor(Math.random() * availableBowlers.length)]
      : (bowlers.length > 0 ? bowlers[Math.floor(Math.random() * bowlers.length)] : { id: 'bowl-1', name: 'Bowler 1' });

    const bowlerId = activeBowler.id || activeBowler.name;
    lastBowlerId = bowlerId;
    bowlerQuota.set(bowlerId, (bowlerQuota.get(bowlerId) || 0) + 1);
    const bRecord = bowlerStatsMap.get(bowlerId);

    // Over Phase context: Powerplay (0-5), Middle (6-14), Death (15-19)
    let phaseRunMultiplier = 1.0;
    let phaseWicketMultiplier = 1.0;
    if (over < 6) {
      phaseRunMultiplier = 1.15; // Powerplay field restrictions
      phaseWicketMultiplier = 0.88;
    } else if (over >= 15) {
      phaseRunMultiplier = 1.38; // Death overs acceleration
      phaseWicketMultiplier = 1.42; // Higher wicket risk
    } else {
      phaseRunMultiplier = 0.94; // Middle overs consolidation
      phaseWicketMultiplier = 1.0;
    }

    // Required Run Rate pressure in chase
    if (isChase && target !== null) {
      const runsNeeded = target - totalRuns;
      const ballsLeft = totalMaxBalls - ballsBowled;
      const rrr = (runsNeeded / Math.max(1, ballsLeft)) * 6;
      if (rrr > 11.5) {
        phaseRunMultiplier *= 1.25;
        phaseWicketMultiplier *= 1.45; // High boundary risk
      } else if (rrr < 6.5) {
        phaseRunMultiplier *= 0.92;
        phaseWicketMultiplier *= 0.70; // Sensible cruising
      }
    }

    let overRuns = 0;

    // Simulate 6 balls
    for (let b = 0; b < 6; b++) {
      if (totalWickets >= 10 || (isChase && target !== null && totalRuns >= target)) break;

      ballsBowled++;
      bRecord.balls++;

      const striker = batterStats[currentStrikerIdx];
      if (!striker) break;
      striker.balls++;

      // Pure Mathematical Probability Breakdown based on 100-point ratings & comprehensive IPL + International stats:
      const rBat = striker.rating || 82;
      const rBowl = bRecord.rating || 82;
      const ratingDelta = (rBat - rBowl) / 100; // e.g. +0.12 or -0.15

      // Combine both IPL and International T20 stats for batter & bowler
      const batIPL = striker.player?.iplStats || {};
      const batIntl = striker.player?.intlStats || {};
      const iplSr = batIPL.sr || striker.player?.stats?.iplSr || striker.player?.stats?.sr || 135;
      const intlSr = batIntl.sr || striker.player?.stats?.intlSr || striker.player?.stats?.sr || 135;
      const bSr = batIntl.matches > 0 ? (iplSr * 0.55 + intlSr * 0.45) : (striker.player?.stats?.sr || iplSr);

      const bowlIPL = activeBowler.iplStats || {};
      const bowlIntl = activeBowler.intlStats || {};
      const iplEcon = bowlIPL.econ || activeBowler.stats?.iplEcon || activeBowler.stats?.econ || 8.2;
      const intlEcon = bowlIntl.econ || activeBowler.stats?.intlEcon || activeBowler.stats?.econ || 8.2;
      const bowlerEcon = bowlIntl.matches > 0 ? (iplEcon * 0.55 + intlEcon * 0.45) : (activeBowler.stats?.econ || iplEcon);

      // 1. Wicket Probability per ball (T20 avg is ~0.048)
      let pWicket = 0.048 * (1.0 - ratingDelta * 0.75) * (8.5 / Math.max(6.0, bowlerEcon)) * phaseWicketMultiplier;
      pWicket = clamp(pWicket, 0.018, 0.14);

      if (Math.random() < pWicket) {
        // WICKET FALLEN!
        totalWickets++;
        bRecord.wickets++;
        striker.isOut = true;
        striker.notOut = false;

        // Realistic dismissal generator
        const modes = ['c', 'c', 'c', 'b', 'lbw', 'c & b', 'st'];
        const m = modes[Math.floor(Math.random() * modes.length)];
        const fielder = bowlingLineup[Math.floor(Math.random() * bowlingLineup.length)]?.name || 'Fielder';

        if (m === 'b') {
          striker.dismissal = `b ${activeBowler.name}`;
        } else if (m === 'lbw') {
          striker.dismissal = `lbw b ${activeBowler.name}`;
        } else if (m === 'c & b') {
          striker.dismissal = `c & b ${activeBowler.name}`;
        } else if (m === 'st') {
          striker.dismissal = `st Keeper b ${activeBowler.name}`;
        } else {
          striker.dismissal = `c ${fielder} b ${activeBowler.name}`;
        }

        // Next batter walks in
        if (nextBatterIdx < batterStats.length) {
          currentStrikerIdx = nextBatterIdx;
          nextBatterIdx++;
        }
      } else {
        // RUN PROBABILITIES GIVEN NO WICKET (Discrete Probability Distribution)
        // 6s, 4s, 3s, 2s, 1s, 0s
        const pSix = clamp(0.065 * (1.0 + ratingDelta * 1.1) * (bSr / 138) * phaseRunMultiplier, 0.02, 0.18);
        const pFour = clamp(0.13 * (1.0 + ratingDelta * 0.9) * (bSr / 135) * phaseRunMultiplier, 0.04, 0.25);
        const pDot = clamp(0.36 * (1.0 - ratingDelta * 0.8) * (bowlerEcon / 8.2), 0.18, 0.52);
        const pTwo = 0.08;
        const pThree = 0.01;
        // Remaining weight is singles (strike rotation)
        const pSingle = Math.max(0.15, 1.0 - (pSix + pFour + pDot + pTwo + pThree));

        // Sample discrete ball outcome
        const roll = Math.random();
        let ballRuns = 0;

        if (roll < pDot) {
          ballRuns = 0; // Dot ball
        } else if (roll < pDot + pSingle) {
          ballRuns = 1; // 1 run
        } else if (roll < pDot + pSingle + pTwo) {
          ballRuns = 2; // 2 runs
        } else if (roll < pDot + pSingle + pTwo + pThree) {
          ballRuns = 3; // 3 runs
        } else if (roll < pDot + pSingle + pTwo + pThree + pFour) {
          ballRuns = 4; // 4 BOUNDARY!
          striker.fours++;
        } else {
          ballRuns = 6; // 6 MAXIMUM!
          striker.sixes++;
        }

        striker.runs += ballRuns;
        overRuns += ballRuns;
        totalRuns += ballRuns;
        bRecord.runs += ballRuns;

        // Strike rotation on odd runs
        if (ballRuns === 1 || ballRuns === 3) {
          const temp = currentStrikerIdx;
          currentStrikerIdx = currentNonStrikerIdx;
          currentNonStrikerIdx = temp;
        }
      }
    }

    if (overRuns === 0) {
      bRecord.maidens++;
    }

    // End of over: mandatory strike rotation
    const temp = currentStrikerIdx;
    currentStrikerIdx = currentNonStrikerIdx;
    currentNonStrikerIdx = temp;
  }

  // Finalize bowler overs and economy
  const bowlingCard = Array.from(bowlerStatsMap.values()).map(b => {
    const fullOvers = Math.floor(b.balls / 6);
    const remBalls = b.balls % 6;
    const oversFormatted = parseFloat(`${fullOvers}.${remBalls}`);
    const econ = b.balls > 0 ? parseFloat(((b.runs / b.balls) * 6).toFixed(2)) : 0;
    return {
      name: b.name,
      rating: b.rating,
      ratingLabel: b.ratingLabel,
      overs: oversFormatted,
      maidens: b.maidens,
      runs: b.runs,
      wickets: b.wickets,
      economy: econ
    };
  });

  // Finalize batter strike rates and cards
  const battingCard = batterStats
    .filter(b => b.balls > 0 || b.isOut || b.runs > 0)
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

  const completedFullOvers = Math.floor(ballsBowled / 6);
  const remainingBallsInInnings = ballsBowled % 6;
  const oversFormatted = parseFloat(`${completedFullOvers}.${remainingBallsInInnings}`);
  const runRate = ballsBowled > 0 ? parseFloat(((totalRuns / ballsBowled) * 6).toFixed(2)) : 0;

  return {
    runs: totalRuns,
    wickets: totalWickets,
    overs: oversFormatted,
    runRate,
    ballsBowled,
    batting: battingCard,
    bowling: bowlingCard
  };
}

/**
 * Super Over Sudden-Death Simulation (6 balls each)
 * Driven by top power-hitters and death specialists using authentic IPL + International ratings
 */
function simulateSuperOver({ teamA, teamB, playingXIA, playingXIB }) {
  const simSOInnings = (team, xi, oppXI) => {
    const hitters = [...(xi || [])].sort((a, b) => {
      const srA = a.intlStats?.matches > 0 ? ((a.iplStats?.sr || 135) * 0.55 + (a.intlStats?.sr || 135) * 0.45) : (a.stats?.sr || 135);
      const srB = b.intlStats?.matches > 0 ? ((b.iplStats?.sr || 135) * 0.55 + (b.intlStats?.sr || 135) * 0.45) : (b.stats?.sr || 135);
      return (srB + (b.rating || 80) * 0.5) - (srA + (a.rating || 80) * 0.5);
    });
    const batter = hitters[0] || { name: 'Super Striker', rating: 85 };
    const deathBowlers = pickBowlers(oppXI || []);
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
      const r = Math.random();
      if (r < pWkt) {
        wkts++;
      } else {
        const pSix = clamp(0.22 * (1.0 + rDelta) * (bSr / 140), 0.08, 0.40);
        const pFour = clamp(0.26 * (1.0 + rDelta * 0.7), 0.12, 0.38);
        const shotRoll = Math.random();
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
    // If still tied, winner decided by boundary count
    winner = Math.random() < 0.5 ? teamA : teamB;
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
 * Main Simulation Function for a T20 Match Fixture
 * Purely probability & statistics driven with neat close prediction margins.
 */
export function simulateMatchFixture({
  fixtureId,
  teamA,
  teamB,
  playingXIA = [],
  playingXIB = []
}) {
  // 1. Calculate Pre-Match Mathematical Win Probability based on Playing XI ratings out of 100
  const preMatchProb = calculatePreMatchWinProbability(playingXIA, playingXIB);

  // 2. Math Toss
  const tossWinner = Math.random() < 0.5 ? teamA.code : teamB.code;
  // Modern T20: 60% chance toss winner bowls first to chase
  const tossDecision = Math.random() < 0.60 ? 'bowl' : 'bat';

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

  // 3. Simulate Innings 1
  const inn1 = simulateInnings({
    battingTeam: firstBatTeam,
    bowlingTeam: secondBatTeam,
    battingXI: firstBatXI,
    bowlingXI: secondBatXI,
    target: null,
    isChase: false
  });

  const target = inn1.runs + 1;

  // 4. Simulate Innings 2 (Chase)
  const inn2 = simulateInnings({
    battingTeam: secondBatTeam,
    bowlingTeam: firstBatTeam,
    battingXI: secondBatXI,
    bowlingXI: firstBatXI,
    target,
    isChase: true
  });

  // 5. Determine Winner & Margin
  let winner = null;
  let margin = '';
  let isSuperOver = false;
  let superOverData = null;

  if (inn2.runs >= target) {
    winner = secondBatTeam.code;
    const wktsInHand = 10 - inn2.wickets;
    const ballsRemaining = 120 - inn2.ballsBowled;
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
      playingXIB: secondBatXI
    });
    winner = superOverData.winner;
    margin = superOverData.summary;
  }

  // 6. Calculate Player of the Match using statistical impact formula
  const impactList = [];

  // Evaluate Innings 1 Batters & Bowlers
  inn1.batting.forEach(b => {
    const pts = b.runs * 1.0 + (b.sr - 110) * 0.25 + b.fours * 0.5 + b.sixes * 1.5 + (b.runs >= 50 ? 20 : 0) + (b.runs >= 100 ? 40 : 0);
    impactList.push({
      name: b.name,
      rating: b.rating,
      teamCode: firstBatTeam.code,
      pts: pts + (winner === firstBatTeam.code ? 15 : 0),
      summary: `${b.runs} runs (${b.balls}b, ${b.fours}x4, ${b.sixes}x6)`
    });
  });

  inn1.bowling.forEach(b => {
    const pts = b.wickets * 28.0 + Math.max(0, (8.5 - b.economy) * 5.0) + (b.wickets >= 3 ? 20 : 0) + (b.wickets >= 5 ? 40 : 0);
    impactList.push({
      name: b.name,
      rating: b.rating,
      teamCode: secondBatTeam.code,
      pts: pts + (winner === secondBatTeam.code ? 15 : 0),
      summary: `${b.wickets}/${b.runs} (${b.overs} ov, Econ ${b.economy})`
    });
  });

  // Evaluate Innings 2 Batters & Bowlers
  inn2.batting.forEach(b => {
    const pts = b.runs * 1.0 + (b.sr - 110) * 0.25 + b.fours * 0.5 + b.sixes * 1.5 + (b.runs >= 50 ? 20 : 0) + (b.runs >= 100 ? 40 : 0);
    impactList.push({
      name: b.name,
      rating: b.rating,
      teamCode: secondBatTeam.code,
      pts: pts + (winner === secondBatTeam.code ? 15 : 0),
      summary: `${b.runs} runs (${b.balls}b, ${b.fours}x4, ${b.sixes}x6)`
    });
  });

  inn2.bowling.forEach(b => {
    const pts = b.wickets * 28.0 + Math.max(0, (8.5 - b.economy) * 5.0) + (b.wickets >= 3 ? 20 : 0) + (b.wickets >= 5 ? 40 : 0);
    impactList.push({
      name: b.name,
      rating: b.rating,
      teamCode: firstBatTeam.code,
      pts: pts + (winner === firstBatTeam.code ? 15 : 0),
      summary: `${b.wickets}/${b.runs} (${b.overs} ov, Econ ${b.economy})`
    });
  });

  impactList.sort((a, b) => b.pts - a.pts);
  const potm = impactList[0] || {
    name: firstBatXI[0]?.name || 'Star Player',
    rating: 90,
    teamCode: winner,
    summary: 'Decisive match performance',
    pts: 80
  };

  return {
    fixtureId,
    preMatchProbability: preMatchProb,
    toss: {
      winner: tossWinner,
      decision: tossDecision,
      summary: `${tossWinner} won the toss and elected to ${tossDecision} first`
    },
    innings1: {
      teamCode: firstBatTeam.code,
      teamName: firstBatTeam.name,
      primaryColor: firstBatTeam.primaryColor,
      runs: inn1.runs,
      wickets: inn1.wickets,
      overs: inn1.overs,
      runRate: inn1.runRate,
      batting: inn1.batting,
      bowling: inn1.bowling
    },
    innings2: {
      teamCode: secondBatTeam.code,
      teamName: secondBatTeam.name,
      primaryColor: secondBatTeam.primaryColor,
      target,
      runs: inn2.runs,
      wickets: inn2.wickets,
      overs: inn2.overs,
      runRate: inn2.runRate,
      batting: inn2.batting,
      bowling: inn2.bowling
    },
    winner,
    margin,
    isSuperOver,
    superOver: superOverData,
    playerOfTheMatch: {
      name: potm.name,
      rating: potm.rating,
      teamCode: potm.teamCode,
      summary: potm.summary,
      impactPoints: parseFloat(potm.pts.toFixed(1))
    },
    simulatedAt: Date.now()
  };
}
