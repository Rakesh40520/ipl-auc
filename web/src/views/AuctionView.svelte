<script>
  import { store } from '../lib/store.svelte.js';
  import { formatLakhs, getFranchise } from '../lib/utils.js';
  import { getBidIncrement, calculateNextBid } from '../../../server/rules.js';
  import {
    Gavel,
    Pause,
    Play,
    RotateCcw,
    FastForward,
    CheckCircle,
    Globe,
    Award,
    Activity,
    AlertCircle,
    User,
    Check,
    Bot,
    SkipForward,
    XCircle,
    Square,
    LogOut
  } from 'lucide-svelte';

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
      return { canBid: false, reason: 'Claim a franchise to bid' };
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

    // Solvency check (min squad 18 @ 30L min base)
    const minSquad = store.roomState.config?.minSquad || 18;
    const minBase = store.roomState.config?.minPlayerBasePrice || 30;
    const remainingSlots = Math.max(0, minSquad - (myTeam.squadCount + 1));
    const reserveNeeded = remainingSlots * minBase;
    const maxAllowedBid = myTeam.purse - reserveNeeded;

    if (nextBidAmount > maxAllowedBid) {
      return {
        canBid: false,
        reason: `Solvency block: Need ₹${formatLakhs(reserveNeeded)} reserved for min squad`
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

<div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  <!-- Top Bar: Set Banner & Round Progress -->
  <div class="flex flex-wrap items-center justify-between gap-3 bg-[#15142e] border border-[#272552] px-5 py-3 rounded-2xl">
    <div class="flex items-center gap-3">
      <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
        {#if store.roomState.isAcceleratedRound}
          Accelerated Round
        {:else}
          {player?.setName || 'Marquee Set'}
        {/if}
      </span>
      <span class="text-xs text-[#9a97c4]">
        Player {store.roomState.currentPlayerIndex + 1} of {store.roomState.totalPlayers || 188}
      </span>
    </div>

    <!-- Status / Round Indicator -->
    <div class="flex items-center gap-2">
      {#if store.roomState.status === 'paused'}
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold">
          <Pause size={12} />
          <span>PAUSED BY HOST</span>
        </span>
      {:else}
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>LIVE AUCTION</span>
        </span>
      {/if}
    </div>
  </div>

  <!-- Main 3-Column Broadcast Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <!-- LEFT COLUMN: Large Player Profile Card (4 cols) -->
    <div class="lg:col-span-4 bg-[#15142e] border border-[#272552] rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-6">
      {#if player}
        <!-- Player Avatar & Badges -->
        <div class="flex items-start justify-between">
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#8b73ff] to-[#ff4d8d] text-white font-heading font-extrabold text-3xl grid place-items-center shadow-lg shadow-purple-950/50">
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
          <h3 class="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
            {player.name}
          </h3>
          <div class="flex items-center gap-2 text-sm text-[#9a97c4]">
            <span class="font-medium text-purple-300">{player.role}</span>
            <span>·</span>
            <span>{player.country}</span>
          </div>
        </div>

        <!-- Cricket Profile & Styles -->
        <div class="space-y-2 p-3 bg-[#0c0b1d] rounded-2xl border border-[#272552]/80">
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
              <span class="px-2 py-0.5 rounded-md font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Batter
              </span>
            {/if}

            <span class="px-2 py-0.5 rounded-md font-medium bg-[#15142e] text-[#9a97c4] border border-[#272552]">
              🏏 {player.battingStyle || 'Right-hand Bat'}
            </span>
          </div>

          {#if player.bowlingStyle}
            <div class="text-xs text-[#9a97c4] flex items-center gap-1.5 pt-0.5">
              <span class="text-white font-medium">Bowling:</span>
              <span class="text-purple-300 font-medium">{player.bowlingStyle}</span>
            </div>
          {/if}

          {#if player.specialization}
            <p class="text-[11px] text-[#8683ad] italic leading-tight">
              {player.specialization}
            </p>
          {/if}
        </div>

        <!-- Base Price Display -->
        <div class="p-4 bg-[#0c0b1d] rounded-2xl border border-[#272552] flex items-center justify-between">
          <span class="text-xs font-semibold text-[#9a97c4] uppercase tracking-wider">Base Price</span>
          <span class="text-xl font-bold font-heading text-white">{formatLakhs(player.basePrice)}</span>
        </div>

        <!-- Career Stats Card -->
        {#if player.stats}
          <div class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-[#9a97c4]">Career IPL / T20 Stats</span>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="p-3 bg-[#0c0b1d] rounded-xl border border-[#272552]/80">
                <span class="text-[#9a97c4] block">Matches</span>
                <span class="text-base font-bold text-white font-heading">{player.stats.matches ?? '-'}</span>
              </div>

              {#if player.stats.runs != null}
                <div class="p-3 bg-[#0c0b1d] rounded-xl border border-[#272552]/80">
                  <span class="text-[#9a97c4] block">Runs (SR)</span>
                  <span class="text-base font-bold text-white font-heading">
                    {player.stats.runs} <span class="text-xs font-normal text-[#9a97c4]">({player.stats.sr})</span>
                  </span>
                </div>
              {:else if player.stats.wkts != null}
                <div class="p-3 bg-[#0c0b1d] rounded-xl border border-[#272552]/80">
                  <span class="text-[#9a97c4] block">Wickets (Econ)</span>
                  <span class="text-base font-bold text-white font-heading">
                    {player.stats.wkts} <span class="text-xs font-normal text-[#9a97c4]">({player.stats.econ})</span>
                  </span>
                </div>
              {/if}

              {#if player.stats.hs}
                <div class="p-3 bg-[#0c0b1d] rounded-xl border border-[#272552]/80">
                  <span class="text-[#9a97c4] block">High Score</span>
                  <span class="text-base font-bold text-white font-heading">{player.stats.hs}</span>
                </div>
              {:else if player.stats.bb}
                <div class="p-3 bg-[#0c0b1d] rounded-xl border border-[#272552]/80">
                  <span class="text-[#9a97c4] block">Best Bowling</span>
                  <span class="text-base font-bold text-white font-heading">{player.stats.bb}</span>
                </div>
              {/if}

              <div class="p-3 bg-[#0c0b1d] rounded-xl border border-[#272552]/80">
                <span class="text-[#9a97c4] block">Auction Set</span>
                <span class="text-base font-bold text-purple-300 font-heading">{player.set}</span>
              </div>
            </div>
          </div>
        {/if}
      {:else}
        <div class="h-64 grid place-items-center text-[#9a97c4] text-sm">
          Loading player details…
        </div>
      {/if}

      <!-- SOLD / UNSOLD Stamp Overlay -->
      {#if store.stamp.visible}
        <div class="absolute inset-0 z-30 grid place-items-center bg-[#0c0b1d]/85 backdrop-blur-sm p-6">
          <div
            class="animate-stamp text-center px-6 py-5 rounded-2xl border-4 shadow-2xl bg-[#15142e] max-w-[280px]"
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
              <div class="mt-1 text-xs text-[#9a97c4]">
                Available in accelerated round
              </div>
            {/if}

            {#if store.isHost}
              <button
                onclick={() => store.hostControl('next_player')}
                class="mt-4 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 mx-auto transition cursor-pointer shadow-lg"
              >
                <span>Next Player</span>
                <SkipForward size={13} />
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- CENTER COLUMN: Live Stage (5 cols) -->
    <div class="lg:col-span-5 bg-[#15142e] border border-[#272552] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center relative shadow-2xl space-y-6 min-h-[540px]">
      <!-- Circular Countdown Timer Ring -->
      <div class="relative w-36 h-36 {isTimerLow ? 'animate-heartbeat' : ''}">
        <svg viewBox="0 0 120 120" class="w-full h-full transform -rotate-90">
          <!-- Background track -->
          <circle
            cx="60"
            cy="60"
            r={timerRadius}
            fill="none"
            stroke="#272552"
            stroke-width="8"
          />
          <!-- Foreground animated countdown -->
          <circle
            cx="60"
            cy="60"
            r={timerRadius}
            fill="none"
            stroke={isTimerLow ? '#e5484d' : '#8b73ff'}
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray={timerCircumference}
            stroke-dashoffset={strokeOffset}
            style="transition: stroke-dashoffset 0.95s linear, stroke 0.3s ease;"
          />
        </svg>

        <!-- Centered Timer Text -->
        <div class="absolute inset-0 grid place-items-center">
          <span class="font-heading font-extrabold text-4xl {isTimerLow ? 'text-red-400' : 'text-white'}">
            {store.roomState.timer || 0}
          </span>
        </div>
      </div>

      <!-- Current Bid & Leading Franchise Display -->
      <div class="space-y-2 w-full">
        <span class="text-xs uppercase font-semibold text-[#9a97c4] tracking-widest block">
          Current Bid
        </span>
        <div class="text-5xl sm:text-6xl font-extrabold text-white font-heading tracking-tight animate-price-pop">
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
            <span class="text-xs text-[#9a97c4] italic">
              Opening bid at base price. Be the first to bid!
            </span>
          {/if}
        </div>
      </div>

      <!-- Big BID Button -->
      <div class="w-full space-y-2">
        <button
          onclick={handleBid}
          disabled={!bidEligibility.canBid || placingBid}
          class="w-full h-16 sm:h-20 rounded-2xl font-heading font-extrabold text-xl sm:text-2xl transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer shadow-xl
            {isLeading
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 cursor-default'
              : bidEligibility.canBid
                ? 'bg-gradient-to-r from-[#8b73ff] via-[#a855f7] to-[#ff4d8d] text-white hover:scale-[1.02] active:scale-[0.98] shadow-purple-900/50'
                : 'bg-[#272552]/40 text-[#6b6891] border border-[#272552] cursor-not-allowed opacity-60'}"
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
            <span>{bidEligibility.reason}</span>
          {/if}
        </button>

        {#if myTeam}
          <div class="flex items-center justify-between text-xs text-[#9a97c4] px-1">
            <span>Your Purse: <strong class="text-white">{formatLakhs(myTeam.purse)}</strong></span>
            <span>Squad: <strong class="text-white">{myTeam.squadCount}/25</strong></span>
          </div>
        {/if}
      </div>

      <!-- Live Bid History Stream -->
      <div class="w-full space-y-1.5 pt-2 border-t border-[#272552]/60">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-[#9a97c4] block text-left">
          Bid Feed
        </span>
        <div class="max-h-28 overflow-y-auto space-y-1 pr-1 text-left text-xs">
          {#if store.roomState.bidHistory?.length > 0}
            {#each store.roomState.bidHistory as bid (bid.timestamp + bid.amount)}
              {@const franchise = getFranchise(bid.teamCode)}
              <div class="flex items-center justify-between p-2 rounded-xl bg-[#0c0b1d] border border-[#272552]/60">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" style="background: {franchise.primary};"></span>
                  <span class="font-bold text-white">{bid.teamCode}</span>
                  <span class="text-[#9a97c4] truncate max-w-[100px]">{bid.userName}</span>
                </div>
                <strong class="font-heading font-bold text-purple-300">
                  {formatLakhs(bid.amount)}
                </strong>
              </div>
            {/each}
          {:else}
            <div class="py-3 text-center text-[#6b6891] italic">
              No bids placed yet for this player
            </div>
          {/if}
        </div>
      </div>

      <!-- HOST CONTROL STRIP (If user is room host) -->
      {#if store.isHost}
        <div class="w-full pt-4 border-t border-[#272552] flex flex-wrap items-center justify-center gap-2 text-xs">
          {#if store.roomState.status === 'active'}
            <button
              onclick={() => store.hostControl('pause')}
              class="px-3 py-1.5 rounded-lg bg-[#272552] hover:bg-[#34316d] text-white font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Pause size={13} />
              <span>Pause</span>
            </button>
          {:else if store.roomState.status === 'paused'}
            <button
              onclick={() => store.hostControl('resume')}
              class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Play size={13} />
              <span>Resume</span>
            </button>
          {/if}

          {#if store.roomState.canUndo}
            <button
              onclick={() => store.hostControl('undo')}
              class="px-3 py-1.5 rounded-lg bg-[#272552] hover:bg-[#34316d] text-white font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Undo Bid</span>
            </button>
          {/if}

          <button
            onclick={() => store.hostControl('sell_now')}
            class="px-3 py-1.5 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/50 text-white font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Hammer down: Sell immediately to leader"
          >
            <Check size={13} />
            <span>Sell Now</span>
          </button>

          <button
            onclick={() => store.hostControl('next_player')}
            class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/30 to-purple-600/30 hover:from-amber-500/50 hover:to-purple-600/50 border border-amber-400/50 text-amber-200 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            title="Advance immediately to next player"
          >
            <SkipForward size={14} class="text-amber-300" />
            <span>Next Player</span>
          </button>

          <button
            onclick={() => store.hostControl('unsold')}
            class="px-3.5 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-700/60 text-red-200 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Pass on player as Unsold (Fast transition)"
          >
            <XCircle size={14} class="text-red-400" />
            <span>Unsold</span>
          </button>

          <button
            onclick={() => {
              if (confirm('Are you sure you want to END the Auction now?\n\nThis will lock all rosters and advance all players to the Playing XI Builder and Head-to-Head 1-on-1 Battle Arena.')) {
                store.hostControl('end_auction');
              }
            }}
            class="px-3.5 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500/60 text-red-200 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            title="End auction and proceed to Playing XI selection and Team Battles"
          >
            <Square size={13} class="text-red-300 fill-red-400" />
            <span>End Auction</span>
          </button>

          <button
            onclick={() => store.hostControl('toggle_bots')}
            class="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer {store.roomState.config?.botsEnabled ? 'bg-purple-600/30 border-purple-500/50 text-purple-200' : 'bg-[#272552] border-transparent text-[#9a97c4]'}"
            title="Toggle AI bots for open franchises"
          >
            <Bot size={13} />
            <span>{store.roomState.config?.botsEnabled ? 'Bots ON' : 'Bots OFF'}</span>
          </button>

          <button
            onclick={() => {
              if (confirm('Leave auction and return to home? The auction will stay active.')) {
                store.leaveRoom(false);
              }
            }}
            class="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Exit auction"
          >
            <LogOut size={13} />
            <span>Exit</span>
          </button>
        </div>
      {/if}
    </div>

    <!-- RIGHT COLUMN: Purse Leaderboard (3 cols) -->
    <div class="lg:col-span-3 bg-[#15142e] border border-[#272552] rounded-3xl p-5 shadow-2xl space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-[#272552]">
        <h4 class="text-sm font-bold text-white uppercase tracking-wider font-heading">
          Franchise Purse
        </h4>
        <span class="text-xs text-[#9a97c4]">10 Teams</span>
      </div>

      <div class="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {#each store.roomState.teams as team (team.code)}
          {@const isCurrentLead = leadTeamCode === team.code}
          {@const isMyFranchise = store.myTeamCode === team.code}
          {@const franchise = getFranchise(team.code)}

          <div
            class="p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between
              {isCurrentLead ? 'bg-[#181635] border-purple-500 ring-2 ring-purple-500/40' : 'bg-[#0c0b1d] border-[#272552]/80'}
              {isMyFranchise ? 'outline outline-1 outline-amber-400/80' : ''}"
          >
            <!-- Left: Team Logo & Name -->
            <div class="flex items-center gap-2.5">
              <div
                class="w-8 h-8 rounded-lg grid place-items-center font-heading font-bold text-xs"
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
                <span class="text-[11px] text-[#9a97c4] block">
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
