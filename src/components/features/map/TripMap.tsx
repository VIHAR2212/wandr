"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
  useMap,
} from "@/components/ui/map";
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

// ─── Globe Styles ────────────────────────────────────────────
const DARK_GLOBE_STYLE: string =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_GLOBE_STYLE: string =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// ─── Inner: Viewport Fitter ──────────────────────────────────
function ViewportFitter({ points }: { points: MapPoint[] }) {
  const { map, isLoaded } = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!isLoaded || !map || points.length === 0 || fitted.current) return;
    if (points.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1500 });
    } else {
      map.easeTo({
        center: [points[0].lng, points[0].lat],
        zoom: 13,
        duration: 1500,
      });
    }
    fitted.current = true;
  }, [isLoaded, map, points]);

  return null;
}

// ─── Inner: Globe Atmosphere + Stars ─────────────────────────
function GlobeEffects({ isDark }: { isDark: boolean }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;
    map.setFog({
      color: isDark ? "rgb(16, 24, 42)" : "rgb(186, 210, 235)",
      "high-color": isDark ? "rgb(40, 60, 120)" : "rgb(36, 92, 223)",
      "horizon-blend": 0.02,
      "space-color": isDark ? "rgb(5, 5, 15)" : "rgb(11, 11, 25)",
      "star-intensity": isDark ? 0.8 : 0.6,
    });
  }, [isLoaded, map, isDark]);

  return null;
}

// ─── Inner: Custom Glassmorphic Toolbar ──────────────────────
function GlassToolbar({
  onLocate,
}: {
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
}) {
  const { map, isLoaded } = useMap();

  const handleTerrain = useCallback(() => {
    if (!map || !isLoaded) return;
    const terrain = map.getTerrain();
    if (terrain) {
      map.setTerrain(undefined as any);
    } else {
      map.setTerrain({ source: "carto-dem", exaggeration: 1.5 });
    }
  }, [map, isLoaded]);

  const handleCompass = useCallback(() => {
    if (!map || !isLoaded) return;
    map.easeTo({ bearing: 0, pitch: 0, duration: 800 });
  }, [map, isLoaded]);

  const handleLocate = useCallback(() => {
    if (!map || !isLoaded) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.easeTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1200,
        });
        onLocate?.({
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, [map, isLoaded, onLocate]);

  const handle3D = useCallback(() => {
    if (!map || !isLoaded) return;
    const current = map.getPitch();
    map.easeTo({ pitch: current > 30 ? 0 : 60, duration: 800 });
  }, [map, isLoaded]);

  const btnBase =
    "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 backdrop-blur-md border border-white/15 shadow-lg hover:scale-110 hover:border-white/30 active:scale-95";
  const iconClass = "w-[18px] h-[18px] text-white/90";

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      {/* Terrain toggle */}
      <button
        onClick={handleTerrain}
        className={`${btnBase} bg-black/30`}
        title="Toggle terrain"
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m8 3 4 8 5-5 1 8H2l2-4 4 1z" />
        </svg>
      </button>

      {/* Compass / Reset North */}
      <button
        onClick={handleCompass}
        className={`${btnBase} bg-black/30`}
        title="Reset compass"
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      </button>

      {/* Locate me */}
      <button
        onClick={handleLocate}
        className={`${btnBase} bg-black/30`}
        title="My location"
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          <path d="m4.93 4.93 2.83 2.83m8.48 8.48 2.83 2.83m0-14.14-2.83 2.83M7.76 16.24l-2.83 2.83" />
        </svg>
      </button>

      {/* 3D tilt toggle */}
      <button
        onClick={handle3D}
        className={`${btnBase} bg-black/30`}
        title="Toggle 3D view"
      >
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
          <path d="M12 12L20 7.5" />
          <path d="M12 12V21" />
          <path d="M12 12L4 7.5" />
        </svg>
      </button>
    </div>
  );
}

// ─── Inner: Custom Glassmorphic Zoom ─────────────────────────
function GlassZoom() {
  const { map, isLoaded } = useMap();

  return (
    <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-1">
      <button
        onClick={() => isLoaded && map?.zoomIn({ duration: 300 })}
        className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 backdrop-blur-md bg-black/30 border border-white/15 shadow-lg hover:scale-105 hover:border-white/30 active:scale-95 text-white/90 text-xl font-light"
      >
        +
      </button>
      <button
        onClick={() => isLoaded && map?.zoomOut({ duration: 300 })}
        className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 backdrop-blur-md bg-black/30 border border-white/15 shadow-lg hover:scale-105 hover:border-white/30 active:scale-95 text-white/90 text-xl font-light"
      >
        −
      </button>
    </div>
  );
}

// ─── Inner: User Location Marker ─────────────────────────────
function UserLocationMarker({
  position,
}: {
  position: { lat: number; lng: number } | null;
}) {
  const { map, isLoaded } = useMap();
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!isLoaded || !map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (position) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="position:relative; width:46px; height:46px;">
          <div style="
            position:absolute; inset:-4px; border-radius:50%;
            background: radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%);
            animation: mapUserPulse 2s ease-out infinite;
          "></div>
          <div style="
            position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
            width:22px; height:22px; border-radius:50%;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border:3px solid white;
            box-shadow: 0 0 14px rgba(255,215,0,0.7), 0 2px 8px rgba(0,0,0,0.3);
            z-index:2;
          "></div>
          <style>
            @keyframes mapUserPulse {
              0% { transform:scale(0.8); opacity:0.8; }
              100% { transform:scale(2.4); opacity:0; }
            }
          </style>
        </div>
      `;

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
            <div style="min-width:120px; font-family:system-ui,sans-serif;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">👤</span>
                <b style="color:#e2e8f0;">Your Location</b>
              </div>
              <div style="color:#94a3b8; font-size:11px; margin-top:4px;">
                ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}
              </div>
            </div>
          `)
        )
        .addTo(map);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [isLoaded, map, position]);

  return null;
}

// ─── Inner: Tracking Animator ────────────────────────────────
function TrackingAnimator({
  routePoints,
  onTrackingToggle,
}: {
  routePoints: MapPoint[];
  onTrackingToggle?: () => void;
}) {
  const { map, isLoaded } = useMap();
  const animFrameRef = useRef<number | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!isLoaded || !map || routePoints.length < 2) return;

    const el = document.createElement("div");
    el.innerHTML = `
      <div style="
        width:22px; height:22px; border-radius:50%;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        border:3px solid white;
        box-shadow: 0 0 14px rgba(255,215,0,0.7), 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `;
    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([routePoints[0].lng, routePoints[0].lat])
      .addTo(map);

    const sourceId = "tracking-trail";
    const layerId = "tracking-trail-line";

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [[routePoints[0].lng, routePoints[0].lat]],
        },
        properties: {},
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#FBBF24",
        "line-width": 4,
        "line-opacity": 0.8,
        "line-cap": "round",
        "line-join": "round",
      },
    });

    let currentIndex = 0;
    let step = 0;
    const totalSteps = 80;
    let lastNotifiedIndex = -1;
    const coords: [number, number][] = [
      [routePoints[0].lng, routePoints[0].lat],
    ];

    const animate = () => {
      if (currentIndex >= routePoints.length - 1) {
        cleanup();
        onTrackingToggle?.();
        return;
      }

      const start = routePoints[currentIndex];
      const end = routePoints[currentIndex + 1];
      const progress = step / totalSteps;
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      markerRef.current?.setLngLat([lng, lat]);
      coords.push([lng, lat]);

      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      source?.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      });

      if (step % 3 === 0) {
        map.panTo([lng, lat], { animate: true, duration: 400 });
      }

      step++;

      if (step >= totalSteps) {
        currentIndex++;
        step = 0;
        if (currentIndex !== lastNotifiedIndex && currentIndex < routePoints.length) {
          lastNotifiedIndex = currentIndex;
          const arrived = routePoints[currentIndex];
          const emoji = TYPE_EMOJIS[arrived.type] || "📍";
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Wandr Journey Update", {
              body: `Arrived at ${emoji} ${arrived.name}`,
            });
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    const cleanup = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };

    return cleanup;
  }, [isLoaded, map, routePoints, onTrackingToggle]);

  return null;
}

// ─── Popup content renderer ──────────────────────────────────
function PopupCard({ point }: { point: MapPoint }) {
  const isTransport = point.type === "transport";
  const isHotel = point.type === "hotel";
  const isRestaurant = point.type === "restaurant";
  const isGem = point.type === "hiddenGem";
  const emoji = isTransport
    ? getTransportEmoji(point.name)
    : TYPE_EMOJIS[point.type] || "📍";
  const color = TYPE_COLORS[point.type] || "#14B8A6";

  return (
    <div
      style={{
        minWidth: 180,
        fontFamily: "system-ui, sans-serif",
        padding: "2px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <b style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.2 }}>
          {point.name}
        </b>
      </div>

      {/* Time */}
      {point.time && (
        <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>
          {point.time}
        </div>
      )}

      {/* Hotel rating */}
      {isHotel && point.rating && (
        <div
          style={{ color: "#F97316", fontSize: 12, fontWeight: 600, marginBottom: 4 }}
        >
          ⭐ {point.rating}
        </div>
      )}

      {/* Restaurant details */}
      {isRestaurant && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#22C55E", fontSize: 12, fontWeight: 600 }}>
            {point.cuisine ? `${point.cuisine} · ` : ""}
            {point.rating ? `⭐ ${point.rating}` : ""}
          </span>
          {point.mustTry && (
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
              Must try: <b style={{ color: "#cbd5e1" }}>{point.mustTry}</b>
            </div>
          )}
        </div>
      )}

      {/* Hotel/Restaurant location */}
      {(isHotel || isRestaurant) && (point.location || point.area) && (
        <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>
          {point.location || point.area}
        </div>
      )}

      {/* Description */}
      {point.description && (
        <div
          style={{
            color: "#94a3b8",
            fontSize: 11,
            lineHeight: 1.4,
            marginTop: 4,
          }}
        >
          {point.description.length > 120
            ? point.description.substring(0, 120) + "..."
            : point.description}
        </div>
      )}

      {/* Hidden gem badge */}
      {isGem && (
        <div
          style={{
            color: color,
            fontSize: 11,
            fontWeight: 600,
            marginTop: 6,
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 9999,
            background: `${color}20`,
          }}
        >
          ✨ Hidden Gem
        </div>
      )}

      {/* Type color bar */}
      <div
        style={{
          height: 2,
          borderRadius: 1,
          background: color,
          marginTop: 8,
          opacity: 0.6,
        }}
      />
    </div>
  );
}

// ─── Marker Pin Component ────────────────────────────────────
function EmojiPin({
  emoji,
  bgColor,
  size = 36,
}: {
  emoji: string;
  bgColor: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.45),
        border: "3px solid white",
        boxShadow: `0 0 0 2px rgba(0,0,0,0.15), 0 0 12px ${bgColor}60, 0 2px 8px rgba(0,0,0,0.3)`,
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
      }}
    >
      {emoji}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ─── MAIN COMPONENT ─────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function TripMap({
  trip,
  tripData,
  userLocation,
  showRoute,
  isTracking = false,
  onTrackingToggle,
  userPosition,
}: MapProps) {
  const data = trip || tripData;
  const [isDark, setIsDark] = useState(false);
  const [locatedUser, setLocatedUser] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ── Dark mode detection ──────────────────────────────────
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // ── Notification permission ──────────────────────────────
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // ── Extract all points ───────────────────────────────────
  const {
    points,
    activityPoints,
    hotelPoints,
    restaurantPoints,
    gemPoints,
  } = useMemo(() => {
    const all: MapPoint[] = [];
    const activities: MapPoint[] = [];
    const hotels: MapPoint[] = [];
    const restaurants: MapPoint[] = [];
    const gems: MapPoint[] = [];

    (data?.days || []).forEach((day: any) => {
      (day.activities || []).forEach((act: any) => {
        if (act.lat && act.lng) {
          const p: MapPoint = {
            lat: act.lat,
            lng: act.lng,
            name: act.title,
            type: act.type || "activity",
            time: act.time,
            description: act.description,
          };
          all.push(p);
          activities.push(p);
        }
      });
    });

    (data?.hotels || []).forEach((h: any) => {
      if (h.lat && h.lng) {
        const p: MapPoint = {
          lat: h.lat,
          lng: h.lng,
          name: h.name,
          type: "hotel",
          rating: h.rating,
          location: h.location || h.area,
        };
        all.push(p);
        hotels.push(p);
      }
    });

    (data?.restaurants || []).forEach((r: any) => {
      if (r.lat && r.lng) {
        const p: MapPoint = {
          lat: r.lat,
          lng: r.lng,
          name: r.name,
          type: "restaurant",
          rating: r.rating,
          cuisine: r.cuisine,
          mustTry: r.mustTry,
        };
        all.push(p);
        restaurants.push(p);
      }
    });

    (data?.hiddenGems || []).forEach((g: any) => {
      if (g.lat && g.lng) {
        const p: MapPoint = {
          lat: g.lat,
          lng: g.lng,
          name: g.name,
          type: "hiddenGem",
          description: g.description || g.whySpecial,
        };
        all.push(p);
        gems.push(p);
      }
    });

    return {
      points: all,
      activityPoints: activities,
      hotelPoints: hotels,
      restaurantPoints: restaurants,
      gemPoints: gems,
    };
  }, [data]);

  // ── Center / zoom defaults ───────────────────────────────
  const center: [number, number] = useMemo(() => {
    if (points.length > 0) {
      const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
      const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
      return [avgLng, avgLat];
    }
    return [72.877, 19.076];
  }, [points]);

  const routeCoords: [number, number][] = useMemo(
    () => points.map((p) => [p.lng, p.lat]),
    [points]
  );

  const userPos = userPosition || userLocation || locatedUser || null;

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border/30">
      <Map
        center={center}
        zoom={points.length > 1 ? 4 : 13}
        projection={{ type: "globe" }}
        styles={{
          dark: DARK_GLOBE_STYLE,
          light: LIGHT_GLOBE_STYLE,
        }}
        className="w-full h-full"
      >
        {/* Globe atmosphere glow + star field */}
        <GlobeEffects isDark={isDark} />

        {/* Auto-fit to all points on load */}
        <ViewportFitter points={points} />

        {/* ── Glassmorphic Toolbar (top-right) ── */}
        <GlassToolbar
          onLocate={(coords) =>
            setLocatedUser({ lat: coords.latitude, lng: coords.longitude })
          }
        />

        {/* ── Glassmorphic Zoom (bottom-right) ── */}
        <GlassZoom />

        {/* ── Route lines ── */}
        {routeCoords.length > 1 && (
          <>
            {/* Outer glow */}
            <MapRoute
              coordinates={routeCoords}
              color="#6366F1"
              width={8}
              opacity={0.15}
            />
            {/* Main dashed route */}
            <MapRoute
              coordinates={routeCoords}
              color="#8B5CF6"
              width={3}
              opacity={0.7}
              dashArray={[10, 14]}
            />
          </>
        )}

        {/* ── Activity Markers ── */}
        {activityPoints.map((p, i) => {
          const isTransport = p.type === "transport";
          const emoji = isTransport ? getTransportEmoji(p.name) : "📍";
          const bgColor = isTransport ? "#3B82F6" : "#14B8A6";

          return (
            <MapMarker key={`act-${i}`} longitude={p.lng} latitude={p.lat}>
              <MarkerContent>
                <EmojiPin emoji={emoji} bgColor={bgColor} />
              </MarkerContent>
              <MarkerPopup>
                <PopupCard point={p} />
              </MarkerPopup>
            </MapMarker>
          );
        })}

        {/* ── Hotel Markers ── */}
        {hotelPoints.map((p, i) => (
          <MapMarker key={`hotel-${i}`} longitude={p.lng} latitude={p.lat}>
            <MarkerContent>
              <EmojiPin emoji="🏨" bgColor="#F97316" />
            </MarkerContent>
            <MarkerPopup>
              <PopupCard point={p} />
            </MarkerPopup>
          </MapMarker>
        ))}

        {/* ── Restaurant Markers ── */}
        {restaurantPoints.map((p, i) => (
          <MapMarker key={`rest-${i}`} longitude={p.lng} latitude={p.lat}>
            <MarkerContent>
              <EmojiPin emoji="🍽️" bgColor="#22C55E" />
            </MarkerContent>
            <MarkerPopup>
              <PopupCard point={p} />
            </MarkerPopup>
          </MapMarker>
        ))}

        {/* ── Hidden Gem Markers ── */}
        {gemPoints.map((p, i) => (
          <MapMarker key={`gem-${i}`} longitude={p.lng} latitude={p.lat}>
            <MarkerContent>
              <EmojiPin emoji="✨" bgColor="#A855F7" />
            </MarkerContent>
            <MarkerPopup>
              <PopupCard point={p} />
            </MarkerPopup>
          </MapMarker>
        ))}

        {/* ── User Location Marker ── */}
        {userPos && <UserLocationMarker position={userPos} />}

        {/* ── Tracking Animation ── */}
        {isTracking && (
          <TrackingAnimator
            routePoints={points}
            onTrackingToggle={onTrackingToggle}
          />
        )}
      </Map>

      {/* ── Legend (bottom-left) ── */}
      <div
        className={`absolute bottom-4 left-4 z-10 p-3.5 rounded-2xl border text-xs space-y-2.5 shadow-lg backdrop-blur-xl transition-colors duration-300 ${
          isDark
            ? "bg-black/50 border-white/10 text-white"
            : "bg-white/90 border-gray-200/60 text-gray-700"
        }`}
      >
        <p
          className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
            isDark ? "text-gray-400" : "text-gray-400"
          }`}
        >
          Map Legend
        </p>

        <LegendRow emoji="✈️" label="Transport" bg="#3B82F6" />
        <LegendRow emoji="🏨" label="Hotels" bg="#F97316" />
        <LegendRow emoji="🍽️" label="Restaurants" bg="#22C55E" />
        <LegendRow emoji="✨" label="Hidden Gems" bg="#A855F7" />
        <LegendRow emoji="📍" label="Attractions" bg="#14B8A6" />

        {userPos && (
          <div
            className={`flex items-center gap-2.5 mt-2.5 pt-2.5 border-t ${
              isDark ? "border-white/10" : "border-gray-200/60"
            }`}
          >
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[14px]"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                boxShadow: "0 0 10px rgba(255,215,0,0.5)",
              }}
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

      {/* ── Globe hint badge ── */}
      <div
        className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md border shadow-sm transition-all duration-500 ${
          isDark
            ? "bg-white/5 border-white/10 text-white/50"
            : "bg-black/5 border-black/10 text-black/50"
        }`}
      >
        🌍 Zoom out for Globe View
      </div>
    </div>
  );
}

// ─── Legend Row ───────────────────────────────────────────────
function LegendRow({
  emoji,
  label,
  bg,
}: {
  emoji: string;
  label: string;
  bg: string;
}) {
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
