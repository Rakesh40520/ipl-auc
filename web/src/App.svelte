<script>
  import { onMount } from 'svelte';
  import { store } from './lib/store.svelte.js';
  import Navbar from './components/Navbar.svelte';
  import HomeView from './views/HomeView.svelte';
  import LobbyView from './views/LobbyView.svelte';
  import AuctionView from './views/AuctionView.svelte';
  import SquadsView from './views/SquadsView.svelte';
  import ResultsView from './views/ResultsView.svelte';
  import { AlertCircle, WifiOff } from 'lucide-svelte';

  onMount(() => {
    store.init();
  });
</script>

<div class="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white flex flex-col font-sans">
  <!-- Ambient subtle glowing background -->
  <div class="aurora" aria-hidden="true"></div>

  <!-- Global Toast / In-App Notification -->
  {#if store.notification}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-xs sm:text-sm font-semibold text-white backdrop-blur-md">
        <AlertCircle size={16} class="text-indigo-400 flex-shrink-0" />
        <span>{store.notification}</span>
      </div>
    </div>
  {/if}

  <!-- Offline / Auto-Reconnection Banner -->
  {#if !store.connected && store.roomCode}
    <div class="bg-amber-500/20 border-b border-amber-500/30 text-amber-200 py-2 px-4 text-center text-xs font-semibold flex flex-wrap items-center justify-center gap-3 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <div class="flex items-center gap-2">
        <WifiOff size={15} class="text-amber-400 animate-pulse" />
        <span>
          Connection lost. Automatically reconnecting{store.reconnectAttempts > 0 ? ` (attempt #${store.reconnectAttempts})` : ''}… All state & squad data are preserved.
        </span>
      </div>
      <button
        onclick={() => store.reconnectNow()}
        class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
      >
        <span>⚡ Reconnect Now</span>
      </button>
    </div>
  {/if}

  <!-- Header Navigation -->
  <Navbar />

  <!-- Main View Routing Container -->
  <main class="relative z-10 flex-1">
    {#if store.view === 'home'}
      <HomeView />
    {:else if store.view === 'lobby'}
      <LobbyView />
    {:else if store.view === 'auction'}
      {#if store.roomState.status === 'playing_xi_selection' || store.roomState.status === 'completed'}
        <ResultsView />
      {:else}
        <AuctionView />
      {/if}
    {:else if store.view === 'squads'}
      <SquadsView />
    {:else if store.view === 'results'}
      <ResultsView />
    {/if}
  </main>

  <!-- Clean Minimal Footer -->
  <footer class="relative z-10 py-6 border-t border-slate-800 text-center text-xs text-slate-400">
    <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span>Gavel IPL Auction · Fastify + Socket.IO + Svelte 5 + SQLite</span>
      <span>Authentic Squads &amp; Official IPL Solvency Rules</span>
    </div>
  </footer>
</div>
