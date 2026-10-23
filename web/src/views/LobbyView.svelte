<script>
  import { store } from '../lib/store.svelte.js';
  import { getFranchise } from '../lib/utils.js';
  import { Play, Copy, Check, Bot, Shield, Trophy, UserCheck, LogOut, Shuffle, Users } from 'lucide-svelte';

  let copied = $state(false);
  let starting = $state(false);
  let shakenTeam = $state(null);

  function copyRoomLink() {
    navigator.clipboard?.writeText(store.roomCode);
    copied = true;
    store.notify(`Room code ${store.roomCode} copied!`);
    setTimeout(() => { copied = false; }, 2000);
  }

  async function handleClaim(team) {
    if (team.isClaimed && team.userToken !== store.userToken) {
      if (isHost) {
        if (confirm(`Do you want to release ${team.name} from ${team.userName}?`)) {
          await store.hostControl('release_team', { teamCode: team.code });
          store.notify(`Released ${team.name}`);
        }
        return;
      }
      shakenTeam = team.code;
      store.notify(`${team.name} is already claimed by ${team.userName}`);
      setTimeout(() => { shakenTeam = null; }, 500);
      return;
    }

    if (team.userToken === store.userToken) {
      // Leave team
      await store.leaveTeam(team.code);
    } else {
      // Claim team
      await store.claimTeam(team.code);
    }
  }

  const isHost = $derived(store.isHost);

  const claimedCount = $derived(
    store.roomState.teams?.filter(t => t.isClaimed)?.length || 0
  );

  const meetsPlayerRequirement = $derived(
    store.roomState.config?.botsEnabled || claimedCount >= 2
  );

  async function handleStart() {
    if (!store.myTeamCode) {
      // If host hasn't selected a team yet, automatically claim the first open franchise
      const firstOpen = store.roomState.teams?.find(t => !t.isClaimed);
      if (firstOpen) {
        await store.claimTeam(firstOpen.code);
      }
    }

    if (!store.roomState.config?.botsEnabled && claimedCount < 2) {
      store.notify(`Tournament requirement: At least 2 players are required to start the auction and tournament (currently ${claimedCount} claimed). Please claim at least 2 teams or switch AI Bots ON.`);
      return;
    }

    starting = true;
    await store.hostControl('start');
    starting = false;
  }
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
  <!-- Top Header -->
  <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-[#272552] pb-6">
    <div>
      <h2 class="text-3xl sm:text-4xl font-extrabold text-white font-heading">
        Pick your franchise
      </h2>
      <p class="text-[#9a97c4] text-sm sm:text-base mt-1">
        Each franchise can be claimed by one manager. Friends will appear here live as they claim teams.
      </p>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <!-- Players in Lobby Badge -->
      <div class="flex items-center gap-2.5 px-4 py-2 bg-[#15142e] border border-[#272552] rounded-2xl shadow-sm">
        <div class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </div>
        <div>
          <span class="block text-[10px] uppercase font-bold text-[#9a97c4]">In Lobby</span>
          <span class="text-sm font-extrabold text-emerald-300 font-mono">
            {store.roomState.connectedUsersCount || 1} {store.roomState.connectedUsersCount === 1 ? 'Player' : 'Players'}
          </span>
        </div>
      </div>

      <!-- Franchises Claimed Badge -->
      <div class="flex items-center gap-2 px-3.5 py-2 bg-[#15142e] border border-[#272552] rounded-2xl shadow-sm">
        <Trophy size={16} class="text-amber-400" />
        <div>
          <span class="block text-[10px] uppercase font-bold text-[#9a97c4]">Claimed</span>
          <span class="text-sm font-extrabold text-amber-300 font-mono">
            {claimedCount}/10
          </span>
        </div>
      </div>

      <!-- Room Code Share Button -->
      <button
        onclick={copyRoomLink}
        title="Click to copy room code"
        class="flex items-center gap-2.5 px-4 py-2 bg-[#15142e] hover:bg-[#272552] border border-[#272552] rounded-2xl transition cursor-pointer text-left"
      >
        <div>
          <span class="block text-[10px] uppercase font-bold text-[#9a97c4]">Room Code</span>
          <span class="text-xl font-extrabold font-mono tracking-widest text-white">{store.roomCode}</span>
        </div>
        {#if copied}
          <Check size={18} class="text-emerald-400" />
        {:else}
          <Copy size={18} class="text-purple-400" />
        {/if}
      </button>
    </div>
  </div>

  <!-- 10 Franchise Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    {#each store.roomState.teams as team (team.code)}
      {@const isMine = store.myTeamCode === team.code}
      {@const isOther = team.isClaimed && !isMine}
      {@const franchise = getFranchise(team.code)}

      <button
        onclick={() => handleClaim(team)}
        class="relative group text-left p-5 rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer
          {isMine ? 'bg-[#181635] border-purple-500 ring-2 ring-purple-500/50 shadow-xl' : 'bg-[#15142e] border-[#272552] hover:border-[#3d3a77] hover:-translate-y-1'}
          {isOther ? 'opacity-70 cursor-not-allowed' : ''}
          {shakenTeam === team.code ? 'animate-bounce' : ''}"
      >
        <!-- Background Radial Franchise Tint -->
        <div
          class="absolute -inset-1 opacity-10 group-hover:opacity-25 transition-opacity pointer-events-none rounded-2xl"
          style="background: radial-gradient(circle at 50% 120%, {team.primaryColor}, transparent 70%);"
        ></div>

        <!-- Top Row: Team Badge & Titles -->
        <div class="flex items-center justify-between mb-4">
          <div
            class="w-12 h-12 rounded-xl grid place-items-center font-heading font-extrabold text-base shadow-md"
            style="background: {team.primaryColor}; color: {team.textColor || '#fff'};"
          >
            {team.code}
          </div>

          {#if team.titles > 0}
            <span class="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Trophy size={11} class="text-amber-400" />
              <span>{team.titles} {team.titles === 1 ? 'Title' : 'Titles'}</span>
            </span>
          {/if}
        </div>

        <!-- Team Name & City -->
        <div class="space-y-0.5 mb-4">
          <strong class="block text-base font-bold text-white group-hover:text-purple-200 transition">
            {team.name}
          </strong>
          <small class="block text-xs text-[#9a97c4]">{team.city || 'India'}</small>
        </div>

        <!-- Status Tag / Ownership -->
        <div class="pt-3 border-t border-[#272552]/80 flex items-center justify-between">
          {#if isMine}
            <span class="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <UserCheck size={14} class="text-emerald-400" />
              <span>You (Manager)</span>
            </span>
            <span class="text-[11px] text-[#9a97c4] hover:text-red-400 underline">Leave</span>
          {:else if isOther}
            <span class="inline-flex items-center gap-1.5 text-xs text-[#9a97c4]">
              {#if team.isBot}
                <Bot size={13} class="text-purple-400" />
                <span>AI Bot</span>
              {:else}
                <Shield size={13} class="text-pink-400" />
                <span class="truncate max-w-[120px]">{team.userName}</span>
              {/if}
            </span>
          {:else}
            <span class="text-xs text-emerald-400 font-semibold group-hover:underline">
              + Claim Franchise
            </span>
          {/if}
        </div>
      </button>
    {/each}
  </div>

  <!-- Bottom Control Bar -->
  <div class="bg-[#15142e] border border-[#272552] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
    <!-- Status Text -->
    <div class="flex items-center gap-3">
      <div class="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
      <div>
        <span class="text-sm font-bold text-white">
          {#if !store.myTeamCode}
            👥 {store.roomState.connectedUsersCount || 1} {store.roomState.connectedUsersCount === 1 ? 'player' : 'players'} in lobby · Click any open franchise above to claim it
          {:else}
            You control {store.myTeamCode}. {claimedCount} of 10 franchises claimed ({store.roomState.connectedUsersCount || 1} players in lobby).
          {/if}
        </span>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {#if isHost}
            {#if store.roomState.config?.botsEnabled}
              <span class="text-purple-300 font-semibold">AI Bots Enabled: All 10 franchises will participate in match fixtures.</span>
            {:else}
              <span class={claimedCount >= 2 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                Fixtures Requirement: {claimedCount} / 2 minimum claimed ({claimedCount >= 2 ? 'Ready for tournament' : 'At least 2 players required'})
              </span>
            {/if}
          {:else}
            <span class="text-[#9a97c4]">
              Waiting for host ({store.roomState.hostName || 'Host'}) to start.
              {#if !store.roomState.config?.botsEnabled && claimedCount < 2}
                <span class="text-amber-400 block sm:inline"> Need at least 2 players to start ({claimedCount}/2).</span>
              {/if}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <button
        onclick={() => store.leaveRoom(false)}
        class="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        title="Exit this auction room"
      >
        <LogOut size={14} />
        <span>Exit Room</span>
      </button>

      {#if isHost}
        <button
          onclick={() => store.hostControl('toggle_bots')}
          class="px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer {store.roomState.config?.botsEnabled ? 'bg-purple-600/30 border-purple-500/50 text-purple-200 hover:bg-purple-600/40' : 'bg-[#272552] border-transparent text-[#9a97c4] hover:bg-[#333069] hover:text-white'}"
          title="Toggle AI bots for open franchises"
        >
          <Bot size={15} class={store.roomState.config?.botsEnabled ? 'text-purple-300' : 'text-[#6b6891]'} />
          <span>{store.roomState.config?.botsEnabled ? 'Bots: ON (All 10 in Fixtures)' : 'Bots: OFF (Humans Only)'}</span>
        </button>

        <button
          onclick={() => store.jumblePlayers()}
          class="px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          title="Jumble & shuffle the player auction order randomly"
        >
          <Shuffle size={14} />
          <span>Jumble Players</span>
        </button>

        <button
          onclick={handleStart}
          disabled={starting}
          title={!meetsPlayerRequirement ? "At least 2 players required to plan match fixtures. Switch Bots ON or invite players." : "Start Tournament Auction"}
          class="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8b73ff] to-[#ff4d8d] hover:opacity-90 text-white text-sm font-bold shadow-lg shadow-purple-900/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {#if starting}
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Starting…</span>
          {:else}
            <Play size={16} />
            <span>Start Auction</span>
          {/if}
        </button>
      {:else}
        <div class="text-xs text-[#9a97c4] px-4 py-2 rounded-xl bg-[#0c0b1d] border border-[#272552]">
          Waiting for host to start…
        </div>
      {/if}
    </div>
  </div>
</div>
