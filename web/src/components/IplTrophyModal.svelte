<script>
  import { onMount } from 'svelte';
  import { Trophy, Crown, Sparkles, Star, Award, Share2, Check, X, RotateCcw } from 'lucide-svelte';
  import { playTrophyCelebration } from '../lib/audio.js';

  let {
    isOpen = false,
    champion = null,
    runnerUp = null,
    standings = [],
    fixtures = [],
    onClose = () => {}
  } = $props();

  let canvasEl = $state(null);
  let animationId = null;
  let copied = $state(false);
  let isLifted = $state(false);

  // Compute Tournament MVP / Player of the Tournament from completed fixtures
  const tournamentMVP = $derived.by(() => {
    if (!fixtures || fixtures.length === 0) return null;
    const potmCount = {};

    fixtures.forEach(f => {
      const potm = f.scorecard?.playerOfTheMatch;
      if (potm && potm.name) {
        if (!potmCount[potm.name]) {
          potmCount[potm.name] = {
            name: potm.name,
            teamCode: potm.teamCode,
            rating: potm.rating || 92,
            awards: 0,
            summary: potm.summary
          };
        }
        potmCount[potm.name].awards++;
      }
    });

    const mvpList = Object.values(potmCount).sort((a, b) => b.awards - a.awards);
    return mvpList[0] || null;
  });

  // Confetti Particle System
  function initConfetti() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const width = (canvasEl.width = window.innerWidth);
    const height = (canvasEl.height = window.innerHeight);

    const colors = [
      '#FFD700', '#FFA000', '#FFE57F', '#FFF8E1',
      champion?.primaryColor || '#6366f1',
      '#ec4899', '#3b82f6', '#10b981', '#f59e0b'
    ];

    const particles = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height,
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 4,
        speedY: Math.random() * 3 + 2.5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.4 ? 'rect' : 'circle'
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (p.y > height) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    }

    render();
  }

  $effect(() => {
    if (isOpen) {
      isLifted = true;
      playTrophyCelebration();
      setTimeout(initConfetti, 100);
    } else {
      if (animationId) cancelAnimationFrame(animationId);
    }
  });

  function liftTrophyAgain() {
    isLifted = false;
    setTimeout(() => {
      isLifted = true;
      playTrophyCelebration();
    }, 50);
  }

  function shareVictory() {
    if (!champion) return;
    const text = `🏆 TATA IPL 2026 CHAMPIONS: ${champion.name.toUpperCase()}! 🏆\n\nManager: ${champion.userName}\nMatches Played: ${champion.played} | Won: ${champion.won}\nPoints: ${champion.points} | Net Margin Diff: ${champion.diff > 0 ? '+' : ''}${champion.diff}\n\nCongratulations to the champions on lifting the prestigious IPL Cup!`;
    navigator.clipboard?.writeText(text);
    copied = true;
    setTimeout(() => { copied = false; }, 2500);
  }
</script>

{#if isOpen && champion}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
    <!-- Background Canvas Confetti -->
    <canvas bind:this={canvasEl} class="absolute inset-0 pointer-events-none z-10"></canvas>

    <!-- Modal Dialog Card -->
    <div class="relative z-20 w-full max-w-3xl my-6 bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.35)] text-center space-y-6">

      <!-- Close Button -->
      <button
        onclick={onClose}
        class="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer z-30"
        title="Close celebration"
      >
        <X size={18} />
      </button>

      <!-- CHAMPIONS BANNER HEADER -->
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-600/20 border border-amber-400/50 text-amber-300 font-extrabold text-xs uppercase tracking-widest shadow-md">
          <Sparkles size={14} class="text-amber-400" />
          <span>TATA IPL 2026 CHAMPIONSHIP</span>
          <Sparkles size={14} class="text-amber-400" />
        </div>

        <h2 class="text-3xl sm:text-5xl font-black font-heading tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)]">
          CHAMPIONS OF IPL 2026!
        </h2>
      </div>

      <!-- THE METALLIC GOLDEN IPL TROPHY PRESENTATION -->
      <div class="relative py-2 flex flex-col items-center justify-center">
        <!-- Radial Golden Sunburst Glow -->
        <div
          class="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full blur-3xl opacity-60 -z-10 animate-pulse pointer-events-none"
          style="background: radial-gradient(circle, {champion.primaryColor || '#ffb703'} 0%, rgba(245,158,11,0.4) 60%, transparent 100%);"
        ></div>

        <!-- 3D SVG Detailed IPL Trophy (The Cup) -->
        <div class="relative transform transition-all duration-700 ease-out {isLifted ? 'scale-105 -translate-y-2' : 'scale-95 translate-y-2'}">
          <svg
            viewBox="0 0 280 320"
            class="w-56 h-64 sm:w-68 sm:h-76 drop-shadow-[0_12px_28px_rgba(245,158,11,0.65)] select-none"
            aria-label="Golden IPL Championship Trophy Cup"
          >
            <defs>
              <!-- Metallic Gold Gradients -->
              <linearGradient id="goldShine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFF9C4" />
                <stop offset="25%" stop-color="#FFD54F" />
                <stop offset="50%" stop-color="#FFA000" />
                <stop offset="75%" stop-color="#FFE082" />
                <stop offset="100%" stop-color="#FF8F00" />
              </linearGradient>

              <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FFB300" />
                <stop offset="30%" stop-color="#FFF9C4" />
                <stop offset="55%" stop-color="#FFC107" />
                <stop offset="85%" stop-color="#FFA000" />
                <stop offset="100%" stop-color="#7F5300" />
              </linearGradient>

              <linearGradient id="marbleBase" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#1e1b38" />
                <stop offset="50%" stop-color="#2d2955" />
                <stop offset="100%" stop-color="#15132a" />
              </linearGradient>

              <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Back Handle Curves -->
            <path
              d="M 60 90 C 20 80, 15 170, 75 190 C 85 192, 85 180, 75 178 C 30 162, 35 100, 68 100 Z"
              fill="url(#goldShine)"
              filter="url(#glowGold)"
            />
            <path
              d="M 220 90 C 260 80, 265 170, 205 190 C 195 192, 195 180, 205 178 C 250 162, 245 100, 212 100 Z"
              fill="url(#goldShine)"
              filter="url(#glowGold)"
            />

            <!-- Main Trophy Bowl (Cup) -->
            <path
              d="M 68 85 Q 140 100 212 85 L 195 180 Q 140 215 85 180 Z"
              fill="url(#goldCup)"
              stroke="#FFF9C4"
              stroke-width="1.5"
            />

            <!-- Top Flared Rim -->
            <ellipse cx="140" cy="85" rx="72" ry="12" fill="url(#goldShine)" stroke="#FFF8E1" stroke-width="1.5" />
            <ellipse cx="140" cy="85" rx="66" ry="9" fill="#996500" />

            <!-- Golden Globe in the Cup Center (The distinctive IPL World Globe) -->
            <circle cx="140" cy="140" r="32" fill="url(#goldShine)" stroke="#FFF9C4" stroke-width="1" />
            <!-- Globe Grid Lines -->
            <ellipse cx="140" cy="140" rx="32" ry="12" fill="none" stroke="#7F5300" stroke-width="1" opacity="0.6" />
            <ellipse cx="140" cy="140" rx="14" ry="32" fill="none" stroke="#7F5300" stroke-width="1" opacity="0.6" />

            <!-- Sparkling Stars in the Globe -->
            <polygon points="140,126 142,135 151,137 142,139 140,148 138,139 129,137 138,135" fill="#FFFFFF" />

            <!-- Trophy Stem / Neck -->
            <path d="M 120 200 L 126 230 L 154 230 L 160 200 Z" fill="url(#goldShine)" />
            <ellipse cx="140" cy="230" rx="18" ry="4" fill="url(#goldCup)" />

            <!-- Ornate Pedestal Tier 1 -->
            <path d="M 112 232 L 102 248 L 178 248 L 168 232 Z" fill="url(#goldShine)" />

            <!-- Tiered Polished Marble Trophy Base (Black & Gold Pedestal) -->
            <rect x="80" y="248" width="120" height="20" rx="4" fill="url(#marbleBase)" stroke="#FFD54F" stroke-width="1" />
            <rect x="68" y="268" width="144" height="26" rx="5" fill="url(#marbleBase)" stroke="#FFA000" stroke-width="1.5" />

            <!-- Engraved Golden Plate on Base -->
            <rect x="78" y="272" width="124" height="18" rx="3" fill="url(#goldShine)" />
            <text x="140" y="284" font-size="8" font-weight="900" text-anchor="middle" fill="#5c3800" font-family="sans-serif" letter-spacing="1">
              IPL 2026 CHAMPIONS
            </text>

            <!-- Champion Team Color Ribbon Hanging from Handles -->
            <path
              d="M 68 180 Q 55 220 70 265 Q 75 270 78 262 Q 72 225 80 185 Z"
              fill={champion.primaryColor || '#6366f1'}
              opacity="0.9"
            />
            <path
              d="M 212 180 Q 225 220 210 265 Q 205 270 202 262 Q 208 225 200 185 Z"
              fill={champion.primaryColor || '#6366f1'}
              opacity="0.9"
            />
          </svg>
        </div>

        <!-- Lift Trophy Interactive Button -->
        <button
          onclick={liftTrophyAgain}
          class="mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-95 text-purple-950 font-extrabold text-xs transition cursor-pointer shadow-lg flex items-center gap-1.5 transform hover:scale-105 active:scale-95"
          title="Click to elevate trophy and blast celebratory confetti"
        >
          <Crown size={14} class="fill-purple-950" />
          <span>Lift The Cup! 🏆</span>
        </button>
      </div>

      <!-- CHAMPION TEAM SHOWCASE CARD -->
      <div
        class="p-5 sm:p-6 rounded-3xl border-2 text-white shadow-2xl relative overflow-hidden"
        style="background: linear-gradient(135deg, {champion.primaryColor || '#6366f1'}33 0%, #0f172a 75%); border-color: {champion.primaryColor || '#6366f1'}88;"
      >
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Team Emblem & Name -->
          <div class="flex items-center gap-4 text-center sm:text-left">
            <div
              class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl grid place-items-center font-heading font-black text-2xl text-white shadow-xl border-2 border-white/20 flex-shrink-0"
              style="background: {champion.primaryColor || '#6366f1'};"
            >
              {champion.code}
            </div>
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-amber-300 block flex items-center gap-1 justify-center sm:justify-start">
                <Crown size={13} class="text-amber-400 fill-amber-400" />
                <span>IPL 2026 Champion Franchise</span>
              </span>
              <h3 class="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
                {champion.name}
              </h3>
              <p class="text-xs text-slate-300 mt-0.5">
                Manager: <strong class="text-white font-semibold">{champion.userName}</strong>
              </p>
            </div>
          </div>

          <!-- Tournament Record Pills -->
          <div class="grid grid-cols-2 gap-2 text-center text-xs">
            <div class="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Won / Played</span>
              <strong class="text-lg font-black text-emerald-400 font-mono">{champion.won} / {champion.played}</strong>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Points</span>
              <strong class="text-lg font-black text-amber-400 font-mono">{champion.points} pts</strong>
            </div>
            <div class="col-span-2 p-2 rounded-xl bg-slate-950/80 border border-white/10 text-[11px] text-slate-300">
              Net Slot Margin: <strong class="text-white font-mono">{champion.diff > 0 ? '+' : ''}{champion.diff}</strong>
            </div>
          </div>
        </div>

        <!-- MVP / Player of the Tournament Highlight (If Available) -->
        {#if tournamentMVP}
          <div class="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2">
              <Award size={16} class="text-amber-400" />
              <span class="text-slate-300">Player of the Tournament:</span>
              <strong class="text-amber-300 font-bold">{tournamentMVP.name}</strong>
              <span class="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                {tournamentMVP.teamCode}
              </span>
            </div>
            <span class="text-xs text-emerald-400 font-mono font-semibold">
              ⭐ {tournamentMVP.awards}x Match POTM Awards
            </span>
          </div>
        {/if}

        {#if runnerUp}
          <div class="mt-2 text-xs text-slate-300 text-center sm:text-right">
            🥈 Runner-Up: <strong class="text-white">{runnerUp.name}</strong> ({runnerUp.points} pts)
          </div>
        {/if}
      </div>

      <!-- Action Footer Buttons -->
      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onclick={shareVictory}
          class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer border border-slate-700"
        >
          {#if copied}
            <Check size={16} class="text-emerald-400" />
            <span>Copied to Clipboard!</span>
          {:else}
            <Share2 size={16} class="text-indigo-300" />
            <span>Share Victory Card</span>
          {/if}
        </button>

        <button
          onclick={onClose}
          class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-extrabold text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-amber-950/40"
        >
          View Championship Standings
        </button>
      </div>

    </div>
  </div>
{/if}
