export interface CarDesignHighlight {
  title: string;
  description: string;
}

export interface CarModel {
  id: string;
  name: string;
  subtitle: string;
  category: 'all' | 'm-power' | 'luxury' | 'electric' | 'heritage' | 'motorsport';
  categoryLabel: string;
  year: string;
  tagline: string;
  image: string;
  startingPrice: string;
  specs: {
    power: string;
    acceleration: string;
    topSpeed: string;
    engine: string;
    fuelType: string;
  };
  designHighlights: CarDesignHighlight[];
  colorOptions: {
    name: string;
    hex: string;
  }[];
}

export const CATEGORIES = [
  { id: 'all', label: 'All Models' },
  { id: 'm-power', label: 'M Performance' },
  { id: 'luxury', label: 'Luxury & Concepts' },
  { id: 'electric', label: 'Electric & Hybrid' },
  { id: 'heritage', label: 'Classic Heritage' },
  { id: 'motorsport', label: 'Motorsport' },
] as const;

export const CARS: CarModel[] = [
  {
    id: 'm4-coupe',
    name: 'BMW M4 Coupé',
    subtitle: 'High-Performance Sports Coupé',
    category: 'm-power',
    categoryLabel: 'M Performance',
    year: '2026',
    tagline: 'Sculpted muscularity engineered for surgical track precision.',
    image: '/images/white-bmw-m4-8q.jpg',
    startingPrice: '$78,100',
    specs: {
      power: '503 HP',
      acceleration: '0–60 in 3.4 sec',
      topSpeed: '180 MPH',
      engine: '3.0L BMW M TwinPower Turbo Inline-6',
      fuelType: 'Gasoline / M xDrive',
    },
    designHighlights: [
      {
        title: 'Frameless Vertical Kidney Grille',
        description: 'Engineered for high-volume air induction directly to the intercoolers with optimized downforce channels.',
      },
      {
        title: 'Carbon Fiber (CFRP) Sculpted Roof',
        description: 'Significantly reduces the center of gravity while double-bubble recesses direct airflow to the rear lip.',
      },
      {
        title: 'Aggressive Aerodynamic Side Air Breathers',
        description: 'Relieves high-pressure turbulence from within the front wheel arches for smoother laminar flow.',
      },
    ],
    colorOptions: [
      { name: 'Alpine White', hex: '#f8fafc' },
      { name: 'Isle of Man Green', hex: '#164e43' },
      { name: 'Sao Paulo Yellow', hex: '#eab308' },
      { name: 'Black Sapphire', hex: '#0f172a' },
    ],
  },
  {
    id: 'm3-competition-black',
    name: 'BMW M3 Competition',
    subtitle: 'Stealth High-Performance Sports Sedan',
    category: 'm-power',
    categoryLabel: 'M Performance',
    year: '2026',
    tagline: 'Everyday four-door luxury infused with pure motorsport pedigree.',
    image: '/images/matt-black-bmw-m3-competition-gh.jpg',
    startingPrice: '$76,000',
    specs: {
      power: '503 HP',
      acceleration: '0–60 in 3.4 sec',
      topSpeed: '180 MPH',
      engine: '3.0L BMW M TwinPower Turbo Inline-6',
      fuelType: 'Gasoline / Rear-Wheel & xDrive',
    },
    designHighlights: [
      {
        title: 'Frozen Deep Black Matte Finish',
        description: 'Multi-layer silk-matte finish highlights the sharp body creases and widened fender flares.',
      },
      {
        title: 'Flared Wheel Arches & M Track Stance',
        description: 'Accommodates staggered forged lightweight wheels for maximum mechanical grip under cornering loads.',
      },
      {
        title: 'Quad 100mm Black Chrome Exhaust',
        description: 'Electrically controlled bypass flaps tune the exhaust note from civilized purr to thunderous bark.',
      },
    ],
    colorOptions: [
      { name: 'Frozen Black Metallic', hex: '#111827' },
      { name: 'Dravit Grey', hex: '#334155' },
      { name: 'Portimao Blue', hex: '#1d4ed8' },
      { name: 'Toronto Red', hex: '#dc2626' },
    ],
  },
  {
    id: 'concept-8-series',
    name: 'BMW Concept 8 Series',
    subtitle: 'Luxury Grand Touring Coupé',
    category: 'luxury',
    categoryLabel: 'Luxury & Concepts',
    year: 'Design Study',
    tagline: 'The pure distillation of athletic presence and modern executive elegance.',
    image: '/images/bmw-8-series-concept-car-c5.jpg',
    startingPrice: '$112,000 (Series)',
    specs: {
      power: '600 HP',
      acceleration: '0–60 in 3.1 sec',
      topSpeed: '190 MPH',
      engine: '4.4L BMW TwinPower Turbo V8',
      fuelType: 'Gasoline Grand Tourer',
    },
    designHighlights: [
      {
        title: 'Sweptback Gran Turismo Silhouette',
        description: 'A low, sweeping roofline transitions fluidly into muscular rear haunches that emphasize rear-wheel propulsion.',
      },
      {
        title: 'Slimline Laser Headlight Blades',
        description: 'Ultra-narrow hexagonal laser light units cast a focused beam extending up to 650 meters down the highway.',
      },
      {
        title: 'Barcelona Blue Liquid Chrome',
        description: 'Special iridescent pigment shifts depth from cool icy silver to deep azure depending on light incidence.',
      },
    ],
    colorOptions: [
      { name: 'Barcelona Blue Chrome', hex: '#38bdf8' },
      { name: 'Frozen Dark Silver', hex: '#64748b' },
      { name: 'Black Sapphire', hex: '#0f172a' },
    ],
  },
  {
    id: '740e-iperformance',
    name: 'BMW 740e iPerformance',
    subtitle: 'Executive Flagship Hybrid',
    category: 'electric',
    categoryLabel: 'Electric & Hybrid',
    year: 'Flagship Series',
    tagline: 'First-class luxury travel paired with intelligent electric propulsion.',
    image: '/images/2017-bmw-740e-iperformance-m-performance-front-9d.jpg',
    startingPrice: '$91,200',
    specs: {
      power: '322 HP Hybrid',
      acceleration: '0–60 in 5.1 sec',
      topSpeed: '155 MPH',
      engine: '2.0L Turbo + Synchronous e-Motor',
      fuelType: 'Plug-in Hybrid (eDrive)',
    },
    designHighlights: [
      {
        title: 'Active Air-Stream Kidney Vanes',
        description: 'Aerodynamic louvers open dynamically only when cooling is needed, maintaining a serene, low-drag profile.',
      },
      {
        title: 'Carbon Core Passenger Structure',
        description: 'Carbon fiber hybrid architecture saves over 130 kg while providing rigid acoustic insulation.',
      },
      {
        title: 'M Performance Aero Front Apron',
        description: 'Sculpted lower intakes with integrated air curtains channel wind cleanly past the front alloy wheels.',
      },
    ],
    colorOptions: [
      { name: 'Mineral White Metallic', hex: '#f1f5f9' },
      { name: 'Carbon Black', hex: '#1e293b' },
      { name: 'Imperial Blue', hex: '#1e3a8a' },
    ],
  },
  {
    id: 'bmw-glowing-laser',
    name: 'BMW Iconic Glow Laser Edition',
    subtitle: 'Signature Night Lighting Study',
    category: 'luxury',
    categoryLabel: 'Luxury & Concepts',
    year: 'Signature Edition',
    tagline: 'An unforgettable illuminated presence that commands the night.',
    image: '/images/bmw-glowing-4k-fe.jpg',
    startingPrice: '$86,500',
    specs: {
      power: '523 HP',
      acceleration: '0–60 in 3.7 sec',
      topSpeed: '155 MPH',
      engine: '4.4L TwinPower V8',
      fuelType: 'Gasoline xDrive',
    },
    designHighlights: [
      {
        title: 'Illuminated Kidney Grille Contour',
        description: 'Fiber-optic light cascades illuminate the iconic double-kidney form when unlocking or driving.',
      },
      {
        title: 'Selective Beam Anti-Dazzle',
        description: 'Dynamically masks oncoming road users while maintaining full high-beam illumination elsewhere.',
      },
      {
        title: 'Welcome Light Carpet',
        description: 'Ambient LED graphics project onto the asphalt alongside the doors for secure, stylish entry.',
      },
    ],
    colorOptions: [
      { name: 'Obsidian Shadow', hex: '#0a0a0f' },
      { name: 'Tanzanite Blue', hex: '#172554' },
      { name: 'Skyscraper Grey', hex: '#475569' },
    ],
  },
  {
    id: 'm6-gtlm-motorsport',
    name: 'BMW M6 GTLM',
    subtitle: 'FIA Endurance Champion',
    category: 'motorsport',
    categoryLabel: 'Motorsport',
    year: 'Racecraft Heritage',
    tagline: 'Crafted for extreme endurance at Daytona, Sebring, and Nürburgring.',
    image: '/images/bmw-m6-gtlm-po.jpg',
    startingPrice: 'Motorsport Spec',
    specs: {
      power: '585 HP',
      acceleration: 'Track Geared',
      topSpeed: '200+ MPH',
      engine: '4.4L M Motorsport V8 dry-sump',
      fuelType: '100% FIA Race Fuel',
    },
    designHighlights: [
      {
        title: 'Swan-Neck High-Downforce Rear Wing',
        description: 'Mounted from the top to ensure clean, undisturbed airflow across the underside of the aerodynamic foil.',
      },
      {
        title: 'Widebody Carbon Composite Shell',
        description: 'Widened track width with vented louvers on the front fenders to evacuate high-speed wheelarch pressure.',
      },
      {
        title: 'Historic M Tricolor Livery',
        description: 'Iconic light blue, dark blue, and red racing stripes that have defined BMW Motorsport victories since 1972.',
      },
    ],
    colorOptions: [
      { name: 'BMW Motorsport Livery', hex: '#1c69d4' },
      { name: 'Pure Carbon Weave', hex: '#1f2937' },
    ],
  },
  {
    id: 'e30-m3-classic',
    name: 'BMW E30 M3 Classic',
    subtitle: 'The Genesis of M Power (1986–1991)',
    category: 'heritage',
    categoryLabel: 'Classic Heritage',
    year: '1988 Classic',
    tagline: 'The most successful touring car in motorsport history.',
    image: '/images/bmw-e30-4k-vd.jpg',
    startingPrice: 'Collector Valuation',
    specs: {
      power: '215 HP',
      acceleration: '0–60 in 6.2 sec',
      topSpeed: '150 MPH',
      engine: '2.3L S14 Naturally Aspirated 4-Cylinder',
      fuelType: '5-Speed Manual Dogleg',
    },
    designHighlights: [
      {
        title: 'Hand-Shaped Box-Flared Fenders',
        description: 'Distinctive stamped steel blister flares designed to clear 10-inch wide racing slick wheels.',
      },
      {
        title: 'Rake-Adjusted Rear Aerofoil & Window',
        description: 'Flatter rear window angle and integrated spoiler bonded to the decklid for high-speed track stability.',
      },
      {
        title: 'Twin Round Sealed-Beam Headlamps',
        description: 'Iconic quad circular headlamps flanked by upright black kidney grilles that define 1980s German design.',
      },
    ],
    colorOptions: [
      { name: 'Henna Red', hex: '#b91c1c' },
      { name: 'Diamond Black', hex: '#1e293b' },
      { name: 'Alpine White I', hex: '#f8fafc' },
    ],
  },
  {
    id: 'vintage-turbo-inferno',
    name: 'BMW 2002 Turbo Heritage',
    subtitle: 'The Turbo Pioneer (1973)',
    category: 'heritage',
    categoryLabel: 'Classic Heritage',
    year: '1973 Classic',
    tagline: 'Europe’s first turbocharged production automobile with legendary shark-nose styling.',
    image: '/images/vintage-inferno-a-fiery-bmw-zs.jpg',
    startingPrice: 'Collector Valuation',
    specs: {
      power: '170 HP Turbo',
      acceleration: '0–60 in 6.9 sec',
      topSpeed: '131 MPH',
      engine: '2.0L KKK Turbocharged Inline-4',
      fuelType: '4-Speed Manual',
    },
    designHighlights: [
      {
        title: 'Reverse Script Front Air Dam',
        description: 'Famous "2002 TURBO" mirror script printed on the front spoiler so drivers ahead could read it in their rearview mirror.',
      },
      {
        title: 'Iconic Shark-Nose Front Fascia',
        description: 'Forward-canted front grille that gives the car a constant eager, predatory stance even at a standstill.',
      },
      {
        title: 'Bolted Fender Flares',
        description: 'Exposed rivets securing the wide fiberglass wheel arches over 13-inch Mahle lightweight sports wheels.',
      },
    ],
    colorOptions: [
      { name: 'Chamonix White with M Stripes', hex: '#f8fafc' },
      { name: 'Polaris Metallic', hex: '#cbd5e1' },
    ],
  },
];
