'use client';

import React, { useState, useMemo } from 'react';
import { ArrowLeft, Share2, ArrowRight, MapPin, Calendar, Clock, Plane, Hotel as HotelIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import COMMUNITY_ROUTE_DB from '@/lib/flightDatabase.json';

const SocialCards = dynamic(() => import('@/components/features/SocialCards'), { ssr: false });

// ─── Types ────────────────────────────────────────────────
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
  routeKey: string;
  imgUrl: string;
  hotels: SequenceItem[];
  activities?: SequenceItem[];
  bestSeason?: string;
  highlights?: string[];
}

// ─── Destination Data (11 trips) ──────────────────────────
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
    imgUrl: "https://sfile.chatglm.cn/images-ppt/f5fde438a90e.jpg",
    hotels: [
      { category: 'hotel', title: 'Spice Coast Houseboat', subtitle: 'Premium Bedroom Cruise, 2 nights', price: 12500 },
      { category: 'hotel', title: 'Marari Beach Resort', subtitle: 'Garden Villa, 3 nights', price: 8400 }
    ],
    activities: [
      { category: 'activity', title: 'Alleppey Backwater Cruise', subtitle: 'Private houseboat, full day', price: 3200 },
      { category: 'activity', title: 'Munnar Tea Gardens', subtitle: 'Guided plantation walk', price: 1800 },
      { category: 'activity', title: 'Kathakali Performance', subtitle: 'Traditional dance evening show', price: 1200 }
    ],
    bestSeason: "Sep – Mar",
    highlights: ["Backwater cruise", "Tea gardens", "Ayurvedic spa"]
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
    imgUrl: "https://sfile.chatglm.cn/images-ppt/c4614dde3337.jpg",
    hotels: [
      { category: 'hotel', title: 'Umaid Bhawan Heritage Hotel', subtitle: 'Deluxe Room, 3 nights', price: 14500 },
      { category: 'hotel', title: 'The Blue House Jodhpur', subtitle: 'Rooftop view room, 3 nights', price: 9200 }
    ],
    activities: [
      { category: 'activity', title: 'Amber Fort Tour', subtitle: 'Guided heritage walk & elephant ride', price: 2500 },
      { category: 'activity', title: 'Jodhpur Cooking Class', subtitle: 'Rajasthani cuisine masterclass', price: 1800 },
      { category: 'activity', title: 'Thar Desert Safari', subtitle: 'Camel ride at sunset', price: 2200 }
    ],
    bestSeason: "Oct – Mar",
    highlights: ["Amber Fort", "Desert safari", "Rajasthani cuisine"]
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
    imgUrl: "https://sfile.chatglm.cn/images-ppt/314d66ee4b60.jpg",
    hotels: [
      { category: 'hotel', title: 'The Grand Dragon Ladakh', subtitle: 'Premier Room, 4 nights', price: 16000 },
      { category: 'hotel', title: 'Pangong Tso Eco Camps', subtitle: 'Luxury Tent Stay, 2 nights', price: 8600 }
    ],
    activities: [
      { category: 'activity', title: 'Pangong Lake Visit', subtitle: 'Full day excursion', price: 3500 },
      { category: 'activity', title: 'Khardung La Pass', subtitle: 'Highest motorable road', price: 2000 },
      { category: 'activity', title: 'Nubra Valley Safari', subtitle: 'Double-humped camel ride', price: 2800 }
    ],
    bestSeason: "Jun – Sep",
    highlights: ["Pangong Lake", "Khardung La", "Buddhist monasteries"]
  },
  {
    id: "goa-sun-surf",
    number: "04",
    category: "NATIONAL",
    region: "INDIA",
    title: "Goa Sun & Surf",
    description: "Golden beaches, spice farms, Portuguese ruins.",
    price: 18500,
    days: 5,
    gradientClass: "from-yellow-500/20 via-yellow-500/5 to-transparent",
    routeKey: "",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/ad50c16e97fd.jpg",
    hotels: [
      { category: 'hotel', title: 'Taj Exotica Resort', subtitle: 'Deluxe Villa, 3 nights', price: 9800 },
      { category: 'hotel', title: 'The Lazy Dog Hostel', subtitle: 'Beach Hut, 1 night', price: 2200 }
    ],
    activities: [
      { category: 'activity', title: 'Dudhsagar Falls Trek', subtitle: 'Guided jungle trek', price: 1500 },
      { category: 'activity', title: 'Spice Plantation Tour', subtitle: 'Organic farm visit', price: 800 },
      { category: 'activity', title: 'Sunset Dolphin Cruise', subtitle: 'Boat ride with dolphins', price: 1200 }
    ],
    bestSeason: "Nov – Feb",
    highlights: ["Beach parties", "Dudhsagar Falls", "Old Goa churches"]
  },
  {
    id: "manali-shimla",
    number: "05",
    category: "NATIONAL",
    region: "INDIA",
    title: "Manali & Shimla Escape",
    description: "Snow-capped peaks, pine forests, mountain air.",
    price: 22000,
    days: 6,
    gradientClass: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    routeKey: "",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/de92aa65bbd3.jpg",
    hotels: [
      { category: 'hotel', title: 'Snow Valley Resort Manali', subtitle: 'Mountain View Room, 3 nights', price: 7200 },
      { category: 'hotel', title: 'The Clarkes Hotel Shimla', subtitle: 'Heritage Suite, 2 nights', price: 6500 }
    ],
    activities: [
      { category: 'activity', title: 'Solang Valley Adventure', subtitle: 'Paragliding & zorbing', price: 2500 },
      { category: 'activity', title: 'Rohtang Pass Drive', subtitle: 'Scenic mountain drive', price: 1800 },
      { category: 'activity', title: 'Mall Road Walk', subtitle: 'Shimla heritage stroll', price: 0 }
    ],
    bestSeason: "Dec – Feb",
    highlights: ["Solang Valley", "Rohtang Pass", "Apple orchards"]
  },
  {
    id: "varanasi-ghats",
    number: "06",
    category: "NATIONAL",
    region: "INDIA",
    title: "Varanasi Spiritual Trail",
    description: "Ancient ghats, Ganga Aarti, soul of India.",
    price: 15800,
    days: 4,
    gradientClass: "from-orange-500/20 via-orange-500/5 to-transparent",
    routeKey: "",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/12469a9b6f4b.jpg",
    hotels: [
      { category: 'hotel', title: 'BrijRama Palace', subtitle: 'River View Suite, 3 nights', price: 8200 }
    ],
    activities: [
      { category: 'activity', title: 'Ganga Aarti at Dashashwamedh', subtitle: 'Evening ceremony', price: 0 },
      { category: 'activity', title: 'Boat Ride at Sunrise', subtitle: 'Private boat on Ganges', price: 1500 },
      { category: 'activity', title: 'Sarnath Excursion', subtitle: 'Buddhist heritage site', price: 1200 }
    ],
    bestSeason: "Oct – Mar",
    highlights: ["Ganga Aarti", "Sunrise boat ride", "Sarnath"]
  },
  {
    id: "rishikesh-adventure",
    number: "07",
    category: "NATIONAL",
    region: "INDIA",
    title: "Rishikesh Rapids & Rafting",
    description: "White water, yoga capital, holy rivers.",
    price: 12500,
    days: 3,
    gradientClass: "from-lime-500/20 via-lime-500/5 to-transparent",
    routeKey: "",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/d8fc2855422e.jpg",
    hotels: [
      { category: 'hotel', title: 'Glasshouse on the Ganges', subtitle: 'Riverside Cottage, 2 nights', price: 5800 }
    ],
    activities: [
      { category: 'activity', title: 'Grade IV Rafting', subtitle: 'Shivpuri to Rishikesh', price: 2200 },
      { category: 'activity', title: 'Bungee Jumping', subtitle: '83ft free fall', price: 3500 },
      { category: 'activity', title: 'Yoga Session', subtitle: 'Morning session by the river', price: 500 }
    ],
    bestSeason: "Sep – Nov",
    highlights: ["River rafting", "Bungee jumping", "Riverside yoga"]
  },
  {
    id: "andaman-islands",
    number: "08",
    category: "NATIONAL",
    region: "INDIA",
    title: "Andaman Island Paradise",
    description: "Turquoise waters, coral reefs, island life.",
    price: 45000,
    days: 7,
    gradientClass: "from-teal-500/20 via-teal-500/5 to-transparent",
    routeKey: "CCU-IXZ",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/68a75b8e9043.jpg",
    hotels: [
      { category: 'hotel', title: 'Barefoot at Havelock', subtitle: 'Beach Villa, 4 nights', price: 14000 },
      { category: 'hotel', title: 'Sinclair Bay View Port Blair', subtitle: 'Sea View Room, 2 nights', price: 7200 }
    ],
    activities: [
      { category: 'activity', title: 'Scuba Diving', subtitle: 'Havelock coral reef', price: 4500 },
      { category: 'activity', title: 'Radhanagar Beach', subtitle: 'Asia\'s best beach visit', price: 0 },
      { category: 'activity', title: 'Bioluminescent Beach', subtitle: 'Night glow kayaking', price: 3200 }
    ],
    bestSeason: "Oct – May",
    highlights: ["Scuba diving", "Radhanagar Beach", "Bioluminescence"]
  },
  {
    id: "kyoto-osaka",
    number: "09",
    category: "INTERNATIONAL",
    region: "JAPAN",
    title: "Kyoto & Osaka",
    description: "Temples, cherry blossoms, street food wonders.",
    price: 85000,
    days: 8,
    gradientClass: "from-pink-500/20 via-pink-500/5 to-transparent",
    routeKey: "DEL-KIX",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/6d182bd95dc9.jpg",
    hotels: [
      { category: 'hotel', title: 'Hotel Granvia Kyoto', subtitle: 'Station View Room, 4 nights', price: 28000 },
      { category: 'hotel', title: 'Cross Hotel Osaka', subtitle: 'Dotonbori View, 3 nights', price: 18000 }
    ],
    activities: [
      { category: 'activity', title: 'Fushimi Inari Shrine', subtitle: '10,000 vermillion gates hike', price: 0 },
      { category: 'activity', title: 'Dotonbori Food Tour', subtitle: 'Street food crawl', price: 3500 },
      { category: 'activity', title: 'Nara Deer Park', subtitle: 'Day trip to Nara', price: 2800 }
    ],
    bestSeason: "Mar – May",
    highlights: ["Fushimi Inari", "Dotonbori", "Cherry blossoms"]
  },
  {
    id: "lisbon-porto",
    number: "10",
    category: "INTERNATIONAL",
    region: "PORTUGAL",
    title: "Lisbon & Porto",
    description: "Trams, tiles, pasteis de nata, Atlantic breeze.",
    price: 72000,
    days: 7,
    gradientClass: "from-amber-500/20 via-yellow-500/5 to-transparent",
    routeKey: "BOM-LIS",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/b0e14941bd94.jpg",
    hotels: [
      { category: 'hotel', title: 'Lisbon Heritage Hotel', subtitle: 'Alfama District, 4 nights', price: 22000 },
      { category: 'hotel', title: 'Infante Sagres Porto', subtitle: 'Ribeira View Room, 2 nights', price: 14000 }
    ],
    activities: [
      { category: 'activity', title: 'Tram 28 Ride', subtitle: 'Iconic yellow tram tour', price: 800 },
      { category: 'activity', title: 'Sintra Day Trip', subtitle: 'Pena Palace & gardens', price: 4500 },
      { category: 'activity', title: 'Porto Wine Tasting', subtitle: 'Douro Valley cellar tour', price: 3200 }
    ],
    bestSeason: "Apr – Jun",
    highlights: ["Tram 28", "Sintra Palace", "Port wine tasting"]
  },
  {
    id: "bali-ubud",
    number: "11",
    category: "INTERNATIONAL",
    region: "INDONESIA",
    title: "Bali & Ubud",
    description: "Rice terraces, temples, tropical paradise.",
    price: 65000,
    days: 8,
    gradientClass: "from-green-500/20 via-green-500/5 to-transparent",
    routeKey: "",
    imgUrl: "https://sfile.chatglm.cn/images-ppt/a95a93b7ea89.jpeg",
    hotels: [
      { category: 'hotel', title: 'Four Seasons Sayan', subtitle: 'Jungle Villa, 4 nights', price: 25000 },
      { category: 'hotel', title: 'The Mulia Bali', subtitle: 'Beachfront Suite, 3 nights', price: 16000 }
    ],
    activities: [
      { category: 'activity', title: 'Tegallalang Rice Terraces', subtitle: 'Guided trek through paddies', price: 1500 },
      { category: 'activity', title: 'Uluwatu Temple Sunset', subtitle: 'Cliffside Kecak dance', price: 2000 },
      { category: 'activity', title: 'Mount Batur Sunrise Trek', subtitle: 'Volcano sunrise hike', price: 3500 }
    ],
    bestSeason: "Apr – Oct",
    highlights: ["Rice terraces", "Uluwatu Temple", "Mount Batur"]
  }
];

// ─── Component ────────────────────────────────────────────
export default function ExplorationDashboard() {
  const [activeTrip, setActiveTrip] = useState<EditorialTrip | null>(null);

  const allCardItems = useMemo(() =>
    EDITORIAL_TRIPS.map(trip => ({
      imgUrl: trip.imgUrl,
      alt: trip.title,
      overlay: (
        <div className="pointer-events-auto">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/40">
              {trip.number} · {trip.category}
            </span>
            <span className="text-[8px] font-mono text-amber-400/70">{trip.region}</span>
          </div>
          <h3 className="text-sm sm:text-base font-serif text-white leading-tight">{trip.title}</h3>
          <p className="text-[10px] text-white/40 mt-0.5 leading-snug">{trip.description}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] font-mono font-semibold text-white/70">
              ₹{trip.price.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-white/40">
              {trip.days} days
            </span>
          </div>
        </div>
      ),
    })),
    [EDITORIAL_TRIPS]
  );

  if (activeTrip) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <button
            onClick={() => setActiveTrip(null)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors py-2"
          >
            <ArrowLeft size={14} /> Back to Explore
          </button>
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center">
      <div className="text-center pb-2 px-6">
        <span className="text-[10px] tracking-[0.25em] font-mono font-bold text-amber-500 uppercase">
          Curated Journeys · 11 Destinations
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif font-medium tracking-tight text-white mt-3">
          Where next?
        </h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
          Handpicked itineraries across India and beyond. Swipe, explore, pick your next adventure.
        </p>
      </div>

      <SocialCards
        cards={EDITORIAL_TRIPS.map(trip => ({
          imgUrl: trip.imgUrl,
          alt: trip.title,
          overlay: (
            <div
              className="pointer-events-auto cursor-pointer"
              onClick={() => setActiveTrip(trip)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/40">
                  {trip.number} · {trip.category}
                </span>
                <span className="text-[8px] font-mono text-amber-400/70">
                  {trip.region}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-serif text-white leading-tight">
                {trip.title}
              </h3>
              <p className="text-[10px] text-white/40 mt-0.5 leading-snug">
                {trip.description}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] font-mono font-semibold text-white/70">
                  ₹{trip.price.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  {trip.days} days
                </span>
              </div>
            </div>
          ),
        }))}
      />
    </div>
  );
}

// ─── Integrated Trip Detail View ──────────────────────────
function IntegratedTripView({ activeTrip }: { activeTrip: EditorialTrip }) {
  const availableFlights = (COMMUNITY_ROUTE_DB as any)[activeTrip.routeKey] || [];
  const primaryFlight = availableFlights[0];

  const hotelCost = activeTrip.hotels.reduce((sum, h) => sum + h.price, 0);
  const activityCost = (activeTrip.activities || []).reduce((sum, a) => sum + a.price, 0);
  const flightCost = primaryFlight ? primaryFlight.avgPrice : 0;
  const grandTotal = flightCost + hotelCost + activityCost;

  return (
    <div className="space-y-4">
      <div className="relative rounded-[2rem] overflow-hidden h-48 bg-neutral-900">
        <img
          src={activeTrip.imgUrl}
          alt={activeTrip.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <span className="text-[10px] tracking-[0.2em] font-mono text-amber-400/80 uppercase block mb-1">
            {activeTrip.region} · {activeTrip.days} Days · {activeTrip.bestSeason}
          </span>
          <h2 className="text-2xl font-serif text-white tracking-tight">
            {activeTrip.title}
          </h2>
          <p className="text-xs text-white/60 mt-0.5">{activeTrip.description}</p>
        </div>
      </div>

      <div className="bg-[#1C1210] border border-amber-950/20 rounded-[2rem] p-6 space-y-5 text-neutral-100 relative overflow-hidden shadow-2xl">
        <div
          className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${activeTrip.gradientClass} blur-2xl opacity-40 pointer-events-none`}
        />

        <div className="relative z-10 space-y-5">
          {primaryFlight ? (
            <div className="flex justify-between items-start border-b border-neutral-800/40 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center mt-0.5">
                  <Plane className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] tracking-widest font-mono text-amber-500 uppercase">
                    Flight
                  </span>
                  <h4 className="text-sm font-serif text-neutral-200">
                    {primaryFlight.airline}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    {primaryFlight.flightNo} · {primaryFlight.aircraft} (
                    {primaryFlight.duration})
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-amber-500/90 font-semibold pt-0.5">
                ₹{primaryFlight.avgPrice.toLocaleString('en-IN')}
              </span>
            </div>
          ) : activeTrip.routeKey ? (
            <div className="border-b border-neutral-800/40 pb-4">
              <h4 className="text-sm font-serif text-neutral-400">Flight Transit</h4>
              <p className="text-xs text-neutral-500">
                No flights found for sector {activeTrip.routeKey}.
              </p>
            </div>
          ) : null}

          {activeTrip.hotels.length > 0 && (
            <div className="space-y-4 border-b border-neutral-800/40 pb-4">
              <span className="text-[10px] tracking-widest font-mono text-amber-500 uppercase flex items-center gap-2">
                <HotelIcon className="w-3 h-3" /> Hotels
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
          )}

          {activeTrip.activities && activeTrip.activities.length > 0 && (
            <div className="space-y-4 border-b border-neutral-800/40 pb-4">
              <span className="text-[10px] tracking-widest font-mono text-amber-500 uppercase flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Activities
              </span>
              {activeTrip.activities.map((act, index) => (
                <div key={index} className="flex justify-between items-start text-sm">
                  <div className="space-y-0.5">
                    <h5 className="font-serif text-neutral-200">{act.title}</h5>
                    <p className="text-xs text-neutral-500">{act.subtitle}</p>
                  </div>
                  <span className="text-xs font-mono text-amber-500/90 font-semibold pt-0.5">
                    {act.price > 0
                      ? `₹${act.price.toLocaleString('en-IN')}`
                      : 'Free'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTrip.highlights && activeTrip.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4 border-b border-neutral-800/40">
              {activeTrip.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 bg-neutral-800/50 px-2.5 py-1 rounded-full"
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-neutral-800/80 pt-4 flex justify-between items-center text-xs font-mono">
            <span className="text-neutral-500 uppercase">Total Estimated Cost</span>
            <span className="text-base font-bold text-white">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
