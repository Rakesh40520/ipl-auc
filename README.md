# Gavel · IPL Auction Engine

A real-time, server-authoritative IPL Live Auction web application built with **Svelte 5**, **Fastify**, **Socket.IO**, and **SQLite**. Designed with broadcast-level aesthetics, authentic IPL bidding ladders, squad solvency constraints, accelerated rounds for unsold players, and an ultra-lean server memory footprint (~70–80 MB RAM).

---

## ⚡ Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Svelte 5 + Vite + Tailwind CSS** | Compiles to zero-overhead JS (~54 kB gzipped), native reactive runes (`$state`, `$derived`, `$effect`), and fluid transitions for SOLD/UNSOLD stamps. |
| **Icons & UI** | **Lucide Svelte + Canvas Confetti** | Clean, minimal dashboard typography, franchise badges, and celebratory particle effects. |
| **Backend** | **Node.js + Fastify + Socket.IO** | High-throughput HTTP + WebSockets with sub-10ms response times, heartbeat, room isolation, and auto-reconnect. |
| **Auction State** | **Server-Authoritative AuctionEngine** | State machine controlling the countdown timer, bid ordering, undo buffer, and bot bidding without race conditions. |
| **Persistence** | **SQLite (`node:sqlite`)** | Zero extra process. Native Node 24 synchronous SQLite stores rooms, claimed teams, bids, and final rosters so restarts never lose an auction. |
| **Validation** | **Zod Schemas** | Strict schema validation for every client and host socket event. |
| **Deployment** | **Single Node Process** | Fastify serves the built Svelte static bundle (`web/dist`) and handles WebSocket connections on a single port for easy one-click hosting on Render, Railway, or Fly.io. |

---

## 🏏 Authentic Auction Features & Rules

1. **Franchise Selection & Locking**:
   - All 10 official franchises: **CSK**, **MI**, **RCB**, **KKR**, **SRH**, **DC**, **RR**, **PBKS**, **LSG**, **GT** with authentic color accents and title histories.
   - One user per franchise with locking; real-time updates as friends join.
   - Reconnect to your claimed franchise automatically after page refresh or network drop.

2. **Server-Enforced Solvency Rule**:
   - A franchise cannot bid if paying that bid would leave them with insufficient purse to fill the minimum squad of **18 players** at the base reserve price.
   - Overseas cap: Strictly enforced at **8 overseas players**.
   - Maximum squad size: Strictly enforced at **25 players**.
   - Self-outbid prevention: A franchise holding the leading bid cannot outbid itself.

3. **Tiered IPL Bid Increments**:
   - `< ₹50 L`: +₹5 L
   - `₹50 L – ₹1 Cr`: +₹10 L
   - `₹1 Cr – ₹2 Cr`: +₹20 L
   - `₹2 Cr – ₹5 Cr`: +₹25 L
   - `≥ ₹5 Cr`: +₹50 L

4. **Auction Sets & Accelerated Round**:
   - 188 curated players seeded across authentic IPL sets:
     - Marquee Sets 1 & 2 (Pant, Shreyas, KL Rahul, Starc, Buttler, Rabada, Chahal, Maxwell, Siraj, Boult, etc.)
     - Capped Batters, All-Rounders, Wicketkeepers, Fast Bowlers, Spinners
     - Uncapped Batters, All-Rounders, Wicketkeepers, Fast Bowlers, Spinners
   - Players passing without bids are automatically queued for the **Accelerated Round**.

5. **Host Controls**:
   - Start auction
   - Pause / Resume timer
   - Undo last bid (instantly reverts bid price, timer, and leader)
   - Skip player
   - Sell now (immediate gavel strike)
   - Auto-fill unclaimed teams with intelligent AI bots

6. **Web Audio Sound Effects**:
   - Synthesized using standard browser `AudioContext` (crisp auctioneer gavel wood strike, ascending bid chime, warning countdown ticks, and victory brass fanfare) with zero external audio assets.

---

## 📁 Project Layout

```text
ipl-auction/
├── data/
│   ├── teams.json             # 10 IPL franchises with hex palettes and metadata
│   ├── players.json           # 188 players across Marquee, Capped & Uncapped sets
│   └── auction.sqlite         # SQLite database file for room state and results
├── server/
│   ├── engine.js              # AuctionEngine state machine (timer, bots, transitions)
│   ├── rules.js               # Solvency math, bid increment ladder, and validation
│   ├── rooms.js               # RoomManager & Socket.IO event handlers
│   ├── db.js                  # node:sqlite persistence layer
│   ├── schema.js              # Zod validation schemas
│   └── index.js               # Fastify server & static web bundle host
├── web/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── store.svelte.js # Svelte 5 Runes reactive store & Socket client
│   │   │   ├── audio.js        # Synthesized Web Audio sound effects
│   │   │   └── utils.js        # Currency formatter, franchise styles, confetti
│   │   ├── components/
│   │   │   └── Navbar.svelte   # Room code copy, franchise pill, audio toggle
│   │   ├── views/
│   │   │   ├── HomeView.svelte    # Hero banner, room create/join, live demo card
│   │   │   ├── LobbyView.svelte   # 10 franchise interactive claim grid
│   │   │   ├── AuctionView.svelte # Broadcast 3-column stage & live bidding
│   │   │   ├── SquadsView.svelte  # Team squad inspector & role balance rating
│   │   │   └── ResultsView.svelte # Final signings, leaderboard & export card
│   │   ├── App.svelte         # Root view router
│   │   ├── app.css            # Tailwind CSS v4 styling & animations
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
├── test/
│   ├── rules.test.js          # Unit tests for solvency & bid increments
│   ├── engine.test.js         # Unit tests for state machine & undo
│   └── e2e.test.js            # End-to-end Socket.IO & memory verification
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js **22+** or **24+** (uses native `node:sqlite` and ESM)
- npm 10+

### Installation & Run

1. **Install dependencies**:
   ```bash
   npm install
   cd web && npm install && cd ..
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Development mode** (runs Fastify server and Vite dev server simultaneously):
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Production mode** (builds frontend and runs single Fastify process):
   ```bash
   npm run build
   npm start
   ```
   Open `http://localhost:3000` in your browser.

---

## ☁️ Deployment (Render, Railway, Fly.io)

Since the project compiles down to a single Node process serving the built web app from `web/dist`, deploying is straightforward:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Port**: Automatic (`process.env.PORT || 3000`)
- **Memory footprint**: ~70–80 MB RSS RAM
