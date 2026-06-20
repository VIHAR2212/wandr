'use client';

import React, { useState } from 'react';
import { ArrowLeft, Share2, Compass, Calendar, ArrowRight } from 'lucide-react';

// 1. Interfaces for Detailed Sequence View
interface SequenceItem {
  category: 'transport' | 'hotel' | 'activity';
  title: string;
  subtitle: string;
  price: number;
}

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
  sequenceItems: SequenceItem[];
}

// 2. Enriched Dataset incorporating detailed line items inspired by reference photos
const EDITORIAL_TRIPS: EditorialTrip[] = [
  {
    id: "kerala-backwaters",
    number: "01",
    category: "NATIONAL",
    region: "INDIA",
    title: "Kerala Backwaters",
    description: "Houseboats, coconut palms, slow mornings.",
    price: 28500,
    days: 6,
    gradientClass: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    sequenceItems: [
      { category: 'transport', title: 'Flight', subtitle: 'IndiGo 6E-2144, BOM → COK', price: 5400 },
      { category: 'transport', title: 'Prepaid Cab', subtitle: 'Kochi Airport to Alleppey Jetty', price: 2200 },
      { category: 'hotel', title: 'Spice Coast Houseboat', subtitle: 'Premium Bedroom Cruise, 2 nights', price: 12500 },
      { category: 'hotel', title: 'Marari Beach Resort', subtitle: 'Garden Villa, 3 nights', price: 8400 }
    ]
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
    gradientClass: "from-amber-500/20 via-amber-500/5 to-transparent",
    sequenceItems: [
      { category: 'transport', title: 'Flight', subtitle: 'SpiceJet SG-342, DEL → JAI', price: 4200 },
      { category: 'transport', title: 'Scooter rental', subtitle: 'Activa, 3 days in Jaipur', price: 1500 },
      { category: 'transport', title: 'Intercity Taxi', subtitle: 'Jaipur ⇄ Jodhpur Transfer', price: 4800 },
      { category: 'hotel', title: 'Umaid Bhawan Heritage Hotel', subtitle: 'Deluxe Room, 3 nights', price: 14500 },
      { category: 'hotel', title: 'The Blue House Jodhpur', subtitle: 'Rooftop view room, 3 nights', price: 9200 }
    ]
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
    gradientClass: "from-sky-500/20 via-sky-500/5 to-transparent",
    sequenceItems: [
      { category: 'transport', title: 'Flight', subtitle: 'Air India AI-445, DEL → IXL', price: 8900 },
      { category: 'transport', title: '4x4 SUV Rental', subtitle: 'Scorpio with driver, 6 days', price: 18500 },
      { category: 'hotel', title: 'The Grand Dragon Ladakh', subtitle: 'Premier Room, 4 nights', price: 16000 },
      { category: 'hotel', title: 'Pangong Tso Eco Camps', subtitle: 'Luxury Tent Stay, 2 nights', price: 8600 }
    ]
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
    gradientClass: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    sequenceItems: [
      { category: 'transport', title: 'Flight', subtitle: 'IndiGo 6E-804, CCU → IXZ', price: 7200 },
      { category: 'transport', title: 'Makruzz Ferry', subtitle: 'Port Blair ⇄ Havelock Island', price: 3400 },
      { category: 'hotel', title: 'Barefoot at Havelock', subtitle: 'Thatch Tent Villa, 3 nights', price: 22000 },
      { category: 'hotel', title: 'Symphony Palms Beach Resort', subtitle: 'Cottage Stay, 1 night', price: 8400 }
    ]
  },
  {
    id: "lisbon-azores",
    number: "01",
    category: "INTERNATIONAL",
    region: "PORTUGAL",
    title: "Lisbon & the Azores",
    description: "Azulejos in the city, volcanoes in the ocean.",
    price: 142000,
    days: 10,
    gradientClass: "from-fuchsia-500/20 via-fuchsia-500/5 to-transparent",
    sequenceItems: [
      { category: 'transport', title: 'International Flight', subtitle: 'Emirates, BOM → LIS (via DXB)', price: 68000 },
      { category: 'transport', title: 'Internal Hopper Flight', subtitle: 'TAP Portugal, LIS → PDL', price: 9500 },
      { category: 'hotel', title: 'Lumiares Hotel & Spa Lisbon', subtitle: 'Boutique Loft, 4 nights', price: 38000 },
      { category: 'hotel', title: 'Terra Nostra Garden Hotel', subtitle: 'Furnas Valley Wing, 5 nights', price: 26500 }
    ]
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
    gradientClass: "from-indigo-500/20 via-indigo-500/5 to-transparent",
    sequenceItems: [
      { category: 'transport', title: 'International Flight', subtitle: 'Japan Airlines, DEL → KIX', price: 54000 },
      { category: 'transport', title: 'JR Kansai Wide Rail Pass', subtitle: 'Shinkansen & Local Lines, 7 Days', price: 12000 },
      { category: 'hotel', title: 'Kyoto Machiya Stay', subtitle: 'Traditional Townhouse, 5 nights', price: 74000 },
      { category: 'hotel', title: 'Shukubo Temple Lodging', subtitle: 'Koyasan Monastic Stay, 2 nights', price: 28000 }
    ]
  }
];

export default function ExplorationDashboard() {
  // State tracking active selected trip sequence detail panel view
  const [activeTrip, setActiveTrip] = useState<EditorialTrip | null>(null);

  const nationalTrips = EDITORIAL_TRIPS.filter(t => t.category === "NATIONAL");
  const internationalTrips = EDITORIAL_TRIPS.filter(t => t.category === "INTERNATIONAL");

  // Render Detailed Sequence Itinerary Panel matching Screenshot_2026-06-20-12-29-01-40_40deb401b9ffe8e1df2f1cc5ba480b12.jpg
  if (activeTrip) {
    const transports = activeTrip.sequenceItems.filter(item => item.category === 'transport');
    const hotels = activeTrip.sequenceItems.filter(item => item.category === 'hotel');

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 animate-fadeIn">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Back Navigation Bar */}
          <button 
            onClick={() => setActiveTrip(null)} 
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors py-2"
          >
            <ArrowLeft size={14} /> Back to Explore
          </button>

          {/* Master Display Screen Frame */}
          <div className="bg-[#1C1210] border border-amber-900/20 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            
            {/* Ambient Title Block Accent */}
            <div className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${activeTrip.gradientClass} blur-2xl opacity-40 pointer-events-none`} />

            {/* Header Content */}
            <div className="p-8 pb-4 relative z-10 border-b border-neutral-800/40">
              <span className="text-[10px] tracking-[0.2em] font-mono text-amber-500/80 uppercase block mb-1">
                {activeTrip.region} · {activeTrip.days} Days
              </span>
              <h2 className="text-3xl font-serif text-white tracking-tight">{activeTrip.title}</h2>
              <p className="text-xs text-neutral-400 mt-1">{activeTrip.description}</p>
            </div>

            {/* Scrollable Detailed Price Summary List Layout */}
            <div className="p-8 pt-6 space-y-6 relative z-10">
              
              {/* Transport List */}
              {transports.length > 0 && (
                <div className="space-y-4">
                  {transports.map((item, index) => (
                    <div key={index} className="flex justify-between items-start group">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-serif text-neutral-200">{item.title}</h4>
                        <p className="text-xs text-neutral-500 font-sans">{item.subtitle}</p>
                      </div>
                      <span className="text-xs font-mono text-amber-500/90 font-semibold pt-0.5">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Subheading Split Lines */}
              {hotels.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase block border-b border-neutral-800/60 pb-2 mb-4">
                    Hotels
                  </span>
                  
                  <div className="space-y-4">
                    {hotels.map((item, index) => (
                      <div key={index} className="flex justify-between items-start group">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-serif text-neutral-200">{item.title}</h4>
                          <p className="text-xs text-neutral-500 font-sans">{item.subtitle}</p>
                        </div>
                        <span className="text-xs font-mono text-amber-500/90 font-semibold pt-0.5">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Summary Footer Row */}
              <div className="border-t border-neutral-800/80 pt-4 flex justify-between items-center text-xs font-mono">
                <span className="text-neutral-500 uppercase">Estimated Total Cost</span>
                <span className="text-base font-bold text-white">
                  ₹{activeTrip.price.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Action Operations Tray */}
              <div className="pt-4 space-y-3">
                <button className="w-full bg-[#E87A5D] hover:bg-[#df6d4f] text-neutral-950 font-mono tracking-wider text-xs font-bold py-3.5 rounded-full uppercase transition-all shadow-xl shadow-[#E87A5D]/10 flex items-center justify-center gap-1.5 group">
                  Edit Sequence <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button className="w-full bg-transparent border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white font-mono tracking-wider text-xs font-bold py-3.5 rounded-full uppercase transition-all flex items-center justify-center gap-1.5">
                  <Share2 size={13} /> Share Itinerary
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // Fallback Base Selection View (Grid Framework)
  return (
    <div className="bg-neutral-950 text-neutral-100 px-6 pt-8 selection:bg-amber-500/30">
      <div className="max-w-4xl mx-auto space-y-16">
        
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

        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.2em] font-mono font-bold text-amber-500 uppercase">Popular · Within India</span>
            <h2 className="text-3xl font-serif font-medium tracking-tight text-white">Closer to home</h2>
            <p className="text-sm text-neutral-400">Eight states, six journeys. Short trips and slow ones.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nationalTrips.map((trip) => (
              <div key={trip.id} onClick={() => setActiveTrip(trip)}>
                <TripCard trip={trip} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.2em] font-mono font-bold text-amber-500 uppercase">Popular · Around the World</span>
            <h2 className="text-3xl font-serif font-medium tracking-tight text-white">Farther out</h2>
            <p className="text-sm text-neutral-400">Routes across continents — temples, glaciers, riads.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {internationalTrips.map((trip) => (
              <div key={trip.id} onClick={() => setActiveTrip(trip)}>
                <TripCard trip={trip} />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// Sub-Component Card Component
function TripCard({ trip }: { trip: EditorialTrip }) {
  return (
    <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-[2rem] p-6 flex flex-col justify-between h-[340px] relative overflow-hidden backdrop-blur-xl shadow-xl hover:border-neutral-700/80 transition-all duration-300 group cursor-pointer">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-48 h-48 rounded-full bg-gradient-to-b ${trip.gradientClass} blur-2xl opacity-70 group-hover:scale-125 transition-transform duration-500 ease-out`} />
      </div>
      <div className="relative z-10 flex justify-between items-center text-[10px] tracking-widest font-mono text-neutral-500 uppercase font-bold">
        <span>{trip.number} · {trip.category}</span>
        <span className="text-neutral-400">{trip.region}</span>
      </div>
      <div className="relative z-10 space-y-1.5 my-auto pt-2">
        <h3 className="text-2xl font-serif text-white group-hover:text-amber-400 transition-colors duration-300">
          {trip.title}
        </h3>
        <p className="text-xs text-neutral-400 font-normal leading-relaxed max-w-[90%]">
          {trip.description}
        </p>
      </div>
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
