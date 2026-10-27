<script>
  import { store } from '../lib/store.svelte.js';
  import { getFranchise } from '../lib/utils.js';
  import { toggleSound, isSoundEnabled } from '../lib/audio.js';
  import { Volume2, VolumeX, Copy, Check, Users, Trophy, Gavel, LogOut, Swords, Calendar, Square } from 'lucide-svelte';

  let copied = $state(false);
  let soundOn = $state(true);
  let showExitModal = $state(false);

  function copyCode() {
    if (!store.roomCode) return;
    navigator.clipboard?.writeText(store.roomCode);
    copied = true;
    store.notify(`Room code ${store.roomCode} copied to clipboard!`);
    setTimeout(() => { copied = false; }, 2000);
  }

  function handleSoundToggle() {
    soundOn = toggleSound();
  }

  const myFranchise = $derived(store.myTeamCode ? getFranchise(store.myTeamCode) : null);
</script>

<header class="relative z-20 flex flex-wrap items-center justify-between py-3 px-3 sm:px-6 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md gap-2">
  <!-- Brand Logo -->
  <div class="flex items-center gap-2.5">
    <button
      onclick={() => store.view = 'home'}
      class="flex items-center gap-2 text-lg sm:text-xl font-bold font-heading hover:opacity-90 transition group text-left cursor-pointer"
    >
      <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 grid place-items-center text-white font-extrabold text-sm sm:text-base shadow-md shadow-indigo-950/40">
        G
      </div>
      <span class="tracking-tight text-white font-extrabold">Gavel</span>
    </button>
    <span class="hidden md:inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
      IPL 2026
    </span>
  </div>

  <!-- Navigation View Tabs (When in Room) -->
  {#if store.roomCode && store.view !== 'home'}
    <nav class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full scrollbar-none">
      {#if store.roomState.status === 'lobby'}
        <button
          onclick={() => store.view = 'lobby'}
          class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap {store.view === 'lobby' ? 'bg-slate-800 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'}"
        >
          <Users size={14} />
          <span>Lobby</span>
        </button>
      {/if}

      <button
        onclick={() => store.view = 'auction'}
        class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap {store.view === 'auction' ? 'bg-slate-800 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'}"
      >
        <Gavel size={14} />
        <span>Auction</span>
      </button>

      <button
        onclick={() => store.view = 'squads'}
        class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap {store.view === 'squads' ? 'bg-slate-800 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'}"
      >
        <Users size={14} />
        <span>Squads</span>
      </button>

      {#if store.roomState.status === 'completed' || store.roomState.status === 'playing_xi_selection' || (store.roomState.results && store.roomState.results.length > 0) || store.roomState.verdict}
        <button
          onclick={() => store.view = 'results'}
          class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap {store.view === 'results' ? 'bg-slate-800 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'}"
        >
          <Trophy size={14} class="text-amber-400" />
          <span>Verdict & Winner</span>
        </button>
      {/if}
    </nav>
  {/if}

  <!-- Status Badges & Controls -->
  <div class="flex items-center gap-1.5 sm:gap-2.5">
    <!-- User's Claimed Franchise Chip -->
    {#if myFranchise}
      <div
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
        style="background: {myFranchise.primary}25; color: #fff; border-color: {myFranchise.primary}70;"
      >
        <span class="w-2 h-2 rounded-full" style="background: {myFranchise.primary};"></span>
        <span>{store.myTeamCode}</span>
      </div>
    {/if}

    <!-- Room Code Badge -->
    {#if store.roomCode}
      <button
        onclick={copyCode}
        title="Click to copy room code"
        class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-full text-xs font-mono font-bold text-slate-200 transition cursor-pointer"
      >
        <span>{store.roomCode}</span>
        {#if copied}
          <Check size={12} class="text-emerald-400" />
        {:else}
          <Copy size={12} class="text-slate-400" />
        {/if}
      </button>
    {/if}

    <!-- Sound Toggle -->
    <button
      onclick={handleSoundToggle}
      title={soundOn ? 'Mute audio' : 'Unmute audio'}
      class="p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
    >
      {#if soundOn}
        <Volume2 size={15} class="text-indigo-400" />
      {:else}
        <VolumeX size={15} />
      {/if}
    </button>

    <!-- Host Status Badge -->
    {#if store.isHost}
      <span class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider">
        HOST
      </span>
    {/if}

    <!-- Host End Auction Quick Button (Available directly in Header Navbar) -->
    {#if store.isHost && (store.roomState.status === 'active' || store.roomState.status === 'paused')}
      <button
        onclick={() => {
          if (confirm('Are you sure you want to END the Auction now?\n\nThis will lock all rosters and advance all players to the Playing XI Builder and Tournament Fixtures.')) {
            store.hostControl('end_auction');
          }
        }}
        title="Host Action: End auction and advance to Playing XI & Fixtures"
        class="flex items-center gap-1 px-2.5 sm:px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-full text-xs font-extrabold transition cursor-pointer shadow-md shadow-red-950/40 border border-red-400/40"
      >
        <Square size={11} class="fill-white" />
        <span class="hidden xs:inline">End Auction</span>
      </button>
    {/if}

    <!-- Exit Room Button -->
    {#if store.roomCode && store.view !== 'home'}
      <button
        onclick={() => showExitModal = true}
        title="Exit room"
        class="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/40 text-slate-300 hover:text-red-300 rounded-full text-xs font-medium transition cursor-pointer"
      >
        <LogOut size={13} />
        <span class="hidden sm:inline">Exit</span>
      </button>
    {/if}

    <!-- Connection Indicator -->
    <div
      title={store.connected ? 'Connected to server' : 'Reconnecting to server...'}
      class="flex items-center gap-1.5 text-xs text-slate-400"
    >
      <span class="w-2.5 h-2.5 rounded-full {store.connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-red-500 animate-pulse'}"></span>
    </div>
  </div>
</header>

<!-- Exit Confirmation Modal -->
{#if showExitModal}
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 backdrop-blur-sm p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl text-center">
      <div class="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 grid place-items-center mx-auto">
        <LogOut size={22} />
      </div>

      <div class="space-y-1">
        <h3 class="text-lg font-bold text-white font-heading">
          {store.isHost ? 'Exit or Close Auction?' : 'Exit Auction Room?'}
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          {#if store.isHost}
            As the host, you can leave the room or close it completely for all players.
          {:else}
            You will return to the home screen. You can rejoin anytime with room code <strong class="text-indigo-400 font-mono">{store.roomCode}</strong>.
          {/if}
        </p>
      </div>

      <div class="space-y-2 pt-2">
        <button
          onclick={() => { store.leaveRoom(false); showExitModal = false; }}
          class="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
        >
          {store.isHost ? 'Leave Room (Keep auction active)' : 'Exit Room'}
        </button>

        {#if store.isHost}
          <button
            onclick={() => { store.leaveRoom(true); showExitModal = false; }}
            class="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-red-950/40"
          >
            Exit & Close Room for All Players
          </button>
        {/if}

        <button
          onclick={() => showExitModal = false}
          class="w-full py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
