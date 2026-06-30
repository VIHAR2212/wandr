"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface Stop {
  name?: string;
  lat?: number;
  lng?: number;
  type?: string;
  day?: number;
  description?: string;
  time?: string;
  duration?: string;
}

interface TripMapProps {
  trip: any;
}

// Stadia Maps Alidade Smooth Dark — free, no API key needed for dev/Vercel
const STADIA_DARK_STYLE: any = {
  version: 8,
  name: "Wandr Dark",
  sources: {
    stadia: {
      type: "raster",
      tiles: [
        "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
      ],
      tileSize: 256,
      attribution: "&copy; Stadia Maps &copy; OpenMapTiles &copy; OSM",
      maxzoom: 20,
    },
  },
  layers: [
    { id: "stadia-tiles", type: "raster", source: "stadia", minzoom: 0, maxzoom: 20 },
  ],
};

// OSM fallback — CSS dark filter applied, always works
const OSM_FALLBACK_STYLE: any = {
  version: 8,
  name: "Wandr OSM",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "osm-tiles", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 },
  ],
};

const TYPE_COLORS: Record<string, string> = {
  attraction: "#f59e0b",
  sightseeing: "#f59e0b",
  hotel: "#3b82f6",
  restaurant: "#ef4444",
  cafe: "#a855f7",
  shopping: "#ec4899",
  transport: "#6b7280",
  activity: "#10b981",
  museum: "#f59e0b",
  temple: "#f59e0b",
  park: "#10b981",
  beach: "#06b6d4",
  hiddenGem: "#a855f7",
  hidden_gem: "#a855f7",
  default: "#f97316",
};

function getColor(type: string): string {
  const t = (type || "").toLowerCase().replace(/[\s_-]/g, "");
  if (t.includes("hiddengem") || t.includes("hidden_gem")) return "#a855f7";
  for (const [key, val] of Object.entries(TYPE_COLORS)) {
    if (t.includes(key)) return val;
  }
  return TYPE_COLORS.default;
}

function getTypeLabel(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("transport")) return "transport";
  if (t.includes("hotel") || t.includes("accommodation")) return "hotel";
  if (t.includes("restaurant") || t.includes("food") || t.includes("cafe") || t.includes("dining")) return "restaurant";
  if (t.includes("hidden") || t.includes("gem")) return "hiddenGem";
  if (t.includes("museum") || t.includes("temple") || t.includes("attraction") || t.includes("sightseeing") || t.includes("monument") || t.includes("fort") || t.includes("palace") || t.includes("beach") || t.includes("park") || t.includes("garden") || t.includes("lake")) return "attraction";
  return "activity";
}

interface RawItem {
  name: string;
  lat: number | null;
  lng: number | null;
  type: string;
  typeLabel: string;
  day: number | null;
  description: string;
  time: string;
  duration: string;
  locationHint: string;
  source: string;
}

// ─────────────────────────────────────────────────────────────────
// KNOWN COORDINATES — sorted by key length DESC so longer
// (more specific) entries are checked before shorter ones.
// Format: [key, [lng, lat]]
// ─────────────────────────────────────────────────────────────────
const KNOWN_RAW: Array<[string, [number, number]]> = [
  // ── Gujarat specific (longest first) ──
  ["nageshwar jyotirlinga", [68.9400, 22.2800]],
  ["nageshwar temple", [68.9400, 22.2800]],
  ["dwarkadhish temple", [68.9685, 22.2440]],
  ["bet dwarka", [68.9500, 22.3300]],
  ["beyt dwarka", [68.9500, 22.3300]],
  ["rukmini devi temple", [68.9690, 22.2360]],
  ["rukmini temple", [68.9690, 22.2360]],
  ["somnath temple", [70.4013, 20.8880]],
  ["triveni sangam", [70.4000, 20.8860]],
  ["gir national park", [70.8123, 21.1243]],
  ["gir forest", [70.8123, 21.1243]],
  ["junagadh fort", [70.4572, 21.5200]],
  ["uparkot fort", [70.4572, 21.5200]],
  ["mahabat maqbara", [70.4590, 21.5170]],
  ["sarkhej roza", [72.5100, 23.0900]],
  ["adalaj stepwell", [72.5770, 23.1670]],
  ["adalaj vav", [72.5770, 23.1670]],
  ["sabarmati ashram", [72.5795, 23.0595]],
  ["gandhi ashram", [72.5795, 23.0595]],
  ["kankaria lake", [72.6070, 23.0060]],
  ["akshardham temple gandhinagar", [72.6782, 23.2156]],
  ["akshardham gandhinagar", [72.6782, 23.2156]],
  ["akshardham temple", [72.6782, 23.2156]],
  ["indroda nature park", [72.6600, 23.1900]],
  ["gandhi smriti", [72.6480, 23.2200]],
  ["victoria garden", [72.5750, 21.1700]],
  ["sayaji baug", [73.1934, 22.3105]],
  ["laxmi vilas palace vadodara", [73.1934, 22.2934]],
  ["laxmi vilas palace", [73.1934, 22.2934]],
  ["champaner pavagadh", [73.5330, 22.4850]],
  ["pavagadh temple", [73.5330, 22.4850]],
  ["surat castle", [72.8310, 21.2060]],
  ["dumas beach", [72.7490, 21.1620]],
  ["madhavpur beach", [69.6490, 21.4440]],
  ["mandvi beach", [69.3550, 22.8330]],
  ["shivrajpur beach", [69.5600, 22.4000]],
  ["pirotan island", [70.2500, 22.2800]],
  ["rana pratap palace", [69.6100, 23.8000]],
  ["aina mahal bhuj", [69.6669, 23.2427]],
  ["prag mahal bhuj", [69.6660, 23.2430]],
  ["bhujio bastion", [69.6650, 23.2440]],
  ["white desert kutch", [69.8600, 23.7337]],
  ["rann of kutch", [69.8600, 23.7337]],
  ["rann utsav", [69.8600, 23.7337]],
  ["modhera sun temple", [72.1332, 23.5830]],
  ["sun temple modhera", [72.1332, 23.5830]],
  // ── Rajasthan specific (longest first) ──
  ["amber fort jaipur", [75.8513, 26.9855]],
  ["amer fort jaipur", [75.8513, 26.9855]],
  ["city palace jaipur", [75.8256, 26.9460]],
  ["nahargarh fort jaipur", [75.8462, 26.9247]],
  ["hawa mahal jaipur", [75.8265, 26.9239]],
  ["jantar mantar jaipur", [75.8248, 26.9247]],
  ["jal mahal jaipur", [75.8472, 26.9535]],
  ["albert hall museum", [75.8100, 26.9130]],
  ["birla mandir jaipur", [75.7870, 26.9040]],
  ["city palace udaipur", [73.6818, 24.5789]],
  ["lake pichola udaipur", [73.6814, 24.5854]],
  ["jag mandir udaipur", [73.6808, 24.5808]],
  ["saheliyon ki bari", [73.6840, 24.5910]],
  ["bagore ki haveli", [73.6821, 24.5812]],
  ["kumbhalgarh fort", [73.5850, 25.1480]],
  ["chittorgarh fort", [74.6268, 24.8887]],
  ["mount abu dilwara", [72.7158, 24.5926]],
  ["pushkar lake", [74.5511, 26.4897]],
  ["brahma temple pushkar", [74.5520, 26.4875]],
  ["mehrangarh fort", [73.0184, 26.2967]],
  ["jaswant thada", [73.0170, 26.2920]],
  ["umaid bhawan palace", [73.0140, 26.2750]],
  ["jaisalmer fort", [70.9133, 26.9157]],
  ["patwon ki haveli", [70.9110, 26.9150]],
  ["gadisar lake", [70.9030, 26.9120]],
  ["sam sand dunes", [70.7500, 26.9500]],
  ["fatehpur sikri", [77.6677, 27.0968]],
  ["junagarh fort bikaner", [73.3000, 28.0229]],
  // ── Major Indian landmarks ──
  ["gateway of india mumbai", [72.8347, 18.9220]],
  ["gateway of india", [72.8347, 18.9220]],
  ["taj mahal agra", [78.0421, 27.1751]],
  ["taj mahal", [78.0421, 27.1751]],
  ["red fort delhi", [77.2410, 28.6562]],
  ["red fort", [77.2410, 28.6562]],
  ["india gate delhi", [77.2295, 28.6129]],
  ["india gate", [77.2295, 28.6129]],
  ["qutub minar", [77.1855, 28.5245]],
  ["lotus temple delhi", [77.2588, 28.5535]],
  ["lotus temple", [77.2588, 28.5535]],
  ["akshardham temple delhi", [77.2771, 28.6127]],
  ["humayun tomb", [77.2608, 28.5933]],
  ["charminar hyderabad", [78.4746, 17.3918]],
  ["charminar", [78.4746, 17.3918]],
  ["golconda fort", [78.4015, 17.3827]],
  ["marine drive mumbai", [72.8231, 18.9431]],
  ["marine drive", [72.8231, 18.9431]],
  ["elephanta caves", [72.9312, 18.9633]],
  ["siddhivinayak temple", [72.8307, 19.0753]],
  ["dal lake srinagar", [74.8340, 34.1150]],
  ["dal lake", [74.8340, 34.1150]],
  ["vaishno devi", [74.9480, 33.0300]],
  ["har ki pauri", [78.1642, 29.9457]],
  ["golden temple amritsar", [74.8770, 31.6200]],
  ["golden temple", [74.8770, 31.6200]],
  ["mysore palace", [76.6554, 12.2958]],
  ["backwaters kerala", [76.3388, 9.4981]],
  ["munnar tea gardens", [77.0595, 10.0889]],
  ["periyar wildlife sanctuary", [77.1650, 9.6000]],
  // ── Cities (longer first) ──
  ["new delhi", [77.209, 28.6139]],
  ["bengaluru", [77.5946, 12.9716]],
  ["port blair", [92.7265, 11.6234]],
  ["havelock island", [92.9982, 11.9810]],
  ["neil island", [92.8748, 11.8345]],
  ["mount abu", [72.7158, 24.5926]],
  ["andaman and nicobar", [92.7265, 11.7401]],
  ["new york", [-74.006, 40.7128]],
  ["delhi", [77.209, 28.6139]],
  ["mumbai", [72.8777, 19.076]],
  ["bangalore", [77.5946, 12.9716]],
  ["goa", [74.124, 15.2993]],
  ["jaipur", [75.7873, 26.9124]],
  ["agra", [78.0081, 27.1767]],
  ["varanasi", [82.9739, 25.3176]],
  ["kerala", [76.2711, 10.8505]],
  ["kochi", [76.2673, 9.9312]],
  ["hyderabad", [78.4867, 17.385]],
  ["chennai", [80.2707, 13.0827]],
  ["kolkata", [88.3639, 22.5726]],
  ["pune", [73.8567, 18.5204]],
  ["manali", [77.1892, 32.2396]],
  ["shimla", [77.1734, 31.1048]],
  ["leh", [77.5771, 34.1526]],
  ["ladakh", [77.5771, 34.1526]],
  ["udaipur", [73.6833, 24.5854]],
  ["jodhpur", [73.0243, 26.2389]],
  ["mysore", [76.6394, 12.2958]],
  ["ooty", [76.695, 11.4102]],
  ["darjeeling", [88.2627, 27.036]],
  ["rishikesh", [78.2676, 30.0869]],
  ["haridwar", [78.1642, 29.9457]],
  ["amritsar", [74.8723, 31.634]],
  ["chandigarh", [76.7794, 30.7333]],
  ["srinagar", [74.7973, 34.0837]],
  ["kashmir", [74.7973, 34.0837]],
  ["coorg", [75.8069, 12.3375]],
  ["munnar", [77.0595, 10.0889]],
  ["alleppey", [76.3388, 9.4981]],
  ["pondicherry", [79.8083, 11.9416]],
  ["hampi", [76.46, 15.335]],
  ["khajuraho", [79.9199, 24.8318]],
  ["ranthambore", [76.5026, 26.0173]],
  ["india", [78.9629, 20.5937]],
  // ── Gujarat cities ──
  ["gujarat", [72.5780, 23.0261]],
  ["ahmedabad", [72.5780, 23.0261]],
  ["vadodara", [73.1815, 22.3099]],
  ["baroda", [73.1815, 22.3099]],
  ["surat", [72.8364, 21.2060]],
  ["rajkot", [70.8022, 22.3016]],
  ["dwarka", [68.9681, 22.2370]],
  ["somnath", [70.4013, 20.8880]],
  ["gir", [70.8123, 21.1243]],
  ["diu", [70.9834, 20.7141]],
  ["kutch", [69.6669, 23.7337]],
  ["bhuj", [69.6669, 23.7337]],
  ["junagadh", [70.4542, 21.5196]],
  ["gandhinagar", [72.6782, 23.2156]],
  ["modhera", [72.1332, 23.5830]],
  ["champaner", [73.5330, 22.4850]],
  ["mandvi", [69.3550, 22.8330]],
  ["rajpipla", [73.5800, 21.8800]],
  // ── Rajasthan cities ──
  ["rajasthan", [75.7873, 26.9124]],
  ["jaisalmer", [70.9083, 26.9157]],
  ["pushkar", [74.5511, 26.4897]],
  ["bikaner", [73.3000, 28.0229]],
  ["alwar", [76.6066, 27.5676]],
  ["bundi", [75.6418, 25.4369]],
  ["chittor", [74.6268, 24.8887]],
  ["amer", [75.8513, 26.9855]],
  // ── Islands / Beaches ──
  ["andaman", [92.7265, 11.7401]],
  ["havelock", [92.9982, 11.981]],
  ["lakshadweep", [72.1833, 10.5667]],
  // ── International ──
  ["dubai", [55.2708, 25.2048]],
  ["singapore", [103.8198, 1.3521]],
  ["bangkok", [100.5018, 13.7563]],
  ["paris", [2.3522, 48.8566]],
  ["london", [-0.1276, 51.5074]],
  ["tokyo", [139.6917, 35.6895]],
  ["bali", [115.1889, -8.4095]],
  ["phuket", [98.3923, 7.8804]],
  ["maldives", [73.2207, 3.2028]],
  ["nepal", [84.124, 28.3949]],
  ["kathmandu", [85.324, 27.7172]],
  ["colombo", [79.8612, 6.9271]],
  ["sri lanka", [80.7718, 7.8731]],
];

// Sorted by key length DESC — longest (most specific) checked first
const KNOWN_SORTED = [...KNOWN_RAW].sort((a, b) => b[0].length - a[0].length);

function findKnownCoords(text: string): [number, number] | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  for (const [key, coords] of KNOWN_SORTED) {
    if (lower === key) return coords;
  }
  for (const [key, coords] of KNOWN_SORTED) {
    if (lower.includes(key)) return coords;
  }
  const words = lower.replace(/[,\.\(\)]/g, " ").split(/\s+/).filter(w => w.length > 2);
  for (const word of words) {
    for (const [key, coords] of KNOWN_SORTED) {
      if (key === word) return coords;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// extractRawItems — pulls ALL place items from trip data
// Handles: trip.days, trip.itinerary (array), trip.itinerary.days,
// trip.hotels, trip.restaurants, trip.hiddenGems
// ─────────────────────────────────────────────────────────────────
function extractRawItems(trip: any): RawItem[] {
  if (!trip) return [];

  function resolveCoords(s: any): [number | null, number | null] {
    const nested =
      (s?.location && typeof s.location === "object" ? s.location : null) ||
      s?.geo || s?.position || s?.coords || null;
    if (nested) {
      const la = Number(nested.lat ?? nested.latitude ?? NaN);
      const lo = Number(nested.lng ?? nested.lon ?? nested.long ?? nested.longitude ?? NaN);
      if (!isNaN(la) && !isNaN(lo) && la !== 0 && lo !== 0) return [la, lo];
    }
    const la = Number(s?.lat ?? s?.latitude ?? NaN);
    const lo = Number(s?.lng ?? s?.lon ?? s?.long ?? s?.longitude ?? NaN);
    if (!isNaN(la) && !isNaN(lo) && la !== 0 && lo !== 0) return [la, lo];
    if (Array.isArray(s?.coordinates) && s.coordinates.length >= 2) {
      const glo = Number(s.coordinates[0]);
      const gla = Number(s.coordinates[1]);
      if (!isNaN(gla) && !isNaN(glo) && gla !== 0 && glo !== 0) return [gla, glo];
    }
    return [null, null];
  }

  function mapItem(s: any, i: number, dayNum: number | null, source: string): RawItem {
    const [lat, lng] = resolveCoords(s);
    const locStr = typeof s?.location === "string" ? s.location : "";
    const name = s?.name || s?.title || s?.place || s?.placeName || s?.attraction || `Stop ${i + 1}`;
    const rawType = s?.type || s?.category || s?.placeType || "";
    return {
      name, lat, lng,
      type: rawType,
      typeLabel: source === "hotel" ? "hotel" : source === "restaurant" ? "restaurant" : source === "gem" ? "hiddenGem" : getTypeLabel(rawType),
      day: dayNum,
      description: s?.description || s?.details || s?.whySpecial || "",
      time: s?.time || s?.startTime || "",
      duration: typeof s?.duration === "number" ? `${s.duration}m` : s?.duration || "",
      locationHint: locStr,
      source,
    };
  }

  const result: RawItem[] = [];

  // Try all possible paths to find the days array
  let dayArray: any[] = [];
  const itinerary = trip?.itinerary;

  if (Array.isArray(trip?.days)) {
    dayArray = trip.days;
  } else if (Array.isArray(itinerary)) {
    dayArray = itinerary;
  } else if (itinerary && typeof itinerary === "object" && Array.isArray(itinerary.days)) {
    dayArray = itinerary.days;
  } else if (Array.isArray(trip?.itinerary?.days)) {
    dayArray = trip.itinerary.days;
  } else if (Array.isArray(trip?.schedule)) {
    dayArray = trip.schedule;
  }

  for (const day of dayArray) {
    let dayNum = day?.dayNumber ?? day?.day ?? day?.dayNum ?? day?.number ?? null;
    if (typeof dayNum === "string") {
      const parsed = parseInt(dayNum.replace(/\D/g, ""), 10);
      dayNum = isNaN(parsed) ? null : parsed;
    }
    const items: any[] = day?.activities || day?.stops || day?.items || day?.places || [];
    for (let i = 0; i < items.length; i++) {
      result.push(mapItem(items[i], i, dayNum, "activity"));
    }
  }

  if (result.length === 0 && Array.isArray(trip?.stops)) {
    for (let i = 0; i < trip.stops.length; i++)
      result.push(mapItem(trip.stops[i], i, trip.stops[i]?.day ?? null, "activity"));
  }
  if (result.length === 0 && Array.isArray(trip?.places)) {
    for (let i = 0; i < trip.places.length; i++)
      result.push(mapItem(trip.places[i], i, null, "activity"));
  }

  // Also extract hotels, restaurants, hiddenGems as map points
  const hotelsSource = trip?.hotels || itinerary?.hotels || [];
  const restSource = trip?.restaurants || itinerary?.restaurants || [];
  const gemsSource = trip?.hiddenGems || itinerary?.hiddenGems || [];

  for (const h of hotelsSource) result.push(mapItem(h, 0, null, "hotel"));
  for (const r of restSource) result.push(mapItem(r, 0, null, "restaurant"));
  for (const g of gemsSource) result.push(mapItem(g, 0, null, "gem"));

  return result;
}

// Minimal inline CSS for MapLibre
const MAPLIBRE_CSS = `
.maplibregl-map{overflow:hidden;position:relative;width:100%;height:100%}
.maplibregl-canvas-container{position:absolute;top:0;left:0;width:100%;height:100%}
.maplibregl-canvas{display:block;position:absolute;left:0;top:0}
.maplibregl-missing-css{display:none}
.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{position:absolute;pointer-events:none;z-index:2}
.maplibregl-ctrl-top-left{top:0;left:0}
.maplibregl-ctrl-top-right{top:0;right:0}
.maplibregl-ctrl-bottom-left{bottom:0;left:0}
.maplibregl-ctrl-bottom-right{bottom:0;right:0}
.maplibregl-ctrl{pointer-events:auto;float:left;clear:both}
.maplibregl-ctrl-top-right .maplibregl-ctrl{float:right;clear:right}
.maplibregl-ctrl-group{background:#1f2937;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.maplibregl-ctrl-group button{background:#1f2937;border:none;border-bottom:1px solid rgba(255,255,255,.1);color:#e5e7eb;cursor:pointer;display:block;height:36px;width:36px;outline:none}
.maplibregl-ctrl-group button:last-child{border-bottom:none}
.maplibregl-ctrl-group button:hover{background:#374151}
.maplibregl-ctrl-icon{display:block;width:100%;height:100%;background-repeat:no-repeat;background-position:center;filter:invert(1) opacity(.8)}
.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29 29'%3E%3Cpath fill='%23333' d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5z'/%3E%3C/svg%3E")}
.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29 29'%3E%3Cpath fill='%23333' d='M10 13c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h9c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-9z'/%3E%3C/svg%3E")}
.maplibregl-popup{position:absolute;top:0;left:0;will-change:transform}
.maplibregl-popup-anchor-top .maplibregl-popup-tip{border-bottom-color:#fff;border-top:none}
.maplibregl-popup-anchor-bottom .maplibregl-popup-tip{border-top-color:#fff;border-bottom:none;align-self:flex-end}
.maplibregl-popup-tip{width:0;height:0;border:10px solid transparent;z-index:1}
.maplibregl-popup-content{background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 4px 20px rgba(0,0,0,.35);pointer-events:auto}
.maplibregl-popup-close-button{background:none;border:none;cursor:pointer;position:absolute;right:6px;top:4px;font-size:18px;line-height:1;color:#666;padding:0}
.maplibregl-popup-close-button:hover{color:#333}
`;

export default function TripMap({ trip }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mlRef = useRef<any>(null);
  const mapLoadedRef = useRef(false);
  const stopsRef = useRef<Stop[]>([]);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [stopsVersion, setStopsVersion] = useState(0);
  const [placedCount, setPlacedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    const id = "maplibre-css-wandr";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = MAPLIBRE_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // ── EFFECT A: extract stops + geocode ──
  useEffect(() => {
    if (!mounted) return;
    const rawItems = extractRawItems(trip);

    console.log("[TripMap] Raw items extracted:", rawItems.length, rawItems.map(r => `${r.name} (${r.type}, day=${r.day}, lat=${r.lat}, lng=${r.lng})`));

    if (rawItems.length === 0) {
      setLoading(false);
      setError(`No stops found. Keys: ${trip ? Object.keys(trip).join(", ") : "null"}`);
      return;
    }

    const placeItems = rawItems.filter(r => {
      const t = (r.type || "").toLowerCase();
      return t !== "transport" && !t.includes("transport");
    });

    console.log("[TripMap] After transport filter:", placeItems.length);

    const withCoords: RawItem[] = [];
    const needsGeo: RawItem[] = [];
    for (const r of placeItems) {
      if (r.lat !== null && r.lng !== null && !isNaN(r.lat) && !isNaN(r.lng)) {
        withCoords.push(r);
      } else {
        needsGeo.push(r);
      }
    }

    console.log("[TripMap] With coords:", withCoords.length, "Needs geo:", needsGeo.length);

    const destination =
      typeof trip?.destination === "string" ? trip.destination :
      typeof trip?.title === "string" ? trip.title : "";

    if (needsGeo.length === 0) {
      stopsRef.current = withCoords.map((r) => ({
        name: r.name, lat: r.lat!, lng: r.lng!, type: r.typeLabel || r.type,
        day: r.day ?? undefined, description: r.description,
        time: r.time, duration: r.duration,
      }));
      setPlacedCount(withCoords.length);
      setTotalCount(placeItems.length);
      setStopsVersion((v) => v + 1);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      // Pass 1: KNOWN lookup
      for (let i = 0; i < needsGeo.length; i++) {
        if (cancelled) return;
        const item = needsGeo[i];
        const known = findKnownCoords(item.locationHint || item.name);
        if (known) {
          item.lat = known[1];
          item.lng = known[0];
          console.log(`[TripMap] KNOWN match: "${item.name}" -> [${item.lat}, ${item.lng}]`);
        }
      }

      // Pass 2: Batch geocoding
      const stillMissing = needsGeo.filter((r) => r.lat === null || r.lng === null);
      if (stillMissing.length > 0 && !cancelled) {
        const BATCH_SIZE = 5;
        const totalBatches = Math.ceil(stillMissing.length / BATCH_SIZE);

        for (let b = 0; b < totalBatches; b++) {
          if (cancelled) return;
          const batch = stillMissing.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
          setGeoStatus(`Finding locations... (${b + 1}/${totalBatches})`);

          try {
            const queries = batch.map((item) => {
              const hint = item.locationHint || item.name;
              if (destination && hint.toLowerCase().includes(destination.toLowerCase())) return hint;
              return `${hint}, ${destination}`;
            });

            const res = await fetch("/api/geocode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ queries, destination }),
            });
            if (res.ok && !cancelled) {
              const { results } = (await res.json()) as { results: ([number, number] | null)[] };
              results.forEach((coords, i) => {
                if (coords) {
                  batch[i].lat = coords[1];
                  batch[i].lng = coords[0];
                  console.log(`[TripMap] Geocoded: "${batch[i].name}" -> [${coords[1]}, ${coords[0]}]`);
                } else {
                  console.warn(`[TripMap] Geocode failed: "${batch[i].name}"`);
                }
              });
            }
          } catch (e) {
            console.warn("[TripMap] geocode batch failed:", e);
          }

          if (b < totalBatches - 1) await new Promise(r => setTimeout(r, 300));
        }
      }

      if (cancelled) return;
      setGeoStatus(null);

      // Build final stops — NO destCoords fallback, skip items without real coords
      const all: Stop[] = [];
      const seenCoords = new Map<string, number>();

      const addStop = (r: RawItem) => {
        if (r.lat === null || r.lng === null || isNaN(r.lat) || isNaN(r.lng)) return;
        if (r.lat === 0 && r.lng === 0) return;

        let lat = r.lat;
        let lng = r.lng;

        const coordKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
        const existingCount = seenCoords.get(coordKey) || 0;
        seenCoords.set(coordKey, existingCount + 1);
        if (existingCount > 0) {
          lng += existingCount * 0.0003;
          lat += existingCount * 0.0002;
        }

        all.push({
          name: r.name, lat, lng,
          type: r.typeLabel || r.type,
          day: r.day ?? undefined,
          description: r.description,
          time: r.time, duration: r.duration,
        });
      };

      for (const r of withCoords) addStop(r);
      for (const r of needsGeo) addStop(r);

      console.log(`[TripMap] Final: ${all.length} placed out of ${placeItems.length} total`);
      console.log("[TripMap] Stops:", all.map(s => `${s.name} (${s.type}, day=${s.day})`));

      stopsRef.current = all;
      setPlacedCount(all.length);
      setTotalCount(placeItems.length);
      setStopsVersion((v) => v + 1);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [mounted, trip]);

  const validStops = stopsRef.current.filter(
    (s) => !isNaN(Number(s.lat)) && !isNaN(Number(s.lng))
  );
  const days = Array.from(
    new Set(stopsRef.current.map((s) => s.day).filter((d): d is number => d != null))
  ).sort((a, b) => a - b);
  const filteredStops = validStops.filter((s) => {
    if (activeDay !== null && s.day !== activeDay) return false;
    if (activeTypes.size > 0 && !activeTypes.has((s.type || "").toLowerCase())) return false;
    return true;
  });
  const allTypes = Array.from(new Set(validStops.map((s) => (s.type || "").toLowerCase())));

  const applyStops = useCallback(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
    const stops = stopsRef.current.filter((s) => !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)));
    const visible = stops.filter((s) => {
      if (activeDay !== null && s.day !== activeDay) return false;
      if (activeTypes.size > 0 && !activeTypes.has((s.type || "").toLowerCase())) return false;
      return true;
    });
    try {
      const stopsSrc = map.getSource("stops") as any;
      if (stopsSrc) {
        stopsSrc.setData({
          type: "FeatureCollection",
          features: visible.map((s, i) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [Number(s.lng), Number(s.lat)] as [number, number] },
            properties: {
              id: i, name: s.name, type: s.type, day: s.day,
              description: s.description, time: s.time, duration: s.duration,
              color: getColor(s.type || ""),
            },
          })),
        });
      }
      const routesSrc = map.getSource("routes") as any;
      if (routesSrc) {
        routesSrc.setData({
          type: "FeatureCollection",
          features: visible.length > 1
            ? visible.slice(0, -1).map((s, i) => ({
                type: "Feature" as const,
                geometry: {
                  type: "LineString" as const,
                  coordinates: [
                    [Number(s.lng), Number(s.lat)] as [number, number],
                    [Number(visible[i + 1].lng), Number(visible[i + 1].lat)] as [number, number],
                  ],
                },
                properties: { color: getColor(s.type || "") },
              }))
            : [],
        });
      }
      if (visible.length > 0) {
        const bounds = new ml.LngLatBounds();
        visible.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      }
    } catch (e) {
      console.error("[TripMap] applyStops error:", e);
    }
  }, [activeDay, activeTypes]);

  useEffect(() => {
    if (!mounted || !mapLoadedRef.current) return;
    applyStops();
  }, [stopsVersion, mounted, applyStops]);

  // ── EFFECT B: init map ONCE ──
  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    let destroyed = false;
    let loadTimeout: ReturnType<typeof setTimeout>;
    let usedFallback = false;

    const finishLoading = (errMsg?: string) => {
      clearTimeout(loadTimeout);
      if (!destroyed) {
        setLoading(false);
        if (errMsg) setError(errMsg);
      }
    };

    loadTimeout = setTimeout(() => {
      if (!destroyed) finishLoading("Map took too long to load. Refresh the page.");
    }, 20000);

    const initMap = async (style: any, isFallback: boolean) => {
      const ml = mlRef.current;
      if (!ml || destroyed || !containerRef.current) return;

      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
        mapLoadedRef.current = false;
      }

      const map = new ml.Map({
        container: containerRef.current,
        style,
        center: [78.9629, 20.5937] as [number, number],
        zoom: 4,
        pitch: 0,
        bearing: 0,
        failIfMajorPerformanceCaveat: false,
        maxParallelImageRequests: 6,
        attributionControl: false,
      });

      mapRef.current = map;

      map.once("styledata", () => {
        if (destroyed) return;
        mapLoadedRef.current = true;

        if (isFallback) {
          const canvas = map.getCanvas();
          if (canvas) canvas.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.6)";
        }

        map.resize();
        finishLoading();

        try {
          map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({
            id: "stops-circle", type: "circle", source: "stops",
            paint: {
              "circle-radius": 7,
              "circle-color": ["get", "color"],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
          map.addLayer({
            id: "stops-label", type: "symbol", source: "stops",
            layout: {
              "text-field": ["get", "name"],
              "text-size": 12,
              "text-offset": [0, 1.8],
              "text-anchor": "top",
              "text-optional": true,
            },
            paint: {
              "text-color": "#e5e7eb",
              "text-halo-color": "#000000",
              "text-halo-width": 1.5,
            },
          });
          map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({
            id: "routes-line", type: "line", source: "routes",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ["get", "color"],
              "line-width": 2.5,
              "line-opacity": 0.8,
              "line-dasharray": [2, 2],
            },
          });
          applyStops();
        } catch (layerErr) {
          console.error("[TripMap] layer setup error:", layerErr);
        }
      });

      map.on("error", (e: any) => {
        const msg: string = e?.error?.message || e?.message || "";
        console.warn("[TripMap] map error:", msg);
        if (!isFallback && !usedFallback && (msg.includes("tile") || msg.includes("fetch") || msg.includes("network") || msg.includes("403") || msg.includes("401"))) {
          usedFallback = true;
          console.warn("[TripMap] Stadia tiles failed, falling back to OSM");
          initMap(OSM_FALLBACK_STYLE, true);
          return;
        }
        if (msg.includes("WebGL") || msg.includes("Failed to initialize")) {
          finishLoading("WebGL not available. Try a different browser.");
        }
      });

      map.on("click", "stops-circle", (e: any) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const dayLabel = props.day != null ? `Day ${props.day}` : "";
        const color = props.color || "#f97316";
        const html = `
          <div style="color:#111;font-family:system-ui,sans-serif;max-width:260px;">
            <span style="display:inline-block;background:${color};color:#fff;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;margin-bottom:6px;">${dayLabel}</span>
            <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${props.name || ""}</div>
            ${props.type ? `<div style="font-size:12px;color:#666;margin-bottom:4px;">${props.type}</div>` : ""}
            ${props.time ? `<div style="font-size:12px;color:#888;">${props.time}${props.duration ? ` &middot; ${props.duration}` : ""}</div>` : ""}
            ${props.description ? `<div style="font-size:12px;color:#555;margin-top:6px;">${props.description}</div>` : ""}
          </div>`;
        new ml.Popup({ offset: 14, maxWidth: "280px" }).setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      map.on("mouseenter", "stops-circle", () => { if (map.getCanvas()) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "stops-circle", () => { if (map.getCanvas()) map.getCanvas().style.cursor = ""; });
      map.addControl(new ml.NavigationControl(), "top-right");
      map.addControl(new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "bottom-right");
    };

    (async () => {
      try {
        const mlModule = await import("maplibre-gl");
        const maplibregl = (mlModule as any).default ?? mlModule;
        if (destroyed || !containerRef.current) { clearTimeout(loadTimeout); return; }
        mlRef.current = maplibregl;
        await initMap(STADIA_DARK_STYLE, false);
      } catch (err) {
        clearTimeout(loadTimeout);
        if (!destroyed) {
          finishLoading("Failed to initialize map. Please refresh.");
          console.error("[TripMap] init error:", err);
        }
      }
    })();

    return () => {
      destroyed = true;
      clearTimeout(loadTimeout);
      if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; }
      mlRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [mounted]);

  function handleZoomIn() { mapRef.current?.easeTo({ zoom: (mapRef.current.getZoom() || 0) + 1, duration: 350 }); }
  function handleZoomOut() { mapRef.current?.easeTo({ zoom: Math.max(1, (mapRef.current.getZoom() || 0) - 1), duration: 350 }); }
  function handleResetView() {
    const map = mapRef.current; const ml = mlRef.current;
    if (!map || !ml || filteredStops.length === 0) return;
    try {
      const bounds = new ml.LngLatBounds();
      filteredStops.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
    } catch (_) {}
  }
  function handle3DToggle() {
    if (!mapRef.current) return;
    try { const p = mapRef.current.getPitch(); mapRef.current.easeTo({ pitch: p > 0 ? 0 : 60, duration: 800 }); } catch (_) {}
  }
  function handleLocate() {
    if (!mapRef.current || filteredStops.length === 0) return;
    mapRef.current.flyTo({ center: [Number(filteredStops[0].lng), Number(filteredStops[0].lat)] as [number, number], zoom: 12, duration: 1500 });
  }
  function toggleType(type: string) {
    setActiveTypes((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
  }

  if (!mounted) {
    return (
      <div className="w-full h-[560px] flex items-center justify-center bg-gray-900/50 rounded-2xl">
        <div className="text-gray-500 text-sm">Preparing map...</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${fullscreen ? "fixed inset-0 z-50" : "h-[560px]"} rounded-2xl overflow-hidden bg-gray-900`}>
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/85 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400 text-center px-6">{geoStatus}</p>
        </div>
      )}

      {loading && !geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400">Loading map...</p>
        </div>
      )}

      {error && !loading && !geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10 px-6">
          <div className="text-red-400 text-lg font-semibold mb-2">Map Error</div>
          <p className="text-gray-400 text-sm text-center max-w-xs">{error}</p>
          <button
            onClick={() => {
              setError(null); setLoading(true);
              if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; }
              mlRef.current = null; mapLoadedRef.current = false;
              stopsRef.current = []; setStopsVersion(0);
              setMounted(false); setTimeout(() => setMounted(true), 50);
            }}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !geoStatus && !error && placedCount > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full text-xs font-medium bg-black/50 backdrop-blur-md border border-white/10 text-gray-300">
          {placedCount} of {totalCount} locations mapped
        </div>
      )}

      {days.length > 1 && !loading && !geoStatus && !error && (
        <div className="absolute top-11 left-3 z-20 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveDay(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${activeDay === null ? "bg-orange-500/90 text-white border-orange-400/40" : "bg-black/30 text-gray-300 border-white/15 hover:bg-white/15"}`}
          >
            All Days
          </button>
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDay(activeDay === d ? null : d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${activeDay === d ? "bg-orange-500/90 text-white border-orange-400/40" : "bg-black/30 text-gray-300 border-white/15 hover:bg-white/15"}`}
            >
              Day {d}
            </button>
          ))}
        </div>
      )}

      {allTypes.length > 1 && !loading && !geoStatus && !error && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5 backdrop-blur-md bg-black/30 rounded-xl p-2 border border-white/10">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${activeTypes.has(t) ? "opacity-40 line-through" : "opacity-100"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(t) }} />
              <span className="text-gray-300 capitalize">{t}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && !geoStatus && !error && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          {([
            { label: "+", title: "Zoom in", fn: handleZoomIn },
            { label: "\u2212", title: "Zoom out", fn: handleZoomOut },
            { label: "3D", title: "Toggle 3D", fn: handle3DToggle },
            { label: "\uD83D\uDCCD", title: "Go to first stop", fn: handleLocate },
            { label: "\u2297", title: "Fit all stops", fn: handleResetView },
          ] as const).map(({ label, title, fn }) => (
            <button
              key={title} onClick={fn} title={title}
              className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setFullscreen(!fullscreen)} title="Toggle fullscreen"
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
          >
            {fullscreen ? "\u2715" : "\u26F6"}
          </button>
        </div>
      )}
    </div>
  );
}
