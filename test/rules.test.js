import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBidIncrement,
  calculateNextBid,
  calculateMaxPermissibleBid,
  validateBid,
  formatLakhs
} from '../server/rules.js';

describe('Auction Rules & Solvency Tests', () => {
  test('formatLakhs formats values correctly in Cr and L', () => {
    assert.equal(formatLakhs(30), '₹30 L');
    assert.equal(formatLakhs(75), '₹75 L');
    assert.equal(formatLakhs(100), '₹1 Cr');
    assert.equal(formatLakhs(250), '₹2.5 Cr');
    assert.equal(formatLakhs(12000), '₹120 Cr');
    assert.equal(formatLakhs(2475), '₹24.75 Cr');
  });

  test('getBidIncrement applies tiered increments correctly', () => {
    assert.equal(getBidIncrement(30), 5);
    assert.equal(getBidIncrement(75), 10);
    assert.equal(getBidIncrement(150), 20);
    assert.equal(getBidIncrement(350), 25);
    assert.equal(getBidIncrement(500), 50);
    assert.equal(getBidIncrement(1200), 50);
  });

  test('calculateNextBid starts with base price and then increments', () => {
    // Opening bid is base price
    assert.equal(calculateNextBid(0, 200, false), 200);
    // Subsequent bids add increment
    assert.equal(calculateNextBid(200, 200, true), 225); // +25 for >= 200
    assert.equal(calculateNextBid(475, 200, true), 500); // +25
    assert.equal(calculateNextBid(500, 200, true), 550); // +50
  });

  test('calculateMaxPermissibleBid reserves enough purse for min squad', () => {
    // 12000 purse, 0 squad, minSquad 18, basePrice 30
    // after winning player: squad will be 1, remaining slots needed = 17
    // reserve needed = 17 * 30 = 510 L
    // max bid = 12000 - 510 = 11490 L
    const maxBid = calculateMaxPermissibleBid(12000, 0, { minSquad: 18, minPlayerBasePrice: 30 });
    assert.equal(maxBid, 11490);

    // If already has 17 players, winning 1 more reaches 18!
    // remaining slots needed = 0, reserve = 0
    // can bid entire purse!
    const maxBidNearEnd = calculateMaxPermissibleBid(500, 17, { minSquad: 18, minPlayerBasePrice: 30 });
    assert.equal(maxBidNearEnd, 500);
  });

  test('validateBid blocks bids that violate solvency', () => {
    const team = {
      code: 'CSK',
      purse: 600, // ₹6 Cr
      squad: [], // 0 players
      overseasCount: 0
    };
    const player = {
      id: 'p-1',
      name: 'Rishabh Pant',
      basePrice: 200,
      isOverseas: false
    };

    // Need 17 slots after this player @ 30L = 510L reserve
    // Team has 600L. Max allowed bid is 600 - 510 = 90L!
    // A bid of 200L should fail solvency!
    const result = validateBid({
      roomState: 'active',
      team,
      player,
      proposedBid: 200,
      currentLeaderTeamCode: null,
      config: { minSquad: 18, minPlayerBasePrice: 30 }
    });

    assert.equal(result.valid, false);
    assert.match(result.reason, /Solvency violation/);
  });

  test('validateBid permits bids that pass all rules', () => {
    const team = {
      code: 'RCB',
      purse: 12000,
      squad: [],
      overseasCount: 0
    };
    const player = {
      id: 'p-1',
      name: 'Rishabh Pant',
      basePrice: 200,
      isOverseas: false
    };

    const result = validateBid({
      roomState: 'active',
      team,
      player,
      proposedBid: 200,
      currentLeaderTeamCode: null,
      config: { minSquad: 18, minPlayerBasePrice: 30 }
    });

    assert.equal(result.valid, true);
    assert.equal(result.nextBid, 200);
  });

  test('validateBid rejects self-outbidding', () => {
    const team = { code: 'RCB', purse: 10000, squad: [], overseasCount: 0 };
    const player = { id: 'p-1', name: 'Rishabh Pant', basePrice: 200, isOverseas: false };

    const result = validateBid({
      roomState: 'active',
      team,
      player,
      proposedBid: 225,
      currentLeaderTeamCode: 'RCB' // RCB already leads
    });

    assert.equal(result.valid, false);
    assert.match(result.reason, /already holds the highest bid/);
  });

  test('validateBid rejects overseas player if overseas cap reached', () => {
    const team = { code: 'MI', purse: 5000, squad: new Array(8).fill({}), overseasCount: 8 };
    const player = { id: 'p-5', name: 'Mitchell Starc', basePrice: 200, isOverseas: true };

    const result = validateBid({
      roomState: 'active',
      team,
      player,
      proposedBid: 200,
      currentLeaderTeamCode: null,
      config: { maxOverseas: 8 }
    });

    assert.equal(result.valid, false);
    assert.match(result.reason, /Overseas player cap reached/);
  });

  test('validateBid rejects bid if squad is full', () => {
    const team = { code: 'KKR', purse: 5000, squad: new Array(25).fill({}), overseasCount: 4 };
    const player = { id: 'p-2', name: 'Shreyas Iyer', basePrice: 200, isOverseas: false };

    const result = validateBid({
      roomState: 'active',
      team,
      player,
      proposedBid: 200,
      currentLeaderTeamCode: null,
      config: { maxSquad: 25 }
    });

    assert.equal(result.valid, false);
    assert.match(result.reason, /Squad limit reached/);
  });
});
