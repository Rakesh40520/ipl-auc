<script>
  import { store } from '../lib/store.svelte.js';
  import { formatLakhs, getFranchise } from '../lib/utils.js';
  import { Trophy, Share2, Copy, Check, RotateCcw, Award, Globe, Flame } from 'lucide-svelte';

  let copied = $state(false);

  // Extract Top 5 Most Expensive Buys from results
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
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
  <!-- Celebration Banner -->
  <div class="text-center space-y-3">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
      <Trophy size={14} class="text-amber-400" />
      <span>IPL Auction Completed</span>
    </div>

    <h2 class="text-3xl sm:text-5xl font-extrabold text-white font-heading tracking-tight">
      The Hammer Has Fallen!
    </h2>
    <p class="text-[#9a97c4] text-sm sm:text-base max-w-xl mx-auto">
      All sets concluded. Review final squad rosters, marquee purchases, and export the official franchise summaries.
    </p>

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
            {@const franchise = getFranchise(team.code)}

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
