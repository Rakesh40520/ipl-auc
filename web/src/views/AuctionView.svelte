<script>
  import { store } from '../lib/store.svelte.js';
  import { formatLakhs, getFranchise } from '../lib/utils.js';
  import { calculateNextBid } from '../../../server/rules.js';
  import {
    Gavel,
    Pause,
    Play,
    RotateCcw,
    CheckCircle,
    Globe,
    Award,
    Check,
    Bot,
    SkipForward,
    XCircle,
    Square,
    LogOut,
    Shuffle,
    AlertCircle
  } from 'lucide-svelte';

  // Safeguard: Automatically redirect if auction has concluded or in playing XI selection
  $effect(() => {
    if (store.roomState.status === 'playing_xi_selection' || store.roomState.status === 'completed') {
      store.view = 'results';
    }
  });

  let placingBid = $state(false);

  const player = $derived(store.roomState.currentPlayer);
  const currentBid = $derived(store.roomState.currentBid || 0);
  const leadTeamCode = $derived(store.roomState.leadTeam);
  const leadTeam = $derived(
    leadTeamCode ? store.roomState.teams?.find(t => t.code === leadTeamCode) : null
  );
  const myTeam = $derived(
    store.myTeamCode ? store.roomState.teams?.find(t => t.code === store.myTeamCode) : null
  );

  const hasLeadingBid = $derived(Boolean(leadTeamCode));
  const nextBidAmount = $derived(
    player ? calculateNextBid(currentBid, player.basePrice, hasLeadingBid) : 0
  );

  const isLeading = $derived(Boolean(store.myTeamCode && leadTeamCode === store.myTeamCode));

  // Determine eligibility to bid
  const bidEligibility = $derived.by(() => {
    if (!store.myTeamCode || !myTeam) {
      return { canBid: false, reason: 'Claim a franchise in lobby to bid' };
    }
    if (store.roomState.status !== 'active') {
      return { canBid: false, reason: `Auction is ${store.roomState.status}` };
    }
    if (isLeading) {
      return { canBid: false, reason: 'You hold the highest bid' };
    }
    if (!player) {
      return { canBid: false, reason: 'Waiting for next player' };
    }
    if (myTeam.squadCount >= 25) {
      return { canBid: false, reason: 'Squad full (25 players)' };
    }
    if (player.isOverseas && myTeam.overseasCount >= 8) {
      return { canBid: false, reason: 'Overseas limit reached (8/8)' };
    }
    if (nextBidAmount > myTeam.purse) {
      return { canBid: false, reason: 'Insufficient purse' };
    }

    // Solvency check (min squad 18 @ 30L min base, or minimum 11)
    const minSquad = store.roomState.config?.minSquad || 18;
    const minBase = store.roomState.config?.minPlayerBasePrice || 30;
    const remainingSlots = Math.max(0, minSquad - (myTeam.squadCount + 1));
    const reserveNeeded = remainingSlots * minBase;
    const maxAllowedBid = myTeam.purse - reserveNeeded;

    if (nextBidAmount > maxAllowedBid) {
      return {
        canBid: false,
        reason: `Solvency block: Need ₹${formatLakhs(reserveNeeded)} reserved for squad`
      };
    }

    return { canBid: true, reason: null };
  });

  async function handleBid() {
    if (!bidEligibility.canBid || placingBid) return;
    placingBid = true;
    await store.placeBid();
    placingBid = false;
  }

  // Timer Circle Math (perimeter 327 for r=52)
  const timerRadius = 52;
  const timerCircumference = 2 * Math.PI * timerRadius; // ~326.72
  const timerDuration = $derived(store.roomState.config?.timerDuration || 10);
  const currentSeconds = $derived(store.roomState.timer ?? store.roomState.timerPrecise ?? 0);
  const timerFraction = $derived(
    Math.max(0, Math.min(1, currentSeconds / timerDuration))
  );
  const strokeOffset = $derived(timerCircumference * (1 - timerFraction));
  const isTimerLow = $derived(currentSeconds <= 3 && currentSeconds > 0);
</script>

<div class="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
  <!-- Top Bar: Set Banner & Round Progress -->
  <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 px-4 sm:px-5 py-3 rounded-2xl shadow-sm">
    <div class="flex items-center gap-3">
      <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
        {#if store.roomState.isAcceleratedRound}
          Accelerated Round
        {:else}
          {player?.setName || 'Marquee Set'}
        {/if}
      </span>
      <span class="text-xs text-slate-300">
        Player {store.roomState.currentPlayerIndex + 1} of {store.roomState.totalPlayers || 188}
      </span>
    </div>

    <!-- Status / Round Indicator -->
    <div class="flex items-center gap-2">
      {#if store.roomState.status === 'paused'}
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
          <Pause size={12} />
          <span>PAUSED BY HOST</span>
        </span>
      {:else}
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>LIVE AUCTION</span>
        </span>
      {/if}
    </div>
  </div>

  <!-- DEDICATED HOST CONTROL PANEL (Prominent for Room Host) -->
  {#if store.isHost}
    <div class="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-500/30">
            HOST CONTROLS
          </span>
          <span class="text-xs text-slate-300">
            Direct host auction management tools:
          </span>
        </div>
        <span class="text-[11px] text-slate-400">
          Ensure all franchises draft 11 players before ending
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <!-- 3 Primary Host Actions: Pause/Resume, Sell Now, End Auction -->
        <div class="flex items-center gap-2 flex-wrap">
          {#if store.roomState.status === 'active'}
            <button
              onclick={() => store.hostControl('pause')}
              class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-950/40"
              title="Pause the auction countdown timer"
            >
              <Pause size={14} />
              <span>Pause</span>
            </button>
          {:else if store.roomState.status === 'paused'}
            <button
              onclick={() => store.hostControl('resume')}
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950/40"
              title="Resume the auction countdown timer"
            >
              <Play size={14} />
              <span>Resume</span>
            </button>
          {/if}

          <button
            onclick={() => store.hostControl('sell_now')}
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-950/40"
            title="Hammer down: Sell immediately to current highest bidder"
          >
            <Check size={14} />
            <span>Sell Now</span>
          </button>

          <button
            onclick={() => {
              if (confirm('Are you sure you want to END the Auction now?\n\nEvery franchise will be auto-completed to 11 players if needed, and all players will immediately advance to the Playing XI Builder and Tournament Fixtures.')) {
                store.hostControl('end_auction');
              }
            }}
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-red-950/50 border border-red-400/40"
            title="End auction and advance to Playing XI selection and Fixtures"
          >
            <Square size={13} class="fill-white" />
            <span>End Auction</span>
          </button>
        </div>

        <!-- Secondary Host Actions: Skip, Unsold, Undo, Bots, Jumble -->
        <div class="flex items-center gap-1.5 flex-wrap">
          {#if store.roomState.canUndo}
            <button
              onclick={() => store.hostControl('undo')}
              class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
          {/if}

          <button
            onclick={() => store.hostControl('next_player')}
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
            title="Advance immediately to next player"
          >
            <SkipForward size={13} />
            <span>Next</span>
          </button>

          <button
            onclick={() => store.hostControl('unsold')}
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 text-red-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
            title="Pass player as Unsold"
          >
            <XCircle size={13} />
            <span>Unsold</span>
          </button>

          <button
            onclick={() => store.hostControl('toggle_bots')}
            class="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer {store.roomState.config?.botsEnabled ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200' : 'bg-slate-800 border-slate-700 text-slate-400'}"
            title="Toggle AI bots for unmanaged franchises"
          >
            <Bot size={13} />
            <span>{store.roomState.config?.botsEnabled ? 'Bots: ON' : 'Bots: OFF'}</span>
          </button>

          <button
            onclick={() => store.jumblePlayers()}
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Jumble remaining player queue"
          >
            <Shuffle size={12} />
            <span>Jumble</span>
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Main 3-Column Broadcast Grid (On mobile: Center Stage appears first!) -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    
    <!-- CENTER COLUMN: Live Stage (order-1 on mobile, order-2 on desktop) -->
    <div class="order-1 lg:order-2 lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-between text-center relative shadow-xl space-y-6 min-h-[480px]">
      
      <!-- Circular Countdown Timer Ring -->
      <div class="relative w-32 h-32 sm:w-36 sm:h-36 {isTimerLow ? 'animate-heartbeat' : ''}">
        <svg viewBox="0 0 120 120" class="w-full h-full transform -rotate-90">
          <!-- Background track -->
          <circle
            cx="60"
            cy="60"
            r={timerRadius}
            fill="none"
            stroke="#1e293b"
            stroke-width="8"
          />
          <!-- Foreground animated countdown -->
          <circle
            cx="60"
            cy="60"
            r={timerRadius}
            fill="none"
            stroke={isTimerLow ? '#ef4444' : '#6366f1'}
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray={timerCircumference}
            stroke-dashoffset={strokeOffset}
            style="transition: stroke-dashoffset 0.95s linear, stroke 0.3s ease;"
          />
        </svg>

        <!-- Centered Timer Text -->
        <div class="absolute inset-0 grid place-items-center">
          <span class="font-heading font-extrabold text-3xl sm:text-4xl {isTimerLow ? 'text-red-400' : 'text-white'}">
            {store.roomState.timer || 0}
          </span>
        </div>
      </div>

      <!-- Current Bid & Leading Franchise Display -->
      <div class="space-y-2 w-full">
        <span class="text-xs uppercase font-semibold text-slate-400 tracking-widest block">
          Current Bid
        </span>
        <div class="text-4xl sm:text-6xl font-extrabold text-white font-heading tracking-tight animate-price-pop">
          {formatLakhs(currentBid)}
        </div>

        <!-- Leading Franchise Tag -->
        <div class="min-h-[36px] flex items-center justify-center pt-1">
          {#if leadTeam}
            {@const franchise = getFranchise(leadTeam.code)}
            <div
              class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border shadow-md animate-pulse"
              style="background: {franchise.primary}25; border-color: {franchise.primary}70; color: #fff;"
            >
              <span class="w-2.5 h-2.5 rounded-full" style="background: {franchise.primary};"></span>
              <span>{leadTeam.name} ({leadTeam.code})</span>
              {#if isLeading}
                <span class="text-xs text-amber-300 font-normal">· You hold this bid</span>
              {/if}
            </div>
          {:else}
            <span class="text-xs text-slate-400 italic">
              Opening bid at base price. Tap below to bid!
            </span>
          {/if}
        </div>
      </div>

      <!-- Big Primary BID Button -->
      <div class="w-full space-y-2">
        <button
          onclick={handleBid}
          disabled={!bidEligibility.canBid || placingBid}
          class="w-full h-16 sm:h-20 rounded-2xl font-heading font-extrabold text-xl sm:text-2xl transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer shadow-xl
            {isLeading
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 cursor-default'
              : bidEligibility.canBid
                ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white hover:scale-[1.01] active:scale-[0.99] shadow-indigo-950/60'
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'}"
        >
          {#if placingBid}
            <span class="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Placing Bid…</span>
          {:else if isLeading}
            <CheckCircle size={24} class="text-emerald-400" />
            <span>You lead the bid</span>
          {:else if bidEligibility.canBid}
            <Gavel size={24} />
            <span>Bid {formatLakhs(nextBidAmount)}</span>
          {:else}
            <span class="text-sm sm:text-base font-semibold">{bidEligibility.reason}</span>
          {/if}
        </button>

        {#if myTeam}
          <div class="flex items-center justify-between text-xs text-slate-300 px-1">
            <span>Your Purse: <strong class="text-white">{formatLakhs(myTeam.purse)}</strong></span>
            <span>Squad: <strong class="text-white">{myTeam.squadCount}/25</strong></span>
          </div>
        {/if}
      </div>

      <!-- Live Bid Feed -->
      <div class="w-full space-y-1.5 pt-2 border-t border-slate-800">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block text-left">
          Live Bids
        </span>
        <div class="max-h-24 overflow-y-auto space-y-1 pr-1 text-left text-xs">
          {#if store.roomState.bidHistory?.length > 0}
            {#each store.roomState.bidHistory as bid (bid.timestamp + bid.amount)}
              {@const franchise = getFranchise(bid.teamCode)}
              <div class="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" style="background: {franchise.primary};"></span>
                  <span class="font-bold text-white">{bid.teamCode}</span>
                  <span class="text-slate-400 truncate max-w-[120px]">{bid.userName}</span>
                </div>
                <strong class="font-heading font-bold text-indigo-300">
                  {formatLakhs(bid.amount)}
                </strong>
              </div>
            {/each}
          {:else}
            <div class="py-2 text-center text-slate-400 italic">
              No bids placed yet for this player
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- LEFT COLUMN: Player Profile Card (order-2 on mobile, order-1 on desktop) -->
    <div class="order-2 lg:order-1 lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xl space-y-5">
      {#if player}
        <!-- Player Avatar & Badges -->
        <div class="flex items-start justify-between">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 text-white font-heading font-extrabold text-2xl sm:text-3xl grid place-items-center shadow-md">
            {player.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>

          <div class="flex flex-col items-end gap-1.5">
            {#if player.isOverseas}
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                <Globe size={12} />
                <span>Overseas</span>
              </span>
            {/if}
            {#if player.isCapped}
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Award size={12} />
                <span>Capped</span>
              </span>
            {:else}
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span>Uncapped</span>
              </span>
            {/if}
          </div>
        </div>

        <!-- Name & Country -->
        <div class="space-y-1">
          <h3 class="text-xl sm:text-2xl font-extrabold text-white font-heading tracking-tight">
            {player.name}
          </h3>
          <div class="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
            <span class="font-medium text-indigo-300">{player.role}</span>
            <span>·</span>
            <span>{player.country}</span>
          </div>
        </div>

        <!-- Cricket Profile & Styles -->
        <div class="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            {#if player.category === 'allrounder' || player.allrounderType}
              <span class="px-2 py-0.5 rounded-md font-bold {player.allrounderType === 'Pace All-Rounder' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'}">
                {player.allrounderType || 'All-Rounder'}
              </span>
            {:else if player.category === 'pacer'}
              <span class="px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Fast Bowler
              </span>
            {:else if player.category === 'spinner'}
              <span class="px-2 py-0.5 rounded-md font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Spin Bowler
              </span>
            {:else if player.category === 'wicketkeeper' || player.role === 'WK-Batter'}
              <span class="px-2 py-0.5 rounded-md font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Wicket-Keeper
              </span>
            {:else}
              <span class="px-2 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Batter
              </span>
            {/if}

            <span class="px-2 py-0.5 rounded-md font-medium bg-slate-900 text-slate-300 border border-slate-800">
              🏏 {player.battingStyle || 'Right-hand Bat'}
            </span>
          </div>

          {#if player.bowlingStyle}
            <div class="text-xs text-slate-300 flex items-center gap-1.5 pt-0.5">
              <span class="text-white font-medium">Bowling:</span>
              <span class="text-indigo-300 font-medium">{player.bowlingStyle}</span>
            </div>
          {/if}

          {#if player.specialization}
            <p class="text-[11px] text-slate-400 italic leading-tight">
              {player.specialization}
            </p>
          {/if}
        </div>

        <!-- Base Price Display -->
        <div class="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Base Price</span>
          <span class="text-lg sm:text-xl font-bold font-heading text-white">{formatLakhs(player.basePrice)}</span>
        </div>

        <!-- Career Stats Card (IPL + International T20) -->
        {#if player.stats}
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Career T20 Stats</span>
              <span class="text-[10px] text-indigo-300 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                IPL + International
              </span>
            </div>

            <!-- IPL & International Sub-Breakdown -->
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                <span class="text-amber-400 font-bold block text-[10px] uppercase">IPL Career</span>
                <span class="text-white font-semibold block">
                  {player.iplStats?.matches ?? player.stats.iplMatches ?? '-'}m · {player.iplStats?.runs ?? player.stats.iplRuns ?? 0}r
                </span>
                <span class="text-slate-300 text-[10px] block">
                  SR {player.iplStats?.sr ?? player.stats.iplSr ?? '-'} · {player.iplStats?.wkts ?? player.stats.iplWkts ?? 0}w
                </span>
              </div>
              <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                <span class="text-cyan-400 font-bold block text-[10px] uppercase">T20I Career</span>
                <span class="text-white font-semibold block">
                  {player.intlStats?.matches ?? player.stats.intlMatches ?? '-'}m · {player.intlStats?.runs ?? player.stats.intlRuns ?? 0}r
                </span>
                <span class="text-slate-300 text-[10px] block">
                  SR {player.intlStats?.sr ?? player.stats.intlSr ?? '-'} · {player.intlStats?.wkts ?? player.stats.intlWkts ?? 0}w
                </span>
              </div>
            </div>

            <!-- Combined Career Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span class="text-slate-400 block text-[10px]">Total Matches</span>
                <span class="text-sm sm:text-base font-bold text-white font-heading">{player.stats.matches ?? '-'}</span>
              </div>

              {#if player.stats.runs != null}
                <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span class="text-slate-400 block text-[10px]">Total Runs (SR)</span>
                  <span class="text-sm sm:text-base font-bold text-white font-heading">
                    {player.stats.runs} <span class="text-xs font-normal text-slate-400">({player.stats.sr})</span>
                  </span>
                </div>
              {:else if player.stats.wkts != null}
                <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span class="text-slate-400 block text-[10px]">Total Wickets</span>
                  <span class="text-sm sm:text-base font-bold text-white font-heading">
                    {player.stats.wkts} <span class="text-xs font-normal text-slate-400">({player.stats.econ})</span>
                  </span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {:else}
        <div class="h-64 grid place-items-center text-slate-400 text-sm">
          Loading player details…
        </div>
      {/if}

      <!-- SOLD / UNSOLD Stamp Overlay -->
      {#if store.stamp.visible}
        <div class="absolute inset-0 z-30 grid place-items-center bg-slate-950/90 backdrop-blur-sm p-6">
          <div
            class="animate-stamp text-center px-6 py-5 rounded-2xl border-4 shadow-2xl bg-slate-900 max-w-[280px]"
            style="border-color: {store.stamp.teamColor}; color: {store.stamp.teamColor};"
          >
            <div class="text-4xl font-extrabold font-heading tracking-tight">
              {store.stamp.type === 'sold' ? 'SOLD' : 'UNSOLD'}
            </div>
            {#if store.stamp.type === 'sold'}
              <div class="mt-1 text-sm font-bold text-white">
                {store.stamp.teamName}
              </div>
              <div class="text-lg font-extrabold font-heading text-amber-300">
                {formatLakhs(store.stamp.amount)}
              </div>
            {:else}
              <div class="mt-1 text-xs text-slate-300">
                Available in accelerated round
              </div>
            {/if}

            {#if store.isHost}
              <button
                onclick={() => store.hostControl('next_player')}
                class="mt-4 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 mx-auto transition cursor-pointer shadow-lg"
              >
                <span>Next Player</span>
                <SkipForward size={13} />
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- RIGHT COLUMN: Purse Leaderboard (order-3) -->
    <div class="order-3 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <h4 class="text-sm font-bold text-white uppercase tracking-wider font-heading">
          Franchise Purses
        </h4>
        <span class="text-xs text-slate-400">10 Teams</span>
      </div>

      <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {#each store.roomState.teams as team (team.code)}
          {@const isCurrentLead = leadTeamCode === team.code}
          {@const isMyFranchise = store.myTeamCode === team.code}

          <div
            class="p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between
              {isCurrentLead ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/40' : 'bg-slate-950 border-slate-800'}
              {isMyFranchise ? 'outline outline-1 outline-amber-400' : ''}"
          >
            <!-- Left: Team Logo & Name -->
            <div class="flex items-center gap-2.5">
              <div
                class="w-8 h-8 rounded-lg grid place-items-center font-heading font-bold text-xs flex-shrink-0"
                style="background: {team.primaryColor}; color: {team.textColor || '#fff'};"
              >
                {team.code}
              </div>

              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-white">{team.code}</span>
                  {#if isMyFranchise}
                    <span class="text-[10px] text-amber-300 font-semibold">(You)</span>
                  {/if}
                </div>
                <span class="text-[11px] text-slate-400 block">
                  {team.squadCount || 0}/25 players
                </span>
              </div>
            </div>

            <!-- Right: Remaining Purse -->
            <div class="text-right">
              <span class="font-heading font-extrabold text-sm text-white block">
                {formatLakhs(team.purse)}
              </span>
              {#if team.overseasCount > 0}
                <span class="text-[10px] text-sky-400 font-medium">
                  {team.overseasCount} OS
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
