/**
 * Cricket Match Simulation Engine based on Mathematics, Player Stats & Probability
 * Calculates realistic 20-over T20 cricket matches, generates authentic scorecards,
 * and determines Player of the Match using statistical impact algorithms.
 */

// Math helper for bounded normal/gaussian distribution
function gaussianRandom(mean = 0, stdev = 1) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdev;
}

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
    const econBonus = p.stats?.econ ? Math.max(0, 10.0 - p.stats.econ) * 5 : 10;
    const wktBonus = p.stats?.wkts ? Math.min(30, p.stats.wkts * 0.3) : 10;
    return {
      player: p,
      index: idx,
      score: bowlScore + econBonus + wktBonus + (p.rating || 80) * 0.2
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

// Ensure at least 11 players in any playing XI
function fillXI(xi, team) {
  const list = Array.isArray(xi) && xi.length > 0 ? [...xi] : [];
  const code = team?.code || 'TEAM';
  while (list.length < 11) {
    const idx = list.length + 1;
    const isBowler = idx > 6;
    list.push({
      id: `${code}-p${idx}`,
      name: `${code} Player ${idx}`,
      role: idx <= 2 ? 'Batter' : idx === 3 ? 'Wicket-Keeper' : idx <= 6 ? 'All-Rounder' : 'Bowler',
      category: idx <= 5 ? 'batsman' : idx === 6 ? 'allrounder' : 'pacer',
      stats: isBowler ? { econ: 8.2, wkts: 12 } : { sr: 135.0, avg: 28.5 },
      rating: 80
    });
  }
  return list;
}

/**
 * Simulate a single innings (up to 20 overs, or target chased / 10 wickets)
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
    bowlerStatsMap.set(b.id || b.name, {
      player: b,
      name: b.name,
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

  const initBatter = (player) => ({
    player,
    name: player.name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    sr: 0,
    isOut: false,
    dismissal: 'not out'
  });

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
      : bowlers[Math.floor(Math.random() * bowlers.length)];

    const bowlerId = activeBowler.id || activeBowler.name;
    lastBowlerId = bowlerId;
    bowlerQuota.set(bowlerId, (bowlerQuota.get(bowlerId) || 0) + 1);
    const bRecord = bowlerStatsMap.get(bowlerId);

    // Over Phase context: Powerplay (0-5), Middle (6-14), Death (15-19)
    let phaseRunMultiplier = 1.0;
    let phaseWicketMultiplier = 1.0;
    if (over < 6) {
      phaseRunMultiplier = 1.15; // Powerplay field restrictions
      phaseWicketMultiplier = 0.9;
    } else if (over >= 15) {
      phaseRunMultiplier = 1.35; // Death overs acceleration
      phaseWicketMultiplier = 1.4; // Higher wicket risk
    } else {
      phaseRunMultiplier = 0.95; // Middle overs consolidation
      phaseWicketMultiplier = 1.0;
    }

    // Required Run Rate pressure in chase
    if (isChase && target !== null) {
      const runsNeeded = target - totalRuns;
      const ballsLeft = totalMaxBalls - ballsBowled;
      const rrr = (runsNeeded / Math.max(1, ballsLeft)) * 6;
      if (rrr > 11) {
        phaseRunMultiplier *= 1.25;
        phaseWicketMultiplier *= 1.4; // Desperate hitting risks wickets
      } else if (rrr < 6) {
        phaseRunMultiplier *= 0.9;
        phaseWicketMultiplier *= 0.7; // Sensible cruising
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

      // Mathematical matchup: Batter Skill vs Bowler Skill
      const bRating = striker.player?.rating || 85;
      const bSr = striker.player?.stats?.sr || 135;
      const bowlerEcon = activeBowler.stats?.econ || 8.5;
      const bowlerRating = activeBowler.rating || 85;

      // Base wicket probability per ball (~ 0.04 to 0.07)
      let wktProb = 0.048 * (bowlerRating / bRating) * (9.0 / Math.max(6.0, bowlerEcon)) * phaseWicketMultiplier;
      wktProb = clamp(wktProb, 0.02, 0.14);

      if (Math.random() < wktProb) {
        // Wicket fallen!
        totalWickets++;
        bRecord.wickets++;
        striker.isOut = true;

        // Dismissal generator
        const modes = ['b', 'c', 'c & b', 'lbw', 'st'];
        const m = modes[Math.floor(Math.random() * modes.length)];
        const fielder = bowlingXI[Math.floor(Math.random() * bowlingXI.length)]?.name || 'Fielder';

        if (m === 'b') {
          striker.dismissal = `b ${activeBowler.name}`;
        } else if (m === 'lbw') {
          striker.dismissal = `lbw b ${activeBowler.name}`;
        } else if (m === 'c & b') {
          striker.dismissal = `c & b ${activeBowler.name}`;
        } else {
          striker.dismissal = `c ${fielder} b ${activeBowler.name}`;
        }

        // Next batter in
        if (nextBatterIdx < batterStats.length) {
          currentStrikerIdx = nextBatterIdx;
          nextBatterIdx++;
        }
      } else {
        // Run scored on ball
        // Probability distribution for runs (0, 1, 2, 3, 4, 6)
        const rand = Math.random();
        const boundaryBoost = (bSr / 140) * phaseRunMultiplier;
        let ballRuns = 0;

        if (rand < 0.38) {
          ballRuns = 0; // Dot ball
        } else if (rand < 0.70) {
          ballRuns = 1; // Single
        } else if (rand < 0.82) {
          ballRuns = 2; // Double
        } else if (rand < 0.83) {
          ballRuns = 3; // Triple
        } else if (rand < 0.93 + (boundaryBoost > 1.2 ? 0.04 : 0)) {
          ballRuns = 4; // Four
          striker.fours++;
        } else {
          ballRuns = 6; // Six
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

    // End of over: strike rotation
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
      overs: oversFormatted,
      maidens: b.maidens,
      runs: b.runs,
      wickets: b.wickets,
      economy: econ
    };
  });

  // Finalize batter strike rates
  const battingCard = batterStats
    .filter(b => b.balls > 0 || b.isOut || b.runs > 0)
    .map(b => ({
      name: b.name,
      runs: b.runs,
      balls: b.balls,
      fours: b.fours,
      sixes: b.sixes,
      sr: b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(1)) : 0,
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
    ballsBowled,
    runRate,
    batting: battingCard,
    bowling: bowlingCard
  };
}

/**
 * Super Over Sudden-Death Simulation (6 balls each)
 */
function simulateSuperOver({ teamA, teamB, playingXIA, playingXIB }) {
  const simSOInnings = (team, xi) => {
    let runs = 0;
    let wkts = 0;
    for (let ball = 0; ball < 6; ball++) {
      if (wkts >= 2) break; // 2 wickets ends Super Over innings
      const r = Math.random();
      if (r < 0.15) {
        wkts++;
      } else if (r < 0.35) {
        runs += 1;
      } else if (r < 0.55) {
        runs += 2;
      } else if (r < 0.78) {
        runs += 4;
      } else {
        runs += 6;
      }
    }
    return { runs, wkts };
  };

  const soA = simSOInnings(teamA, playingXIA);
  const soB = simSOInnings(teamB, playingXIB);

  let winner = teamA;
  if (soB.runs > soA.runs) {
    winner = teamB;
  } else if (soA.runs > soB.runs) {
    winner = teamA;
  } else {
    // If still tied, winner decided by boundary count or higher rated captain
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
 */
export function simulateMatchFixture({
  fixtureId,
  teamA,
  teamB,
  playingXIA = [],
  playingXIB = []
}) {
  // 1. Math Toss
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

  // 2. Simulate Innings 1
  const inn1 = simulateInnings({
    battingTeam: firstBatTeam,
    bowlingTeam: secondBatTeam,
    battingXI: firstBatXI,
    bowlingXI: secondBatXI,
    target: null,
    isChase: false
  });

  const target = inn1.runs + 1;

  // 3. Simulate Innings 2 (Chase)
  const inn2 = simulateInnings({
    battingTeam: secondBatTeam,
    bowlingTeam: firstBatTeam,
    battingXI: secondBatXI,
    bowlingXI: firstBatXI,
    target,
    isChase: true
  });

  // 4. Determine Winner & Margin
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

  // 5. Calculate Player of the Match using statistical impact formula
  const impactList = [];

  // Evaluate batters and bowlers from Innings 1
  inn1.batting.forEach(b => {
    const pts = b.runs * 1.0 + (b.sr - 110) * 0.25 + b.fours * 0.5 + b.sixes * 1.5 + (b.runs >= 50 ? 20 : 0) + (b.runs >= 100 ? 40 : 0);
    impactList.push({
      name: b.name,
      teamCode: firstBatTeam.code,
      pts: pts + (winner === firstBatTeam.code ? 15 : 0),
      summary: `${b.runs} runs (${b.balls}b, ${b.fours}x4, ${b.sixes}x6)`
    });
  });

  inn1.bowling.forEach(b => {
    const pts = b.wickets * 28.0 + Math.max(0, (8.5 - b.economy) * 5.0) + (b.wickets >= 3 ? 20 : 0) + (b.wickets >= 5 ? 40 : 0);
    impactList.push({
      name: b.name,
      teamCode: secondBatTeam.code,
      pts: pts + (winner === secondBatTeam.code ? 15 : 0),
      summary: `${b.wickets}/${b.runs} (${b.overs} ov, Econ ${b.economy})`
    });
  });

  // Evaluate batters and bowlers from Innings 2
  inn2.batting.forEach(b => {
    const pts = b.runs * 1.0 + (b.sr - 110) * 0.25 + b.fours * 0.5 + b.sixes * 1.5 + (b.runs >= 50 ? 20 : 0) + (b.runs >= 100 ? 40 : 0);
    impactList.push({
      name: b.name,
      teamCode: secondBatTeam.code,
      pts: pts + (winner === secondBatTeam.code ? 15 : 0),
      summary: `${b.runs} runs (${b.balls}b, ${b.fours}x4, ${b.sixes}x6)`
    });
  });

  inn2.bowling.forEach(b => {
    const pts = b.wickets * 28.0 + Math.max(0, (8.5 - b.economy) * 5.0) + (b.wickets >= 3 ? 20 : 0) + (b.wickets >= 5 ? 40 : 0);
    impactList.push({
      name: b.name,
      teamCode: firstBatTeam.code,
      pts: pts + (winner === firstBatTeam.code ? 15 : 0),
      summary: `${b.wickets}/${b.runs} (${b.overs} ov, Econ ${b.economy})`
    });
  });

  impactList.sort((a, b) => b.pts - a.pts);
  const potm = impactList[0] || {
    name: firstBatXI[0]?.name || 'Star Player',
    teamCode: winner,
    summary: 'Decisive match performance',
    pts: 80
  };

  return {
    fixtureId,
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
      teamCode: potm.teamCode,
      summary: potm.summary,
      impactPoints: parseFloat(potm.pts.toFixed(1))
    },
    simulatedAt: Date.now()
  };
}
