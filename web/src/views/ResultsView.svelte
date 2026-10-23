<script>
  import { store } from '../lib/store.svelte.js';
  import { formatLakhs, getFranchise } from '../lib/utils.js';
  import { calculateT20Rating, calculatePreMatchWinProbability } from '../lib/rating.js';
  import IplTrophyModal from '../components/IplTrophyModal.svelte';
  import {
    Trophy,
    Check,
    Award,
    Globe,
    Users,
    Shield,
    Zap,
    AlertCircle,
    CheckCircle2,
    X,
    Sparkles,
    Calendar,
    TableProperties,
    Play,
    Timer,
    Lock,
    Crown,
    Star,
    BarChart2,
    RotateCcw
  } from 'lucide-svelte';

  // Sub-navigation tab: 'xi' | 'fixtures' | 'standings' | 'overview'
  let activeTab = $state(
    store.roomState.status === 'playing_xi_selection' ? 'xi' : 'fixtures'
  );
  let stageFilter = $state('all'); // 'all' | 'league' | 'playoffs'
  let copied = $state(false);

  // IPL Trophy Presentation Ceremony State
  let showTrophyModal = $state(false);
  let hasAutoTriggeredTrophy = $state(false);

  // Scorecard modal state
  let selectedScorecardFixture = $state(null);
  let scorecardInningsTab = $state('inn1'); // 'inn1' | 'inn2'

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

  // Auto-switch to fixtures tab when all teams are confirmed or when tournament starts
  $effect(() => {
    if (store.roomState.status === 'completed' && activeTab === 'xi') {
      activeTab = 'fixtures';
    }
  });

  // Automatically trigger Trophy Celebration when Grand Final is completed
  $effect(() => {
    const finalFixture = store.roomState.fixtures?.find(f => f.stage === 'final' && f.status === 'completed');
    if (finalFixture && !hasAutoTriggeredTrophy && !showTrophyModal) {
      hasAutoTriggeredTrophy = true;
      showTrophyModal = true;
    }
  });

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

  // Bench pool: squad players not currently in localXI
  const benchPlayers = $derived(
    (selectedTeam?.squad || []).filter(p => !localXI.some(x => x && x.id === p.id))
  );

  let swapSourceIndex = $state(null);

  function handleSlotClick(idx) {
    if (!isMyTeamOrHost || isCurrentTeamConfirmed) return;
    if (swapSourceIndex === null) {
      swapSourceIndex = idx;
    } else if (swapSourceIndex === idx) {
      swapSourceIndex = null;
    } else {
      const updated = [...localXI];
      const temp = updated[swapSourceIndex];
      updated[swapSourceIndex] = updated[idx];
      updated[idx] = temp;
      localXI = updated;
      swapSourceIndex = null;
    }
  }

  function handleBenchClick(benchPlayer) {
    if (!isMyTeamOrHost || isCurrentTeamConfirmed) return;
    if (swapSourceIndex !== null) {
      const targetSlot = localXI[swapSourceIndex];
      if (benchPlayer.isOverseas && overseasInXI >= 4 && (!targetSlot || !targetSlot.isOverseas)) {
        store.notify('Overseas Limit Exceeded: Maximum 4 overseas players allowed in Playing XI');
        return;
      }
      const updated = [...localXI];
      updated[swapSourceIndex] = benchPlayer;
      localXI = updated;
      swapSourceIndex = null;
    } else {
      store.notify(`Click a slot (1-11) above to replace with ${benchPlayer.name}`);
    }
  }

  async function handleConfirmXI() {
    if (localXI.length < 11) {
      store.notify('Playing XI must have exactly 11 players.');
      return;
    }
    if (overseasInXI > 4) {
      store.notify(`Overseas Rule Violation: Max 4 overseas players allowed (currently ${overseasInXI}).`);
      return;
    }
    if (wksInXI < 1) {
      store.notify('Wicketkeeper Required: At least 1 designated Wicketkeeper must be in the Playing XI.');
      return;
    }

    const res = await store.setPlayingXI(selectedTeam.code, localXI, true);
    if (res.success) {
      store.notify(`${selectedTeam.name} Playing XI Confirmed!`);
    }
  }

  async function handleAutoBalanceXI() {
    const res = await store.hostControl('generate_default_xi', { teamCode: selectedTeam.code });
    if (res.success && res.playingXI) {
      localXI = [...res.playingXI];
      store.notify('Auto-balanced balanced Playing XI generated.');
    }
  }

  async function handleProceedToTournament() {
    if (!allTeamsConfirmed && !confirm('Some managers have not confirmed their Playing XI yet. Do you want to auto-confirm and start tournament fixtures?')) {
      return;
    }
    await store.hostControl('advance_to_fixtures');
    activeTab = 'fixtures';
    store.notify('Tournament Fixtures Live!');
  }

  // --- FIXTURES & STANDINGS STATE ---
  const fixtures = $derived(store.roomState.fixtures || []);
  const standings = $derived(store.roomState.standings || []);
  const completedFixturesCount = $derived(fixtures.filter(f => f.status === 'completed').length);
  const totalFixturesCount = $derived(fixtures.length);

  const filteredFixtures = $derived.by(() => {
    if (stageFilter === 'league') {
      return fixtures.filter(f => !f.stage || f.stage === 'league');
    }
    if (stageFilter === 'playoffs') {
      return fixtures.filter(f => f.stage === 'semifinal' || f.stage === 'final');
    }
    return fixtures;
  });

  const nextScheduledFixture = $derived(
    fixtures.find(f => f.status === 'scheduled' && f.teamA !== 'TBD' && f.teamB !== 'TBD')
  );

  // Grand Final Fixture
  const grandFinalFixture = $derived(
    fixtures.find(f => f.stage === 'final')
  );

  const championTeam = $derived.by(() => {
    if (store.roomState.championTeam) return store.roomState.championTeam;
    if (grandFinalFixture && grandFinalFixture.status === 'completed' && grandFinalFixture.winner) {
      return store.roomState.teams?.find(t => t.code === grandFinalFixture.winner);
    }
    return null;
  });

  const runnerUpTeam = $derived.by(() => {
    if (grandFinalFixture && grandFinalFixture.status === 'completed' && grandFinalFixture.winner) {
      const runnerCode = grandFinalFixture.winner === grandFinalFixture.teamA ? grandFinalFixture.teamB : grandFinalFixture.teamA;
      return store.roomState.teams?.find(t => t.code === runnerCode);
    }
    return null;
  });

  async function handleSimulateFixture(fixtureId) {
    const res = await store.simulateFixture(fixtureId);
    if (res.success) {
      selectedScorecardFixture = res.fixture;
      scorecardInningsTab = 'inn1';
      store.notify(`Match Simulated: ${res.scorecard.margin}`);
    }
  }

  async function handleSimulateAll() {
    const res = await store.simulateAllFixtures();
    if (res.success) {
      store.notify(`All remaining tournament fixtures simulated! Champion declared.`);
      if (championTeam) {
        showTrophyModal = true;
      }
    }
  }

  // Helper to get stage badge styling
  function getStageBadge(fixture) {
    if (fixture.stage === 'final') {
      return {
        label: '🏆 IPL GRAND FINAL',
        bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30 font-extrabold'
      };
    }
    if (fixture.stage === 'semifinal') {
      return {
        label: fixture.stageLabel || '⚔️ SEMI-FINAL',
        bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-bold'
      };
    }
    return {
      label: fixture.stageLabel || `League Match #${fixture.matchNumber}`,
      bg: 'bg-slate-800 text-slate-300 border-slate-700 font-medium'
    };
  }

  function getActiveInnings(sc, tab) {
    if (!sc) return null;
    return tab === 'inn1' ? sc.innings1 : sc.innings2;
  }
</script>

<div class="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">

  <!-- TOP HERO HEADER -->
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <Trophy class="text-amber-400" size={24} />
        <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
          IPL Tournament &amp; Fixtures
        </h1>
      </div>
      <p class="text-slate-400 text-xs sm:text-sm">
        Authentic cricket match simulation based on real player stats &amp; mathematical ball-by-ball probability.
      </p>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto">
      {#if isXISelectionPhase || !allTeamsConfirmed}
        <button
          onclick={() => activeTab = 'xi'}
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer {activeTab === 'xi' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
        >
          <Lock size={14} />
          <span>Playing 11</span>
          {#if !allTeamsConfirmed}
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          {/if}
        </button>
      {/if}

      <button
        onclick={() => activeTab = 'fixtures'}
        class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer {activeTab === 'fixtures' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
      >
        <Calendar size={14} />
        <span>Fixtures</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
          {completedFixturesCount}/{totalFixturesCount}
        </span>
      </button>

      <button
        onclick={() => activeTab = 'standings'}
        class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer {activeTab === 'standings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
      >
        <TableProperties size={14} />
        <span>Standings</span>
      </button>

      {#if championTeam}
        <button
          onclick={() => showTrophyModal = true}
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition whitespace-nowrap cursor-pointer shadow-sm animate-pulse"
        >
          <Crown size={14} class="text-amber-400" />
          <span>IPL Winner!</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- CHAMPION CELEBRATION BANNER (If Grand Final Completed) -->
  {#if championTeam}
    <div class="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-2 border-amber-500/60 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>
      <div class="relative z-10 max-w-2xl mx-auto space-y-3">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-widest">
          <Crown size={14} /> IPL 2026 Champions Declared
        </span>

        <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight font-heading">
          {championTeam.name}
        </h2>

        <p class="text-amber-200 text-sm sm:text-base font-medium">
          Champions of the 2026 Tournament! Managed by <strong class="text-white">{championTeam.userName || championTeam.code}</strong>.
          {#if runnerUpTeam}
            Runner-up: <strong class="text-slate-300">{runnerUpTeam.name}</strong>.
          {/if}
        </p>

        <div class="pt-2 flex items-center justify-center gap-3">
          <button
            onclick={() => showTrophyModal = true}
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 cursor-pointer transition"
          >
            <Trophy size={16} />
            <span>View Trophy Presentation</span>
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- TAB 1: PLAYING 11 SELECTION WINDOW -->
  {#if activeTab === 'xi'}
    <div class="space-y-6">
      <!-- Status Notice -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full {allTeamsConfirmed ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}"></span>
            <h3 class="text-base font-bold text-white">
              {allTeamsConfirmed ? 'All Franchises Ready!' : 'Step 1: Pick and Confirm Playing 11'}
            </h3>
          </div>
          <p class="text-xs text-slate-400">
            {confirmedHumanTeams.length} of {humanTeams.length} human managers confirmed. Minimum 1 WK, maximum 4 overseas players.
          </p>
        </div>

        {#if store.isHost}
          <button
            onclick={handleProceedToTournament}
            class="px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 {allTeamsConfirmed ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'}"
          >
            <Play size={14} />
            <span>Proceed to Tournament Fixtures</span>
          </button>
        {/if}
      </div>

      <!-- Franchise Selector Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {#each store.roomState.teams as team (team.code)}
          {@const isSelected = team.code === selectedTeamCode}
          {@const isMine = store.myTeamCode === team.code}
          <button
            onclick={() => selectedTeamCode = team.code}
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border
              {isSelected
                ? 'bg-slate-800 text-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'}"
          >
            <span class="w-3 h-3 rounded-full" style="background: {team.primaryColor};"></span>
            <span>{team.code}</span>
            {#if isMine}
              <span class="text-[10px] text-amber-300">(You)</span>
            {/if}
            {#if team.isXIConfirmed}
              <Check size={12} class="text-emerald-400" />
            {/if}
          </button>
        {/each}
      </div>

      <!-- Playing 11 Slot Editor -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 class="text-xl font-black text-white font-heading">
              {selectedTeam?.name} — Playing 11
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Managed by <strong class="text-slate-200">{selectedTeam?.userName || 'AI Bot'}</strong> ·
              <span class={overseasInXI <= 4 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>{overseasInXI}/4 Overseas</span> ·
              <span class={wksInXI >= 1 ? 'text-emerald-400' : 'text-amber-400 font-bold'}>{wksInXI} Keeper</span>
            </p>
          </div>

          <div class="flex items-center gap-2">
            {#if isMyTeamOrHost && !isCurrentTeamConfirmed}
              <button
                onclick={handleAutoBalanceXI}
                class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Auto-Fill 11
              </button>
              <button
                onclick={handleConfirmXI}
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check size={14} />
                <span>Lock Playing 11</span>
              </button>
            {:else if isCurrentTeamConfirmed}
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                <CheckCircle2 size={14} /> Playing 11 Locked
              </span>
            {/if}
          </div>
        </div>

        <!-- 11 Slots Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each localXI as player, idx}
            {@const pos = positionLabels[idx] || { num: idx + 1, role: `Slot #${idx + 1}`, desc: 'Player' }}
            {@const isSelectedSlot = swapSourceIndex === idx}
            <button
              type="button"
              onclick={() => handleSlotClick(idx)}
              class="p-3.5 rounded-xl border transition cursor-pointer relative flex items-center justify-between gap-3 text-left w-full
                {isSelectedSlot ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg' : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'}"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                  {idx + 1}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <strong class="text-sm font-bold text-white truncate">{player?.name || 'Empty'}</strong>
                    {#if player?.isOverseas}
                      <Globe size={11} class="text-sky-400 shrink-0" />
                    {/if}
                  </div>
                  <span class="text-[11px] text-slate-400 block">{pos.role} · {player?.role || 'Squad'}</span>
                </div>
              </div>

              {#if player?.rating}
                <div class="text-right shrink-0">
                  <span class="text-xs font-bold text-amber-300 font-mono">{player.rating}</span>
                  <span class="text-[9px] text-slate-500 block uppercase">Rating</span>
                </div>
              {/if}
            </button>
          {/each}
        </div>

        <!-- Bench Players Selection -->
        {#if benchPlayers.length > 0 && isMyTeamOrHost && !isCurrentTeamConfirmed}
          <div class="pt-4 border-t border-slate-800 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">
              Available Bench Reserves ({benchPlayers.length} players) — Click a slot above then click below to swap
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {#each benchPlayers as bPlayer}
                <button
                  onclick={() => handleBenchClick(bPlayer)}
                  class="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-left transition cursor-pointer flex items-center justify-between"
                >
                  <div class="min-w-0">
                    <span class="text-xs font-bold text-white block truncate">{bPlayer.name}</span>
                    <span class="text-[10px] text-slate-400 block">{bPlayer.role}</span>
                  </div>
                  <span class="text-xs font-bold text-amber-300 font-mono ml-2 shrink-0">{bPlayer.rating || 80}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- TAB 2: TOURNAMENT FIXTURES & SCORECARDS -->
  {#if activeTab === 'fixtures'}
    <div class="space-y-6">
      <!-- Fixtures Action Strip -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <!-- Stage Filters -->
        <div class="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onclick={() => stageFilter = 'all'}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {stageFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}"
          >
            All Matches ({fixtures.length})
          </button>
          <button
            onclick={() => stageFilter = 'league'}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {stageFilter === 'league' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}"
          >
            League Stage
          </button>
          <button
            onclick={() => stageFilter = 'playoffs'}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {stageFilter === 'playoffs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}"
          >
            ⚔️ Playoffs &amp; Finals
          </button>
        </div>

        <!-- Simulation Controls -->
        <div class="flex items-center gap-2 self-stretch sm:self-auto">
          {#if nextScheduledFixture}
            <button
              onclick={() => handleSimulateFixture(nextScheduledFixture.id)}
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={13} />
              <span>Simulate Match #{nextScheduledFixture.matchNumber}</span>
            </button>
          {/if}

          {#if completedFixturesCount < totalFixturesCount}
            <button
              onclick={handleSimulateAll}
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={13} />
              <span>Simulate All ({totalFixturesCount - completedFixturesCount})</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- Fixtures Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each filteredFixtures as fixture (fixture.id)}
          {@const tA = store.roomState.teams?.find(t => t.code === fixture.teamA)}
          {@const tB = store.roomState.teams?.find(t => t.code === fixture.teamB)}
          {@const isDone = fixture.status === 'completed'}
          {@const stageBadge = getStageBadge(fixture)}
          {@const potm = fixture.scorecard?.playerOfTheMatch}

          <div class="bg-slate-900 border rounded-2xl p-5 transition space-y-4 shadow-lg
            {fixture.stage === 'final' ? 'border-amber-500/50 bg-gradient-to-b from-slate-900 to-amber-950/30' : 'border-slate-800'}"
          >
            <!-- Top: Stage badge & Match Number -->
            <div class="flex items-center justify-between text-xs">
              <span class="px-2.5 py-1 rounded-lg border text-[11px] {stageBadge.bg}">
                {stageBadge.label}
              </span>

              {#if isDone}
                <span class="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                  <Check size={13} /> Completed
                </span>
              {:else}
                <span class="text-slate-400 text-xs font-mono">Scheduled</span>
              {/if}
            </div>

            <!-- Teams Clashing Display -->
            <div class="grid grid-cols-2 gap-3 items-center py-2">
              <!-- Team A -->
              <div class="flex items-center gap-3 {fixture.winner === fixture.teamA ? 'font-black text-white' : 'text-slate-300'}">
                <div
                  class="w-10 h-10 rounded-xl grid place-items-center font-black text-sm shadow-md shrink-0"
                  style="background: {tA?.primaryColor || '#334155'}; color: {tA?.textColor || '#fff'};"
                >
                  {fixture.teamA}
                </div>
                <div class="min-w-0">
                  <span class="font-bold text-sm block truncate">{tA?.name || fixture.teamA}</span>
                  {#if fixture.scorecard?.innings1?.teamCode === fixture.teamA}
                    <span class="text-xs font-mono text-amber-300 block font-bold">
                      {fixture.scorecard.innings1.runs}/{fixture.scorecard.innings1.wickets} ({fixture.scorecard.innings1.overs} ov)
                    </span>
                  {:else if fixture.scorecard?.innings2?.teamCode === fixture.teamA}
                    <span class="text-xs font-mono text-amber-300 block font-bold">
                      {fixture.scorecard.innings2.runs}/{fixture.scorecard.innings2.wickets} ({fixture.scorecard.innings2.overs} ov)
                    </span>
                  {/if}
                </div>
              </div>

              <!-- Team B -->
              <div class="flex items-center gap-3 justify-end text-right {fixture.winner === fixture.teamB ? 'font-black text-white' : 'text-slate-300'}">
                <div class="min-w-0">
                  <span class="font-bold text-sm block truncate">{tB?.name || fixture.teamB}</span>
                  {#if fixture.scorecard?.innings1?.teamCode === fixture.teamB}
                    <span class="text-xs font-mono text-amber-300 block font-bold">
                      {fixture.scorecard.innings1.runs}/{fixture.scorecard.innings1.wickets} ({fixture.scorecard.innings1.overs} ov)
                    </span>
                  {:else if fixture.scorecard?.innings2?.teamCode === fixture.teamB}
                    <span class="text-xs font-mono text-amber-300 block font-bold">
                      {fixture.scorecard.innings2.runs}/{fixture.scorecard.innings2.wickets} ({fixture.scorecard.innings2.overs} ov)
                    </span>
                  {/if}
                </div>
                <div
                  class="w-10 h-10 rounded-xl grid place-items-center font-black text-sm shadow-md shrink-0"
                  style="background: {tB?.primaryColor || '#334155'}; color: {tB?.textColor || '#fff'};"
                >
                  {fixture.teamB}
                </div>
              </div>
            </div>

            <!-- Result Summary / Scorecard Action -->
            <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              {#if isDone}
                <div class="min-w-0">
                  <span class="text-xs font-bold text-emerald-300 block truncate">
                    {fixture.scorecard?.margin || `${fixture.winner} won`}
                  </span>
                  {#if potm}
                    <span class="text-[11px] text-amber-400 block truncate font-medium">
                      POTM: {potm.name} ({potm.summary})
                    </span>
                  {/if}
                </div>

                <button
                  onclick={() => {
                    selectedScorecardFixture = fixture;
                    scorecardInningsTab = 'inn1';
                  }}
                  class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  <BarChart2 size={13} />
                  <span>Scorecard</span>
                </button>
              {:else if fixture.teamA !== 'TBD' && fixture.teamB !== 'TBD'}
                <span class="text-xs text-slate-400">Match Scheduled</span>
                <button
                  onclick={() => handleSimulateFixture(fixture.id)}
                  class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                >
                  <Play size={12} />
                  <span>Simulate</span>
                </button>
              {:else}
                <span class="text-xs text-slate-500 italic">Waiting for preceding semi-finalists</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- TAB 3: STANDINGS & POINTS TABLE -->
  {#if activeTab === 'standings'}
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 class="text-lg font-black text-white font-heading">
            IPL League Stage Standings
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Top 4 franchises qualify for Semi-Finals and the IPL Grand Final.
          </p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="text-slate-400 bg-slate-950/80 border-b border-slate-800 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th class="py-3 px-3">#</th>
              <th class="py-3 px-3">Team</th>
              <th class="py-3 px-2 text-center">P</th>
              <th class="py-3 px-2 text-center">W</th>
              <th class="py-3 px-2 text-center">L</th>
              <th class="py-3 px-2 text-center font-bold text-white">Pts</th>
              <th class="py-3 px-3 text-center">Form</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-mono">
            {#each standings as team, rank}
              {@const isTop4 = rank < 4}
              <tr class="hover:bg-slate-800/40 transition {isTop4 ? 'bg-indigo-950/10' : ''}">
                <td class="py-3 px-3 font-bold text-slate-400">
                  <span class="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] {isTop4 ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}">
                    {rank + 1}
                  </span>
                </td>
                <td class="py-3 px-3 font-sans font-bold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" style="background: {team.primaryColor};"></span>
                  <span>{team.name} ({team.code})</span>
                  {#if isTop4}
                    <span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">Q</span>
                  {/if}
                </td>
                <td class="py-3 px-2 text-center text-slate-300">{team.played}</td>
                <td class="py-3 px-2 text-center text-emerald-400 font-bold">{team.won}</td>
                <td class="py-3 px-2 text-center text-rose-400 font-bold">{team.lost}</td>
                <td class="py-3 px-2 text-center font-black text-white text-sm">{team.points}</td>
                <td class="py-3 px-3 text-center font-sans">
                  <div class="flex items-center justify-center gap-1">
                    {#each (team.form || []) as res}
                      <span class="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center {res === 'W' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
                        {res}
                      </span>
                    {/each}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- AUTHENTIC SCORECARD MODAL -->
{#if selectedScorecardFixture && selectedScorecardFixture.scorecard}
  {@const sc = selectedScorecardFixture.scorecard}
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
    <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl space-y-6 my-8">
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-amber-400">
            {selectedScorecardFixture.stageLabel || `Match #${selectedScorecardFixture.matchNumber}`}
          </span>
          <h2 class="text-xl sm:text-2xl font-black text-white font-heading mt-0.5">
            {sc.teamA.code} vs {sc.teamB.code} Scorecard
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            {sc.toss?.summary || 'T20 Match'} · <strong class="text-emerald-400">{sc.margin}</strong>
          </p>
        </div>

        <button
          onclick={() => selectedScorecardFixture = null}
          class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Player of the Match Spotlight -->
      {#if sc.playerOfTheMatch}
        <div class="p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-800/40 to-amber-500/10 rounded-2xl border border-amber-500/30 flex items-center gap-3">
          <Award size={22} class="text-amber-400 shrink-0" />
          <div class="min-w-0">
            <span class="text-[10px] uppercase font-bold text-amber-300 block">Player of the Match</span>
            <strong class="text-white text-sm block truncate">{sc.playerOfTheMatch.name} ({sc.playerOfTheMatch.teamCode})</strong>
            <span class="text-xs text-slate-300 block">{sc.playerOfTheMatch.summary}</span>
          </div>
        </div>
      {/if}

      <!-- Innings Switcher Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onclick={() => scorecardInningsTab = 'inn1'}
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer {scorecardInningsTab === 'inn1' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
        >
          {sc.innings1.teamCode} Innings: {sc.innings1.runs}/{sc.innings1.wickets} ({sc.innings1.overs} ov)
        </button>
        <button
          onclick={() => scorecardInningsTab = 'inn2'}
          class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer {scorecardInningsTab === 'inn2' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
        >
          {sc.innings2.teamCode} Innings: {sc.innings2.runs}/{sc.innings2.wickets} ({sc.innings2.overs} ov)
        </button>
      </div>

      <!-- Selected Innings Breakdown -->
      {#if getActiveInnings(sc, scorecardInningsTab)}
        {@const activeInnings = getActiveInnings(sc, scorecardInningsTab)}
        <div class="space-y-4">
          <!-- Batting Table -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Batting Card</h4>
            <div class="overflow-x-auto rounded-xl border border-slate-800">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th class="py-2.5 px-3">Batter</th>
                    <th class="py-2.5 px-2">Dismissal</th>
                    <th class="py-2.5 px-2 text-right font-bold text-white">R</th>
                    <th class="py-2.5 px-2 text-right">B</th>
                    <th class="py-2.5 px-2 text-right">4s</th>
                    <th class="py-2.5 px-2 text-right">6s</th>
                    <th class="py-2.5 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 font-mono">
                  {#each activeInnings.batting as b}
                    <tr class="hover:bg-slate-800/30">
                      <td class="py-2 px-3 font-sans font-bold text-white">
                        {b.name}
                        {#if b.notOut}
                          <span class="text-amber-400">*</span>
                        {/if}
                      </td>
                      <td class="py-2 px-2 text-slate-400 font-sans text-[11px] truncate max-w-[140px]">{b.dismissal}</td>
                      <td class="py-2 px-2 text-right font-black text-amber-300 text-sm">{b.runs}</td>
                      <td class="py-2 px-2 text-right text-slate-300">{b.balls}</td>
                      <td class="py-2 px-2 text-right text-slate-400">{b.fours}</td>
                      <td class="py-2 px-2 text-right text-slate-400">{b.sixes}</td>
                      <td class="py-2 px-3 text-right text-slate-300 font-bold">{b.sr}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Bowling Table -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Bowling Card</h4>
            <div class="overflow-x-auto rounded-xl border border-slate-800">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th class="py-2.5 px-3">Bowler</th>
                    <th class="py-2.5 px-2 text-right">O</th>
                    <th class="py-2.5 px-2 text-right">M</th>
                    <th class="py-2.5 px-2 text-right">R</th>
                    <th class="py-2.5 px-2 text-right font-bold text-cyan-300">W</th>
                    <th class="py-2.5 px-3 text-right">Econ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 font-mono">
                  {#each activeInnings.bowling as b}
                    <tr class="hover:bg-slate-800/30">
                      <td class="py-2 px-3 font-sans font-bold text-white">{b.name}</td>
                      <td class="py-2 px-2 text-right text-slate-300">{b.overs}</td>
                      <td class="py-2 px-2 text-right text-slate-400">{b.maidens}</td>
                      <td class="py-2 px-2 text-right text-slate-300">{b.runs}</td>
                      <td class="py-2 px-2 text-right font-black text-cyan-300 text-sm">{b.wickets}</td>
                      <td class="py-2 px-3 text-right text-slate-300 font-bold">{b.economy}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- IPL TROPHY CEREMONY MODAL -->
<IplTrophyModal
  isOpen={showTrophyModal}
  champion={championTeam}
  runnerUp={runnerUpTeam}
  standings={standings}
  fixtures={fixtures}
  onClose={() => showTrophyModal = false}
/>
