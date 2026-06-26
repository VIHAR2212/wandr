'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const GLOBE_TRIPS = [
  {
    id: 'kerala-backwaters',
    title: 'Kerala Backwaters',
    description: 'Houseboats, coconut palms, slow mornings.',
    price: 28500, days: 6, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Sep – Mar',
    highlights: ['Backwater cruise', 'Tea gardens', 'Ayurvedic spa'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/f5fde438a90e.jpg',
    lat: 9.4981, lng: 76.3388, emoji: '🌴',
  },
  {
    id: 'pink-blue-city',
    title: 'Pink City to Blue City',
    description: 'Forts the color of late summer.',
    price: 34200, days: 7, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Oct – Mar',
    highlights: ['Amber Fort', 'Desert safari', 'Rajasthani cuisine'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/c4614dde3337.jpg',
    lat: 26.9124, lng: 75.7873, emoji: '🏰',
  },
  {
    id: 'ladakh-loop',
    title: 'Ladakh High Loop',
    description: 'Cold deserts and impossibly blue lakes.',
    price: 52000, days: 9, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Jun – Sep',
    highlights: ['Pangong Lake', 'Khardung La', 'Buddhist monasteries'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/314d66ee4b60.jpg',
    lat: 34.1526, lng: 77.5771, emoji: '🏔️',
  },
  {
    id: 'goa-sun-surf',
    title: 'Goa Sun & Surf',
    description: 'Golden beaches, spice farms, Portuguese ruins.',
    price: 18500, days: 5, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Nov – Feb',
    highlights: ['Beach parties', 'Dudhsagar Falls', 'Old Goa churches'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/ad50c16e97fd.jpg',
    lat: 15.2993, lng: 74.124, emoji: '🏖️',
  },
  {
    id: 'manali-shimla',
    title: 'Manali & Shimla Escape',
    description: 'Snow-capped peaks, pine forests, mountain air.',
    price: 22000, days: 6, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Dec – Feb',
    highlights: ['Solang Valley', 'Rohtang Pass', 'Apple orchards'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/de92aa65bbd3.jpg',
    lat: 32.2396, lng: 77.1887, emoji: '❄️',
  },
  {
    id: 'varanasi-ghats',
    title: 'Varanasi Spiritual Trail',
    description: 'Ancient ghats, Ganga Aarti, soul of India.',
    price: 15800, days: 4, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Oct – Mar',
    highlights: ['Ganga Aarti', 'Sunrise boat ride', 'Sarnath'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/12469a9b6f4b.jpg',
    lat: 25.3176, lng: 82.9739, emoji: '🪔',
  },
  {
    id: 'rishikesh-adventure',
    title: 'Rishikesh Rapids & Rafting',
    description: 'White water, yoga capital, holy rivers.',
    price: 12500, days: 3, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Sep – Nov',
    highlights: ['River rafting', 'Bungee jumping', 'Riverside yoga'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/d8fc2855422e.jpg',
    lat: 30.0869, lng: 78.2676, emoji: '🌊',
  },
  {
    id: 'andaman-islands',
    title: 'Andaman Island Paradise',
    description: 'Turquoise waters, coral reefs, island life.',
    price: 45000, days: 7, region: 'INDIA', category: 'NATIONAL',
    bestSeason: 'Oct – May',
    highlights: ['Scuba diving', 'Radhanagar Beach', 'Bioluminescence'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/68a75b8e9043.jpg',
    lat: 11.7401, lng: 92.6586, emoji: '🐠',
  },
  {
    id: 'kyoto-osaka',
    title: 'Kyoto & Osaka',
    description: 'Temples, cherry blossoms, street food wonders.',
    price: 85000, days: 8, region: 'JAPAN', category: 'INTERNATIONAL',
    bestSeason: 'Mar – May',
    highlights: ['Fushimi Inari', 'Dotonbori', 'Cherry blossoms'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/6d182bd95dc9.jpg',
    lat: 35.0116, lng: 135.7681, emoji: '🌸',
  },
  {
    id: 'lisbon-porto',
    title: 'Lisbon & Porto',
    description: 'Trams, tiles, pasteis de nata, Atlantic breeze.',
    price: 72000, days: 7, region: 'PORTUGAL', category: 'INTERNATIONAL',
    bestSeason: 'Apr – Jun',
    highlights: ['Tram 28', 'Sintra Palace', 'Port wine tasting'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/b0e14941bd94.jpg',
    lat: 38.7169, lng: -9.1395, emoji: '🏛️',
  },
  {
    id: 'bali-ubud',
    title: 'Bali & Ubud',
    description: 'Rice terraces, temples, tropical paradise.',
    price: 65000, days: 8, region: 'INDONESIA', category: 'INTERNATIONAL',
    bestSeason: 'Apr – Oct',
    highlights: ['Rice terraces', 'Uluwatu Temple', 'Mount Batur'],
    imgUrl: 'https://sfile.chatglm.cn/images-ppt/a95a93b7ea89.jpeg',
    lat: -8.5069, lng: 115.2625, emoji: '🌺',
  },
];

const HOME = { label: 'Mumbai', lat: 19.076, lng: 72.8777 };

let _seq = 0;
function nextTrip() {
  const t = GLOBE_TRIPS[_seq % GLOBE_TRIPS.length];
  _seq++;
  return t;
}

// ─── Calibration ─────────────────────────────────────────────────────────────
// The texture jpeg is equirectangular starting at lng -180 on the left edge.
// When backgroundPositionX = P, the left edge of the texture is P pixels
// to the LEFT of the globe's left edge — meaning the globe shows a window
// starting at texture offset P. Centre of that window = P + TEX_WIDTH/2.
// Centre longitude = -180 + ((P + TEX_WIDTH/2) / TEX_WIDTH) * 360
//                 = -180 + (P/TEX_WIDTH)*360 + 180
//                 = (P / TEX_WIDTH) * 360   mapped to -180..180

const TEX_WIDTH = 400;
const GLOBE_R = 125;
const CX = 125;
const CY = 125;
const PX_PER_MS = TEX_WIDTH / 30000; // full rotation in 30s

function posXToCentreLng(posX: number): number {
  const raw = ((posX % TEX_WIDTH) + TEX_WIDTH) % TEX_WIDTH;
  const lng = (raw / TEX_WIDTH) * 360 - 180;
  return lng; // -180..180
}

function lngToPosX(lng: number): number {
  // inverse of posXToCentreLng
  return (((lng + 180) / 360) * TEX_WIDTH + TEX_WIDTH) % TEX_WIDTH;
}

// Start with India centred (Mumbai lng ≈ 73)
const INDIA_START = lngToPosX(73);

// ─── Projection ───────────────────────────────────────────────────────────────
function project(lat: number, lng: number, centreLng: number) {
  let dLng = lng - centreLng;
  while (dLng > 180) dLng -= 360;
  while (dLng < -180) dLng += 360;
  const lngRad = (dLng * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const x = CX + GLOBE_R * Math.cos(latRad) * Math.sin(lngRad);
  const y = CY - GLOBE_R * Math.sin(latRad);
  const z = Math.cos(latRad) * Math.cos(lngRad);
  return { x, y, z, visible: z > 0.05 };
}

function buildArcPath(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  centreLng: number,
  steps = 80
): string {
  const toR = (d: number) => (d * Math.PI) / 180;
  const φ1 = toR(lat1), λ1 = toR(lng1);
  const φ2 = toR(lat2), λ2 = toR(lng2);
  const cosD = Math.sin(φ1)*Math.sin(φ2) + Math.cos(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  const d = Math.acos(Math.max(-1, Math.min(1, cosD)));
  if (d < 0.001) return '';
  let path = '';
  let wasVis = false;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const A = Math.sin((1-t)*d) / Math.sin(d);
    const B = Math.sin(t*d) / Math.sin(d);
    const x3 = A*Math.cos(φ1)*Math.cos(λ1) + B*Math.cos(φ2)*Math.cos(λ2);
    const y3 = A*Math.cos(φ1)*Math.sin(λ1) + B*Math.cos(φ2)*Math.sin(λ2);
    const z3 = A*Math.sin(φ1) + B*Math.sin(φ2);
    const lat = (Math.atan2(z3, Math.sqrt(x3*x3+y3*y3))*180)/Math.PI;
    const lng = (Math.atan2(y3,x3)*180)/Math.PI;
    const p = project(lat, lng, centreLng);
    if (p.visible) {
      path += wasVis ? ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      wasVis = true;
    } else { wasVis = false; }
  }
  return path;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LuckyGlobe() {
  // posX drives backgroundPositionX directly — single source of truth
  const posXRef = useRef(INDIA_START);
  const [posX, setPosX] = useState(INDIA_START);
  const [trip, setTrip] = useState<(typeof GLOBE_TRIPS)[0] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [arcProgress, setArcProgress] = useState(0);
  const [showCard, setShowCard] = useState(false);

  const autoRafRef = useRef<number | null>(null);
  const spinRafRef = useRef<number | null>(null);
  const isSpinning = useRef(false);

  // ── Auto-rotate via rAF — 100% JS, no CSS animation
  useEffect(() => {
    let last: number | null = null;
    const tick = (now: number) => {
      if (!isSpinning.current) {
        const dt = last !== null ? now - last : 0;
        posXRef.current = (posXRef.current + PX_PER_MS * dt) % TEX_WIDTH;
        setPosX(posXRef.current);
      }
      last = now;
      autoRafRef.current = requestAnimationFrame(tick);
    };
    autoRafRef.current = requestAnimationFrame(tick);
    return () => { if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current); };
  }, []);

  const handleLucky = useCallback(() => {
    if (isSpinning.current) return;
    setShowCard(false);
    setArcProgress(0);
    setTrip(null);
    isSpinning.current = true;
    setSpinning(true);

    const next = nextTrip();

    // Target posX that centres destination
    const targetPosX = lngToPosX(next.lng);
    const cur = posXRef.current;

    // Always spin forward (increase posX), add 2 full rotations for drama
    let delta = targetPosX - (cur % TEX_WIDTH);
    if (delta < 0) delta += TEX_WIDTH;
    const totalSpin = TEX_WIDTH * 2 + delta;
    const endPosX = cur + totalSpin;

    const dur = 1800;
    const t0 = performance.now();

    const spinFrame = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      // Cubic ease-in-out
      const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      const current = cur + (endPosX - cur) * ease;
      posXRef.current = current % TEX_WIDTH;
      setPosX(posXRef.current);

      if (t < 1) {
        spinRafRef.current = requestAnimationFrame(spinFrame);
      } else {
        posXRef.current = targetPosX;
        setPosX(targetPosX);
        isSpinning.current = false;
        setSpinning(false);
        setTrip(next);

        // Animate arc draw
        const a0 = performance.now();
        const arcFrame = (n: number) => {
          const at = Math.min((n - a0) / 1000, 1);
          setArcProgress(at);
          if (at < 1) requestAnimationFrame(arcFrame);
          else setTimeout(() => setShowCard(true), 180);
        };
        requestAnimationFrame(arcFrame);
      }
    };
    spinRafRef.current = requestAnimationFrame(spinFrame);
  }, []);

  // (markers removed — globe spins clean)

  return (
    <>
      <style>{`
        @keyframes lg-ping {
          0%   { transform: scale(1);   opacity: .7; }
          100% { transform: scale(2.4); opacity: 0;  }
        }
        @keyframes lg-card-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lg-spin-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .lg-globe {
          background-image: url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/globe.jpeg');
          background-size: ${TEX_WIDTH}px auto;
          background-repeat: repeat-x;
          background-position-y: center;
        }
      `}</style>

      <div className="flex flex-col items-center gap-5 py-6 select-none">

        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-semibold mb-1">
            Surprise Me
          </p>
          <h2 className="text-xl font-bold text-white">Where should I go?</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Tap the button · watch the globe spin</p>
        </div>

        {/* Globe */}
        <div className="relative" style={{ width: 250, height: 250 }}>

          {/* Texture globe — driven purely by backgroundPositionX from JS */}
          <div
            className="lg-globe w-[250px] h-[250px] rounded-full overflow-hidden"
            style={{
              backgroundPositionX: `${posX}px`,
              boxShadow: `
                0 0 20px rgba(255,255,255,0.15),
                -5px 0 8px #c3f4ff inset,
                15px 2px 25px #000 inset,
                -24px -2px 34px #c3f4ff99 inset,
                250px 0 44px #00000066 inset,
                150px 0 38px #000000aa inset
              `,
            }}
          />

          {/* Spin ring */}
          {spinning && (
            <div className="absolute inset-0 rounded-full pointer-events-none"
                 style={{ border: '1.5px solid rgba(245,158,11,0.3)',
                          animation: 'lg-spin-ring 0.85s linear infinite' }} />
          )}
        </div>

        {/* Button */}
        <button
          onClick={handleLucky}
          disabled={spinning}
          className="flex items-center gap-2.5 px-8 py-3 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: spinning ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
            color: spinning ? '#f59e0b' : '#000',
            boxShadow: spinning ? 'none' : '0 0 28px rgba(245,158,11,0.3), 0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          {spinning ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity={0.25}/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" opacity={0.75}/>
              </svg>
              Spinning the globe…
            </>
          ) : (
            <><span>🎲</span> I'm Feeling Lucky</>
          )}
        </button>

        {/* Trip card */}
        {showCard && trip && (
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
               style={{
                 background: 'linear-gradient(160deg,rgba(28,18,16,0.97) 0%,rgba(12,12,12,0.95) 100%)',
                 border: '1px solid rgba(245,158,11,0.15)',
                 animation: 'lg-card-up 0.35s cubic-bezier(0.16,1,0.3,1)',
               }}>
            <div className="relative h-36 overflow-hidden">
              <img src={trip.imgUrl} alt={trip.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400/80 uppercase block mb-0.5">
                  {trip.category} · {trip.region}
                </span>
                <h3 className="text-base font-serif font-bold text-white leading-tight">
                  {trip.emoji} {trip.title}
                </h3>
                <p className="text-[10px] text-white/50 mt-0.5">{trip.description}</p>
              </div>
            </div>
            <div className="px-4 pt-3 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-white">
                    ₹{trip.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-neutral-500 ml-1.5">{trip.days} days</span>
                </div>
                <span className="text-[9px] font-mono text-amber-400/70 tracking-wider">
                  Best: {trip.bestSeason}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trip.highlights.map(h => (
                  <span key={h} className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded-full">
                    {h}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
               <a href={`/explore?trip=${trip.id}`}
                   className="flex-1 py-2.5 rounded-xl text-xs font-bold text-black text-center hover:opacity-90 transition-opacity"
                   style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                  View Full Itinerary →
                </a>
                <button onClick={handleLucky}
                        className="px-4 py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  🎲
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
