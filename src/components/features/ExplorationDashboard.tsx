import React from 'react';

// 1. Data Structure Interface
interface EditorialTrip {
  id: string;
  number: string;
  category: "NATIONAL" | "INTERNATIONAL";
  region: string;
  title: string;
  description: string;
  price: number;
  days: number;
  gradientClass: string;
}

// 2. Complete Dataset from Reference Photos
const EDITORIAL_TRIPS: EditorialTrip[] = [
  // --- CLOSER TO HOME (1000212635.jpg) ---
  {
    id: "kerala-backwaters",
    number: "01",
    category: "NATIONAL",
    region: "INDIA",
    title: "Kerala Backwaters",
    description: "Houseboats, coconut palms, slow mornings.",
    price: 28500,
    days: 6,
    gradientClass: "from-emerald-500/20 via-emerald-500/5 to-transparent"
  },
  {
    id: "pink-blue-city",
    number: "02",
    category: "NATIONAL",
    region: "INDIA",
    title: "Pink City to Blue City",
    description: "Forts the color of late summer.",
    price: 34200,
    days: 7,
    gradientClass: "from-amber-500/20 via-amber-500/5 to-transparent"
  },
  {
    id: "ladakh-loop",
    number: "03",
    category: "NATIONAL",
    region: "INDIA",
    title: "Ladakh High Loop",
    description: "Cold deserts and impossibly blue lakes.",
    price: 52000,
    days: 9,
    gradientClass: "from-sky-500/20 via-sky-500/5 to-transparent"
  },
  {
    id: "andaman-coast",
    number: "04",
    category: "NATIONAL",
    region: "INDIA",
    title: "Andaman Quiet Coast",
    description: "Bioluminescence and barefoot afternoons.",
    price: 41000,
    days: 5,
    gradientClass: "from-cyan-500/20 via-cyan-500/5 to-transparent"
  },
  // --- FARTHER OUT (1000212636.jpg) ---
  {
    id: "lisbon-azores",
    number: "01",
    category: "INTERNATIONAL",
    region: "PORTUGAL",
    title: "Lisbon & the Azores",
    description: "Azulejos in the city, volcanoes in the ocean.",
    price: 142000,
    days: 10,
    gradientClass: "from-fuchsia-500/20 via-fuchsia-500/5 to-transparent"
  },
  {
    id: "kyoto-koyasan",
    number: "02",
    category: "INTERNATIONAL",
    region: "JAPAN",
    title: "Kyoto & Kōyasan",
    description: "Temple bells, cedar forests, kaiseki dinners.",
    price: 168000,
    days: 8,
    gradientClass: "from-indigo-500/20 via-indigo-500/5 to-transparent"
  },
  {
    id: "patagonia-w",
    number: "03",
    category: "INTERNATIONAL",
    region: "CHILE",
    title: "Patagonia W-Trek",
    description: "Glaciers, granite towers, end-of-world wind.",
    price: 245000,
    days: 12,
    gradientClass: "from-blue-500/20 via-blue-500/5 to-transparent"
  },
  {
    id: "marrakech-atlas",
    number: "04",
    category: "INTERNATIONAL",
    region: "MOROCCO",
    title: "Marrakech to the Atlas",
    description: "Riads, spice steam, mountain mornings.",
    price: 118000,
    days: 7,
    gradientClass: "from-orange-500/20 via-orange-500/5 to-transparent"
  }
];

// 3. Main Dashboard Wrapper Component
export default function ExplorationDashboard() {
  const nationalTrips = EDITORIAL_TRIPS.filter(t => t.category === "NATIONAL");
  const internationalTrips = EDITORIAL_TRIPS.filter(t => t.category === "INTERNATIONAL");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12 selection:bg-amber-500/30">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Editorial Sub-Header Row */}
        <header className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-neutral-800 pb-8 text-[11px] tracking-wider uppercase font-mono text-neutral-400">
          <div>
            <h4 className="font-bold text-amber-500 mb-1">Say where</h4>
            <p className="normal-case font-sans tracking-normal text-neutral-400 leading-relaxed">From A to B, or just a feeling. A long weekend, a sabbatical.</p>
          </div>
          <div>
            <h4 className="font-bold text-amber-500 mb-1">We compose</h4>
            <p className="normal-case font-sans tracking-normal text-neutral-400 leading-relaxed">Routes, hotels, flights, the little café no one tells you about.</p>
          </div>
          <div>
            <h4 className="font-bold text-amber-500 mb-1">You drift</h4>
            <p className="normal-case font-sans tracking-normal text-neutral-400 leading-relaxed">Saved as a sequence you can edit, share, and pack from.</p>
          </div>
        </header>

        {/* SECTION 1: Closer to Home (National) */}
        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.2em] font-mono font-bold text-amber-500 uppercase">Popular · Within India</span>
            <h2 className="text-3xl font-serif font-medium tracking-tight text-white">Closer to home</h2>
            <p className="text-sm text-neutral-400">Eight states, six journeys. Short trips and slow ones.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nationalTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>

        {/* SECTION 2: Farther Out (International) */}
        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.2em] font-mono font-bold text-amber-500 uppercase">Popular · Around the World</span>
            <h2 className="text-3xl font-serif font-medium tracking-tight text-white">Farther out</h2>
            <p className="text-sm text-neutral-400">Routes across continents — temples, glaciers, riads.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {internationalTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// 4. Reusable Premium Dark Glassmorphic Card
function TripCard({ trip }: { trip: EditorialTrip }) {
  return (
    <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-[2rem] p-6 flex flex-col justify-between h-[340px] relative overflow-hidden backdrop-blur-xl shadow-xl hover:border-neutral-700/80 transition-all duration-300 group cursor-pointer">
      
      {/* Ambient Radial Gradient Glow Effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-48 h-48 rounded-full bg-gradient-to-b ${trip.gradientClass} blur-2xl opacity-70 group-hover:scale-125 transition-transform duration-500 ease-out`} />
      </div>

      {/* Top Card Info Row */}
      <div className="relative z-10 flex justify-between items-center text-[10px] tracking-widest font-mono text-neutral-500 uppercase font-bold">
        <span>{trip.number} · {trip.category}</span>
        <span className="text-neutral-400">{trip.region}</span>
      </div>

      {/* Mid Card Text Info */}
      <div className="relative z-10 space-y-1.5 my-auto pt-2">
        <h3 className="text-2xl font-serif text-white group-hover:text-amber-400 transition-colors duration-300">
          {trip.title}
        </h3>
        <p className="text-xs text-neutral-400 font-normal leading-relaxed max-w-[90%]">
          {trip.description}
        </p>
      </div>

      {/* Bottom Budget/Day Parameters Row */}
      <div className="relative z-10 border-t border-neutral-800/60 pt-4 grid grid-cols-2 text-left">
        <div>
          <span className="block text-[9px] tracking-wider font-mono text-neutral-500 uppercase">From</span>
          <span className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors">
            ₹{trip.price.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[9px] tracking-wider font-mono text-neutral-500 uppercase">Days</span>
          <span className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors">
            {trip.days}
          </span>
        </div>
      </div>

    </div>
  );
    }
