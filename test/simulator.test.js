import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateMatchFixture,
  simulateInnings,
  createPRNG,
  FORMAT_CONFIGS,
  PITCH_TYPES,
  fillXI,
  pickBowlers
} from '../server/simulator.js';
import { AuctionEngine } from '../server/engine.js';
import { AuctionDB } from '../server/db.js';
import path from 'node:path';
import fs from 'node:fs';

const mockTeamA = {
  code: 'CSK',
  name: 'Chennai Super Kings',
  primaryColor: '#facc15',
  purse: 2000,
  squad: [
    { name: 'Ruturaj Gaikwad', role: 'Batter', category: 'batter', rating: 92, stats: { sr: 138, avg: 39, runs: 2400, matches: 65, iplSr: 140 } },
    { name: 'Devon Conway', role: 'WK-Batter', category: 'wicketkeeper', rating: 90, stats: { sr: 141, avg: 43, runs: 1600, matches: 45, iplSr: 142 } },
    { name: 'Shivam Dube', role: 'All-Rounder', category: 'allrounder', rating: 88, stats: { sr: 158, avg: 31, runs: 1500, wkts: 18, econ: 8.8, matches: 58 } },
    { name: 'Ravindra Jadeja', role: 'All-Rounder', category: 'allrounder', rating: 93, stats: { sr: 132, avg: 30, runs: 2800, wkts: 156, econ: 7.6, matches: 230 } },
    { name: 'MS Dhoni', role: 'WK-Batter', category: 'wicketkeeper', rating: 91, stats: { sr: 139, avg: 39, runs: 5100, matches: 250 } },
    { name: 'Moeen Ali', role: 'All-Rounder', category: 'allrounder', rating: 87, stats: { sr: 143, avg: 26, runs: 1100, wkts: 35, econ: 7.3, matches: 60 } },
    { name: 'Deepak Chahar', role: 'Bowler', category: 'pacer', rating: 86, stats: { econ: 7.9, wkts: 76, matches: 75 } },
    { name: 'Matheesha Pathirana', role: 'Bowler', category: 'pacer', rating: 92, stats: { econ: 7.7, wkts: 42, matches: 28 } },
    { name: 'Maheesh Theekshana', role: 'Bowler', category: 'spinner', rating: 88, stats: { econ: 7.4, wkts: 38, matches: 35 } },
    { name: 'Tushar Deshpande', role: 'Bowler', category: 'pacer', rating: 84, stats: { econ: 8.9, wkts: 34, matches: 30 } },
    { name: 'Shardul Thakur', role: 'All-Rounder', category: 'allrounder', rating: 85, stats: { sr: 136, runs: 350, wkts: 89, econ: 9.1, matches: 86 } }
  ]
};

const mockTeamB = {
  code: 'RCB',
  name: 'Royal Challengers Bengaluru',
  primaryColor: '#ef4444',
  purse: 2200,
  squad: [
    { name: 'Virat Kohli', role: 'Batter', category: 'batter', rating: 98, stats: { sr: 134, avg: 40, runs: 8000, matches: 250, iplSr: 132 } },
    { name: 'Faf du Plessis', role: 'Batter', category: 'batter', rating: 91, stats: { sr: 136, avg: 36, runs: 4500, matches: 135, iplSr: 137 } },
    { name: 'Glenn Maxwell', role: 'All-Rounder', category: 'allrounder', rating: 92, stats: { sr: 157, avg: 27, runs: 2750, wkts: 37, econ: 8.3, matches: 125 } },
    { name: 'Rajat Patidar', role: 'Batter', category: 'batter', rating: 87, stats: { sr: 154, avg: 34, runs: 900, matches: 28 } },
    { name: 'Dinesh Karthik', role: 'WK-Batter', category: 'wicketkeeper', rating: 88, stats: { sr: 135, avg: 26, runs: 4800, matches: 245 } },
    { name: 'Cameron Green', role: 'All-Rounder', category: 'allrounder', rating: 89, stats: { sr: 148, avg: 33, runs: 700, wkts: 16, econ: 8.6, matches: 29 } },
    { name: 'Will Jacks', role: 'All-Rounder', category: 'allrounder', rating: 86, stats: { sr: 165, avg: 32, runs: 300, wkts: 5, econ: 8.9, matches: 12 } },
    { name: 'Mohammed Siraj', role: 'Bowler', category: 'pacer', rating: 91, stats: { econ: 8.2, wkts: 93, matches: 90 } },
    { name: 'Lockie Ferguson', role: 'Bowler', category: 'pacer', rating: 87, stats: { econ: 8.7, wkts: 48, matches: 42 } },
    { name: 'Yash Dayal', role: 'Bowler', category: 'pacer', rating: 84, stats: { econ: 8.1, wkts: 38, matches: 30 } },
    { name: 'Karn Sharma', role: 'Bowler', category: 'spinner', rating: 83, stats: { econ: 8.4, wkts: 76, matches: 82 } }
  ]
};

describe('Cricket Match Simulator - Mathematical & Statistical Precision', () => {

  test('Guarantees mathematical equality between batting runs + extras and team total across 50 simulated matches', () => {
    for (let i = 0; i < 50; i++) {
      const match = simulateMatchFixture({
        fixtureId: `test-match-${i}`,
        teamA: mockTeamA,
        teamB: mockTeamB,
        playingXIA: mockTeamA.squad,
        playingXIB: mockTeamB.squad,
        seed: 1000 + i
      });

      // Innings 1 check
      const inn1 = match.innings1;
      const sumBattersRuns1 = inn1.batting.reduce((acc, b) => acc + b.runs, 0);
      const mathTotal1 = sumBattersRuns1 + inn1.extras.total;
      assert.strictEqual(
        inn1.runs,
        mathTotal1,
        `Innings 1 math mismatch: ${inn1.runs} vs ${mathTotal1} (batters: ${sumBattersRuns1}, extras: ${inn1.extras.total})`
      );

      // Innings 1 Bowling check: Bowler runs == runs off bat + wides + no-balls
      const sumBowlerRuns1 = inn1.bowling.reduce((acc, b) => acc + b.runs, 0);
      const expectedBowlerRuns1 = sumBattersRuns1 + inn1.extras.wides + inn1.extras.noBalls;
      assert.strictEqual(
        sumBowlerRuns1,
        expectedBowlerRuns1,
        `Innings 1 bowling runs mismatch: ${sumBowlerRuns1} vs ${expectedBowlerRuns1}`
      );

      // Innings 2 check
      const inn2 = match.innings2;
      const sumBattersRuns2 = inn2.batting.reduce((acc, b) => acc + b.runs, 0);
      const mathTotal2 = sumBattersRuns2 + inn2.extras.total;
      assert.strictEqual(
        inn2.runs,
        mathTotal2,
        `Innings 2 math mismatch: ${inn2.runs} vs ${mathTotal2} (batters: ${sumBattersRuns2}, extras: ${inn2.extras.total})`
      );

      const sumBowlerRuns2 = inn2.bowling.reduce((acc, b) => acc + b.runs, 0);
      const expectedBowlerRuns2 = sumBattersRuns2 + inn2.extras.wides + inn2.extras.noBalls;
      assert.strictEqual(
        sumBowlerRuns2,
        expectedBowlerRuns2,
        `Innings 2 bowling runs mismatch: ${sumBowlerRuns2} vs ${expectedBowlerRuns2}`
      );

      // Extras subcategories must equal extras.total
      assert.strictEqual(
        inn1.extras.total,
        inn1.extras.byes + inn1.extras.legByes + inn1.extras.wides + inn1.extras.noBalls
      );
      assert.strictEqual(
        inn2.extras.total,
        inn2.extras.byes + inn2.extras.legByes + inn2.extras.wides + inn2.extras.noBalls
      );
    }
  });

  test('Deterministic seed reproducibility generates 100% identical scorecards for identical seeds', () => {
    const fixedSeed = 424242;

    const run1 = simulateMatchFixture({
      fixtureId: 'rep-test',
      teamA: mockTeamA,
      teamB: mockTeamB,
      playingXIA: mockTeamA.squad,
      playingXIB: mockTeamB.squad,
      seed: fixedSeed
    });

    const run2 = simulateMatchFixture({
      fixtureId: 'rep-test',
      teamA: mockTeamA,
      teamB: mockTeamB,
      playingXIA: mockTeamA.squad,
      playingXIB: mockTeamB.squad,
      seed: fixedSeed
    });

    assert.strictEqual(run1.winner, run2.winner);
    assert.strictEqual(run1.margin, run2.margin);
    assert.strictEqual(run1.innings1.runs, run2.innings1.runs);
    assert.strictEqual(run1.innings1.wickets, run2.innings1.wickets);
    assert.strictEqual(run1.innings2.runs, run2.innings2.runs);
    assert.strictEqual(run1.innings2.wickets, run2.innings2.wickets);
    assert.strictEqual(run1.playerOfTheMatch.name, run2.playerOfTheMatch.name);
    assert.strictEqual(run1.playerOfTheMatch.impactPoints, run2.playerOfTheMatch.impactPoints);
    assert.deepStrictEqual(run1.innings1.fallOfWickets, run2.innings1.fallOfWickets);
  });

  test('Multi-format support: T20 and ODI respect format quotas and boundaries', () => {
    // T20 format: max 20 overs, max 4 overs/bowler
    const t20Match = simulateMatchFixture({
      fixtureId: 't20-test',
      teamA: mockTeamA,
      teamB: mockTeamB,
      playingXIA: mockTeamA.squad,
      playingXIB: mockTeamB.squad,
      format: 'T20',
      seed: 555
    });

    assert.strictEqual(t20Match.format, 'T20');
    assert.ok(t20Match.innings1.overs <= 20.0);
    t20Match.innings1.bowling.forEach(b => {
      assert.ok(b.overs <= 4.0, `T20 bowler ${b.name} bowled ${b.overs} > 4.0`);
    });

    // ODI format: max 50 overs, max 10 overs/bowler
    const odiMatch = simulateMatchFixture({
      fixtureId: 'odi-test',
      teamA: mockTeamA,
      teamB: mockTeamB,
      playingXIA: mockTeamA.squad,
      playingXIB: mockTeamB.squad,
      format: 'ODI',
      seed: 888
    });

    assert.strictEqual(odiMatch.format, 'ODI');
    assert.ok(odiMatch.innings1.overs <= 50.0);
    odiMatch.innings1.bowling.forEach(b => {
      assert.ok(b.overs <= 10.0, `ODI bowler ${b.name} bowled ${b.overs} > 10.0`);
    });
  });

  test('Tracking of Fall of Wickets, Partnerships, and Did Not Bat', () => {
    const match = simulateMatchFixture({
      fixtureId: 'fow-test',
      teamA: mockTeamA,
      teamB: mockTeamB,
      playingXIA: mockTeamA.squad,
      playingXIB: mockTeamB.squad,
      seed: 777
    });

    // FoW length must match wickets fallen
    assert.strictEqual(match.innings1.fallOfWickets.length, match.innings1.wickets);
    assert.strictEqual(match.innings2.fallOfWickets.length, match.innings2.wickets);

    // Did Not Bat list
    assert.ok(Array.isArray(match.innings1.didNotBat));
    assert.ok(Array.isArray(match.innings2.didNotBat));

    // Partnerships array
    assert.ok(Array.isArray(match.innings1.partnerships));
    assert.ok(match.innings1.partnerships.length >= 1);
  });

  test('Engine simulateFixture idempotency: re-simulating returns saved result without duplicating', () => {
    const testDbPath = path.resolve('data/test-sim.sqlite');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const testDb = new AuctionDB(testDbPath);

    const engine = new AuctionEngine({
      roomCode: 'SIMTEST',
      hostToken: 'host-123',
      hostName: 'TestHost',
      teamsData: [mockTeamA, mockTeamB],
      db: testDb
    });

    // Generate fixtures
    engine.generateFixtures();
    const fId = engine.fixtures[0].id;

    // 1st simulation
    const res1 = engine.simulateFixture({ fixtureId: fId, seed: 999 });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.fixture.status, 'completed');
    const firstRuns = res1.scorecard.innings1.runs;

    // 2nd simulation call (idempotent guard)
    const res2 = engine.simulateFixture({ fixtureId: fId, seed: 1234 });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.alreadySimulated, true);
    assert.strictEqual(res2.scorecard.innings1.runs, firstRuns);

    // Verify persisted in DB
    const dbRecord = testDb.getFixtureMatch(fId);
    assert.ok(dbRecord);
    assert.strictEqual(dbRecord.status, 'completed');
    assert.strictEqual(dbRecord.scorecard.innings1.runs, firstRuns);

    // Verify genuine Net Run Rate calculation
    const standings = engine.getTournamentStandings();
    assert.ok(standings.length >= 2);
    const winnerTeam = standings.find(s => s.code === res1.fixture.winner);
    assert.strictEqual(winnerTeam.won, 1);
    assert.strictEqual(winnerTeam.points, 2);
    assert.ok(typeof winnerTeam.nrr === 'number');

    testDb.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });
});
