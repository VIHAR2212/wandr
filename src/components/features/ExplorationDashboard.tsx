'use client';

import React, { useState } from 'react';
import { ArrowLeft, Share2, ArrowRight } from 'lucide-react';
// 1. Read directly from the automated JSON file database compiled by your Python GitHub Action
import COMMUNITY_ROUTE_DB from '@/lib/flightDatabase.json';

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
  routeKey: string; // Used to search the flightDatabase.json keys (e.g., "BOM-COK")
  hotels: SequenceItem[];
}

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
    routeKey: "BOM-COK",
    hotels: [
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
    routeKey: "DEL-JAI",
    hotels: [
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
    routeKey: "DEL-IXL",
    hotels: [
      { category: 'hotel', title: 'The Grand Dragon Ladakh', subtitle: 'Premier Room, 4 nights', price: 16000 },
      { category: 'hotel', title: 'Pangong Tso Eco Camps', subtitle: 'Luxury Tent Stay, 2 nights', price: 8600 }
    ]
  }
];

export default function ExplorationDashboard() {
  const [activeTrip, setActiveTrip] = useState<EditorialTrip | null>(null);

  const nationalTrips = EDITORIAL_TRIPS.filter(t => t.category === "NATIONAL");
  const internationalTrips = EDITORIAL_TRIPS.filter(t => t.category === "INTERNATIONAL");

  if (activeTrip) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          
          <button onClick={() => setActiveTrip(null)} className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors py-2">
            <ArrowLeft size={14} /> Back to Explore
          </button>

          {/* 🚀 Render the Integrated Dynamic View Directly Inside the Open Layout Panel */}
          <IntegratedTripView activeTrip={activeTrip} />

          <div className="px-4 space-y-3">
            <button className="w-full bg-[#E87A5D] text-neutral-950 font-mono tracking-wider text-xs font-bold py-3.5 rounded-full uppercase flex items-center justify-center gap-1.5 group">
              Edit Sequence <ArrowRight size={14} />
            </button>
            <button className="w-full bg-transparent border border-neutral-800 text-neutral-400 font-mono tracking-wider text-xs font-bold py-3.5 rounded-full uppercase flex items-center justify-center gap-1.5">
              <Share2 size={13} /> Share Itinerary
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 text-neutral-100 px-6 pt-8">
      <div className="max-w-4xl mx-auto space-y-16">
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
      </div>
    </div>
  );
}

// 🚀 The Integrated View sub-component handling the JSON data resolution
function IntegratedTripView({ activeTrip }: { activeTrip: EditorialTrip }) {
  const availableFlights = (COMMUNITY_ROUTE_DB as any)[activeTrip.routeKey] || [];
  const primaryFlight = availableFlights[0];

  const hotelCost = activeTrip.hotels.reduce((sum, h) => sum + h.price, 0);
  const flightCost = primaryFlight ? primaryFlight.avgPrice : 0;
  const grandTotal = flightCost + hotelCost;

  return (
    <div className="bg-[#1C1210] border border-amber-950/20 rounded-[2.5rem] p-8 space-y-6 text-neutral-100 relative overflow-hidden shadow-2xl">
      <div className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${activeTrip.gradientClass} blur-2xl opacity-40 pointer-events-none`} />

      <div className="relative z-10 border-b border-neutral-800/40 pb-4">
        <span className="text-[10px] tracking-[0.2em] font-mono text-amber-500/80 uppercase block mb-1">
          {activeTrip.region} · {activeTrip.days} Days
        </span>
        <h2 className="text-3xl font-serif text-white tracking-tight">{activeTrip.title}</h2>
        <p className="text-xs text-neutral-400 mt-1">{activeTrip.description}</p>
      </div>

      <div className="relative z-10 space-y-6">
        {primaryFlight ? (
          <div className="flex justify-between items-start border-b border-neutral-800/40 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] tracking-widest font-mono text-amber-500 uppercase">Flight</span>
              <h4 className="text-sm font-serif text-neutral-200">{primaryFlight.airline}</h4>
              <p className="text-xs text-neutral-500 font-sans">
                {primaryFlight.flightNo} · {primaryFlight.aircraft} ({primaryFlight.duration})
              </p>
            </div>
            <span className="text-xs font-mono text-amber-500/90 font-semibold pt-0.5">
              ₹{primaryFlight.avgPrice.toLocaleString('en-IN')}
            </span>
          </div>
        ) : (
          <div className="border-b border-neutral-800/40 pb-4">
            <h4 className="text-sm font-serif text-neutral-400">Flight Transit</h4>
            <p className="text-xs text-neutral-500 font-sans">No flights found in database for sector {activeTrip.routeKey}.</p>
          </div>
        )}

        <div className="space-y-4">
          <span className="text-[10px] tracking-widest font-mono text-neutral-500 uppercase block border-b border-neutral-800/60 pb-2">
            Hotels
          </span>
          {activeTrip.hotels.map((hotel, index) => (
            <div key={index} className="flex justify-between items-start text-sm">
              <div className="space-y-0.5">
                <h5 className="font-serif text-neutral-200">{hotel.title}</h5>
                <p className="text-xs text-neutral-500">{hotel.subtitle}</p>
              </div>
              <span className="text-xs font-mono text-amber-500/90 font-semibold pt-0.5">
                ₹{hotel.price.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-800/80 pt-4 flex justify-between items-center text-xs font-mono">
          <span className="text-neutral-500 uppercase">Total Estimated Cost</span>
          <span className="text-base font-bold text-white">
            ₹{grandTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: EditorialTrip }) {
  return (
    <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-[2rem] p-6 flex flex-col justify-between h-[340px] relative overflow-hidden cursor-pointer group">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-48 h-48 rounded-full bg-gradient-to-b ${trip.gradientClass} blur-2xl opacity-70 group-hover:scale-125 transition-transform duration-500`} />
      </div>
      <div className="relative z-10 flex justify-between items-center text-[10px] font-mono text-neutral-500 uppercase font-bold">
        <span>{trip.number} · {trip.category}</span>
        <span className="text-neutral-400">{trip.region}</span>
      </div>
      <div className="relative z-10 pt-2">
        <h3 className="text-2xl font-serif text-white group-hover:text-amber-400 transition-colors">{trip.title}</h3>
        <p className="text-xs text-neutral-400 mt-1">{trip.description}</p>
      </div>
      <div className="relative z-10 border-t border-neutral-800/60 pt-4 grid grid-cols-2 text-left">
        <div>
          <span className="block text-[9px] font-mono text-neutral-500 uppercase">From</span>
          <span className="text-sm font-semibold text-neutral-200">₹{trip.price.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-right">
          <span className="block text-[9px] font-mono text-neutral-500 uppercase">Days</span>
          <span className="text-sm font-semibold text-neutral-200">{trip.days}</span>
        </div>
      </div>
    </div>
  );
        }

