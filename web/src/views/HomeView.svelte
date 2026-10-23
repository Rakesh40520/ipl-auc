<script>
  import { store } from '../lib/store.svelte.js';
  import { formatLakhs } from '../lib/utils.js';
  import { Sparkles, ArrowRight, Settings, ShieldCheck, Flame, Bot, Check } from 'lucide-svelte';

  let name = $state(store.userName || '');
  let joinCode = $state(store.roomCode || '');
  let isCreating = $state(false);
  let isJoining = $state(false);
  let showAdvanced = $state(false);

  // Advanced Config
  let defaultPurseCr = $state(120);
  let timerDuration = $state(10);
  let minSquad = $state(18);
  let botsEnabled = $state(false);

  // Demo ticker animation loop
  let demoBid = $state(200);
  let demoTeamIdx = $state(0);
  const demoTeams = [
    { code: 'RCB', name: 'Royal Challengers', color: '#D1121B' },
    { code: 'CSK', name: 'Chennai Super Kings', color: '#F4C20D' },
    { code: 'MI', name: 'Mumbai Indians', color: '#0B8EC9' },
    { code: 'KKR', name: 'Kolkata Knight Riders', color: '#6A3FA0' }
  ];

  $effect(() => {
    const iv = setInterval(() => {
      demoBid += 25;
      if (demoBid > 1400) demoBid = 200;
      demoTeamIdx = (demoTeamIdx + 1) % demoTeams.length;
    }, 1800);
    return () => clearInterval(iv);
  });

  async function handleCreate() {
    if (!name.trim()) {
      store.notify('Please enter your name');
      return;
    }
    isCreating = true;
    await store.createRoom(name.trim(), {
      defaultPurse: defaultPurseCr * 100,
      timerDuration,
      minSquad,
      botsEnabled
    });
    isCreating = false;
  }

  async function handleJoin() {
    if (!name.trim()) {
      store.notify('Please enter your name');
      return;
    }
    if (!joinCode.trim()) {
      store.notify('Please enter a 5-letter room code');
      return;
    }
    isJoining = true;
    await store.joinRoom(joinCode.trim(), name.trim());
    isJoining = false;
  }
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
    <!-- Left Hero Column -->
    <div class="lg:col-span-7 space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
        <Sparkles size={14} class="text-indigo-400" />
        <span>Realtime Multi-User Auction Engine</span>
      </div>

      <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white">
        Run your own <span class="bg-gradient-to-r from-amber-300 via-indigo-400 to-blue-400 bg-clip-text text-transparent">IPL auction</span> with friends.
      </h1>

      <p class="text-base sm:text-xl text-slate-300 max-w-xl font-normal leading-relaxed">
        Pick a franchise, manage your purse, draft your Playing 11, and simulate full IPL tournament fixtures live with authentic scorecards and player probability calculations.
      </p>

      <!-- Main Form Card -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg space-y-4">
        <div>
          <label for="user-name" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Name</label>
          <input
            id="user-name"
            type="text"
            bind:value={name}
            placeholder="e.g. Aarav or Virat Fan"
            maxlength="30"
            onkeydown={(e) => { if (e.key === 'Enter') { if (joinCode.trim()) handleJoin(); else handleCreate(); } }}
            class="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition font-medium"
          />
        </div>

        <!-- Bot Inclusion Mode Option -->
        <div class="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg grid place-items-center {botsEnabled ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-400'}">
              <Bot size={16} />
            </div>
            <div>
              <span class="block text-xs font-bold text-white">Fill Open Teams with AI Bots</span>
              <span class="block text-[11px] text-slate-400">
                {botsEnabled ? 'AI bots will bid for unclaimed teams' : 'Humans only (no AI bots)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onclick={() => botsEnabled = !botsEnabled}
            class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer flex items-center gap-1.5 {botsEnabled ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/40' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'}"
          >
            {#if botsEnabled}
              <Check size={12} />
              <span>Bots ON</span>
            {:else}
              <span>Bots OFF</span>
            {/if}
          </button>
        </div>

        <!-- Create Button -->
        <button
          onclick={handleCreate}
          disabled={isCreating}
          class="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer disabled:opacity-50"
        >
          {#if isCreating}
            <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Creating Room…</span>
          {:else}
            <span>Create New Room</span>
            <ArrowRight size={18} />
          {/if}
        </button>

        <!-- Advanced Host Config Toggle -->
        <div class="pt-1">
          <button
            type="button"
            onclick={() => showAdvanced = !showAdvanced}
            class="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Settings size={13} />
            <span>{showAdvanced ? 'Hide auction settings' : 'Customize rules (purse, timer, bots)'}</span>
          </button>

          {#if showAdvanced}
            <div class="mt-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Starting Purse per Team</span>
                <div class="flex items-center gap-1 font-bold text-white">
                  <input
                    type="number"
                    bind:value={defaultPurseCr}
                    min="50"
                    max="200"
                    class="w-16 h-7 px-2 text-center bg-slate-900 border border-slate-800 rounded text-white"
                  />
                  <span>Cr</span>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-400">Bid Timer Duration</span>
                <div class="flex items-center gap-1 font-bold text-white">
                  <input
                    type="number"
                    bind:value={timerDuration}
                    min="5"
                    max="25"
                    class="w-16 h-7 px-2 text-center bg-slate-900 border border-slate-800 rounded text-white"
                  />
                  <span>Sec</span>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-400">Min Squad Requirement</span>
                <span class="font-bold text-white">18 Players</span>
              </div>
            </div>
          {/if}
        </div>

        <!-- Or Join Section -->
        <div class="relative flex py-2 items-center">
          <div class="flex-grow border-t border-slate-800"></div>
          <span class="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase">Or Join Room</span>
          <div class="flex-grow border-t border-slate-800"></div>
        </div>

        <div class="flex gap-2">
          <input
            type="text"
            bind:value={joinCode}
            onkeydown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            placeholder="5-LETTER CODE"
            maxlength="10"
            class="flex-1 h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white uppercase tracking-widest font-mono text-center text-lg placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
          />
          <button
            onclick={handleJoin}
            disabled={isJoining}
            class="h-12 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50 border border-slate-700"
          >
            {#if isJoining}
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {:else}
              Join
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Right Column: Interactive Broadcast Demo Card -->
    <div class="lg:col-span-5 flex justify-center">
      <div class="relative w-full max-w-md transform rotate-1 hover:rotate-0 transition-transform duration-500">
        <!-- Ambient glow behind card -->
        <div
          class="absolute -inset-1 rounded-3xl blur-xl opacity-30 transition-colors duration-700"
          style="background: {demoTeams[demoTeamIdx].color};"
        ></div>

        <div class="relative bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-6">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Auction Demo
            </span>
            <span class="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Bidding Active
            </span>
          </div>

          <!-- Player Header -->
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#d1121b] to-[#f4c20d] text-white font-heading font-extrabold text-2xl grid place-items-center shadow-lg">
              VK
            </div>
            <div>
              <h3 class="text-2xl font-extrabold text-white font-heading">Virat Kohli</h3>
              <p class="text-sm text-slate-300">Batter · India · Marquee Set 1</p>
            </div>
          </div>

          <!-- Current Bid Display -->
          <div class="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
            <span class="text-xs uppercase font-semibold text-slate-400 tracking-wider">Current Bid</span>
            <div class="text-5xl font-extrabold text-white font-heading tracking-tight animate-price-pop">
              {formatLakhs(demoBid)}
            </div>
            <div class="pt-2 flex items-center justify-between text-xs text-slate-300">
              <span>Base Price: ₹2 Cr</span>
              <span class="text-indigo-400 font-medium">Increment: +₹25 L</span>
            </div>
          </div>

          <!-- Leading Franchise Chip -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-xs text-slate-300">Leading Franchise:</span>
            <div
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-sm border shadow-sm transition-all duration-500"
              style="background: {demoTeams[demoTeamIdx].color}25; border-color: {demoTeams[demoTeamIdx].color}70; color: #fff;"
            >
              <span class="w-2.5 h-2.5 rounded-full" style="background: {demoTeams[demoTeamIdx].color};"></span>
              <span>{demoTeams[demoTeamIdx].name} ({demoTeams[demoTeamIdx].code})</span>
            </div>
          </div>

          <!-- Feature Bullets -->
          <div class="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div class="flex items-center gap-2">
              <ShieldCheck size={14} class="text-indigo-400" />
              <span>Solvency Block</span>
            </div>
            <div class="flex items-center gap-2">
              <Flame size={14} class="text-amber-400" />
              <span>Accelerated Round</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
