import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AuctionEngine } from '../server/engine.js';

const mockTeams = [
  { code: 'CSK', name: 'Chennai Super Kings', primaryColor: '#F4C20D' },
  { code: 'RCB', name: 'Royal Challengers Bengaluru', primaryColor: '#D1121B' },
  { code: 'MI', name: 'Mumbai Indians', primaryColor: '#0B8EC9' }
];

const mockPlayers = [
  { id: 'p-1', name: 'Virat Kohli', role: 'Batter', country: 'India', basePrice: 200, set: 'M1', isOverseas: false, isCapped: true },
  { id: 'p-2', name: 'Jasprit Bumrah', role: 'Bowler', country: 'India', basePrice: 200, set: 'M1', isOverseas: false, isCapped: true }
];

describe('AuctionEngine State Machine Tests', () => {
  test('Engine initializes in lobby and allows claiming team', () => {
    const events = [];
    const engine = new AuctionEngine({
      roomCode: 'TEST1',
      hostToken: 'host-123',
      hostName: 'Admin',
      teamsData: mockTeams,
      playersData: mockPlayers,
      emit: (evt, data) => events.push({ evt, data })
    });

    const snapshot = engine.getStateSnapshot();
    assert.equal(snapshot.status, 'lobby');
    assert.equal(snapshot.teams.length, 3);

    // Claim CSK
    const claimRes = engine.claimTeam('CSK', { userToken: 'user-1', userName: 'Aarav' });
    assert.equal(claimRes.success, true);
    assert.equal(claimRes.team.userName, 'Aarav');

    // Attempt to claim CSK by another user should fail
    const conflictRes = engine.claimTeam('CSK', { userToken: 'user-2', userName: 'Bob' });
    assert.equal(conflictRes.success, false);
  });

  test('Start auction presents first player and allows bids', () => {
    const events = [];
    const engine = new AuctionEngine({
      roomCode: 'TEST2',
      hostToken: 'host-123',
      hostName: 'Admin',
      config: { timerDuration: 10, botsEnabled: false },
      teamsData: mockTeams,
      playersData: mockPlayers,
      emit: (evt, data) => events.push({ evt, data })
    });

    engine.claimTeam('CSK', { userToken: 'user-1', userName: 'Aarav' });
    engine.claimTeam('RCB', { userToken: 'user-2', userName: 'ViratFan' });

    const startRes = engine.startAuction();
    assert.equal(startRes.success, true);
    assert.equal(engine.status, 'active');
    assert.equal(engine.currentPlayer.name, 'Virat Kohli');
    assert.equal(engine.currentBid, 200);

    // Place opening bid by CSK
    const bid1 = engine.placeBid({ teamCode: 'CSK', userToken: 'user-1' });
    assert.equal(bid1.success, true);
    assert.equal(bid1.amount, 200);
    assert.equal(engine.leadTeam, 'CSK');

    // CSK tries to self-outbid -> rejected
    const bid2 = engine.placeBid({ teamCode: 'CSK', userToken: 'user-1' });
    assert.equal(bid2.success, false);

    // RCB bids -> incremented to 225
    const bid3 = engine.placeBid({ teamCode: 'RCB', userToken: 'user-2' });
    assert.equal(bid3.success, true);
    assert.equal(bid3.amount, 225);
    assert.equal(engine.leadTeam, 'RCB');

    // Test Undo Last Bid
    assert.equal(engine.lastBidSnapshot !== null, true);
    const undoRes = engine.undoLastBid();
    assert.equal(undoRes.success, true);
    assert.equal(engine.currentBid, 200);
    assert.equal(engine.leadTeam, 'CSK');

    engine.destroy();
  });

  test('Immediate sellNow awards player and deducts purse', () => {
    const engine = new AuctionEngine({
      roomCode: 'TEST3',
      hostToken: 'host-123',
      hostName: 'Admin',
      config: { timerDuration: 10, botsEnabled: false },
      teamsData: mockTeams,
      playersData: mockPlayers,
      emit: () => {}
    });

    engine.claimTeam('CSK', { userToken: 'user-1', userName: 'Aarav' });
    engine.startAuction();

    engine.placeBid({ teamCode: 'CSK', userToken: 'user-1' });
    engine.sellNow();

    const csk = engine.teams.get('CSK');
    assert.equal(csk.squad.length, 1);
    assert.equal(csk.squad[0].name, 'Virat Kohli');
    assert.equal(csk.purse, 12000 - 200);

    engine.destroy();
  });

  test('Bots configuration and safe sellNow guard tests', () => {
    const engine = new AuctionEngine({
      roomCode: 'TEST4',
      hostToken: 'host-123',
      hostName: 'Admin',
      config: { timerDuration: 10, botsEnabled: false },
      teamsData: mockTeams,
      playersData: mockPlayers,
      emit: () => {}
    });

    // Verify sellNow in lobby does not crash
    const earlySell = engine.sellNow();
    assert.equal(earlySell.success, false);

    // Claim CSK as human
    engine.claimTeam('CSK', { userToken: 'user-1', userName: 'Aarav' });

    // Start auction with bots disabled
    engine.startAuction();

    // Verify RCB and MI are NOT bots
    assert.equal(engine.teams.get('RCB').isBot, false);
    assert.equal(engine.teams.get('MI').isBot, false);

    // Host toggles bots ON
    engine.updateConfig({ botsEnabled: true });
    assert.equal(engine.teams.get('RCB').isBot, true);
    assert.equal(engine.teams.get('MI').isBot, true);

    // Host toggles bots OFF
    engine.updateConfig({ botsEnabled: false });
    assert.equal(engine.teams.get('RCB').isBot, false);
    assert.equal(engine.teams.get('MI').isBot, false);

    // Test nextPlayer advances to next player
    const firstPlayerId = engine.currentPlayer.id;
    const nextRes = engine.nextPlayer();
    assert.equal(nextRes.success, true);

    engine.destroy();
  });

  test('skipPlayer / unsold does not double-increment player index', () => {
    const queue = [
      { id: 'p-1', name: 'Player One', role: 'Batter', category: 'batter', basePrice: 100 },
      { id: 'p-2', name: 'Player Two', role: 'Bowler', category: 'pacer', basePrice: 100 },
      { id: 'p-3', name: 'Player Three', role: 'All-Rounder', category: 'allrounder', basePrice: 100 },
      { id: 'p-4', name: 'Player Four', role: 'WK-Batter', category: 'wicketkeeper', basePrice: 100 }
    ];

    const engine = new AuctionEngine({
      roomCode: 'TEST-UNSOLD',
      hostToken: 'host-1',
      hostName: 'Host',
      config: { timerDuration: 10, botsEnabled: false },
      teamsData: mockTeams,
      playersData: queue,
      emit: () => {}
    });

    engine.startAuction();
    assert.equal(engine.currentPlayerIndex, 0);
    assert.equal(engine.currentPlayer.name, 'Player One');

    // Click unsold / skip on Player One
    engine.skipPlayer();
    assert.equal(engine.isTransitioning, true);

    // Host clicks unsold AGAIN immediately while transition is pending
    engine.skipPlayer();

    // Exactly 1 player should have been advanced, reaching Player Two
    assert.equal(engine.currentPlayerIndex, 1);
    assert.equal(engine.currentPlayer.name, 'Player Two');

    // Skip Player Two
    engine.skipPlayer();
    assert.equal(engine.isTransitioning, true);
    // Click nextPlayer during transition
    engine.nextPlayer();
    assert.equal(engine.currentPlayerIndex, 2);
    assert.equal(engine.currentPlayer.name, 'Player Three');

    engine.destroy();
  });

  test('endAuction completes auction, populates Playing XI, and handles Battle Arena voting', () => {
    const queue = [
      { id: 'p-1', name: 'Player One', role: 'Batter', category: 'batter', basePrice: 100 },
      { id: 'p-2', name: 'Player Two', role: 'Bowler', category: 'pacer', basePrice: 100 }
    ];

    const engine = new AuctionEngine({
      roomCode: 'TEST-BATTLE',
      hostToken: 'host-1',
      hostName: 'Host',
      config: { timerDuration: 10, botsEnabled: false },
      teamsData: mockTeams,
      playersData: queue,
      emit: () => {}
    });

    engine.claimTeam('CSK', { userToken: 'user-csk', userName: 'CSK Manager' });
    engine.claimTeam('MI', { userToken: 'user-mi', userName: 'MI Manager' });
    engine.claimTeam('RCB', { userToken: 'user-rcb', userName: 'RCB Manager' });

    engine.startAuction();
    assert.equal(engine.status, 'active');

    // Host calls endAuction
    const endRes = engine.endAuction();
    assert.equal(endRes.success, true);
    assert.equal(engine.status, 'completed');

    // Playing XI should be auto-initialized
    const cskTeam = engine.teams.get('CSK');
    assert.ok(Array.isArray(cskTeam.playingXI));

    // Custom setPlayingXI
    const customXI = [{ id: 'p-1', name: 'Player One', role: 'Batter' }];
    const setRes = engine.setPlayingXI('CSK', { userToken: 'user-csk', playingXI: customXI });
    assert.equal(setRes.success, true);
    assert.equal(cskTeam.playingXI.length, 1);

    // Initiate Battle CSK vs MI
    const battleRes = engine.initiateBattle({ teamA: 'CSK', teamB: 'MI', userToken: 'host-1' });
    assert.equal(battleRes.success, true);
    assert.equal(engine.activeBattle.teamA, 'CSK');
    assert.equal(engine.activeBattle.teamB, 'MI');

    // Competing manager (CSK) tries to vote -> rejected (neutral remaining teams vote)
    const selfVoteRes = engine.castBattleVote({
      slotIndex: 0,
      voteTeamCode: 'CSK',
      userToken: 'user-csk',
      voterTeamCode: 'CSK'
    });
    assert.equal(selfVoteRes.success, false);

    // Neutral manager (RCB) votes for CSK in Slot 0 -> accepted
    const neutralVoteRes = engine.castBattleVote({
      slotIndex: 0,
      voteTeamCode: 'CSK',
      userToken: 'user-rcb',
      voterTeamCode: 'RCB'
    });
    assert.equal(neutralVoteRes.success, true);
    assert.equal(engine.activeBattle.votes['0']['user-rcb'].voteTeamCode, 'CSK');

    engine.destroy();
  });
});
