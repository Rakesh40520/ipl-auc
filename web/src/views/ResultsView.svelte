<script>
  import { store } from '../lib/store.svelte.js';
  import { formatLakhs, getFranchise } from '../lib/utils.js';
  import {
    Trophy,
    Share2,
    Check,
    RotateCcw,
    Award,
    Globe,
    Flame,
    Swords,
    Users,
    Shield,
    Zap,
    AlertCircle,
    CheckCircle2,
    X,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Calendar,
    TableProperties,
    Play,
    Radio,
    Timer,
    Lock,
    Eye,
    EyeOff,
    Crown,
    Cpu,
    BarChart2,
    Star,
    ChevronDown,
    Shuffle
  } from 'lucide-svelte';

  // Sub-navigation tab: 'fixtures' | 'battle' | 'xi' | 'overview'
  let activeTab = $state(
    store.roomState.status === 'playing_xi_selection' ? 'xi' : 'fixtures'
  );
  let fixturesSubTab = $state('fixtures'); // 'fixtures' | 'standings'
  let roundFilter = $state('all');
  let copied = $state(false);

  // Scorecard modal state for AI Math Simulation
  let selectedScorecardFixture = $state(null);
  let scorecardInningsTab = $state('inn1'); // 'inn1' | 'inn2'
  const matchMode = $derived(store.roomState.matchMode || 'voting');

  // Spectator identification & permissions
  const isSpectator = $derived(!store.myTeamCode);
  const spectatorsCanVote = $derived(store.roomState.spectatorsCanVote ?? true);

  // Playing XI Phase status & readiness
  const isXISelectionPhase = $derived(store.roomState.status === 'playing_xi_selection');
  const xiTimer = $derived(store.roomState.xiTimer ?? 90);

  const humanTeams = $derived(
    store.roomState.teams?.filter(t => t.userToken && !t.isBot) || []
  );

  const confirmedHumanTeams = $derived(
    humanTeams.filter(t => t.isXIConfirmed)
  );

  const allTeamsConfirmed = $derived(
    store.roomState.allTeamsXIConfirmed ||
    (humanTeams.length > 0 && confirmedHumanTeams.length === humanTeams.length)
  );

  // --- PLAYING XI STATE ---
  let selectedTeamCode = $state(
    store.myTeamCode || store.roomState.teams?.[0]?.code || 'CSK'
  );

  const selectedTeam = $derived(
    store.roomState.teams?.find(t => t.code === selectedTeamCode) || store.roomState.teams?.[0]
  );

  const isCurrentTeamConfirmed = $derived(
    Boolean(selectedTeam?.isXIConfirmed)
  );

  const isMyTeamOrHost = $derived(
    Boolean(store.myTeamCode === selectedTeam?.code || store.isHost)
  );

  // Local copy of Playing XI for editing
  let localXI = $state([]);

  $effect(() => {
    if (selectedTeam) {
      localXI = [...(selectedTeam.playingXI || [])];
    }
  });

  const positionLabels = [
    { num: 1, role: 'Opener #1', desc: 'Opening Batter / WK' },
    { num: 2, role: 'Opener #2', desc: 'Opening Batter' },
    { num: 3, role: 'Top Order #3', desc: 'Anchor / Top Order' },
    { num: 4, role: 'Top Order #4', desc: 'Middle Order Specialist' },
    { num: 5, role: 'Middle Order #5', desc: 'Middle Order / Wicketkeeper' },
    { num: 6, role: 'Finisher #6', desc: 'Power Finisher / All-Rounder' },
    { num: 7, role: 'All-Rounder #7', desc: 'Dual-Threat All-Rounder' },
    { num: 8, role: 'All-Rounder #8', desc: 'Bowling All-Rounder' },
    { num: 9, role: 'Strike Bowler #9', desc: 'Primary Strike Bowler' },
    { num: 10, role: 'Bowler #10', desc: 'Specialist Pacer / Spinner' },
    { num: 11, role: 'Death Bowler #11', desc: 'Death Overs Specialist' }
  ];

  const overseasInXI = $derived(localXI.filter(p => p && p.isOverseas).length);
  const wksInXI = $derived(localXI.filter(p => p && (p.category === 'wicketkeeper' || p.role === 'WK-Batter')).length);

  const unassignedSquad = $derived.by(() => {
    const squad = selectedTeam?.squad || [];
    const assignedIds = new Set(localXI.filter(Boolean).map(p => p.id));
    return squad.filter(p => !assignedIds.has(p.id));
  });

  function removeSlot(idx) {
    if (!isMyTeamOrHost) return;
    localXI.splice(idx, 1);
  }

  function assignPlayer(player) {
    if (!isMyTeamOrHost) return;
    if (localXI.length >= 11) {
      store.notify('Playing XI is full (11 players maximum). Remove a slot first.');
      return;
    }
    if (player.isOverseas && overseasInXI >= 4) {
      store.notify('Overseas limit reached (Maximum 4 overseas allowed in Playing XI).');
      return;
    }
    localXI.push(player);
  }

  function autoPickOptimalXI() {
    const squad = selectedTeam?.squad || [];
    if (squad.length === 0) return;

    const chosen = [];
    let overseas = 0;

    const canTake = (p) => {
      if (chosen.some(c => c.id === p.id)) return false;
      if (p.isOverseas && overseas >= 4) return false;
      return true;
    };

    const pick = (p) => {
      chosen.push(p);
      if (p.isOverseas) overseas++;
    };

    // 1. Mandatory WK
    const wks = squad.filter(p => (p.category === 'wicketkeeper' || p.role === 'WK-Batter') && canTake(p));
    if (wks.length > 0) pick(wks[0]);

    // 2. Pure Batters (up to 4)
    const batters = squad.filter(p => (p.category === 'batter' || p.role === 'Batter') && canTake(p));
    for (const b of batters.slice(0, 4)) {
      if (canTake(b) && chosen.length < 11) pick(b);
    }

    // 3. All-Rounders (up to 2)
    const allrounders = squad.filter(p => (p.category === 'allrounder' || p.role === 'All-Rounder') && canTake(p));
    for (const ar of allrounders.slice(0, 2)) {
      if (canTake(ar) && chosen.length < 11) pick(ar);
    }

    // 4. Fast Bowlers / Pacers (up to 2)
    const pacers = squad.filter(p => (p.category === 'pacer' || p.bowlingType === 'Pace') && canTake(p));
    for (const pac of pacers.slice(0, 2)) {
      if (canTake(pac) && chosen.length < 11) pick(pac);
    }

    // 5. Spinners (up to 2)
    const spinners = squad.filter(p => (p.category === 'spinner' || p.bowlingType === 'Spin') && canTake(p));
    for (const spin of spinners.slice(0, 2)) {
      if (canTake(spin) && chosen.length < 11) pick(spin);
    }

    // 6. Fill remaining slots respecting overseas cap
    for (const p of squad) {
      if (chosen.length >= 11) break;
      if (canTake(p)) pick(p);
    }

    // 7. Fallback fill if squad has slots remaining
    if (chosen.length < 11) {
      for (const p of squad) {
        if (chosen.length >= 11) break;
        if (!chosen.some(c => c.id === p.id)) chosen.push(p);
      }
    }

    localXI = chosen;
    store.notify(`Auto-picked optimal ${chosen.length} players for ${selectedTeam.name}!`);
  }

  async function savePlayingXI() {
    if (!selectedTeam) return;
    await store.setPlayingXI(selectedTeam.code, localXI, false);
  }

  async function lockInPlayingXI() {
    if (!selectedTeam) return;
    if (localXI.length < 11) {
      store.notify(`Please select 11 players before locking in (currently ${localXI.length}/11).`);
      return;
    }
    await store.setPlayingXI(selectedTeam.code, localXI, true);
  }

  async function handleAdvanceToFixtures() {
    await store.advanceToFixtures();
    activeTab = 'fixtures';
  }

  async function handleToggleSpectators() {
    await store.toggleSpectatorVoting();
  }

  // --- BATTLE ARENA STATE ---
  let battleTeamA = $state(store.roomState.teams?.[0]?.code || 'CSK');
  let battleTeamB = $state(store.roomState.teams?.[1]?.code || 'MI');

  const activeBattle = $derived(store.roomState.activeBattle);

  const teamAObj = $derived(
    store.roomState.teams?.find(t => t.code === activeBattle?.teamA)
  );
  const teamBObj = $derived(
    store.roomState.teams?.find(t => t.code === activeBattle?.teamB)
  );

  // Determine whether current user is permitted to vote
  const canVote = $derived.by(() => {
    if (!activeBattle) return false;
    if (isSpectator) {
      return spectatorsCanVote;
    }
    // If more than 2 human franchises, contenders cannot vote (neutral remaining teams vote)
    if (humanTeams.length > 2) {
      return store.myTeamCode !== activeBattle.teamA && store.myTeamCode !== activeBattle.teamB;
    }
    // If 2 or fewer players, allow anyone to vote
    return true;
  });

  const remainingTeams = $derived(
    store.roomState.teams?.filter(t => t.code !== activeBattle?.teamA && t.code !== activeBattle?.teamB) || []
  );

  // Calculate battle scores for Team A vs Team B across all 11 slots
  const battleScores = $derived.by(() => {
    if (!activeBattle) return { teamAWins: 0, teamBWins: 0, ties: 0, slotWinners: [] };
    let aWins = 0;
    let bWins = 0;
    let ties = 0;
    const slotWinners = [];

    for (let i = 0; i < 11; i++) {
      const slotVotes = activeBattle.votes?.[String(i)] || {};
      let aVotes = 0;
      let bVotes = 0;

      for (const voterToken in slotVotes) {
        const v = slotVotes[voterToken];
        if (v.voteTeamCode === activeBattle.teamA) aVotes++;
        if (v.voteTeamCode === activeBattle.teamB) bVotes++;
      }

      let winner = null;
      if (aVotes > bVotes) {
        winner = activeBattle.teamA;
        aWins++;
      } else if (bVotes > aVotes) {
        winner = activeBattle.teamB;
        bWins++;
      } else if (aVotes > 0 && aVotes === bVotes) {
        winner = 'TIE';
        ties++;
      }

      slotWinners.push({
        slotIndex: i,
        aVotes,
        bVotes,
        winner,
        totalVotes: aVotes + bVotes
      });
    }

    return {
      teamAWins: aWins,
      teamBWins: bWins,
      ties,
      slotWinners
    };
  });

  function hasVotedForSlot(slotIdx, teamCode) {
    if (!activeBattle) return false;
    const slotVotes = activeBattle.votes?.[String(slotIdx)];
    if (!slotVotes) return false;
    return slotVotes[store.userToken]?.voteTeamCode === teamCode;
  }

  function castVote(slotIdx, teamCode) {
    store.castBattleVote(slotIdx, teamCode);
  }

  function hasVotedForSuperOver(teamCode) {
    if (!activeBattle || !activeBattle.superOverVotes) return false;
    return activeBattle.superOverVotes[store.userToken]?.voteTeamCode === teamCode;
  }

  function castSuperOverVote(teamCode) {
    store.castBattleVote(0, teamCode, true);
  }

  const superOverScores = $derived.by(() => {
    if (!activeBattle || !activeBattle.superOverVotes) return { aVotes: 0, bVotes: 0, total: 0 };
    let aVotes = 0;
    let bVotes = 0;
    for (const token in activeBattle.superOverVotes) {
      const v = activeBattle.superOverVotes[token];
      if (v.voteTeamCode === activeBattle.teamA) aVotes++;
      if (v.voteTeamCode === activeBattle.teamB) bVotes++;
    }
    return { aVotes, bVotes, total: aVotes + bVotes };
  });

  // --- OVERVIEW / TOP BUYS STATE ---
  const soldPlayers = $derived(
    store.roomState.results
      ?.filter(r => r.status === 'sold')
      ?.sort((a, b) => b.amount - a.amount) || []
  );

  const topBuys = $derived(soldPlayers.slice(0, 5));

  function copySummary() {
    let text = `🏏 IPL AUCTION RESULTS (Room ${store.roomCode})\n\n`;
    text += `🏆 TOP SIGNINGS:\n`;
    topBuys.forEach((b, i) => {
      text += `${i + 1}. ${b.playerName} -> ${b.teamCode} for ${formatLakhs(b.amount)}\n`;
    });
    text += `\n💰 REMAINING PURSE LEADERBOARD:\n`;
    store.roomState.teams.forEach(t => {
      text += `• ${t.code}: ${t.squadCount} players | Purse Left: ${formatLakhs(t.purse)}\n`;
    });

    navigator.clipboard?.writeText(text);
    copied = true;
    store.notify('Auction summary copied to clipboard! Share with your friends.');
    setTimeout(() => { copied = false; }, 2500);
  }

  // --- TOURNAMENT FIXTURES & STANDINGS STATE ---
  const fixtures = $derived(store.roomState.fixtures || []);
  const standings = $derived(store.roomState.standings || []);

  const participatingCount = $derived(
    store.roomState.config?.botsEnabled
      ? 10
      : (store.roomState.teams?.filter(t => t.userToken || (t.squad && t.squad.length > 0))?.length || 0)
  );

  const completedFixturesCount = $derived(
    fixtures.filter(f => f.status === 'completed').length
  );

  const liveFixture = $derived(
    fixtures.find(f => f.status === 'live')
  );

  const distinctRounds = $derived.by(() => {
    const set = new Set();
    fixtures.forEach(f => set.add(f.round));
    return Array.from(set).sort((a, b) => a - b);
  });

  const filteredFixtures = $derived.by(() => {
    if (roundFilter === 'all') return fixtures;
    if (roundFilter === 'my_matches') {
      if (!store.myTeamCode) return fixtures;
      return fixtures.filter(f => f.teamA === store.myTeamCode || f.teamB === store.myTeamCode);
    }
    const rNum = Number(roundFilter);
    return fixtures.filter(f => f.round === rNum);
  });

  async function handleStartFixture(fixture) {
    const res = await store.startFixtureBattle(fixture.id);
    if (res.success) {
      activeTab = 'battle';
    }
  }

  async function handlePlanFixtures() {
    await store.planFixtures();
  }

  async function handleConcludeBattle() {
    await store.concludeBattle();
    activeTab = 'fixtures';
    fixturesSubTab = 'standings';
  }

  async function handleSetMatchMode(mode) {
    if (!store.isHost) return;
    await store.setMatchMode(mode);
  }

  async function handleSimulateFixture(fixtureId) {
    const res = await store.simulateFixture(fixtureId);
    if (res?.fixture?.scorecard) {
      selectedScorecardFixture = res.fixture;
      scorecardInningsTab = 'inn1';
    }
  }

  async function handleSimulateAll() {
    await store.simulateAllFixtures();
  }

  function openScorecard(fixture) {
    selectedScorecardFixture = fixture;
    scorecardInningsTab = 'inn1';
  }

  function closeScorecard() {
    selectedScorecardFixture = null;
  }
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  <!-- Post-Auction Hero Header -->
  <div class="text-center space-y-3">
    <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm">
      <Trophy size={14} class="text-amber-400" />
      <span>Post-Auction Championship Hub</span>
    </div>

    <h2 class="text-3xl sm:text-5xl font-extrabold text-white font-heading tracking-tight">
      Playing XI & 1-on-1 Battle Arena
    </h2>
    <p class="text-[#9a97c4] text-xs sm:text-sm max-w-xl mx-auto">
      Select your franchise Playing XI, launch 1-on-1 position battles between any two squads, and have remaining teams vote on each duel!
    </p>

    <!-- Sub-Navigation Navigation Bar -->
    <div class="flex items-center justify-center gap-2 pt-2">
      <div class="flex items-center gap-1.5 p-1 bg-[#15142e] rounded-2xl border border-[#272552] shadow-xl overflow-x-auto max-w-full">
        <button
          onclick={() => activeTab = 'fixtures'}
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'fixtures' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-[#9a97c4] hover:text-white'}"
        >
          <Calendar size={16} />
          <span>Match Fixtures &amp; Standings</span>
          {#if liveFixture}
            <span class="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
          {/if}
        </button>

        <button
          onclick={() => activeTab = 'battle'}
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'battle' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md' : 'text-[#9a97c4] hover:text-white'}"
        >
          <Swords size={16} />
          <span>1-on-1 Battle Arena</span>
          {#if activeBattle}
            <span class="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
          {/if}
        </button>

        <button
          onclick={() => activeTab = 'xi'}
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'xi' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' : 'text-[#9a97c4] hover:text-white'}"
        >
          <Shield size={16} />
          <span>Playing XI Builder</span>
        </button>

        <button
          onclick={() => activeTab = 'overview'}
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'overview' ? 'bg-[#272552] text-white shadow-md' : 'text-[#9a97c4] hover:text-white'}"
        >
          <Trophy size={16} />
          <span>Auction Recap</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Playing XI Selection Stage Countdown & Control Banner -->
  {#if isXISelectionPhase}
    <div class="bg-gradient-to-r from-purple-950/40 via-[#181638] to-indigo-950/40 border-2 border-purple-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
        <!-- Stage Info & Timer -->
        <div class="flex items-start sm:items-center gap-4">
          <!-- Countdown Clock -->
          <div class="relative flex-shrink-0">
            <div class="w-16 h-16 rounded-2xl bg-[#0c0b1d] border-2 border-purple-500/60 grid place-items-center shadow-lg">
              <span class="font-heading font-extrabold text-2xl text-purple-300 font-mono">
                {xiTimer}s
              </span>
            </div>
            <span class="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Timer size={12} />
                <span>Playing XI Selection Phase</span>
              </span>
              {#if allTeamsConfirmed}
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>All Franchises Ready!</span>
                </span>
              {:else}
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  {confirmedHumanTeams.length} / {humanTeams.length || store.roomState.teams.length} Franchises Locked In
                </span>
              {/if}
            </div>

            <h3 class="text-xl sm:text-2xl font-extrabold text-white font-heading">
              Lock In Your 11 Before Match Fixtures Begin
            </h3>
            <p class="text-xs text-[#9a97c4] max-w-xl">
              Select your balanced 11 (Max 4 overseas, at least 1 keeper). Once all teams confirm (or countdown finishes), the tournament fixtures begin!
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {#if store.myTeamCode}
            {@const myFranchise = store.roomState.teams?.find(t => t.code === store.myTeamCode)}
            {#if myFranchise?.isXIConfirmed}
              <div class="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Your Playing XI is Locked In!</span>
              </div>
            {:else}
              <button
                onclick={() => {
                  activeTab = 'xi';
                  selectedTeamCode = store.myTeamCode;
                  lockInPlayingXI();
                }}
                class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Lock size={14} />
                <span>Lock In {store.myTeamCode} XI</span>
              </button>
            {/if}
          {/if}

          {#if store.isHost}
            <button
              onclick={handleToggleSpectators}
              class="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {spectatorsCanVote ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200 hover:bg-indigo-600/50' : 'bg-[#0c0b1d] border-[#272552] text-[#9a97c4] hover:text-white'}"
              title="Toggle whether non-franchise spectators are allowed to cast jury votes"
            >
              {#if spectatorsCanVote}
                <Eye size={14} class="text-indigo-400" />
                <span>Spectator Voting: ON</span>
              {:else}
                <EyeOff size={14} class="text-[#9a97c4]" />
                <span>Spectator Voting: OFF</span>
              {/if}
            </button>

            <button
              onclick={handleAdvanceToFixtures}
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-xl shadow-amber-950/40"
              title="Start tournament match fixtures immediately"
            >
              <Crown size={15} />
              <span>Start Matches Now</span>
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Spectator Identification Pill Banner -->
  {#if isSpectator}
    <div class="p-3.5 rounded-2xl bg-[#15142e] border border-[#272552] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 grid place-items-center flex-shrink-0">
          <Eye size={16} />
        </div>
        <div>
          <strong class="text-white font-bold block">Spectator Mode Active</strong>
          <span class="text-[#9a97c4] text-[11px]">
            {#if spectatorsCanVote}
              <span class="text-emerald-400 font-semibold">Voting Permitted:</span> You can cast jury votes in 1-on-1 position duels and Super Over tie-breakers!
            {:else}
              <span class="text-amber-400 font-semibold">View Only:</span> The room host has restricted voting to competing franchise managers.
            {/if}
          </span>
        </div>
      </div>

      {#if store.isHost}
        <button
          onclick={handleToggleSpectators}
          class="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <span>Toggle Spectator Votes ({spectatorsCanVote ? 'Disable' : 'Enable'})</span>
        </button>
      {/if}
    </div>
  {/if}

  <!-- ========================================== -->
  <!-- TAB 0: MATCH FIXTURES & STANDINGS         -->
  <!-- ========================================== -->
  {#if activeTab === 'fixtures'}
    <div class="space-y-6">
      <!-- Championship Match Resolution Mode Selector (2 Options) -->
      <div class="bg-gradient-to-r from-[#17153b] via-[#1a1740] to-[#151336] border-2 border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Crown size={12} class="text-amber-400" />
                <span>Match Resolution Engine</span>
              </span>
              {#if store.isHost}
                <span class="text-[11px] text-purple-300 font-semibold">(Host Choice: Select how tournament matches are decided)</span>
              {:else}
                <span class="text-[11px] text-[#9a97c4]">(Controlled by Host)</span>
              {/if}
            </div>
            <h4 class="text-lg sm:text-xl font-extrabold text-white font-heading">
              Choose Championship Match Resolution Mode
            </h4>
          </div>

          <div class="text-xs text-[#9a97c4]">
            Active Mode:
            <strong class="ml-1 font-mono uppercase {matchMode === 'ai_simulation' ? 'text-emerald-400' : 'text-purple-400'}">
              {matchMode === 'ai_simulation' ? '🤖 AI Math Simulation & Scorecards' : '🗳️ Community Jury Voting'}
            </strong>
          </div>
        </div>

        <!-- The 2 Options Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Option 1: Community Jury Voting -->
          <button
            type="button"
            onclick={() => handleSetMatchMode('voting')}
            disabled={!store.isHost}
            class="relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer disabled:cursor-default
              {matchMode === 'voting'
                ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30 shadow-lg'
                : 'bg-[#0f0e26] border-[#272552] hover:border-[#3d3a77] opacity-80'}"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl {matchMode === 'voting' ? 'bg-purple-600 text-white shadow-md' : 'bg-[#1e1c45] text-[#9a97c4]'} grid place-items-center flex-shrink-0">
                  <Swords size={20} />
                </div>
                <div>
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 block">Option 1</span>
                  <h5 class="text-base font-extrabold text-white font-heading">Community Jury Voting Mode</h5>
                </div>
              </div>

              {#if matchMode === 'voting'}
                <span class="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Check size={11} /> Selected
                </span>
              {/if}
            </div>

            <p class="text-xs text-[#9a97c4] mt-3 leading-relaxed">
              Experience position-by-position 1v1 player duels (Opener vs Opener, Finisher vs Finisher, Pacer vs Pacer). Competing neutral franchises and spectators cast live votes, with Super Over tie-breakers!
            </p>

            <div class="mt-3 flex items-center gap-2 text-[11px] text-purple-300 font-semibold">
              <Users size={12} />
              <span>Multiplayer live voting &amp; instant battle commentary</span>
            </div>
          </button>

          <!-- Option 2: AI Match Simulation (Player Stats & Math) -->
          <button
            type="button"
            onclick={() => handleSetMatchMode('ai_simulation')}
            disabled={!store.isHost}
            class="relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer disabled:cursor-default
              {matchMode === 'ai_simulation'
                ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                : 'bg-[#0f0e26] border-[#272552] hover:border-[#3d3a77] opacity-80'}"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl {matchMode === 'ai_simulation' ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#1e1c45] text-[#9a97c4]'} grid place-items-center flex-shrink-0">
                  <Cpu size={20} />
                </div>
                <div>
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">Option 2</span>
                  <h5 class="text-base font-extrabold text-white font-heading">AI Match Simulation &amp; Scorecards</h5>
                </div>
              </div>

              {#if matchMode === 'ai_simulation'}
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Check size={11} /> Selected
                </span>
              {/if}
            </div>

            <p class="text-xs text-[#9a97c4] mt-3 leading-relaxed">
              Mathematical ball-by-ball simulation calculating crucial match variables: batter Strike Rate &amp; Average, bowler Economy &amp; Wickets, Powerplay/Middle/Death phases, pressure chases, and generates full authentic 20-over scorecards!
            </p>

            <div class="mt-3 flex items-center gap-2 text-[11px] text-emerald-300 font-semibold">
              <BarChart2 size={12} />
              <span>Full 2-innings batting/bowling scorecard &amp; Player of the Match</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Tournament Header Stats Strip -->
      <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
              IPL Championship Schedule
            </span>
            {#if liveFixture}
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold animate-pulse">
                <Radio size={12} class="text-red-400" />
                <span>Match #{liveFixture.matchNumber} Live</span>
              </span>
            {/if}
          </div>
          <h3 class="text-xl sm:text-2xl font-extrabold text-white font-heading">
            Tournament Match Fixtures &amp; Standings
          </h3>
          <p class="text-xs text-[#9a97c4]">
            {#if matchMode === 'ai_simulation'}
              Matches are resolved via statistical AI simulation with realistic 20-over scorecards.
            {:else}
              Every franchise clashes head-to-head across 11 position duels. Neutral remaining franchises cast jury votes.
            {/if}
          </p>
        </div>

        <!-- Metric Badges & Simulation / Re-Plan Buttons -->
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <div class="px-3.5 py-2 rounded-xl bg-[#0c0b1d] border border-[#272552] text-center">
            <span class="block text-[10px] text-[#9a97c4] font-bold uppercase">Total Matches</span>
            <strong class="text-white text-sm font-mono">{fixtures.length}</strong>
          </div>
          <div class="px-3.5 py-2 rounded-xl bg-[#0c0b1d] border border-[#272552] text-center">
            <span class="block text-[10px] text-[#9a97c4] font-bold uppercase">Completed</span>
            <strong class="text-emerald-400 text-sm font-mono">{completedFixturesCount} / {fixtures.length}</strong>
          </div>
          {#if standings[0]}
            <div class="px-3.5 py-2 rounded-xl bg-[#0c0b1d] border border-[#272552] text-center">
              <span class="block text-[10px] text-[#9a97c4] font-bold uppercase">Leader</span>
              <strong class="text-amber-300 text-sm">{standings[0].code} ({standings[0].points} pts)</strong>
            </div>
          {/if}

          {#if store.isHost && matchMode === 'ai_simulation' && completedFixturesCount < fixtures.length}
            <button
              onclick={handleSimulateAll}
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Simulate all remaining fixtures in this tournament"
            >
              <Zap size={13} />
              <span>Simulate All Matches (AI)</span>
            </button>
          {/if}

          {#if store.isHost}
            <button
              onclick={handlePlanFixtures}
              class="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Regenerate round-robin fixtures schedule"
            >
              <RotateCcw size={13} />
              <span>Re-plan Fixtures</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- Requirement Alert when <= 3 teams -->
      {#if participatingCount <= 3}
        <div class="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div class="flex items-center gap-3">
            <AlertCircle size={28} class="text-amber-400 flex-shrink-0" />
            <div>
              <h4 class="text-base font-bold text-amber-200 font-heading">
                More Than 3 Players Required for Tournament Fixtures
              </h4>
              <p class="text-xs text-amber-300/80 mt-0.5">
                Currently, only {participatingCount} franchise{participatingCount === 1 ? '' : 's'} {participatingCount === 1 ? 'is' : 'are'} participating. At least 4 franchises (&gt; 3) are required to generate the round-robin match fixtures and jury voting.
              </p>
            </div>
          </div>
          {#if store.isHost}
            <button
              onclick={() => store.hostControl('fill_bots')}
              class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-bold text-xs transition cursor-pointer whitespace-nowrap shadow-md"
            >
              Fill with AI Bots (10 Teams)
            </button>
          {/if}
        </div>
      {:else}
        <!-- Live Fixture Banner (If a battle is active) -->
        {#if liveFixture}
          {@const tA = store.roomState.teams?.find(t => t.code === liveFixture.teamA)}
          {@const tB = store.roomState.teams?.find(t => t.code === liveFixture.teamB)}
          <div class="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-r from-rose-950/40 via-[#1a1235] to-purple-950/40 border border-rose-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3 text-left">
              <div class="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
              <div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-rose-300 block">
                  Live Battle in Progress • Match #{liveFixture.matchNumber} (Round {liveFixture.round})
                </span>
                <h4 class="text-lg sm:text-xl font-extrabold text-white font-heading flex items-center gap-2">
                  <span style="color: {tA?.primaryColor || '#fff'}">{liveFixture.teamA}</span>
                  <span class="text-xs text-[#9a97c4]">VS</span>
                  <span style="color: {tB?.primaryColor || '#fff'}">{liveFixture.teamB}</span>
                </h4>
              </div>
            </div>

            <button
              onclick={() => activeTab = 'battle'}
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Swords size={15} />
              <span>Jump to Live Duel &amp; Cast Votes →</span>
            </button>
          </div>
        {/if}

        <!-- Fixtures vs Standings Sub-Tab Toggle -->
        <div class="flex items-center justify-between gap-4 border-b border-[#272552] pb-4">
          <div class="flex items-center gap-2">
            <button
              onclick={() => fixturesSubTab = 'fixtures'}
              class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer {fixturesSubTab === 'fixtures' ? 'bg-[#272552] text-white' : 'text-[#9a97c4] hover:text-white'}"
            >
              <Calendar size={14} />
              <span>Match Schedule ({fixtures.length})</span>
            </button>

            <button
              onclick={() => fixturesSubTab = 'standings'}
              class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer {fixturesSubTab === 'standings' ? 'bg-[#272552] text-white' : 'text-[#9a97c4] hover:text-white'}"
            >
              <TableProperties size={14} />
              <span>Points Table &amp; Standings</span>
            </button>
          </div>

          <!-- Round Filter (When in Fixtures view) -->
          {#if fixturesSubTab === 'fixtures'}
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span class="text-[11px] text-[#9a97c4] font-semibold mr-1 hidden sm:inline">Filter:</span>
              <button
                onclick={() => roundFilter = 'all'}
                class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {roundFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-[#15142e] text-[#9a97c4] hover:text-white border border-[#272552]'}"
              >
                All
              </button>
              {#if store.myTeamCode}
                <button
                  onclick={() => roundFilter = 'my_matches'}
                  class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {roundFilter === 'my_matches' ? 'bg-purple-600 text-white' : 'bg-[#15142e] text-[#9a97c4] hover:text-white border border-[#272552]'}"
                >
                  My Matches
                </button>
              {/if}
              {#each distinctRounds as r}
                <button
                  onclick={() => roundFilter = String(r)}
                  class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer {roundFilter === String(r) ? 'bg-purple-600 text-white' : 'bg-[#15142e] text-[#9a97c4] hover:text-white border border-[#272552]'}"
                >
                  R{r}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- SUB-VIEW 1: FIXTURES LIST -->
        {#if fixturesSubTab === 'fixtures'}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredFixtures as fixture (fixture.id)}
              {@const tA = store.roomState.teams?.find(t => t.code === fixture.teamA)}
              {@const tB = store.roomState.teams?.find(t => t.code === fixture.teamB)}
              {@const isMyMatch = Boolean(store.myTeamCode && (fixture.teamA === store.myTeamCode || fixture.teamB === store.myTeamCode))}

              <div class="relative overflow-hidden p-5 rounded-3xl bg-[#15142e] border transition-all duration-300
                {fixture.status === 'live' ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-xl' : 'border-[#272552] hover:border-[#3d3a77]'}
                {isMyMatch ? 'bg-[#171536]' : ''}">

                <!-- Match Top Pill: Match # and Status -->
                <div class="flex items-center justify-between gap-2 mb-4 text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded-md bg-[#0c0b1d] border border-[#272552] text-[#9a97c4] font-bold text-[11px]">
                      Match #{fixture.matchNumber} • Round {fixture.round}
                    </span>
                    {#if isMyMatch}
                      <span class="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        Your Match
                      </span>
                    {/if}
                  </div>

                  {#if fixture.status === 'live'}
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-extrabold uppercase animate-pulse">
                      <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      <span>Live Duel</span>
                    </span>
                  {:else if fixture.status === 'completed'}
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                      <Check size={11} class="text-emerald-400" />
                      <span>Completed</span>
                    </span>
                  {:else}
                    <span class="px-2.5 py-0.5 rounded-full bg-[#0c0b1d] text-[#6b6891] border border-[#272552] text-[11px] font-semibold">
                      Scheduled
                    </span>
                  {/if}
                </div>

                <!-- Teams Clash Row -->
                <div class="flex items-center justify-between gap-3 mb-5">
                  <!-- Team A -->
                  <div class="flex items-center gap-3 text-left flex-1 min-w-0">
                    <div
                      class="w-11 h-11 rounded-xl grid place-items-center font-heading font-extrabold text-sm text-white shadow-md flex-shrink-0"
                      style="background: {tA?.primaryColor || '#6366f1'};"
                    >
                      {fixture.teamA}
                    </div>
                    <div class="truncate">
                      <strong class="block text-sm font-bold text-white truncate">{tA?.name || fixture.teamA}</strong>
                      <small class="block text-[11px] text-[#9a97c4] truncate">{tA?.userName || 'Team A'}</small>
                    </div>
                  </div>

                  <!-- Middle Score / VS -->
                  <div class="text-center px-3 py-1.5 rounded-xl bg-[#0c0b1d] border border-[#272552] flex-shrink-0">
                    {#if fixture.status === 'completed'}
                      {#if fixture.scorecard}
                        <div class="text-sm font-extrabold font-heading text-white">
                          <span class="{fixture.winner === fixture.teamA ? 'text-amber-400 font-black' : 'text-white'}">{fixture.scoreA}</span>
                          <span class="text-[#6b6891] px-1">-</span>
                          <span class="{fixture.winner === fixture.teamB ? 'text-amber-400 font-black' : 'text-white'}">{fixture.scoreB}</span>
                        </div>
                      {:else}
                        <div class="text-base font-extrabold font-heading text-white">
                          <span class="{fixture.winner === fixture.teamA ? 'text-amber-400' : 'text-white'}">{fixture.scoreA}</span>
                          <span class="text-[#6b6891] px-1">-</span>
                          <span class="{fixture.winner === fixture.teamB ? 'text-amber-400' : 'text-white'}">{fixture.scoreB}</span>
                        </div>
                      {/if}
                      <span class="text-[9px] uppercase font-bold text-emerald-400 block whitespace-nowrap">
                        {fixture.winner === 'TIE' ? 'Tied' : `${fixture.winner} Won`}
                      </span>
                    {:else if fixture.status === 'live'}
                      <span class="text-xs font-mono font-extrabold text-rose-400 tracking-wider">LIVE</span>
                    {:else}
                      <span class="text-xs font-mono font-bold text-[#6b6891]">VS</span>
                    {/if}
                  </div>

                  <!-- Team B -->
                  <div class="flex items-center gap-3 text-right flex-1 min-w-0 justify-end">
                    <div class="truncate">
                      <strong class="block text-sm font-bold text-white truncate">{tB?.name || fixture.teamB}</strong>
                      <small class="block text-[11px] text-[#9a97c4] truncate">{tB?.userName || 'Team B'}</small>
                    </div>
                    <div
                      class="w-11 h-11 rounded-xl grid place-items-center font-heading font-extrabold text-sm text-white shadow-md flex-shrink-0"
                      style="background: {tB?.primaryColor || '#ff4d8d'};"
                    >
                      {fixture.teamB}
                    </div>
                  </div>
                </div>

                <!-- AI Scorecard Quick Summary (if simulated) -->
                {#if fixture.scorecard}
                  <div class="mb-4 p-3 rounded-2xl bg-[#0c0b1d]/90 border border-purple-500/20 text-xs space-y-1.5 shadow-inner">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-white flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full" style="background: {fixture.scorecard.innings1.primaryColor || '#6366f1'}"></span>
                        <span>{fixture.scorecard.innings1.teamCode} {fixture.scorecard.innings1.runs}/{fixture.scorecard.innings1.wickets}</span>
                        <span class="text-[10px] text-[#9a97c4] font-normal font-mono">({fixture.scorecard.innings1.overs} ov)</span>
                      </span>
                      <span class="text-[10px] uppercase font-bold text-purple-300">Target {fixture.scorecard.innings2.target}</span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="font-bold text-white flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full" style="background: {fixture.scorecard.innings2.primaryColor || '#ff4d8d'}"></span>
                        <span>{fixture.scorecard.innings2.teamCode} {fixture.scorecard.innings2.runs}/{fixture.scorecard.innings2.wickets}</span>
                        <span class="text-[10px] text-[#9a97c4] font-normal font-mono">({fixture.scorecard.innings2.overs} ov)</span>
                      </span>
                      <span class="text-[11px] font-extrabold text-emerald-400">{fixture.scorecard.margin}</span>
                    </div>

                    {#if fixture.scorecard.playerOfTheMatch}
                      <div class="pt-1.5 border-t border-[#272552]/80 flex items-center justify-between text-[11px]">
                        <span class="flex items-center gap-1 text-amber-300">
                          <Star size={11} class="text-amber-400 flex-shrink-0" />
                          <span>POTM: <strong>{fixture.scorecard.playerOfTheMatch.name}</strong></span>
                        </span>
                        <span class="text-[#9a97c4] text-[10px] font-mono">({fixture.scorecard.playerOfTheMatch.summary})</span>
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Action Button Row -->
                <div class="pt-3 border-t border-[#272552]/80 flex items-center justify-between gap-2">
                  <span class="text-[11px] text-[#9a97c4]">
                    {#if fixture.status === 'completed'}
                      {#if fixture.scorecard}
                        20-over AI match simulated
                      {:else}
                        11 position duels completed
                      {/if}
                    {:else if fixture.status === 'live'}
                      Neutral teams currently voting
                    {:else if matchMode === 'ai_simulation'}
                      Ready for AI match calculation
                    {:else}
                      Ready to clash in Battle Arena
                    {/if}
                  </span>

                  {#if fixture.status === 'live'}
                    <button
                      onclick={() => activeTab = 'battle'}
                      class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-90 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Swords size={13} />
                      <span>Vote Now</span>
                    </button>
                  {:else if fixture.status === 'completed'}
                    <div class="flex items-center gap-2">
                      {#if fixture.scorecard}
                        <button
                          onclick={() => openScorecard(fixture)}
                          class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <BarChart2 size={13} />
                          <span>View Scorecard</span>
                        </button>
                      {:else}
                        <button
                          onclick={() => {
                            store.initiateBattle(fixture.teamA, fixture.teamB);
                            activeTab = 'battle';
                          }}
                          class="px-3 py-1 rounded-xl bg-[#0c0b1d] hover:bg-[#272552] border border-[#272552] text-[#9a97c4] hover:text-white font-bold text-xs transition cursor-pointer"
                        >
                          Review Duel
                        </button>
                      {/if}
                    </div>
                  {:else}
                    {#if matchMode === 'ai_simulation'}
                      {#if store.isHost}
                        <button
                          onclick={() => handleSimulateFixture(fixture.id)}
                          class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Zap size={13} />
                          <span>Simulate Match (AI)</span>
                        </button>
                      {:else}
                        <span class="text-xs text-[#9a97c4] font-medium italic">Pending AI Sim</span>
                      {/if}
                    {:else}
                      <button
                        onclick={() => handleStartFixture(fixture)}
                        class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Play size={13} />
                        <span>Start Match</span>
                      </button>
                    {/if}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- SUB-VIEW 2: POINTS TABLE & STANDINGS -->
        {#if fixturesSubTab === 'standings'}
          <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between gap-3 border-b border-[#272552] pb-4">
              <div>
                <h4 class="text-xl font-extrabold text-white font-heading">
                  IPL Championship Standings
                </h4>
                <p class="text-xs text-[#9a97c4]">
                  Win = 2 Pts, Tie = 1 Pt. Top 4 teams qualify for Playoffs. Net Position Diff (Diff) decides ties.
                </p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                Top 4 Playoff Zone
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr class="border-b border-[#272552] text-[#9a97c4] text-[11px] uppercase tracking-wider font-bold">
                    <th class="py-3 px-3">Pos</th>
                    <th class="py-3 px-3">Franchise</th>
                    <th class="py-3 px-2 text-center">P</th>
                    <th class="py-3 px-2 text-center">W</th>
                    <th class="py-3 px-2 text-center">L</th>
                    <th class="py-3 px-2 text-center">T</th>
                    <th class="py-3 px-2 text-center">Diff</th>
                    <th class="py-3 px-3 text-center font-extrabold text-white">Pts</th>
                    <th class="py-3 px-3 text-right">Form</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#272552]/60">
                  {#each standings as item, idx (item.code)}
                    {@const isTopFour = idx < 4}
                    {@const isMyTeam = store.myTeamCode === item.code}

                    <tr class="transition {isMyTeam ? 'bg-purple-900/15' : 'hover:bg-[#1a1838]'}">
                      <!-- Position -->
                      <td class="py-3.5 px-3">
                        <div class="flex items-center gap-2">
                          <span class="w-6 h-6 rounded-lg grid place-items-center font-bold text-xs {isTopFour ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-[#0c0b1d] shadow-sm' : 'bg-[#0c0b1d] text-[#6b6891]'}">
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      <!-- Team & Manager -->
                      <td class="py-3.5 px-3">
                        <div class="flex items-center gap-2.5">
                          <div
                            class="w-7 h-7 rounded-lg grid place-items-center font-heading font-extrabold text-xs text-white shadow-sm flex-shrink-0"
                            style="background: {item.primaryColor};"
                          >
                            {item.code}
                          </div>
                          <div>
                            <strong class="block text-white font-bold leading-tight">
                              {item.name}
                              {#if isMyTeam}
                                <span class="text-[10px] text-purple-300 font-normal ml-1">(You)</span>
                              {/if}
                            </strong>
                            <small class="block text-[11px] text-[#9a97c4]">{item.userName}</small>
                          </div>
                        </div>
                      </td>

                      <!-- Played, Won, Lost, Tied -->
                      <td class="py-3.5 px-2 text-center text-[#9a97c4] font-mono">{item.played}</td>
                      <td class="py-3.5 px-2 text-center text-emerald-400 font-bold font-mono">{item.won}</td>
                      <td class="py-3.5 px-2 text-center text-red-400 font-mono">{item.lost}</td>
                      <td class="py-3.5 px-2 text-center text-amber-300 font-mono">{item.tied}</td>

                      <!-- Net Position Difference -->
                      <td class="py-3.5 px-2 text-center font-mono font-semibold {item.diff > 0 ? 'text-emerald-400' : item.diff < 0 ? 'text-red-400' : 'text-[#9a97c4]'}">
                        {item.diff > 0 ? `+${item.diff}` : item.diff}
                      </td>

                      <!-- Points -->
                      <td class="py-3.5 px-3 text-center">
                        <span class="px-2.5 py-1 rounded-lg bg-[#0c0b1d] text-white font-extrabold font-mono text-sm border border-[#272552]">
                          {item.points}
                        </span>
                      </td>

                      <!-- Recent Form Badges -->
                      <td class="py-3.5 px-3 text-right">
                        <div class="flex items-center justify-end gap-1">
                          {#if item.form.length === 0}
                            <span class="text-[10px] text-[#6b6891]">-</span>
                          {:else}
                            {#each item.form.slice(-5) as f}
                              <span class="w-5 h-5 rounded-md grid place-items-center text-[10px] font-bold text-white
                                {f === 'W' ? 'bg-emerald-600' : f === 'L' ? 'bg-red-600' : 'bg-amber-600'}">
                                {f}
                              </span>
                            {/each}
                          {/if}
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- ========================================== -->
  <!-- TAB 1: PLAYING XI BUILDER                 -->
  <!-- ========================================== -->
  {#if activeTab === 'xi'}
    <div class="space-y-6">
      <!-- Franchise Selector Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {#each store.roomState.teams as team (team.code)}
          {@const isSelected = team.code === selectedTeamCode}
          {@const isMine = store.myTeamCode === team.code}
          {@const franchise = getFranchise(team.code)}

          <button
            onclick={() => selectedTeamCode = team.code}
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border
              {isSelected
                ? 'bg-[#181635] text-white border-purple-500 ring-2 ring-purple-500/40 shadow-lg'
                : 'bg-[#15142e] text-[#9a97c4] hover:text-white border-[#272552]'}"
          >
            <span class="w-3 h-3 rounded-full" style="background: {franchise.primary};"></span>
            <span>{team.code}</span>
            {#if isMine}
              <span class="text-[10px] text-amber-300">(You)</span>
            {/if}
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0c0b1d] text-[#9a97c4]">
              {team.playingXI?.length || 0}/11
            </span>
          </button>
        {/each}
      </div>

      {#if selectedTeam}
        <!-- Playing XI Control Strip -->
        <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-6 shadow-2xl space-y-4">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#272552] pb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-xl grid place-items-center font-heading font-extrabold text-lg text-white shadow-md"
                style="background: {selectedTeam.primaryColor};"
              >
                {selectedTeam.code}
              </div>
              <div>
                <h3 class="text-xl font-extrabold text-white font-heading">
                  {selectedTeam.name} Playing XI
                </h3>
                <span class="text-xs text-[#9a97c4]">
                  Managed by <strong class="text-white">{selectedTeam.userName || 'Unclaimed'}</strong>
                </span>
              </div>
            </div>

            <!-- Validation Counters & Actions -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <!-- Total Selected Pill -->
              <div class="px-3 py-1.5 rounded-xl bg-[#0c0b1d] border border-[#272552] flex items-center gap-1.5">
                <span class="text-[#9a97c4]">Selected:</span>
                <strong class="text-white">{localXI.length} / 11</strong>
              </div>

              <!-- Overseas Cap Pill -->
              <div class="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 {overseasInXI > 4 ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-[#0c0b1d] text-sky-400 border-[#272552]'}">
                <Globe size={13} />
                <span>Overseas: <strong>{overseasInXI} / 4 max</strong></span>
              </div>

              <!-- Wicket-Keeper Pill -->
              <div class="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 {wksInXI < 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}">
                <span>🧤 Keeper: <strong>{wksInXI >= 1 ? 'Ready' : 'Needed'}</strong></span>
              </div>

              <!-- Confirmation Status Badge -->
              {#if isCurrentTeamConfirmed}
                <div class="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={13} />
                  <span>Locked In</span>
                </div>
              {:else}
                <div class="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-semibold">
                  <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Drafting XI</span>
                </div>
              {/if}

              {#if isMyTeamOrHost}
                <button
                  onclick={autoPickOptimalXI}
                  class="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Auto-pick balanced 11 players"
                >
                  <Sparkles size={13} class="text-purple-300" />
                  <span>Auto-Pick Best 11</span>
                </button>

                <button
                  onclick={savePlayingXI}
                  class="px-3.5 py-1.5 rounded-xl bg-[#0c0b1d] hover:bg-[#1a183d] border border-[#272552] text-white font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Save draft"
                >
                  <Check size={14} />
                  <span>Save Draft</span>
                </button>

                <button
                  onclick={lockInPlayingXI}
                  class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-950/40"
                  title="Lock in Playing XI for tournament matches"
                >
                  <Lock size={14} />
                  <span>{isCurrentTeamConfirmed ? 'Re-Lock & Confirm' : 'Lock In & Confirm XI'}</span>
                </button>
              {/if}
            </div>
          </div>

          <!-- 11 Position Slots Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each positionLabels as pos, idx (pos.num)}
              {@const player = localXI[idx]}
              <div class="p-3.5 rounded-2xl bg-[#0c0b1d] border {player ? 'border-[#272552] hover:border-purple-500/40' : 'border-dashed border-[#272552]/70'} flex items-center justify-between transition">
                <div class="flex items-center gap-3">
                  <!-- Slot Number Pill -->
                  <div class="w-8 h-8 rounded-xl bg-[#15142e] border border-[#272552] grid place-items-center font-heading font-extrabold text-xs text-purple-300 flex-shrink-0">
                    #{pos.num}
                  </div>

                  {#if player}
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <strong class="text-sm font-bold text-white">{player.name}</strong>
                        {#if player.isOverseas}
                          <Globe size={12} class="text-sky-400" title="Overseas" />
                        {/if}
                      </div>
                      <span class="text-xs text-[#9a97c4] block">
                        {player.specialization || `${player.role} (${player.battingStyle || 'RHB'})`}
                      </span>
                    </div>
                  {:else}
                    <div class="space-y-0.5">
                      <span class="text-xs font-semibold text-white block">{pos.role}</span>
                      <span class="text-[11px] text-[#6b6891]">{pos.desc}</span>
                    </div>
                  {/if}
                </div>

                {#if player && isMyTeamOrHost}
                  <button
                    onclick={() => removeSlot(idx)}
                    class="p-1.5 rounded-lg text-[#9a97c4] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                    title="Remove from Playing XI"
                  >
                    <X size={15} />
                  </button>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Bench / Unassigned Squad Players -->
          {#if isMyTeamOrHost}
            <div class="pt-4 border-t border-[#272552] space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-white font-heading">
                  Available Bench / Squad Reserve ({unassignedSquad.length} Players)
                </h4>
                <span class="text-xs text-[#6b6891]">Click player to assign to next open slot</span>
              </div>

              {#if unassignedSquad.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {#each unassignedSquad as benchPlayer (benchPlayer.id)}
                    <button
                      onclick={() => assignPlayer(benchPlayer)}
                      class="p-3 rounded-xl bg-[#0c0b1d] border border-[#272552] hover:border-purple-500/60 hover:bg-[#15142e] text-left transition flex items-center justify-between group cursor-pointer"
                    >
                      <div class="space-y-0.5">
                        <div class="flex items-center gap-1.5">
                          <strong class="text-xs font-bold text-white group-hover:text-purple-300 transition">{benchPlayer.name}</strong>
                          {#if benchPlayer.isOverseas}
                            <Globe size={11} class="text-sky-400" />
                          {/if}
                        </div>
                        <span class="text-[11px] text-[#9a97c4] block">
                          {benchPlayer.role} · {benchPlayer.battingStyle || 'RHB'}
                        </span>
                      </div>
                      <span class="text-xs text-purple-400 group-hover:translate-x-0.5 transition font-bold">+</span>
                    </button>
                  {/each}
                </div>
              {:else}
                <div class="py-4 text-center text-xs text-[#6b6891] bg-[#0c0b1d] rounded-xl border border-dashed border-[#272552]">
                  All squad players are assigned to the Playing XI.
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- ========================================== -->
  <!-- TAB 2: 1-ON-1 HEAD-TO-HEAD BATTLE ARENA    -->
  <!-- ========================================== -->
  {#if activeTab === 'battle'}
    <div class="space-y-6">
      <!-- Clash Initiator (When no battle is currently active) -->
      {#if !activeBattle}
        <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div class="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 grid place-items-center mx-auto shadow-xl">
            <Swords size={28} />
          </div>

          <div class="space-y-2">
            <h3 class="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              Launch a Head-to-Head 1-on-1 Clash
            </h3>
            <p class="text-xs sm:text-sm text-[#9a97c4] max-w-lg mx-auto">
              Select two franchises to face off. Their Playing XIs will duel position by position (Openers vs Openers, Keepers vs Keepers, Death Bowlers vs Death Bowlers). All remaining franchises cast votes!
            </p>
          </div>

          <!-- Team Selection Controls -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-2">
            <div class="w-full space-y-1.5 text-left">
              <label for="team-a-select" class="text-xs font-semibold uppercase tracking-wider text-[#9a97c4]">Franchise A</label>
              <select
                id="team-a-select"
                bind:value={battleTeamA}
                class="w-full bg-[#0c0b1d] border border-[#272552] rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {#each store.roomState.teams as t (t.code)}
                  <option value={t.code}>{t.name} ({t.code})</option>
                {/each}
              </select>
            </div>

            <div class="font-heading font-extrabold text-xl text-rose-400 pt-4">VS</div>

            <div class="w-full space-y-1.5 text-left">
              <label for="team-b-select" class="text-xs font-semibold uppercase tracking-wider text-[#9a97c4]">Franchise B</label>
              <select
                id="team-b-select"
                bind:value={battleTeamB}
                class="w-full bg-[#0c0b1d] border border-[#272552] rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {#each store.roomState.teams as t (t.code)}
                  <option value={t.code}>{t.name} ({t.code})</option>
                {/each}
              </select>
            </div>
          </div>

          <button
            onclick={() => store.initiateBattle(battleTeamA, battleTeamB)}
            class="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-90 text-white font-extrabold text-sm sm:text-base flex items-center gap-2 mx-auto shadow-xl shadow-rose-950/50 transition cursor-pointer"
          >
            <Swords size={18} />
            <span>Start 1-on-1 Position Battles & Voting</span>
          </button>
        </div>
      {:else}
        <!-- ACTIVE BATTLE ARENA -->
        <div class="space-y-6">
          <!-- Battle Scoreboard Header -->
          <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-6 shadow-2xl space-y-4">
            <!-- Linked Tournament Match Banner -->
            {#if activeBattle.fixtureId}
              {@const linkedFixture = fixtures.find(f => f.id === activeBattle.fixtureId)}
              <div class="px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                <span class="flex items-center gap-2">
                  <Flame size={15} class="text-amber-400 flex-shrink-0" />
                  <span>Championship Match #{linkedFixture?.matchNumber || ''} (Round {linkedFixture?.round || ''}): {activeBattle.teamA} vs {activeBattle.teamB}</span>
                </span>
                <span class="text-[11px] font-mono text-white/90 bg-[#0c0b1d] px-2.5 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">
                  Winner earns 2 Points in Tournament Standings
                </span>
              </div>
            {/if}

            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#272552] pb-4">
              <!-- Team A -->
              <div class="flex items-center gap-3 text-left">
                <div
                  class="w-14 h-14 rounded-2xl grid place-items-center font-heading font-extrabold text-xl shadow-lg"
                  style="background: {teamAObj?.primaryColor}; color: {teamAObj?.textColor || '#fff'};"
                >
                  {teamAObj?.code}
                </div>
                <div>
                  <h3 class="text-xl font-extrabold text-white font-heading">{teamAObj?.name}</h3>
                  <span class="text-xs text-[#9a97c4]">{teamAObj?.userName || 'Team A'}</span>
                </div>
              </div>

              <!-- Live Battle Score -->
              <div class="text-center px-6 py-2 rounded-2xl bg-[#0c0b1d] border border-[#272552] space-y-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-rose-400 block">Position Duels Score</span>
                <div class="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
                  <span class="text-amber-300">{battleScores.teamAWins}</span>
                  <span class="text-[#6b6891] px-2">-</span>
                  <span class="text-sky-300">{battleScores.teamBWins}</span>
                </div>
                {#if battleScores.ties > 0}
                  <span class="text-[10px] text-[#9a97c4] block">({battleScores.ties} ties)</span>
                {/if}
              </div>

              <!-- Team B -->
              <div class="flex items-center gap-3 text-right">
                <div>
                  <h3 class="text-xl font-extrabold text-white font-heading">{teamBObj?.name}</h3>
                  <span class="text-xs text-[#9a97c4]">{teamBObj?.userName || 'Team B'}</span>
                </div>
                <div
                  class="w-14 h-14 rounded-2xl grid place-items-center font-heading font-extrabold text-xl shadow-lg"
                  style="background: {teamBObj?.primaryColor}; color: {teamBObj?.textColor || '#fff'};"
                >
                  {teamBObj?.code}
                </div>
              </div>
            </div>

            <!-- Jury Voting Status Alert -->
            <div class="p-3.5 rounded-2xl bg-[#0c0b1d] border border-[#272552] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2">
                <Users size={16} class="text-purple-400 flex-shrink-0" />
                <span>
                  {#if canVote}
                    <strong class="text-emerald-400">You are a voting jury member!</strong> Cast your vote for each 1-on-1 player duel below.
                  {:else}
                    <strong class="text-amber-400">Contenders in the Arena:</strong> Remaining neutral franchises and spectators are voting on your 1-to-1 player comparisons.
                  {/if}
                </span>
              </div>

              <!-- Spectator Voting indicator pill -->
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl {spectatorsCanVote ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'bg-zinc-800/60 text-[#8a87a8] border border-zinc-700/50'} text-[11px] font-semibold">
                {#if spectatorsCanVote}
                  <Eye size={12} class="text-indigo-400" />
                  <span>Spectators Voting</span>
                {:else}
                  <EyeOff size={12} class="text-[#8a87a8]" />
                  <span>Spectators View-Only</span>
                {/if}
                {#if store.isHost}
                  <button
                    onclick={handleToggleSpectators}
                    class="text-[10px] underline ml-1 hover:text-white cursor-pointer"
                  >
                    Change
                  </button>
                {/if}
              </div>

              <div class="flex items-center gap-2 flex-wrap text-[#9a97c4]">
                <span>Voting Jury:</span>
                {#each remainingTeams as rem (rem.code)}
                  <span class="px-2 py-0.5 rounded-md bg-[#15142e] border border-[#272552] text-white font-bold text-[10px]">
                    {rem.code}
                  </span>
                {/each}
              </div>

              <div class="flex items-center gap-2">
                <button
                  onclick={handleConcludeBattle}
                  class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition cursor-pointer text-xs flex items-center gap-1.5 shadow-md whitespace-nowrap"
                  title="Finalize position duels and record points into tournament standings"
                >
                  <Trophy size={13} />
                  <span>Finalize &amp; Record Score</span>
                </button>

                {#if store.isHost}
                  <button
                    onclick={() => store.resetBattle()}
                    class="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 font-bold transition cursor-pointer text-xs whitespace-nowrap"
                  >
                    Reset Duel
                  </button>
                {/if}
              </div>
            </div>
          </div>

          <!-- SUPER OVER SUDDEN-DEATH CARD (When draw occurs) -->
          {#if activeBattle.isSuperOver}
            {@const soVotesA = superOverScores.aVotes}
            {@const soVotesB = superOverScores.bVotes}
            {@const aSoVoted = hasVotedForSuperOver(activeBattle.teamA)}
            {@const bSoVoted = hasVotedForSuperOver(activeBattle.teamB)}

            <div class="p-6 rounded-3xl bg-gradient-to-r from-red-950/60 via-[#1e1533] to-amber-950/60 border-2 border-amber-500 shadow-2xl relative overflow-hidden space-y-5">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-500/40 pb-4">
                <div class="space-y-1">
                  <div class="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider">
                    <Zap size={14} class="text-amber-400 fill-amber-400 animate-bounce" />
                    <span>Super Over Sudden-Death Tie-Breaker</span>
                  </div>
                  <h3 class="text-xl sm:text-2xl font-extrabold text-white font-heading">
                    Match Tied! Golden MVP Clash Decides Winner
                  </h3>
                  <p class="text-xs text-amber-200/80">
                    Regular 11-slot position duels concluded in a tie ({activeBattle.regularScoreA || 5} - {activeBattle.regularScoreB || 5})! Remaining franchises and spectators cast the decisive golden vote.
                  </p>
                </div>

                <!-- Live Super Over Score Display -->
                <div class="px-5 py-2.5 rounded-2xl bg-[#0c0b1d] border-2 border-amber-500/60 text-center flex-shrink-0">
                  <span class="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Super Over Score</span>
                  <div class="text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
                    <span class="text-amber-300">{soVotesA}</span>
                    <span class="text-[#6b6891] px-1.5">:</span>
                    <span class="text-sky-300">{soVotesB}</span>
                  </div>
                  <span class="text-[10px] text-[#9a97c4] block">{superOverScores.total} golden votes</span>
                </div>
              </div>

              <!-- Side-by-Side Super Over MVP Showdown -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Team A MVP -->
                <div class="p-4 rounded-2xl bg-[#0c0b1d] border border-amber-500/50 flex flex-col justify-between space-y-4 {soVotesA > soVotesB ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-950/40' : ''}">
                  <div class="space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <span class="text-[10px] uppercase font-bold text-amber-400 block tracking-widest">{teamAObj?.name} Super Over MVP</span>
                        <strong class="text-lg font-bold text-white block">{activeBattle.superOverA?.name || 'Team A MVP'}</strong>
                        <span class="text-xs text-[#9a97c4]">{activeBattle.superOverA?.role || 'Top Icon'} · Rating: {activeBattle.superOverA?.rating || 95}/100</span>
                      </div>
                      <div class="w-10 h-10 rounded-xl grid place-items-center font-heading font-extrabold text-sm text-white shadow-md" style="background: {teamAObj?.primaryColor};">
                        {teamAObj?.code}
                      </div>
                    </div>

                    {#if activeBattle.superOverA?.stats}
                      <div class="p-2.5 rounded-xl bg-[#15142e] text-xs text-[#9a97c4] grid grid-cols-3 gap-2 text-center">
                        <div><span class="text-[10px] text-[#6b6891] block">Runs</span><strong class="text-amber-300">{activeBattle.superOverA.stats.runs ?? '-'}</strong></div>
                        <div><span class="text-[10px] text-[#6b6891] block">SR</span><strong class="text-white">{activeBattle.superOverA.stats.sr ?? '-'}</strong></div>
                        <div><span class="text-[10px] text-[#6b6891] block">Wkts</span><strong class="text-cyan-300">{activeBattle.superOverA.stats.wkts ?? '-'}</strong></div>
                      </div>
                    {/if}
                  </div>

                  <div class="pt-2 border-t border-[#272552] flex items-center justify-between">
                    <span class="text-xs font-bold text-amber-300">{soVotesA} Golden Votes</span>
                    {#if canVote}
                      <button
                        onclick={() => castSuperOverVote(activeBattle.teamA)}
                        class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {aSoVoted ? 'bg-amber-500 text-black shadow-lg font-extrabold' : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/40'}"
                      >
                        <Zap size={13} />
                        <span>{aSoVoted ? `Voted ${teamAObj?.code}` : `Vote ${teamAObj?.code} MVP`}</span>
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Team B MVP -->
                <div class="p-4 rounded-2xl bg-[#0c0b1d] border border-amber-500/50 flex flex-col justify-between space-y-4 {soVotesB > soVotesA ? 'ring-2 ring-sky-400 shadow-lg shadow-sky-950/40' : ''}">
                  <div class="space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <span class="text-[10px] uppercase font-bold text-sky-400 block tracking-widest">{teamBObj?.name} Super Over MVP</span>
                        <strong class="text-lg font-bold text-white block">{activeBattle.superOverB?.name || 'Team B MVP'}</strong>
                        <span class="text-xs text-[#9a97c4]">{activeBattle.superOverB?.role || 'Top Icon'} · Rating: {activeBattle.superOverB?.rating || 95}/100</span>
                      </div>
                      <div class="w-10 h-10 rounded-xl grid place-items-center font-heading font-extrabold text-sm text-white shadow-md" style="background: {teamBObj?.primaryColor};">
                        {teamBObj?.code}
                      </div>
                    </div>

                    {#if activeBattle.superOverB?.stats}
                      <div class="p-2.5 rounded-xl bg-[#15142e] text-xs text-[#9a97c4] grid grid-cols-3 gap-2 text-center">
                        <div><span class="text-[10px] text-[#6b6891] block">Runs</span><strong class="text-amber-300">{activeBattle.superOverB.stats.runs ?? '-'}</strong></div>
                        <div><span class="text-[10px] text-[#6b6891] block">SR</span><strong class="text-white">{activeBattle.superOverB.stats.sr ?? '-'}</strong></div>
                        <div><span class="text-[10px] text-[#6b6891] block">Wkts</span><strong class="text-cyan-300">{activeBattle.superOverB.stats.wkts ?? '-'}</strong></div>
                      </div>
                    {/if}
                  </div>

                  <div class="pt-2 border-t border-[#272552] flex items-center justify-between">
                    <span class="text-xs font-bold text-sky-300">{soVotesB} Golden Votes</span>
                    {#if canVote}
                      <button
                        onclick={() => castSuperOverVote(activeBattle.teamB)}
                        class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {bSoVoted ? 'bg-sky-500 text-black shadow-lg font-extrabold' : 'bg-sky-500/20 hover:bg-sky-500/40 text-sky-200 border border-sky-500/40'}"
                      >
                        <Zap size={13} />
                        <span>{bSoVoted ? `Voted ${teamBObj?.code}` : `Vote ${teamBObj?.code} MVP`}</span>
                      </button>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- Conclude Super Over Host Button -->
              <div class="pt-2 flex items-center justify-between flex-wrap gap-2">
                <span class="text-xs text-[#9a97c4]">
                  {#if soVotesA > soVotesB}
                    <strong class="text-amber-300">{teamAObj?.name}</strong> leads the Super Over.
                  {:else if soVotesB > soVotesA}
                    <strong class="text-sky-300">{teamBObj?.name}</strong> leads the Super Over.
                  {:else}
                    Super Over is currently tied. Cast your decisive vote!
                  {/if}
                </span>

                <button
                  onclick={handleConcludeBattle}
                  class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40"
                >
                  <Trophy size={14} />
                  <span>Award Victory & Conclude Super Over</span>
                </button>
              </div>
            </div>
          {/if}

          <!-- 11 Position-by-Position Comparison Cards -->
          <div class="space-y-4">
            <h4 class="text-lg font-bold text-white font-heading">
              1-on-1 Position Duels (Slots 1 to 11)
            </h4>

            {#each positionLabels as pos, idx (pos.num)}
              {@const playerA = teamAObj?.playingXI?.[idx]}
              {@const playerB = teamBObj?.playingXI?.[idx]}
              {@const duelWinner = battleScores.slotWinners[idx]}
              {@const aVoted = hasVotedForSlot(idx, activeBattle.teamA)}
              {@const bVoted = hasVotedForSlot(idx, activeBattle.teamB)}

              <div class="p-5 rounded-3xl bg-[#15142e] border border-[#272552] shadow-xl space-y-4">
                <!-- Duel Position Header -->
                <div class="flex items-center justify-between border-b border-[#272552]/80 pb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-extrabold text-xs grid place-items-center">
                      #{pos.num}
                    </span>
                    <strong class="text-sm font-bold text-white font-heading">{pos.role}</strong>
                    <span class="text-xs text-[#6b6891]">({pos.desc})</span>
                  </div>

                  <!-- Winner Stamp for Slot -->
                  {#if duelWinner?.winner && duelWinner?.winner !== 'TIE'}
                    <span class="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🏆 {duelWinner.winner} Leads ({duelWinner.aVotes} - {duelWinner.bVotes})
                    </span>
                  {:else if duelWinner?.winner === 'TIE'}
                    <span class="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Tie ({duelWinner.aVotes} - {duelWinner.bVotes})
                    </span>
                  {:else}
                    <span class="text-xs text-[#6b6891]">Awaiting jury votes</span>
                  {/if}
                </div>

                <!-- Side-by-Side 1-on-1 Player Duel Comparison -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Team A Player Card -->
                  <div class="p-4 rounded-2xl bg-[#0c0b1d] border border-[#272552] flex flex-col justify-between space-y-3 {duelWinner?.winner === activeBattle.teamA ? 'ring-2 ring-amber-500/50' : ''}">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between">
                        <div>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <strong class="text-base font-bold text-white">{playerA?.name || 'Unfilled Slot'}</strong>
                            {#if playerA?.isOverseas}
                              <Globe size={13} class="text-sky-400" />
                            {/if}
                          </div>
                          <span class="text-xs text-[#9a97c4] block">
                            {teamAObj?.code} · {playerA?.country || 'India'}
                          </span>
                        </div>

                        <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-[#15142e] text-purple-300 border border-[#272552]">
                          {playerA?.role || 'Slot'}
                        </span>
                      </div>

                      {#if playerA}
                        <div class="p-2 rounded-xl bg-[#15142e] text-xs text-[#9a97c4] space-y-1">
                          <div class="flex items-center justify-between">
                            <span>🏏 {playerA.battingStyle || 'RHB'}</span>
                            {#if playerA.bowlingStyle}
                              <span class="text-purple-300">{playerA.bowlingStyle}</span>
                            {/if}
                          </div>
                          {#if playerA.specialization}
                            <p class="text-[10px] text-[#8683ad] italic leading-tight">
                              {playerA.specialization}
                            </p>
                          {/if}
                        </div>

                        <!-- Stats Row -->
                        {#if playerA.stats}
                          <div class="grid grid-cols-3 gap-1 text-center text-[10px] bg-[#15142e]/60 p-1.5 rounded-lg border border-[#272552]/40">
                            <div><span class="text-[#6b6891] block">Matches</span><strong class="text-white">{playerA.stats.matches ?? '-'}</strong></div>
                            <div><span class="text-[#6b6891] block">Runs (SR)</span><strong class="text-amber-300">{playerA.stats.runs ?? '-'}{#if playerA.stats.sr} ({playerA.stats.sr}){/if}</strong></div>
                            <div><span class="text-[#6b6891] block">Wkts (Econ)</span><strong class="text-cyan-300">{playerA.stats.wkts ?? '-'}{#if playerA.stats.econ} ({playerA.stats.econ}){/if}</strong></div>
                          </div>
                        {/if}
                      {/if}
                    </div>

                    <!-- Vote Button A -->
                    <div class="pt-2 border-t border-[#272552] flex items-center justify-between">
                      <span class="text-xs font-bold text-white">
                        {duelWinner?.aVotes || 0} Votes
                      </span>

                      {#if canVote}
                        <button
                          onclick={() => castVote(idx, activeBattle.teamA)}
                          class="px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {aVoted ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#15142e] hover:bg-[#272552] text-white border border-[#272552]'}"
                        >
                          {#if aVoted}
                            <Check size={13} />
                            <span>Voted {teamAObj?.code}</span>
                          {:else}
                            <span>Vote for {playerA?.name?.split(' ')[0] || teamAObj?.code}</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- Team B Player Card -->
                  <div class="p-4 rounded-2xl bg-[#0c0b1d] border border-[#272552] flex flex-col justify-between space-y-3 {duelWinner?.winner === activeBattle.teamB ? 'ring-2 ring-sky-500/50' : ''}">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between">
                        <div>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <strong class="text-base font-bold text-white">{playerB?.name || 'Unfilled Slot'}</strong>
                            {#if playerB?.isOverseas}
                              <Globe size={13} class="text-sky-400" />
                            {/if}
                          </div>
                          <span class="text-xs text-[#9a97c4] block">
                            {teamBObj?.code} · {playerB?.country || 'India'}
                          </span>
                        </div>

                        <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-[#15142e] text-purple-300 border border-[#272552]">
                          {playerB?.role || 'Slot'}
                        </span>
                      </div>

                      {#if playerB}
                        <div class="p-2 rounded-xl bg-[#15142e] text-xs text-[#9a97c4] space-y-1">
                          <div class="flex items-center justify-between">
                            <span>🏏 {playerB.battingStyle || 'RHB'}</span>
                            {#if playerB.bowlingStyle}
                              <span class="text-purple-300">{playerB.bowlingStyle}</span>
                            {/if}
                          </div>
                          {#if playerB.specialization}
                            <p class="text-[10px] text-[#8683ad] italic leading-tight">
                              {playerB.specialization}
                            </p>
                          {/if}
                        </div>

                        <!-- Stats Row -->
                        {#if playerB.stats}
                          <div class="grid grid-cols-3 gap-1 text-center text-[10px] bg-[#15142e]/60 p-1.5 rounded-lg border border-[#272552]/40">
                            <div><span class="text-[#6b6891] block">Matches</span><strong class="text-white">{playerB.stats.matches ?? '-'}</strong></div>
                            <div><span class="text-[#6b6891] block">Runs (SR)</span><strong class="text-amber-300">{playerB.stats.runs ?? '-'}{#if playerB.stats.sr} ({playerB.stats.sr}){/if}</strong></div>
                            <div><span class="text-[#6b6891] block">Wkts (Econ)</span><strong class="text-cyan-300">{playerB.stats.wkts ?? '-'}{#if playerB.stats.econ} ({playerB.stats.econ}){/if}</strong></div>
                          </div>
                        {/if}
                      {/if}
                    </div>

                    <!-- Vote Button B -->
                    <div class="pt-2 border-t border-[#272552] flex items-center justify-between">
                      <span class="text-xs font-bold text-white">
                        {duelWinner?.bVotes || 0} Votes
                      </span>

                      {#if canVote}
                        <button
                          onclick={() => castVote(idx, activeBattle.teamB)}
                          class="px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {bVoted ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#15142e] hover:bg-[#272552] text-white border border-[#272552]'}"
                        >
                          {#if bVoted}
                            <Check size={13} />
                            <span>Voted {teamBObj?.code}</span>
                          {:else}
                            <span>Vote for {playerB?.name?.split(' ')[0] || teamBObj?.code}</span>
                          {/if}
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ========================================== -->
  <!-- TAB 3: AUCTION RECAP & LEADERBOARD         -->
  <!-- ========================================== -->
  {#if activeTab === 'overview'}
    <div class="space-y-6">
      <!-- Share & Lobby Actions -->
      <div class="flex items-center justify-center gap-3 pt-2">
        <button
          onclick={copySummary}
          class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8b73ff] to-[#ff4d8d] hover:opacity-90 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-900/40 transition cursor-pointer"
        >
          {#if copied}
            <Check size={16} />
            <span>Copied Summary</span>
          {:else}
            <Share2 size={16} />
            <span>Copy & Share Results</span>
          {/if}
        </button>

        {#if store.isHost}
          <button
            onclick={() => store.view = 'lobby'}
            class="px-5 py-2.5 rounded-xl bg-[#15142e] hover:bg-[#272552] border border-[#272552] text-white font-bold text-sm flex items-center gap-2 transition cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>Return to Lobby</span>
          </button>
        {/if}
      </div>

      <!-- Top 5 Most Expensive Marquee Buys -->
      {#if topBuys.length > 0}
        <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-[#272552]">
            <h3 class="text-lg font-extrabold text-white font-heading flex items-center gap-2">
              <Flame size={18} class="text-pink-400" />
              <span>Top Auction Signings</span>
            </h3>
            <span class="text-xs text-[#9a97c4]">Highest Bids</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {#each topBuys as buy, i (buy.playerId + i)}
              {@const franchise = getFranchise(buy.teamCode)}
              <div class="p-4 bg-[#0c0b1d] rounded-2xl border border-[#272552] flex flex-col justify-between space-y-3">
                <div class="flex items-center justify-between">
                  <span class="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-extrabold text-xs grid place-items-center">
                    #{i + 1}
                  </span>
                  <div
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style="background: {franchise.primary}20; color: {franchise.primary};"
                  >
                    {buy.teamCode}
                  </div>
                </div>

                <div>
                  <strong class="text-sm font-bold text-white block truncate">{buy.playerName}</strong>
                  <span class="text-xs text-[#9a97c4]">{buy.role}</span>
                </div>

                <div class="pt-2 border-t border-[#272552]/80">
                  <span class="text-base font-extrabold font-heading text-amber-300">
                    {formatLakhs(buy.amount)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Final Leaderboard Table -->
      <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <h3 class="text-lg font-extrabold text-white font-heading">
          Final Franchise Standings
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="text-[#9a97c4] text-xs uppercase border-b border-[#272552]">
                <th class="py-3 px-3">Franchise</th>
                <th class="py-3 px-3">Manager</th>
                <th class="py-3 px-3">Squad Size</th>
                <th class="py-3 px-3">Overseas</th>
                <th class="py-3 px-3">Purse Remaining</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#272552]/60">
              {#each store.roomState.teams as team (team.code)}
                {@const isMine = store.myTeamCode === team.code}

                <tr class="hover:bg-[#181635] transition {isMine ? 'bg-purple-950/20' : ''}">
                  <td class="py-3.5 px-3 flex items-center gap-2.5">
                    <div
                      class="w-7 h-7 rounded-lg grid place-items-center font-heading font-bold text-xs"
                      style="background: {team.primaryColor}; color: {team.textColor || '#fff'};"
                    >
                      {team.code}
                    </div>
                    <span class="font-bold text-white">{team.name}</span>
                    {#if isMine}
                      <span class="text-[10px] text-amber-300 font-semibold">(You)</span>
                    {/if}
                  </td>
                  <td class="py-3.5 px-3 text-[#9a97c4]">
                    {team.userName || 'Unclaimed'}
                  </td>
                  <td class="py-3.5 px-3 font-bold text-white">
                    {team.squadCount || 0} / 25
                  </td>
                  <td class="py-3.5 px-3 text-sky-400 font-medium">
                    {team.overseasCount || 0} / 8
                  </td>
                  <td class="py-3.5 px-3 font-extrabold font-heading text-emerald-400">
                    {formatLakhs(team.purse)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========================================== -->
  <!-- FULL CRICKET SCORECARD MODAL (AI Engine)   -->
  <!-- ========================================== -->
  {#if selectedScorecardFixture && selectedScorecardFixture.scorecard}
    {@const sc = selectedScorecardFixture.scorecard}
    {@const activeInn = scorecardInningsTab === 'inn1' ? sc.innings1 : sc.innings2}

    <div
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div class="relative w-full max-w-4xl bg-[#110f29] border border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <!-- Modal Top Bar -->
        <div class="p-4 sm:p-5 bg-[#171538] border-b border-[#272552] flex items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={12} class="text-purple-400" />
              <span>Match #{selectedScorecardFixture.matchNumber} • Round {selectedScorecardFixture.round}</span>
            </span>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              Official T20 Scorecard
            </span>
          </div>

          <button
            type="button"
            onclick={closeScorecard}
            class="p-2 rounded-xl bg-[#0c0b1d] hover:bg-[#272552] text-[#9a97c4] hover:text-white transition cursor-pointer"
            aria-label="Close Scorecard"
          >
            <X size={18} />
          </button>
        </div>

        <!-- Match Result & Header Banner -->
        <div class="p-5 sm:p-6 bg-gradient-to-r from-purple-950/40 via-[#18153b] to-indigo-950/40 border-b border-[#272552] flex-shrink-0 space-y-4">
          <!-- Teams Summary Strip -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <!-- Innings 1 Team -->
            <div class="flex items-center gap-3 text-center sm:text-left">
              <div
                class="w-12 h-12 rounded-2xl grid place-items-center font-heading font-extrabold text-base text-white shadow-lg flex-shrink-0"
                style="background: {sc.innings1.primaryColor || '#6366f1'};"
              >
                {sc.innings1.teamCode}
              </div>
              <div>
                <strong class="text-white text-base sm:text-lg font-bold block">{sc.innings1.teamName}</strong>
                <span class="text-2xl font-black font-mono text-white">
                  {sc.innings1.runs}/{sc.innings1.wickets}
                  <span class="text-xs font-normal text-[#9a97c4]">({sc.innings1.overs} ov, RR {sc.innings1.runRate})</span>
                </span>
              </div>
            </div>

            <!-- VS / Divider -->
            <div class="px-3 py-1 rounded-full bg-[#0c0b1d] border border-[#272552] text-[#6b6891] text-xs font-mono font-bold">
              VS
            </div>

            <!-- Innings 2 Team -->
            <div class="flex items-center gap-3 text-center sm:text-right flex-row-reverse sm:flex-row">
              <div class="sm:text-right">
                <strong class="text-white text-base sm:text-lg font-bold block">{sc.innings2.teamName}</strong>
                <span class="text-2xl font-black font-mono text-white">
                  {sc.innings2.runs}/{sc.innings2.wickets}
                  <span class="text-xs font-normal text-[#9a97c4]">({sc.innings2.overs} ov, RR {sc.innings2.runRate})</span>
                </span>
              </div>
              <div
                class="w-12 h-12 rounded-2xl grid place-items-center font-heading font-extrabold text-base text-white shadow-lg flex-shrink-0"
                style="background: {sc.innings2.primaryColor || '#ff4d8d'};"
              >
                {sc.innings2.teamCode}
              </div>
            </div>
          </div>

          <!-- Margin Banner & Toss -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-[#272552]/80 text-xs">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs sm:text-sm">
                🏆 {sc.margin}
              </span>
              {#if sc.isSuperOver}
                <span class="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs">
                  ⚡ Super Over Decider
                </span>
              {/if}
            </div>

            <div class="text-[#9a97c4] text-xs">
              🪙 <span>{sc.toss.summary}</span>
            </div>
          </div>

          <!-- Player of the Match Spotlight -->
          {#if sc.playerOfTheMatch}
            <div class="p-3 rounded-2xl bg-[#0c0b1d]/90 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 grid place-items-center flex-shrink-0">
                  <Star size={16} class="text-amber-400" />
                </div>
                <div>
                  <span class="text-[10px] text-amber-400 uppercase font-black tracking-wider block">Player of the Match</span>
                  <strong class="text-white text-sm font-bold">{sc.playerOfTheMatch.name}</strong>
                  <span class="text-[#9a97c4] ml-1.5">({sc.playerOfTheMatch.teamCode}) — {sc.playerOfTheMatch.summary}</span>
                </div>
              </div>

              <div class="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono font-bold whitespace-nowrap">
                Impact: {sc.playerOfTheMatch.impactPoints} pts
              </div>
            </div>
          {/if}
        </div>

        <!-- Innings Tabs (Innings 1 vs Innings 2) -->
        <div class="p-3 bg-[#13112e] border-b border-[#272552] flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onclick={() => scorecardInningsTab = 'inn1'}
            class="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer
              {scorecardInningsTab === 'inn1'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[#1a173d] text-[#9a97c4] hover:text-white'}"
          >
            <span>1st Innings: {sc.innings1.teamCode}</span>
            <span class="font-mono font-black">{sc.innings1.runs}/{sc.innings1.wickets}</span>
            <span class="text-[11px] opacity-80">({sc.innings1.overs} ov)</span>
          </button>

          <button
            type="button"
            onclick={() => scorecardInningsTab = 'inn2'}
            class="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer
              {scorecardInningsTab === 'inn2'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[#1a173d] text-[#9a97c4] hover:text-white'}"
          >
            <span>2nd Innings: {sc.innings2.teamCode}</span>
            <span class="font-mono font-black">{sc.innings2.runs}/{sc.innings2.wickets}</span>
            <span class="text-[11px] opacity-80">({sc.innings2.overs} ov)</span>
          </button>
        </div>

        <!-- Scrollable Scorecard Content (Batting & Bowling Tables) -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          <!-- BATTING SCORECARD -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" style="background: {activeInn.primaryColor || '#a855f7'}"></span>
                <span>{activeInn.teamName} Batting</span>
              </h4>
              <span class="text-xs text-[#9a97c4] font-mono">
                {activeInn.runs}/{activeInn.wickets} ({activeInn.overs} Ov, RR {activeInn.runRate})
              </span>
            </div>

            <div class="overflow-x-auto rounded-2xl border border-[#272552] bg-[#0c0b1d]">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="text-[#9a97c4] text-[11px] uppercase border-b border-[#272552] bg-[#14122d]">
                    <th class="py-2.5 px-3">Batter</th>
                    <th class="py-2.5 px-3">Dismissal</th>
                    <th class="py-2.5 px-3 text-right">R</th>
                    <th class="py-2.5 px-3 text-right">B</th>
                    <th class="py-2.5 px-3 text-right">4s</th>
                    <th class="py-2.5 px-3 text-right">6s</th>
                    <th class="py-2.5 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#272552]/40">
                  {#each activeInn.batting as b}
                    <tr class="hover:bg-[#151433] transition">
                      <td class="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        {b.name}
                        {#if b.notOut}
                          <span class="text-emerald-400 font-extrabold">*</span>
                        {/if}
                      </td>
                      <td class="py-2.5 px-3 text-[11px] text-[#9a97c4]">
                        {#if b.notOut}
                          <span class="text-emerald-400 font-semibold">not out</span>
                        {:else}
                          <span>{b.dismissal}</span>
                        {/if}
                      </td>
                      <td class="py-2.5 px-3 text-right font-black font-mono {b.runs >= 50 ? 'text-amber-300 font-extrabold text-sm' : 'text-white'}">
                        {b.runs}
                      </td>
                      <td class="py-2.5 px-3 text-right text-[#9a97c4] font-mono">{b.balls}</td>
                      <td class="py-2.5 px-3 text-right text-[#9a97c4] font-mono">{b.fours}</td>
                      <td class="py-2.5 px-3 text-right text-purple-300 font-mono font-semibold">{b.sixes}</td>
                      <td class="py-2.5 px-3 text-right font-mono font-semibold {b.sr >= 160 ? 'text-emerald-400' : b.sr >= 130 ? 'text-white' : 'text-[#9a97c4]'}">
                        {b.sr}
                      </td>
                    </tr>
                  {/each}
                  <!-- Totals Row -->
                  <tr class="bg-[#14122d] font-bold border-t border-[#272552]">
                    <td class="py-3 px-3 text-white" colspan="2">TOTAL ({activeInn.overs} Overs, RR {activeInn.runRate})</td>
                    <td class="py-3 px-3 text-right text-emerald-400 text-sm font-mono font-black" colspan="5">
                      {activeInn.runs} / {activeInn.wickets}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- BOWLING SCORECARD -->
          <div class="space-y-3">
            <h4 class="text-sm font-extrabold uppercase tracking-wider text-white">
              Bowling
            </h4>

            <div class="overflow-x-auto rounded-2xl border border-[#272552] bg-[#0c0b1d]">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="text-[#9a97c4] text-[11px] uppercase border-b border-[#272552] bg-[#14122d]">
                    <th class="py-2.5 px-3">Bowler</th>
                    <th class="py-2.5 px-3 text-right">O</th>
                    <th class="py-2.5 px-3 text-right">M</th>
                    <th class="py-2.5 px-3 text-right">R</th>
                    <th class="py-2.5 px-3 text-right">W</th>
                    <th class="py-2.5 px-3 text-right">ECON</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#272552]/40">
                  {#each activeInn.bowling as bowl}
                    <tr class="hover:bg-[#151433] transition">
                      <td class="py-2.5 px-3 font-bold text-white whitespace-nowrap">{bowl.name}</td>
                      <td class="py-2.5 px-3 text-right text-[#9a97c4] font-mono">{bowl.overs}</td>
                      <td class="py-2.5 px-3 text-right text-[#9a97c4] font-mono">{bowl.maidens}</td>
                      <td class="py-2.5 px-3 text-right text-white font-mono">{bowl.runs}</td>
                      <td class="py-2.5 px-3 text-right font-black font-mono {bowl.wickets >= 3 ? 'text-amber-400 text-sm font-extrabold' : 'text-white'}">
                        {bowl.wickets}
                      </td>
                      <td class="py-2.5 px-3 text-right font-mono font-semibold {bowl.economy <= 7.0 ? 'text-emerald-400' : bowl.economy <= 9.0 ? 'text-white' : 'text-rose-400'}">
                        {bowl.economy}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <!-- SUPER OVER DETAILS (IF APPLICABLE) -->
          {#if sc.isSuperOver && sc.superOver}
            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <h4 class="text-sm font-extrabold text-amber-300 font-heading flex items-center gap-1.5">
                <Zap size={15} class="text-amber-400" />
                <span>Super Over Sudden-Death Tiebreaker</span>
              </h4>
              <p class="text-xs text-white">
                {sc.superOver.summary}
              </p>
            </div>
          {/if}
        </div>

        <!-- Modal Footer -->
        <div class="p-4 bg-[#171538] border-t border-[#272552] flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onclick={closeScorecard}
            class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
