# BMW Design Atelier // Official Automotive Experience

A premier luxury automotive web application inspired by **Supaste** (component UI, tactile micro-interactions, floating pill navigation) and **DG Cinema** (4K anamorphic letterbox framing, cinematic chapters, and quiet luxury editorial design).

---

## 🚗 Featured Vehicles

All authentic high-resolution vehicle photography included in the repository:
1. **BMW M4 Coupé** (Alpine White) — *M Performance Track Icon*
2. **BMW M3 Competition** (Matte Frozen Black) — *Stealth Sports Sedan*
3. **BMW Concept 8 Series** (Barcelona Blue Liquid Chrome) — *Luxury Grand Tourer*
4. **BMW 740e iPerformance** (Mineral White) — *Executive Plug-in Hybrid*
5. **BMW Laserlight Glow Study** (Obsidian Shadow) — *Signature Night Lighting*
6. **BMW M6 GTLM Motorsport** (M Tricolor Livery) — *FIA Endurance Champion*
7. **BMW E30 M3 Classic** (1988 Genesis) — *Historic Touring Legend*
8. **BMW 2002 Turbo Inferno** (1973 Pioneer) — *Europe's First Turbocharged Production Car*

---

## 🛠️ Tech Stack

* **Framework:** React 19 + TypeScript + Vite
* **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
* **Motion & Physics:** Framer Motion (`framer-motion`)
* **Smooth Inertia Scrolling:** Lenis (`lenis`)
* **Routing & Page Transitions:** React Router DOM v7 (`react-router-dom`)
* **Icons:** Lucide React (`lucide-react`)
* **Micro-Audio:** Web Audio API (zero-latency synthetic click & soundscape tones)

---

## 🚀 Deployment on Render

This project is pre-configured with [`render.yaml`](./render.yaml) for 1-click deployment on [Render](https://render.com).

### Manual Configuration on Render (Static Site):
* **Environment:** `Static Site`
* **Build Command:** `npm install && npm run build`
* **Publish Directory:** `dist`
* **Redirects / Rewrites:**
  * **Type:** `Rewrite`
  * **Source:** `/*`
  * **Destination:** `/index.html` *(Essential for client-side React Router navigation)*

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Production build
npm run build

# Preview build locally
npm run preview
```
