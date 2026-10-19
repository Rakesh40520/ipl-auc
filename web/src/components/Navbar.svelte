<script>
  import { store } from '../lib/store.svelte.js';
  import { getFranchise } from '../lib/utils.js';
  import { toggleSound, isSoundEnabled } from '../lib/audio.js';
  import { Volume2, VolumeX, Copy, Check, Users, Trophy, Gavel, LogOut, Swords } from 'lucide-svelte';

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

<header class="relative z-20 flex items-center justify-between py-4 px-4 sm:px-6 border-b border-[#272552]/60 bg-[#0c0b1d]/80 backdrop-blur-md">
  <!-- Brand Logo -->
  <div class="flex items-center gap-3">
    <button
      onclick={() => store.view = 'home'}
      class="flex items-center gap-2.5 text-xl font-bold font-heading hover:opacity-90 transition group text-left cursor-pointer"
    >
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8b73ff] to-[#ff4d8d] grid place-items-center text-white font-extrabold text-base shadow-lg shadow-purple-950/40 transform -rotate-6 group-hover:rotate-0 transition-transform">
        G
      </div>
      <span class="tracking-tight text-white font-extrabold text-xl">Gavel</span>
    </button>
    <span class="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-950/40 text-purple-300 border border-purple-800/40">
      IPL 2026
    </span>
  </div>

  <!-- Navigation View Tabs (When in Room) -->
  {#if store.roomCode && store.view !== 'home'}
    <nav class="flex items-center gap-1 bg-[#15142e] p-1 rounded-xl border border-[#272552]">
      {#if store.roomState.status === 'lobby'}
        <button
          onclick={() => store.view = 'lobby'}
          class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition {store.view === 'lobby' ? 'bg-[#272552] text-white shadow-sm' : 'text-[#9a97c4] hover:text-white'}"
        >
          <Users size={14} />
          <span>Lobby</span>
        </button>
      {:else}
        <button
          onclick={() => store.view = 'auction'}
          class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition {store.view === 'auction' ? 'bg-[#272552] text-white shadow-sm' : 'text-[#9a97c4] hover:text-white'}"
        >
          <Gavel size={14} />
          <span>Auction</span>
        </button>
      {/if}

      <button
        onclick={() => store.view = 'squads'}
        class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition {store.view === 'squads' ? 'bg-[#272552] text-white shadow-sm' : 'text-[#9a97c4] hover:text-white'}"
      >
        <Users size={14} />
        <span>Squads</span>
      </button>

      {#if store.roomState.status === 'completed' || store.roomState.results?.length > 0}
        <button
          onclick={() => store.view = 'results'}
          class="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg transition {store.view === 'results' ? 'bg-[#272552] text-white shadow-sm' : 'text-[#9a97c4] hover:text-white'}"
        >
          <Swords size={14} class="text-rose-400" />
          <span>Battle & XI</span>
        </button>
      {/if}
    </nav>
  {/if}

  <!-- Status Badges & Controls -->
  <div class="flex items-center gap-2 sm:gap-3">
    <!-- User's Claimed Franchise Chip -->
    {#if myFranchise}
      <div
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
        style="background: {myFranchise.primary}20; color: #fff; border-color: {myFranchise.primary}60;"
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
        class="flex items-center gap-1.5 px-2.5 py-1 bg-[#15142e] hover:bg-[#272552] border border-[#272552] hover:border-purple-500/50 rounded-full text-xs font-mono font-bold text-[#f1efff] transition cursor-pointer"
      >
        <span>{store.roomCode}</span>
        {#if copied}
          <Check size={12} class="text-emerald-400" />
        {:else}
          <Copy size={12} class="text-[#9a97c4]" />
        {/if}
      </button>
    {/if}

    <!-- Sound Toggle -->
    <button
      onclick={handleSoundToggle}
      title={soundOn ? 'Mute audio' : 'Unmute audio'}
      class="p-2 bg-[#15142e] hover:bg-[#272552] border border-[#272552] rounded-full text-[#9a97c4] hover:text-white transition cursor-pointer"
    >
      {#if soundOn}
        <Volume2 size={16} class="text-purple-400" />
      {:else}
        <VolumeX size={16} />
      {/if}
    </button>

    <!-- Exit Room Button -->
    {#if store.roomCode && store.view !== 'home'}
      <button
        onclick={() => showExitModal = true}
        title="Exit room"
        class="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 rounded-full text-xs font-bold transition cursor-pointer"
      >
        <LogOut size={13} />
        <span>Exit</span>
      </button>
    {/if}

    <!-- Connection Indicator -->
    <div
      title={store.connected ? 'Connected to server' : 'Reconnecting to server...'}
      class="flex items-center gap-1.5 text-xs text-[#9a97c4]"
    >
      <span class="w-2.5 h-2.5 rounded-full {store.connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-red-500'}"></span>
    </div>
  </div>
</header>

<!-- Exit Confirmation Modal -->
{#if showExitModal}
  <div class="fixed inset-0 z-50 grid place-items-center bg-[#0c0b1d]/80 backdrop-blur-sm p-4">
    <div class="bg-[#15142e] border border-[#272552] rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl text-center">
      <div class="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 grid place-items-center mx-auto">
        <LogOut size={22} />
      </div>

      <div class="space-y-1">
        <h3 class="text-lg font-bold text-white font-heading">
          {store.isHost ? 'Exit or Close Auction?' : 'Exit Auction Room?'}
        </h3>
        <p class="text-xs text-[#9a97c4] leading-relaxed">
          {#if store.isHost}
            As the host, you can leave the room or close it completely for all players.
          {:else}
            You will return to the home screen. You can rejoin anytime with room code <strong class="text-purple-300 font-mono">{store.roomCode}</strong>.
          {/if}
        </p>
      </div>

      <div class="space-y-2 pt-2">
        <button
          onclick={() => { store.leaveRoom(false); showExitModal = false; }}
          class="w-full py-2.5 px-4 rounded-xl bg-[#272552] hover:bg-[#34316d] text-white text-xs font-bold transition cursor-pointer"
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
          class="w-full py-2 px-4 rounded-xl text-xs text-[#9a97c4] hover:text-white transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
