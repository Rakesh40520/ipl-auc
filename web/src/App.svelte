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

<div class="relative min-h-screen bg-[#0c0b1d] text-[#f1efff] selection:bg-purple-600 selection:text-white flex flex-col font-sans">
  <!-- Ambient glowing aurora background -->
  <div class="aurora" aria-hidden="true"></div>

  <!-- Global Toast / In-App Notification -->
  {#if store.notification}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#15142e] border border-purple-500/60 shadow-2xl text-xs sm:text-sm font-semibold text-white backdrop-blur-md">
        <AlertCircle size={16} class="text-pink-400 flex-shrink-0" />
        <span>{store.notification}</span>
      </div>
    </div>
  {/if}

  <!-- Offline / Reconnection Banner -->
  {#if !store.connected && store.roomCode}
    <div class="bg-amber-500/20 border-b border-amber-500/30 text-amber-300 py-1.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2">
      <WifiOff size={14} />
      <span>Reconnecting to auction server… All state is securely saved.</span>
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
      <AuctionView />
    {:else if store.view === 'squads'}
      <SquadsView />
    {:else if store.view === 'results'}
      <ResultsView />
    {/if}
  </main>

  <!-- Clean Minimal Footer -->
  <footer class="relative z-10 py-6 border-t border-[#272552]/60 text-center text-xs text-[#6b6891]">
    <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span>Gavel IPL Auction · Fastify + Socket.IO + Svelte 5 + SQLite</span>
      <span>Real Solvency Rules & Authentic Sets</span>
    </div>
  </footer>
</div>
