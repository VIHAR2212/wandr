"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Types ───────────────────────────────────────────────────
interface MapPoint {
  lat: number;
  lng: number;
  name: string;
  type: string;
  time?: string;
  description?: string;
  rating?: string;
  cuisine?: string;
  mustTry?: string;
  location?: string;
  area?: string;
  whySpecial?: string;
}

interface MapProps {
  trip?: any;
  userLocation?: { lat: number; lng: number };
  showRoute?: boolean;
  tripData?: any;
  isTracking?: boolean;
  onTrackingToggle?: () => void;
  userPosition?: { lat: number; lng: number } | null;
}

// ─── Constants ───────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  hotel: "#F97316",
  restaurant: "#22C55E",
  hiddenGem: "#A855F7",
  transport: "#3B82F6",
  sightseeing: "#14B8A6",
  activity: "#14B8A6",
};

const TYPE_EMOJIS: Record<string, string> = {
  hotel: "🏨",
  restaurant: "🍽️",
  hiddenGem: "✨",
  transport: "🚗",
  sightseeing: "📍",
  activity: "📍",
};

const TRANSPORT_ICONS: Record<string, string> = {
  flight: "✈️",
  train: "🚆",
  bus: "🚌",
  default: "🚗",
};

function getTransportEmoji(title?: string): string {
  if (!title) return TRANSPORT_ICONS.default;
  const t = title.toLowerCase();
  if (t.includes("flight") || t.includes("airport")) return TRANSPORT_ICONS.flight;
  if (t.includes("train") || t.includes("rail") || t.includes("metro")) return TRANSPORT_ICONS.train;
  if (t.includes("bus") || t.includes("coach")) return TRANSPORT_ICONS.bus;
  return TRANSPORT_ICONS.default;
}

// ─── SVG Icons ───────────────────────────────────────────────
const IconTerrain = () => (
  <svg className="w-[18px] h-[18px] text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m8 3 4 8 5-5 1 8H2l2-4 4 1z" />
  </svg>
);

const IconCompass = () => (
  <svg className="w-[18px] h-[18px] text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const IconLocate = () => (
  <svg className="w-[18px] h-[18px] text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
    <path d="m4.93 4.93 2.83 2.83m8.48 8.48 2.83 2.83m0-14.14-2.83 2.83M7.76 16.24l-2.83 2.83" />
  </svg>
);

const Icon3D = () => (
  <svg className="w-[18px] h-[18px] text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
    <path d="M12 12L20 7.5" />
    <path d="M12 12V21" />
    <path d="M12 12L4 7.5" />
  </svg>
);

// ─── Emoji Pin HTML ──────────────────────────────────────────
function pinHTML(emoji: string, bgColor: string, size: number = 36): string {
  return `<div style="
    width:${size}px; height:${size}px; border-radius:50%; background:${bgColor};
    display:flex; align-items:center; justify-content:center;
    font-size:${Math.round(size * 0.45)}px; border:3px solid white;
    box-shadow:0 0 0 2px rgba(0,0,0,0.15), 0 0 12px ${bgColor}60, 0 2px 8px rgba(0,0,0,0.3);
    cursor:pointer; transition:transform 0.2s;
  ">${emoji}</div>`;
}

function userPinHTML(): string {
  return `<div style="position:relative;width:46px;height:46px;">
    <div style="position:absolute;inset:-4px;border-radius:50%;background:radial-gradient(circle,rgba(255,215,0,0.35) 0%,transparent 70%);animation:mapUserPulse 2s ease-out infinite;"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FFA500);border:3px solid white;box-shadow:0 0 14px rgba(255,215,0,0.7),0 2px 8px rgba(0,0,0,0.3);z-index:2;"></div>
    <style>@keyframes mapUserPulse{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(2.4);opacity:0}}</style>
  </div>`;
}

// ─── Popup HTML ──────────────────────────────────────────────
function popupHTML(point: MapPoint): string {
  const isTransport = point.type === "transport";
  const isHotel = point.type === "hotel";
  const isRestaurant = point.type === "restaurant";
  const isGem = point.type === "hiddenGem";
  const emoji = isTransport ? getTransportEmoji(point.name) : (TYPE_EMOJIS[point.type] || "📍");
  const color = TYPE_COLORS[point.type] || "#14B8A6";

  let details = "";
  if (point.time) details += `<div style="color:#94a3b8;font-size:11px;margin-bottom:4px">${point.time}</div>`;
  if (isHotel && point.rating) details += `<div style="color:#F97316;font-size:12px;font-weight:600;margin-bottom:4px">⭐ ${point.rating}</div>`;
  if (isRestaurant) {
    let r = "";
    if (point.cuisine) r += point.cuisine;
    if (point.rating) r += (r ? " · " : "") + "⭐ " + point.rating;
    if (r) details += `<div style="color:#22C55E;font-size:12px;font-weight:600;margin-bottom:4px">${r}</div>`;
    if (point.mustTry) details += `<div style="color:#94a3b8;font-size:11px;margin-top:2px">Must try: <b style="color:#cbd5e1">${point.mustTry}</b></div>`;
  }
  if ((isHotel || isRestaurant) && (point.location || point.area)) details += `<div style="color:#94a3b8;font-size:11px;margin-bottom:4px">${point.location || point.area}</div>`;
  if (point.description) details += `<div style="color:#94a3b8;font-size:11px;line-height:1.4;margin-top:4px">${point.description.length > 120 ? point.description.substring(0, 120) + "..." : point.description}</div>`;
  if (isGem) details += `<div style="color:${color};font-size:11px;font-weight:600;margin-top:6px;display:inline-block;padding:2px 8px;border-radius:9999px;background:${color}20">✨ Hidden Gem</div>`;

  return `<div style="min-width:180px;font-family:system-ui,sans-serif;padding:2px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:18px">${emoji}</span>
      <b style="color:#e2e8f0;font-size:13px;line-height:1.2">${point.name}</b>
    </div>
    ${details}
    <div style="height:2px;border-radius:1px;background:${color};margin-top:8px;opacity:0.6"></div>
  </div>`;
}

// ─── Glass Button HTML ───────────────────────────────────────
function glassBtnHTML(svgContent: string): string {
  return `<button style="
    width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);
    box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:all 0.2s;color:rgba(255,255,255,0.9);
    padding:0;outline:none;
  " onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.transform='scale(1.1)';this.style.borderColor='rgba(255,255,255,0.3)'"
     onmouseout="this.style.background='rgba(0,0,0,0.3)';this.style.transform='scale(1)';this.style.borderColor='rgba(255,255,255,0.15)'"
  >${svgContent}</button>`;
}

function glassZoomBtnHTML(label: string): string {
  return `<button style="
    width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);
    box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:all 0.2s;color:rgba(255,255,255,0.9);
    font-size:20px;font-weight:300;padding:0;outline:none;
  " onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.transform='scale(1.05)'"
     onmouseout="this.style.background='rgba(0,0,0,0.3)';this.style.transform='scale(1)'"
  >${label}</button>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ─── MAIN COMPONENT ─────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function TripMap({
  trip, tripData, userLocation, showRoute,
  isTracking = false, onTrackingToggle, userPosition,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const trailMarkerRef = useRef<maplibregl.Marker | null>(null);
  const tripMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [routePoints, setRoutePoints] = useState<MapPoint[]>([]);
  const controlsAddedRef = useRef(false);

  const data = trip || tripData;

  // ── Dark mode ─────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ── Notification ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Extract all points ────────────────────────────────────
  const { points, activityPoints, hotelPoints, restaurantPoints, gemPoints } = useMemo(() => {
    const all: MapPoint[] = [];
    const activities: MapPoint[] = [];
    const hotels: MapPoint[] = [];
    const restaurants: MapPoint[] = [];
    const gems: MapPoint[] = [];

    (data?.days || []).forEach((day: any) => {
      (day.activities || []).forEach((act: any) => {
        if (act.lat && act.lng) {
          const p: MapPoint = { lat: act.lat, lng: act.lng, name: act.title, type: act.type || "activity", time: act.time, description: act.description };
          all.push(p); activities.push(p);
        }
      });
    });
    (data?.hotels || []).forEach((h: any) => {
      if (h.lat && h.lng) {
        const p: MapPoint = { lat: h.lat, lng: h.lng, name: h.name, type: "hotel", rating: h.rating, location: h.location || h.area };
        all.push(p); hotels.push(p);
      }
    });
    (data?.restaurants || []).forEach((r: any) => {
      if (r.lat && r.lng) {
        const p: MapPoint = { lat: r.lat, lng: r.lng, name: r.name, type: "restaurant", rating: r.rating, cuisine: r.cuisine, mustTry: r.mustTry };
        all.push(p); restaurants.push(p);
      }
    });
    (data?.hiddenGems || []).forEach((g: any) => {
      if (g.lat && g.lng) {
        const p: MapPoint = { lat: g.lat, lng: g.lng, name: g.name, type: "hiddenGem", description: g.description || g.whySpecial };
        all.push(p); gems.push(p);
      }
    });

    return { points: all, activityPoints: activities, hotelPoints: hotels, restaurantPoints: restaurants, gemPoints: gems };
  }, [data]);

  const center: [number, number] = useMemo(() => {
    if (points.length > 0) {
      return [points.reduce((s, p) => s + p.lng, 0) / points.length, points.reduce((s, p) => s + p.lat, 0) / points.length];
    }
    return [72.877, 19.076];
  }, [points]);

  const routeCoords: [number, number][] = useMemo(() => points.map((p) => [p.lng, p.lat]), [points]);
  const userPos = userPosition || userLocation || null;

  // ── Build map style ───────────────────────────────────────
  const mapStyle = useMemo(() => {
    return isDark
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  }, [isDark]);

  // ── Initialize Map ────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center,
      zoom: points.length > 1 ? 4 : 13,
      attributionControl: false,
    });

    try { (map as any).setProjection({ type: "globe" }); } catch {}

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      if (!controlsAddedRef.current) {
        controlsAddedRef.current = true;

        const toolbarEl = document.createElement("div");
        toolbarEl.style.cssText = "display:flex;flex-direction:column;gap:8px;";
        toolbarEl.innerHTML = [
          glassBtnHTML('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 1 8H2l2-4 4 1z"/></svg>'),
          glassBtnHTML('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>'),
          glassBtnHTML('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><path d="m4.93 4.93 2.83 2.83m8.48 8.48 2.83 2.83m0-14.14-2.83 2.83M7.76 16.24l-2.83 2.83"/></svg>'),
          glassBtnHTML('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"/><path d="M12 12L20 7.5"/><path d="M12 12V21"/><path d="M12 12L4 7.5"/></svg>'),
        ].join("");

        const toolbarCtrl: maplibregl.IControl = {
          onAdd() {
            const buttons = toolbarEl.querySelectorAll("button");
            if (buttons[0]) buttons[0].addEventListener("click", () => {
              const terrain = map.getTerrain();
              if (terrain) { map.setTerrain(undefined as any); }
              else { map.setTerrain({ source: "carto-dem", exaggeration: 1.5 }); }
            });
            if (buttons[1]) buttons[1].addEventListener("click", () => {
              map.easeTo({ bearing: 0, pitch: 0, duration: 800 });
            });
            if (buttons[2]) buttons[2].addEventListener("click", () => {
              navigator.geolocation?.getCurrentPosition(
                (pos) => map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14, duration: 1200 }),
                () => {},
                { enableHighAccuracy: true }
              );
            });
            if (buttons[3]) buttons[3].addEventListener("click", () => {
              map.easeTo({ pitch: map.getPitch() > 30 ? 0 : 60, duration: 800 });
            });
            return toolbarEl;
          },
          onRemove() { toolbarEl.remove(); },
        };
        map.addControl(toolbarCtrl, "top-right");

        const zoomEl = document.createElement("div");
        zoomEl.style.cssText = "display:flex;flex-direction:column;gap:4px;";
        zoomEl.innerHTML = [glassZoomBtnHTML("+"), glassZoomBtnHTML("−")].join("");

        const zoomCtrl: maplibregl.IControl = {
          onAdd() {
            const buttons = zoomEl.querySelectorAll("button");
            if (buttons[0]) buttons[0].addEventListener("click", () => map.zoomIn({ duration: 300 }));
            if (buttons[1]) buttons[1].addEventListener("click", () => map.zoomOut({ duration: 300 }));
            return zoomEl;
          },
          onRemove() { zoomEl.remove(); },
        };
        map.addControl(zoomCtrl, "bottom-right");
      }

      if (points.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        points.forEach((p) => bounds.extend([p.lng, p.lat]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1500 });
      } else if (points.length === 1) {
        map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 13, duration: 1500 });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapInstanceRef.current = null;
      controlsAddedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update style on dark mode change ──────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.getStyle()) return;
    map.setStyle(mapStyle);
    map.once("style.load", () => {
      addMarkersAndRoutes();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // ── Add markers + routes ──────────────────────────────────
  const addMarkersAndRoutes = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    tripMarkersRef.current.forEach((m) => m.remove());
    tripMarkersRef.current = [];

    ["route-glow", "route-main", "route-dots"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ["route-glow-src", "route-main-src", "route-dots-src"].forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });

    if (routeCoords.length > 1) {
      const routeGeoJSON: any = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: routeCoords },
        properties: {},
      };

      map.addSource("route-glow-src", { type: "geojson", data: routeGeoJSON });
      map.addLayer({
        id: "route-glow", type: "line", source: "route-glow-src",
        paint: { "line-color": "#6366F1", "line-width": 8, "line-opacity": 0.15 },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.addSource("route-main-src", { type: "geojson", data: routeGeoJSON });
      map.addLayer({
        id: "route-main", type: "line", source: "route-main-src",
        paint: { "line-color": "#8B5CF6", "line-width": 3, "line-opacity": 0.7, "line-dasharray": [10, 14] },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      const dotFeatures = points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { color: TYPE_COLORS[p.type] || "#14B8A6" },
      }));
      map.addSource("route-dots-src", { type: "geojson", data: { type: "FeatureCollection", features: dotFeatures } });
      map.addLayer({
        id: "route-dots", type: "circle", source: "route-dots-src",
        paint: {
          "circle-radius": 4,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-blur": 0.3,
        },
      });
    }

    activityPoints.forEach((p) => {
      const isTransport = p.type === "transport";
      const emoji = isTransport ? getTransportEmoji(p.name) : "📍";
      const bgColor = isTransport ? "#3B82F6" : "#14B8A6";
      const el = document.createElement("div");
      el.innerHTML = pinHTML(emoji, bgColor);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, closeButton: true, className: "maplibregl-popup" }).setHTML(popupHTML(p)))
        .addTo(map);
      tripMarkersRef.current.push(marker);
    });

    hotelPoints.forEach((p) => {
      const el = document.createElement("div");
      el.innerHTML = pinHTML("🏨", "#F97316");
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, closeButton: true, className: "maplibregl-popup" }).setHTML(popupHTML(p)))
        .addTo(map);
      tripMarkersRef.current.push(marker);
    });

    restaurantPoints.forEach((p) => {
      const el = document.createElement("div");
      el.innerHTML = pinHTML("🍽️", "#22C55E");
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, closeButton: true, className: "maplibregl-popup" }).setHTML(popupHTML(p)))
        .addTo(map);
      tripMarkersRef.current.push(marker);
    });

    gemPoints.forEach((p) => {
      const el = document.createElement("div");
      el.innerHTML = pinHTML("✨", "#A855F7");
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, closeButton: true, className: "maplibregl-popup" }).setHTML(popupHTML(p)))
        .addTo(map);
      tripMarkersRef.current.push(marker);
    });
  }, [points, routeCoords, activityPoints, hotelPoints, restaurantPoints, gemPoints]);

  // ── Plot markers + routes on data change ───────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!map.isStyleLoaded()) {
      map.once("style.load", () => addMarkersAndRoutes());
    } else {
      addMarkersAndRoutes();
    }

    setRoutePoints(points);

    if (points.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1500 });
    } else if (points.length === 1) {
      map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 13, duration: 1500 });
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── User location marker ──────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userPos) {
      const el = document.createElement("div");
      el.innerHTML = userPinHTML();
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userPos.lng, userPos.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="min-width:120px;font-family:system-ui,sans-serif">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:16px">👤</span>
              <b style="color:#e2e8f0">Your Location</b>
            </div>
            <div style="color:#94a3b8;font-size:11px;margin-top:4px">${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}</div>
          </div>
        `))
        .addTo(map);
    }
  }, [userPos]);

  // ── Tracking animation ────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isTracking || routePoints.length < 2 || !map || !map.isStyleLoaded()) return;

    const el = document.createElement("div");
    el.innerHTML = `<div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FFA500);border:3px solid white;box-shadow:0 0 14px rgba(255,215,0,0.7),0 2px 8px rgba(0,0,0,0.3)"></div>`;
    trailMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([routePoints[0].lng, routePoints[0].lat])
      .addTo(map);

    const sourceId = "tracking-trail";
    const layerId = "tracking-trail-line";
    const coords: [number, number][] = [[routePoints[0].lng, routePoints[0].lat]];

    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
    });
    map.addLayer({
      id: layerId, type: "line", source: sourceId,
      paint: { "line-color": "#FBBF24", "line-width": 4, "line-opacity": 0.8 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    let currentIndex = 0;
    let step = 0;
    const totalSteps = 80;
    let lastNotifiedIndex = -1;

    const animate = () => {
      if (currentIndex >= routePoints.length - 1) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (trailMarkerRef.current) { trailMarkerRef.current.remove(); trailMarkerRef.current = null; }
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        onTrackingToggle?.();
        return;
      }

      const start = routePoints[currentIndex];
      const end = routePoints[currentIndex + 1];
      const progress = step / totalSteps;
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      trailMarkerRef.current?.setLngLat([lng, lat]);
      coords.push([lng, lat]);
      (map.getSource(sourceId) as maplibregl.GeoJSONSource)?.setData({
        type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {},
      });

      if (step % 3 === 0) map.panTo([lng, lat], { animate: true, duration: 400 });

      step++;

      if (step >= totalSteps) {
        currentIndex++;
        step = 0;
        if (currentIndex !== lastNotifiedIndex && currentIndex < routePoints.length) {
          lastNotifiedIndex = currentIndex;
          const arrived = routePoints[currentIndex];
          const emoji = TYPE_EMOJIS[arrived.type] || "📍";
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Wandr Journey Update", { body: `Arrived at ${emoji} ${arrived.name}` });
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (trailMarkerRef.current) { trailMarkerRef.current.remove(); trailMarkerRef.current = null; }
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [isTracking, routePoints]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border/30">
      <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />

      <div
        className={`absolute bottom-4 left-4 z-10 p-3.5 rounded-2xl border text-xs space-y-2.5 shadow-lg backdrop-blur-xl transition-colors duration-300 ${
          isDark ? "bg-black/50 border-white/10 text-white" : "bg-white/90 border-gray-200/60 text-gray-700"
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-400">
          Map Legend
        </p>
        <LegendRow emoji="✈️" label="Transport" bg="#3B82F6" />
        <LegendRow emoji="🏨" label="Hotels" bg="#F97316" />
        <LegendRow emoji="🍽️" label="Restaurants" bg="#22C55E" />
        <LegendRow emoji="✨" label="Hidden Gems" bg="#A855F7" />
        <LegendRow emoji="📍" label="Attractions" bg="#14B8A6" />

        {userPos && (
          <div className={`flex items-center gap-2.5 mt-2.5 pt-2.5 border-t ${isDark ? "border-white/10" : "border-gray-200/60"}`}>
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[14px]"
              style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 10px rgba(255,215,0,0.5)" }}
            >
              👤
            </span>
            <span className="text-amber-500 font-bold">Your Location</span>
          </div>
        )}

        {isTracking && (
          <div className="flex items-center gap-2 text-green-400 font-bold mt-2.5 pt-2.5 border-t border-white/10 animate-pulse">
            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />
            Live Tracking Active
          </div>
        )}
      </div>

      <div
        className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md border shadow-sm transition-all duration-500 ${
          isDark ? "bg-white/5 border-white/10 text-white/50" : "bg-black/5 border-black/10 text-black/50"
        }`}
      >
        🌍 Zoom out for Globe View
      </div>
    </div>
  );
}

function LegendRow({ emoji, label, bg }: { emoji: string; label: string; bg: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] shadow-sm"
        style={{ background: bg, boxShadow: `0 2px 8px ${bg}40` }}
      >
        {emoji}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
