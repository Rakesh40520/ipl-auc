/**
 * Mathematical T20 Cricket Player Rating & Probability Calculation Engine
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
  const ipl = player.iplStats || {};
  const intl = player.intlStats || {};

  // Aggregate matches, runs, sr, wkts, econ across IPL + International T20
  const iplMatches = ipl.matches ?? (stats.iplMatches ?? 0);
  const intlMatches = intl.matches ?? (stats.intlMatches ?? 0);
  const totalMatches = stats.matches || (iplMatches + intlMatches) || 20;

  const iplRuns = ipl.runs ?? (stats.iplRuns ?? 0);
  const intlRuns = intl.runs ?? (stats.intlRuns ?? 0);
  const totalRuns = stats.runs ?? (iplRuns + intlRuns);

  // Effective Batting Strike Rate considering both IPL & International T20
  const iplSr = ipl.sr ?? (stats.iplSr ?? stats.sr ?? 125.0);
  const intlSr = intl.sr ?? (stats.intlSr ?? stats.sr ?? 125.0);
  const combinedSr = stats.sr || (intlMatches > 0 ? (iplSr * 0.55 + intlSr * 0.45) : iplSr);

  const iplWkts = ipl.wkts ?? (stats.iplWkts ?? 0);
  const intlWkts = intl.wkts ?? (stats.intlWkts ?? 0);
  const totalWkts = stats.wkts ?? (iplWkts + intlWkts);

  // Effective Bowling Economy considering both IPL & International T20
  const iplEcon = ipl.econ ?? (stats.iplEcon ?? stats.econ ?? 8.5);
  const intlEcon = intl.econ ?? (stats.intlEcon ?? stats.econ ?? 8.5);
  const combinedEcon = stats.econ || (intlMatches > 0 ? (iplEcon * 0.55 + intlEcon * 0.45) : iplEcon);

  const isCapped = Boolean(player.isCapped);
  const baseRating = player.rating || 80;

  // 1. Batting Impact Component (Out of 100)
  // Evaluates both IPL and International strike rate and volume
  const sriIPL = clamp(60 + (iplSr - 110) * 0.75, 45, 100);
  const sriIntl = clamp(60 + (intlSr - 110) * 0.75, 45, 100);
  const sri = intlMatches > 0 ? (sriIPL * 0.55 + sriIntl * 0.45) : sriIPL;

  // Volume & Runs per match (Avg indicator across both IPL & International)
  const rpm = totalRuns / Math.max(1, totalMatches);
  const cai = clamp(50 + (rpm - 14) * 2.8, 45, 100);

  // International Pedigree & High Score Factor
  let hsVal = 50;
  const hsRaw = stats.hs || ipl.hs || intl.hs || 50;
  if (typeof hsRaw === 'string') {
    hsVal = parseInt(hsRaw.replace('*', ''), 10) || 50;
  } else if (typeof hsRaw === 'number') {
    hsVal = hsRaw;
  }
  const intlBatBonus = (intlRuns >= 1500 ? 6 : intlRuns >= 500 ? 3 : 0) + (intlMatches >= 30 ? 2 : 0) + (totalRuns >= 8000 ? 5 : totalRuns >= 3000 ? 3 : 0);
  const cci = clamp(58 + (Math.min(130, hsVal) - 50) * 0.52 + (isCapped ? 6 : 0) + intlBatBonus, 50, 100);
  const emi = clamp(60 + Math.min(40, totalMatches * 0.16), 60, 100);

  const battingScore = clamp(
    Math.round(sri * 0.40 + cai * 0.34 + cci * 0.16 + emi * 0.10)
  );

  // 2. Bowling Impact Component (Out of 100)
  // Evaluates both IPL and International economy and wickets
  const eciIPL = clamp(100 - (iplEcon - 6.0) * 11.0, 45, 100);
  const eciIntl = clamp(100 - (intlEcon - 6.0) * 11.0, 45, 100);
  const eci = intlMatches > 0 ? (eciIPL * 0.55 + eciIntl * 0.45) : eciIPL;

  // Wickets per match across both IPL & International
  const wpm = totalWkts / Math.max(1, totalMatches);
  const wsi = clamp(52 + (wpm - 0.65) * 64, 45, 100);

  // Strike bowler pedigree & international strike bowler bonus
  const intlBowlBonus = (intlWkts >= 60 ? 6 : intlWkts >= 25 ? 3 : 0) + (totalWkts >= 200 ? 5 : totalWkts >= 80 ? 3 : 0);
  const bbi = clamp(65 + (totalWkts >= 120 ? 15 : totalWkts >= 50 ? 8 : 0) + (isCapped ? 6 : 0) + intlBowlBonus, 50, 100);

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
    rawRating = bowlingScore;
  } else if (category === 'allrounder' || role === 'All-Rounder') {
    if (totalWkts >= 40 && totalRuns >= 1000) {
      rawRating = battingScore * 0.50 + bowlingScore * 0.50;
    } else if (totalWkts >= 50) {
      rawRating = bowlingScore * 0.65 + battingScore * 0.35;
    } else {
      rawRating = battingScore * 0.65 + bowlingScore * 0.35;
    }
  } else if (category === 'wicketkeeper' || role === 'WK-Batter') {
    rawRating = battingScore * 0.94 + 6.0;
  } else {
    // Pure Batter
    rawRating = battingScore;
  }

  // Anchor with player's calibrated baseline rating for elite icon differentiation
  const finalRating = clamp(
    Math.round(rawRating * 0.70 + baseRating * 0.30),
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

  // Logistic distribution with temperature scaling of 26.0 points
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
  // Scaled for full 11-player team diff (teams usually differ by 1-5 rating points)
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
