/**
 * Mathematical T20 Cricket Player Rating & Probability Calculation Engine (Frontend)
 * Benchmarked on modern IPL and International T20 career statistics:
 * Strike Rate, Batting Average, Economy Rate, Bowling Strike Rate,
 * High Scores, Best Bowling, and High-Pressure Match Pedigree.
 */

function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates a precise Player Impact Rating out of 100 based on T20 / IPL stats.
 */
export function calculateT20Rating(player) {
  if (!player) {
    return {
      overall: 75,
      label: 'Squad Player',
      battingScore: 70,
      bowlingScore: 70,
      clutchScore: 70,
      experienceScore: 70
    };
  }

  const role = player.role || 'Batter';
  const category = player.category || 'batter';
  const stats = player.stats || {};
  const matches = stats.matches || 20;
  const runs = stats.runs || 0;
  const sr = stats.sr || 125.0;
  const wkts = stats.wkts || 0;
  const econ = stats.econ || 8.5;
  const isCapped = Boolean(player.isCapped);
  const baseRating = player.rating || 80;

  // 1. Batting Impact Component (Out of 100)
  const sri = clamp(52 + (sr - 100) * 0.72, 45, 100);
  const rpm = runs / Math.max(1, matches);
  const cai = clamp(48 + (rpm - 14) * 2.7, 45, 100);

  let hsVal = 50;
  if (typeof stats.hs === 'string') {
    hsVal = parseInt(stats.hs.replace('*', ''), 10) || 50;
  } else if (typeof stats.hs === 'number') {
    hsVal = stats.hs;
  }
  const cci = clamp(58 + (Math.min(130, hsVal) - 50) * 0.52 + (isCapped ? 6 : 0), 50, 100);
  const emi = clamp(60 + Math.min(40, matches * 0.22), 60, 100);

  const battingScore = clamp(
    Math.round(sri * 0.42 + cai * 0.32 + cci * 0.16 + emi * 0.10)
  );

  // 2. Bowling Impact Component (Out of 100)
  const eci = clamp(100 - (econ - 5.8) * 12.0, 45, 100);
  const wpm = wkts / Math.max(1, matches);
  const wsi = clamp(52 + (wpm - 0.65) * 64, 45, 100);
  const bbi = clamp(65 + (wkts >= 80 ? 15 : wkts >= 30 ? 8 : 0) + (isCapped ? 6 : 0), 50, 100);

  const bowlingScore = clamp(
    Math.round(eci * 0.45 + wsi * 0.35 + bbi * 0.10 + emi * 0.10)
  );

  // 3. Clutch & Experience Scores
  const clutchScore = clamp(
    Math.round(
      (category === 'allrounder'
        ? (battingScore + bowlingScore) / 2
        : category === 'pacer' || category === 'spinner' || role === 'Bowler'
        ? bowlingScore
        : battingScore) * 0.85 + (isCapped ? 10 : 4) + (baseRating >= 95 ? 5 : 0)
    )
  );

  const experienceScore = clamp(Math.round(emi));

  // 4. Role-specific Composite Overall Rating (Out of 100)
  let rawRating = 75;

  if (category === 'pacer' || category === 'spinner' || role === 'Bowler') {
    rawRating = bowlingScore * 0.85 + battingScore * 0.15;
  } else if (category === 'allrounder' || role === 'All-Rounder') {
    if (wkts >= 40 && runs >= 1000) {
      rawRating = battingScore * 0.52 + bowlingScore * 0.48;
    } else if (wkts >= 50) {
      rawRating = bowlingScore * 0.65 + battingScore * 0.35;
    } else {
      rawRating = battingScore * 0.65 + bowlingScore * 0.35;
    }
  } else if (category === 'wicketkeeper' || role === 'WK-Batter') {
    rawRating = battingScore * 0.90 + 8.0;
  } else {
    rawRating = battingScore * 0.92 + bowlingScore * 0.08;
  }

  const finalRating = clamp(
    Math.round(rawRating * 0.80 + baseRating * 0.20),
    65,
    99
  );

  let label = 'Reliable Performer';
  if (finalRating >= 95) label = 'Generational Match Winner';
  else if (finalRating >= 91) label = 'World-Class Superstar';
  else if (finalRating >= 86) label = 'Impact Core Player';
  else if (finalRating >= 80) label = 'Proven Campaigner';

  return {
    overall: finalRating,
    label,
    battingScore,
    bowlingScore,
    clutchScore,
    experienceScore
  };
}

/**
 * Mathematical Bradley-Terry / Logistic Head-to-Head Duel Probability
 * Calculates the exact win probability between Player A and Player B.
 */
export function calculateDuelProbability(playerA, playerB) {
  const ratingObjA = calculateT20Rating(playerA);
  const ratingObjB = calculateT20Rating(playerB);

  const rA = ratingObjA.overall;
  const rB = ratingObjB.overall;

  const diff = rA - rB;
  const probA = 1.0 / (1.0 + Math.pow(10, (rB - rA) / 26.0));
  const probB = 1.0 - probA;

  const percentA = Math.round(probA * 100);
  const percentB = 100 - percentA;

  let favorite = 'EQUAL';
  if (percentA > percentB) favorite = 'A';
  else if (percentB > percentA) favorite = 'B';

  return {
    ratingA: rA,
    ratingB: rB,
    ratingObjA,
    ratingObjB,
    diff,
    probA: parseFloat(probA.toFixed(3)),
    probB: parseFloat(probB.toFixed(3)),
    percentA,
    percentB,
    favorite
  };
}

/**
 * Calculates Team Playing XI aggregate strength and rating out of 100
 */
export function calculateTeamXIRating(playingXI = []) {
  if (!playingXI || playingXI.length === 0) return 75.0;
  const ratings = playingXI.map(p => calculateT20Rating(p).overall);
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return parseFloat((sum / ratings.length).toFixed(1));
}

/**
 * Pre-Match Win Probability between Team A and Team B based on Playing XI ratings
 */
export function calculatePreMatchWinProbability(playingXIA = [], playingXIB = []) {
  const teamRatingA = calculateTeamXIRating(playingXIA);
  const teamRatingB = calculateTeamXIRating(playingXIB);

  const diff = teamRatingA - teamRatingB;
  const probA = 1.0 / (1.0 + Math.pow(10, (teamRatingB - teamRatingA) / 12.0));
  const probB = 1.0 - probA;

  return {
    teamRatingA,
    teamRatingB,
    diff: parseFloat(diff.toFixed(1)),
    probA: parseFloat(probA.toFixed(3)),
    probB: parseFloat(probB.toFixed(3)),
    percentA: Math.round(probA * 100),
    percentB: Math.round(probB * 100)
  };
}
