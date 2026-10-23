<script>
  import { store } from '../lib/store.svelte.js';
  import { formatLakhs, getFranchise } from '../lib/utils.js';
  import { Users, Globe, Shield, Award, CheckCircle2, ChevronRight, Zap } from 'lucide-svelte';

  let selectedTeamCode = $state(
    store.myTeamCode || store.roomState.teams?.[0]?.code || 'CSK'
  );

  const selectedTeam = $derived(
    store.roomState.teams?.find(t => t.code === selectedTeamCode) || store.roomState.teams?.[0]
  );

  // Helper to resolve player category cleanly
  function resolveCategory(p) {
    if (p.category) return p.category;
    if (p.role === 'WK-Batter' || p.set?.startsWith('WK') || p.set?.startsWith('UWK')) return 'wicketkeeper';
    if (p.role === 'All-Rounder' || p.set?.startsWith('AL') || p.set?.startsWith('UAL') || p.allrounderType) return 'allrounder';
    if (p.set?.startsWith('FA') || p.set?.startsWith('UFA') || p.bowlingType === 'Pace') return 'pacer';
    if (p.set?.startsWith('SP') || p.set?.startsWith('USP') || p.bowlingType === 'Spin') return 'spinner';
    if (p.role === 'Batter' || p.set?.startsWith('BA') || p.set?.startsWith('UBA')) return 'batter';
    if (['Arshdeep Singh', 'Mitchell Starc', 'Kagiso Rabada', 'Mohammed Shami', 'Mohammed Siraj', 'Trent Boult', 'Bhuvneshwar Kumar'].includes(p.name)) return 'pacer';
    if (['Yuzvendra Chahal'].includes(p.name)) return 'spinner';
    return 'batter';
  }

  // 5 Separate Squad Categories
  const squad = $derived(selectedTeam?.squad || []);
  const batters = $derived(squad.filter(p => resolveCategory(p) === 'batter'));
  const wicketKeepers = $derived(squad.filter(p => resolveCategory(p) === 'wicketkeeper'));
  const allRounders = $derived(squad.filter(p => resolveCategory(p) === 'allrounder'));
  const pacers = $derived(squad.filter(p => resolveCategory(p) === 'pacer'));
  const spinners = $derived(squad.filter(p => resolveCategory(p) === 'spinner'));
  const overseas = $derived(squad.filter(p => p.isOverseas));

  const totalSpent = $derived(
    squad.reduce((sum, p) => sum + (p.soldPrice || p.amount || 0), 0)
  );

  // Rating & Balance Evaluation
  const squadHealth = $derived.by(() => {
    const count = squad.length;
    const minSquad = store.roomState.config?.minSquad || 18;
    const hasEnoughBatters = batters.length >= 4;
    const hasEnoughBowlers = (pacers.length + spinners.length) >= 4;
    const hasEnoughAllRounders = allRounders.length >= 2;
    const hasEnoughWKs = wicketKeepers.length >= 1;

    if (count >= minSquad && hasEnoughBatters && hasEnoughBowlers && hasEnoughAllRounders && hasEnoughWKs) {
      return { rating: '9.5 / 10 · Elite Balanced', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    }
    if (count >= 11 && hasEnoughWKs) {
      return { rating: '8.2 / 10 · Competitive', color: 'text-indigo-300', bg: 'bg-indigo-500/10 border-indigo-500/30' };
    }
    return { rating: 'Building Roster…', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
  });

  const categories = $derived([
    {
      id: 'batters',
      title: 'Batters / Batsmen',
      icon: '🏏',
      items: batters,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      description: 'Top-order & middle-order batting specialists'
    },
    {
      id: 'wicketkeepers',
      title: 'Wicket Keepers',
      icon: '🧤',
      items: wicketKeepers,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      description: 'Glovemen & key batting anchors'
    },
    {
      id: 'allrounders',
      title: 'All-Rounders',
      icon: '⚡',
      items: allRounders,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Pace & spin dual-threat players'
    },
    {
      id: 'pacers',
      title: 'Pacers / Fast Bowlers',
      icon: '🚀',
      items: pacers,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Express pace, swing & death-over specialists'
    },
    {
      id: 'spinners',
      title: 'Spin Bowlers / Spinners',
      icon: '🌀',
      items: spinners,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      description: 'Wrist spin, orthodox & mystery turners'
    }
  ]);
</script>

<div class="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
  <!-- Instruction / Section Header -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
    <div>
      <h2 class="text-xl sm:text-2xl font-extrabold text-white font-heading">
        Franchise Squad Rosters
      </h2>
      <p class="text-xs sm:text-sm text-slate-300">
        Tap any franchise below to inspect their full squad roster, purse balance, overseas spots, and career stats.
      </p>
    </div>

    <!-- Quick Mobile Franchise Selector Dropdown -->
    <div class="sm:hidden w-full">
      <label for="team-select" class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
        Select Franchise:
      </label>
      <select
        id="team-select"
        bind:value={selectedTeamCode}
        class="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500"
      >
        {#each store.roomState.teams as team (team.code)}
          <option value={team.code}>
            {team.code} - {team.name} ({team.squadCount || 0} players) {store.myTeamCode === team.code ? '⭐ Your Team' : ''}
          </option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Franchise Selector Tabs (Scrollable on tablet/desktop & swipeable on mobile) -->
  <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
    {#each store.roomState.teams as team (team.code)}
      {@const isSelected = team.code === selectedTeamCode}
      {@const isMine = store.myTeamCode === team.code}
      {@const franchise = getFranchise(team.code)}

      <button
        onclick={() => selectedTeamCode = team.code}
        class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border flex-shrink-0
          {isSelected
            ? 'bg-slate-800 text-white border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg'
            : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'}"
      >
        <span class="w-3 h-3 rounded-full flex-shrink-0" style="background: {franchise.primary};"></span>
        <span class="font-extrabold">{team.code}</span>
        {#if isMine}
          <span class="text-[10px] text-amber-300 font-normal">(You)</span>
        {/if}
        <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
          {team.squadCount || 0}
        </span>
      </button>
    {/each}
  </div>

  {#if selectedTeam}
    <!-- Franchise Summary Banner -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl space-y-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div class="flex items-center gap-4">
          <div
            class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center font-heading font-extrabold text-xl sm:text-2xl shadow-lg flex-shrink-0"
            style="background: {selectedTeam.primaryColor}; color: {selectedTeam.textColor || '#fff'};"
          >
            {selectedTeam.code}
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                {selectedTeam.name}
              </h3>
              {#if store.myTeamCode === selectedTeam.code}
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Your Team
                </span>
              {/if}
            </div>
            <p class="text-xs sm:text-sm text-slate-300 mt-0.5">
              Managed by <strong class="text-white">{selectedTeam.userName || (selectedTeam.isBot ? 'AI Bot' : 'Open Franchise')}</strong>
            </p>
          </div>
        </div>

        <!-- Squad Balance Health Rating -->
        <div class="px-4 py-2 rounded-2xl border {squadHealth.bg} flex items-center gap-2">
          <Award size={18} class={squadHealth.color} />
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Squad Rating</span>
            <span class="text-xs sm:text-sm font-extrabold font-heading {squadHealth.color}">{squadHealth.rating}</span>
          </div>
        </div>
      </div>

      <!-- Key Squad Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="p-3.5 sm:p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <span class="text-slate-400 block mb-0.5">Purse Remaining</span>
          <span class="text-xl sm:text-2xl font-extrabold font-heading text-white">{formatLakhs(selectedTeam.purse)}</span>
        </div>

        <div class="p-3.5 sm:p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <span class="text-slate-400 block mb-0.5">Total Spent</span>
          <span class="text-xl sm:text-2xl font-extrabold font-heading text-indigo-300">{formatLakhs(totalSpent)}</span>
        </div>

        <div class="p-3.5 sm:p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <span class="text-slate-400 block mb-0.5">Squad Size</span>
          <span class="text-xl sm:text-2xl font-extrabold font-heading text-white">
            {squad.length} <span class="text-xs text-slate-400 font-normal">/ 25 (min 11)</span>
          </span>
        </div>

        <div class="p-3.5 sm:p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <span class="text-slate-400 block mb-0.5">Overseas Cap</span>
          <span class="text-xl sm:text-2xl font-extrabold font-heading text-sky-400">
            {overseas.length} <span class="text-xs text-slate-400 font-normal">/ 8 max</span>
          </span>
        </div>
      </div>

      <!-- 5-Way Role Distribution Breakdown -->
      <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
          Role Balance &amp; Depth (5 Categories)
        </span>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div class="p-2.5 rounded-xl bg-slate-900 flex items-center justify-between border border-slate-800">
            <span class="text-slate-300 flex items-center gap-1.5">
              <span>🏏</span>
              <span>Batters</span>
            </span>
            <span class="font-extrabold font-heading text-white">{batters.length}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 flex items-center justify-between border border-slate-800">
            <span class="text-slate-300 flex items-center gap-1.5">
              <span>🧤</span>
              <span>Keepers</span>
            </span>
            <span class="font-extrabold font-heading text-white">{wicketKeepers.length}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 flex items-center justify-between border border-slate-800">
            <span class="text-slate-300 flex items-center gap-1.5">
              <span>⚡</span>
              <span>All-Rounders</span>
            </span>
            <span class="font-extrabold font-heading text-white">{allRounders.length}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 flex items-center justify-between border border-slate-800">
            <span class="text-slate-300 flex items-center gap-1.5">
              <span>🚀</span>
              <span>Pacers</span>
            </span>
            <span class="font-extrabold font-heading text-white">{pacers.length}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 flex items-center justify-between border border-slate-800">
            <span class="text-slate-300 flex items-center gap-1.5">
              <span>🌀</span>
              <span>Spinners</span>
            </span>
            <span class="font-extrabold font-heading text-white">{spinners.length}</span>
          </div>
        </div>
      </div>

      <!-- Categorized Acquired Players -->
      <div class="space-y-8 pt-2">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 class="text-lg sm:text-xl font-extrabold text-white font-heading">
            Squad Roster ({squad.length} Players)
          </h4>
          <span class="text-xs text-slate-300">
            {overseas.length} Overseas · {squad.length - overseas.length} Indian
          </span>
        </div>

        {#if squad.length > 0}
          {#each categories as cat (cat.id)}
            <div class="space-y-3">
              <!-- Category Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{cat.icon}</span>
                  <h5 class="text-sm sm:text-base font-bold text-white font-heading">
                    {cat.title}
                  </h5>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold {cat.badgeColor} border">
                    {cat.items.length}
                  </span>
                </div>
                <span class="text-xs text-slate-400 hidden sm:inline">
                  {cat.description}
                </span>
              </div>

              <!-- Category Player Cards Grid -->
              {#if cat.items.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {#each cat.items as p (p.id || p.name)}
                    <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3 shadow-sm hover:border-slate-700 transition">
                      <!-- Top Line: Name, Overseas, Price -->
                      <div class="flex items-start justify-between gap-2">
                        <div>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <strong class="text-sm font-bold text-white">{p.name}</strong>
                            {#if p.isOverseas}
                              <Globe size={13} class="text-sky-400" title="Overseas Player" />
                            {/if}
                          </div>
                          <span class="text-xs text-slate-300 block">
                            {p.country} · {p.set || 'Auction'}
                          </span>
                        </div>

                        <div class="text-right whitespace-nowrap">
                          <span class="font-heading font-extrabold text-sm text-indigo-300 block">
                            {formatLakhs(p.soldPrice || p.amount)}
                          </span>
                          <span class="text-[10px] text-slate-400">
                            {p.round === 2 ? 'Accelerated' : 'Round 1'}
                          </span>
                        </div>
                      </div>

                      <!-- Detailed Cricket Style & Profile Badge -->
                      <div class="space-y-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <div class="flex flex-wrap items-center gap-1.5">
                          {#if cat.id === 'allrounders'}
                            <span class="px-2 py-0.5 rounded-md font-bold {p.allrounderType === 'Pace All-Rounder' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'}">
                              {p.allrounderType || (p.bowlingType === 'Pace' ? 'Pace All-Rounder' : 'Spin All-Rounder')}
                            </span>
                          {:else if cat.id === 'pacers'}
                            <span class="px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Fast Bowler
                            </span>
                          {:else if cat.id === 'spinners'}
                            <span class="px-2 py-0.5 rounded-md font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Spin Bowler
                            </span>
                          {:else if cat.id === 'wicketkeepers'}
                            <span class="px-2 py-0.5 rounded-md font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Wicket-Keeper
                            </span>
                          {:else}
                            <span class="px-2 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Batter
                            </span>
                          {/if}

                          <span class="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                            🏏 {p.battingStyle || 'Right-hand Bat'}
                          </span>
                        </div>

                        {#if p.bowlingStyle}
                          <div class="text-[11px] text-slate-300 flex items-center gap-1 pt-0.5">
                            <span class="text-white font-medium">Bowling:</span>
                            <span class="text-indigo-300 font-medium truncate">{p.bowlingStyle}</span>
                          </div>
                        {/if}

                        {#if p.specialization}
                          <p class="text-[10px] text-slate-400 italic leading-tight pt-0.5">
                            {p.specialization}
                          </p>
                        {/if}
                      </div>

                      <!-- Career IPL / T20 Stats Row -->
                      {#if p.stats}
                        {#if p.iplStats || p.intlStats}
                          <div class="flex items-center justify-between text-[9px] text-slate-300 px-1 pt-1 border-t border-slate-800">
                            <span>IPL: {p.iplStats?.runs ?? p.stats?.iplRuns ?? 0}r · {p.iplStats?.wkts ?? p.stats?.iplWkts ?? 0}w</span>
                            <span>T20I: {p.intlStats?.runs ?? p.stats?.intlRuns ?? 0}r · {p.intlStats?.wkts ?? p.stats?.intlWkts ?? 0}w</span>
                          </div>
                        {/if}
                        <div class="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800 text-center text-[11px]">
                          <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                            <span class="text-slate-400 block text-[10px]">Matches</span>
                            <strong class="text-white font-heading">{p.stats.matches ?? '-'}</strong>
                          </div>

                          {#if cat.id === 'allrounders'}
                            <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                              <span class="text-slate-400 block text-[10px]">Runs (SR)</span>
                              <strong class="text-amber-300 font-heading">
                                {p.stats.runs ?? '-'}
                                {#if p.stats.sr}<span class="text-[9px] text-slate-300">({p.stats.sr})</span>{/if}
                              </strong>
                            </div>
                            <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                              <span class="text-slate-400 block text-[10px]">Wkts (Econ)</span>
                              <strong class="text-cyan-300 font-heading">
                                {p.stats.wkts ?? '-'}
                                {#if p.stats.econ}<span class="text-[9px] text-slate-300">({p.stats.econ})</span>{/if}
                              </strong>
                            </div>
                          {:else if cat.id === 'pacers' || cat.id === 'spinners'}
                            <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                              <span class="text-slate-400 block text-[10px]">Wickets</span>
                              <strong class="text-cyan-300 font-heading">{p.stats.wkts ?? '-'}</strong>
                            </div>
                            <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                              <span class="text-slate-400 block text-[10px]">Economy</span>
                              <strong class="text-white font-heading">{p.stats.econ ?? (p.stats.bb || '-')}</strong>
                            </div>
                          {:else}
                            <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                              <span class="text-slate-400 block text-[10px]">Runs</span>
                              <strong class="text-indigo-300 font-heading">{p.stats.runs ?? '-'}</strong>
                            </div>
                            <div class="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                              <span class="text-slate-400 block text-[10px]">Strike Rate</span>
                              <strong class="text-white font-heading">{p.stats.sr ?? '-'}</strong>
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="py-4 px-4 text-xs text-slate-400 bg-slate-950 rounded-xl border border-dashed border-slate-800">
                  No {cat.title.toLowerCase()} acquired yet.
                </div>
              {/if}
            </div>
          {/each}
        {:else}
          <div class="py-16 text-center text-slate-400 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
            No players bought by {selectedTeam.name} yet.
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
