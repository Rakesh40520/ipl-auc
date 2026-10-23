/**
 * Auction Bidding Rules & Solvency Engine for IPL Auction
 *
 * All amounts are in Lakhs (INR) unless noted.
 * 1 Crore (Cr) = 100 Lakhs (L).
 * E.g., 200 = ₹2.00 Cr, 20 = ₹20 Lakhs, 12000 = ₹120.00 Cr.
 */

export const DEFAULT_CONFIG = {
  defaultPurse: 12000, // 120 Cr in Lakhs
  minSquad: 18,
  maxSquad: 25,
  maxOverseas: 8,
  minPlayerBasePrice: 30, // 30 Lakhs
  timerDuration: 10, // seconds
  rtmEnabled: false,
  botsEnabled: true
};

/**
 * Official IPL Bid Increments:
 * - Below 6 Cr (< 600 Lakhs): +10 Lakhs increment
 * - 6 Cr and above (>= 600 Lakhs): +25 Lakhs increment
 */
export function getBidIncrement(currentBidAmount) {
  if (currentBidAmount < 600) {
    return 10;
  }
  return 25;
}

/**
 * Calculates next minimum bid for a player.
 * If no bid yet, next bid is the player's base price.
 */
export function calculateNextBid(currentBid, basePrice, hasExistingBid = false) {
  if (!hasExistingBid || currentBid === 0) {
    return basePrice;
  }
  return currentBid + getBidIncrement(currentBid);
}

/**
 * Calculates the maximum bid a team can legally place while maintaining
 * solvency to fill their squad up to `minSquad` at `minPlayerBasePrice`.
 */
export function calculateMaxPermissibleBid(teamPurse, squadSize, config = DEFAULT_CONFIG) {
  const minSquad = config.minSquad ?? DEFAULT_CONFIG.minSquad;
  const minBasePrice = config.minPlayerBasePrice ?? DEFAULT_CONFIG.minPlayerBasePrice;

  // After winning this player, the team's squad size will be squadSize + 1
  const remainingSlotsNeeded = Math.max(0, minSquad - (squadSize + 1));
  const reserveNeeded = remainingSlotsNeeded * minBasePrice;

  return Math.max(0, teamPurse - reserveNeeded);
}

/**
 * Comprehensive bid validator.
 * Returns { valid: true, nextBid: number } OR { valid: false, reason: string }
 */
export function validateBid({
  roomState,
  team,
  player,
  proposedBid,
  currentLeaderTeamCode,
  config = DEFAULT_CONFIG
}) {
  if (roomState !== 'active') {
    return { valid: false, reason: `Auction is currently ${roomState || 'inactive'}` };
  }

  if (!team) {
    return { valid: false, reason: 'Invalid or unassigned team' };
  }

  if (!player) {
    return { valid: false, reason: 'No player is currently on the auction block' };
  }

  // 1. Self-outbid check
  if (currentLeaderTeamCode && currentLeaderTeamCode === team.code) {
    return { valid: false, reason: 'Your franchise already holds the highest bid' };
  }

  // 2. Maximum squad limit check
  const maxSquad = config.maxSquad ?? DEFAULT_CONFIG.maxSquad;
  const currentSquadCount = team.squad?.length || 0;
  if (currentSquadCount >= maxSquad) {
    return { valid: false, reason: `Squad limit reached (${maxSquad} players)` };
  }

  // 3. Overseas limit check
  const maxOverseas = config.maxOverseas ?? DEFAULT_CONFIG.maxOverseas;
  const currentOverseasCount = team.overseasCount ?? (team.squad?.filter(p => p.isOverseas)?.length || 0);
  if (player.isOverseas && currentOverseasCount >= maxOverseas) {
    return { valid: false, reason: `Overseas player cap reached (${maxOverseas} players)` };
  }

  // 4. Raw purse check
  if (proposedBid > team.purse) {
    return {
      valid: false,
      reason: `Insufficient purse. Required: ₹${formatLakhs(proposedBid)}, Available: ₹${formatLakhs(team.purse)}`
    };
  }

  // 5. Solvency Rule: must be able to fill min squad
  const minSquad = config.minSquad ?? DEFAULT_CONFIG.minSquad;
  const minBasePrice = config.minPlayerBasePrice ?? DEFAULT_CONFIG.minPlayerBasePrice;
  const remainingSlots = Math.max(0, minSquad - (currentSquadCount + 1));
  const reserveNeeded = remainingSlots * minBasePrice;
  const maxAllowedBid = team.purse - reserveNeeded;

  if (proposedBid > maxAllowedBid) {
    return {
      valid: false,
      reason: `Solvency violation: Maximum allowable bid is ₹${formatLakhs(maxAllowedBid)}. You must reserve at least ₹${formatLakhs(reserveNeeded)} to complete the minimum squad of ${minSquad} players.`
    };
  }

  return { valid: true, nextBid: proposedBid };
}

/**
 * Format Lakhs into Indian Currency notation:
 * E.g., 200 -> "₹2 Cr", 250 -> "₹2.5 Cr", 30 -> "₹30 L"
 */
export function formatLakhs(lakhs) {
  if (lakhs == null || isNaN(lakhs)) return '₹0';
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    const formatted = cr % 1 === 0 ? cr.toString() : cr.toFixed(2).replace(/\.?0+$/, '');
    return `₹${formatted} Cr`;
  }
  return `₹${lakhs} L`;
}
