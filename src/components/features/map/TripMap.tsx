"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Types ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TripStop = {
  id?: string;
  day?: number;
  name?: string;
  type?: string;
  description?: string;
  emoji?: string;
  coordinates?: [number, number];
  time?: string;
  cost?: number;
  rating?: number;
  tips?: string;
  [key: string]: any;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TripMapProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trip: any;
  isDark?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  transport: "#3b82f6",
  hotel: "#f97316",
  restaurant: "#22c55e",
  attraction: "#14b8a6",
  hidden_gem: "#a855f7",
  activity: "#ec4899",
  shopping: "#eab308",
  default: "#6b7280",
};

const TYPE_EMOJIS: Record<string, string> = {
  transport: "🚗",
  hotel: "🏨",
  restaurant: "🍽️",
  attraction: "📍",
  hidden_gem: "💎",
  activity: "🎯",
  shopping: "🛍️",
  default: "📌",
};

const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// ─── Glass Button ────────────────────────────────────────────────────────────
function GlassButton({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200 cursor-pointer text-lg"
    >
      {children}
    </button>
  );
}

// ─── Helper: extract stops from any trip shape ───────────────────────────────
function extractStops(trip: any): TripStop[] {
  if (!trip) return [];
  // Direct stops array
  if (Array.isArray(trip.stops)) return trip.stops;
  // Nested in itinerary
  if (Array.isArray(trip.itinerary)) {
    const result: TripStop[] = [];
    trip.itinerary.forEach((day: any, dayIdx: number) => {
      if (Array.isArray(day.stops)) {
        day.stops.forEach((s: any, i: number) => {
          result.push({
            id: s.id || `stop-${dayIdx}-${i}`,
            day: s.day || dayIdx + 1,
            name: s.name || s.location || s.place || "Unknown",
            type: s.type || s.category || "default",
            description: s.description || s.details,
            emoji: s.emoji,
            coordinates: s.coordinates || s.location_coords,
            time: s.time,
            cost: s.cost || s.price,
            rating: s.rating,
            tips: s.tips,
          });
        });
      }
    });
    return result;
  }
  return [];
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TripMap({ trip, isDark = true }: TripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const tripMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [showGlobeBadge, setShowGlobeBadge] = useState(true);
  const [terrainEnabled, setTerrainEnabled] = useState(false);
  const [compassDeg, setCompassDeg] = useState(0);

  const allStops = extractStops(trip);
  const stopsWithCoords = allStops.filter(
    (s) => s.coordinates && s.coordinates.length === 2
  );

  // ─── Build GeoJSON route ───────────────────────────────────────────────
  const buildRouteGeoJSON = useCallback(() => {
    const coords = stopsWithCoords.map(
      (s) => s.coordinates as [number, number]
    );
    if (coords.length < 2) return null;
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: coords,
          },
        },
      ],
    };
  }, [stopsWithCoords]);

  // ─── Initialize Map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current) return;

    const container = mapContainer.current;
    const rect = container.getBoundingClientRect();
    if (rect.height < 10) {
      container.style.height = "500px";
    }

    const map = new maplibregl.Map({
      container,
      style: isDark ? DARK_STYLE : LIGHT_STYLE,
      center: [74.0, 15.0],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    // Globe projection — must be AFTER map creation
    (map as any).setProjection({ type: "globe" });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("error", (e: any) => {
      console.error("MapLibre error:", e.error || e);
    });

    map.on("style.load", () => {
      console.log("MapLibre style loaded successfully");
    });

    map.on("load", () => {
      console.log("MapLibre map loaded");

      const routeGeoJSON = buildRouteGeoJSON();
      if (routeGeoJSON) {
        // Glow line
        map.addSource("route-glow", {
          type: "geojson",
          data: routeGeoJSON,
        });
        map.addLayer({
          id: "route-glow-layer",
          type: "line",
          source: "route-glow",
          paint: {
            "line-color": "#f97316",
            "line-width": 12,
            "line-opacity": 0.15,
            "line-blur": 8,
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        });

        // Main route line
        map.addSource("route-main", {
          type: "geojson",
          data: routeGeoJSON,
        });
        map.addLayer({
          id: "route-main-layer",
          type: "line",
          source: "route-main",
          paint: {
            "line-color": "#f97316",
            "line-width": 3,
            "line-opacity": 0.9,
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        });

        // Dashed line
        map.addSource("route-dash", {
          type: "geojson",
          data: routeGeoJSON,
        });
        map.addLayer({
          id: "route-dash-layer",
          type: "line",
          source: "route-dash",
          paint: {
            "line-color": "#fbbf24",
            "line-width": 2,
            "line-opacity": 0.6,
            "line-dasharray": [0, 4, 3],
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        });

        // Dots
        if (stopsWithCoords.length > 1) {
          const dotFeatures = stopsWithCoords.map((stop, i) => ({
            type: "Feature" as const,
            properties: { index: i },
            geometry: {
              type: "Point" as const,
              coordinates: stop.coordinates as [number, number],
            },
          }));
          map.addSource("route-dots", {
            type: "geojson",
            data: { type: "FeatureCollection" as const, features: dotFeatures },
          });
          map.addLayer({
            id: "route-dots-layer",
            type: "circle",
            source: "route-dots",
            paint: {
              "circle-radius": 4,
              "circle-color": "#fff",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#f97316",
            },
          });
        }
      }

      // ── Add stop markers ───────────────────────────────────────────
      tripMarkersRef.current.forEach((m) => m.remove());
      tripMarkersRef.current = [];

      stopsWithCoords.forEach((stop) => {
        const color = TYPE_COLORS[stop.type?.toLowerCase()] || TYPE_COLORS.default;
        const emoji = stop.emoji || TYPE_EMOJIS[stop.type?.toLowerCase()] || "📍";

        const el = document.createElement("div");
        el.style.cssText = `
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          background: ${color}; border: 2.5px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
          font-size: 18px; cursor: pointer; transition: transform 0.2s;
        `;
        el.textContent = emoji;
        el.addEventListener("mouseenter", () => (el.style.transform = "scale(1.2)"));
        el.addEventListener("mouseleave", () => (el.style.transform = "scale(1)"));

        const popup = new maplibregl.Popup({
          offset: 15,
          closeButton: true,
          className: "maplibre-popup-custom",
          maxWidth: "260px",
        }).setHTML(`
          <div style="font-family:system-ui,sans-serif;padding:4px 0;">
            <div style="font-size:14px;font-weight:700;color:#111;">${stop.name || "Stop"}</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">
              Day ${stop.day || 1} ${stop.time ? "• " + stop.time : ""} ${stop.type ? "• " + stop.type : ""}
            </div>
            ${stop.description ? `<div style="font-size:12px;color:#444;margin-top:6px;line-height:1.4;">${stop.description}</div>` : ""}
            ${stop.cost ? `<div style="font-size:12px;color:#f97316;margin-top:4px;font-weight:600;">₹${Number(stop.cost).toLocaleString()}</div>` : ""}
            ${stop.rating ? `<div style="font-size:12px;color:#eab308;margin-top:2px;">★ ${stop.rating}/5</div>` : ""}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(stop.coordinates as [number, number])
          .setPopup(popup)
          .addTo(map);

        tripMarkersRef.current.push(marker);
      });

      // ── Fit bounds ─────────────────────────────────────────────────
      if (stopsWithCoords.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        stopsWithCoords.forEach((s) =>
          bounds.extend(s.coordinates as [number, number])
        );
        map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 60, right: 60 }, maxZoom: 12, duration: 1500 });
      }

      map.on("zoomend", () => {
        setShowGlobeBadge(map.getZoom() < 3.5);
      });

      map.on("rotateend", () => {
        setCompassDeg(map.getBearing());
      });
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      tripMarkersRef.current.forEach((m) => m.remove());
      tripMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [trip, isDark, buildRouteGeoJSON, stopsWithCoords]);

  // ─── Toolbar Actions ───────────────────────────────────────────────────
  const handleResetNorth = () => {
    if (mapRef.current) {
      mapRef.current.easeTo({ bearing: 0, duration: 500 });
      setCompassDeg(0);
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.easeTo({ zoom: (mapRef.current.getZoom() || 4) + 1.5, duration: 400 });
  };

  const handleZoomOut = () => {
    mapRef.current?.easeTo({ zoom: Math.max(1, (mapRef.current.getZoom() || 4) - 1.5), duration: 400 });
  };

  const handleLocate = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        mapRef.current!.flyTo({ center: [longitude, latitude], zoom: 13, duration: 1500 });
        const pulseEl = document.createElement("div");
        pulseEl.style.cssText = `
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(59,130,246,0.3); border: 3px solid #3b82f6;
          box-shadow: 0 0 12px rgba(59,130,246,0.5);
          animation: pulse-ring 2s ease-out infinite;
        `;
        new maplibregl.Marker({ element: pulseEl, anchor: "center" })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current!);
      },
      () => {}
    );
  };

  const handle3DTilt = () => {
    if (!mapRef.current) return;
    const currentPitch = mapRef.current.getPitch();
    mapRef.current.easeTo({ pitch: currentPitch > 10 ? 0 : 60, duration: 800 });
  };

  const handleTerrain = () => {
    if (!mapRef.current) return;
    setTerrainEnabled((prev) => {
      const next = !prev;
      try {
        if (next) {
          mapRef.current!.addSource("terrain-source", {
            type: "raster-dem",
            url: "https://demotiles.maplibre.org/terrain-tiles.json",
            tileSize: 256,
          });
          mapRef.current!.setTerrain({ source: "terrain-source", exaggeration: 1.5 });
        } else {
          mapRef.current!.setTerrain(null as any);
          const src = mapRef.current!.getSource("terrain-source");
          if (src) mapRef.current!.removeSource("terrain-source");
        }
      } catch (e) {
        console.error("Terrain error:", e);
      }
      return next;
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full" style={{ height: "520px", minHeight: "400px" }}>
      <div
        ref={mapContainer}
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{ width: "100%", height: "100%" }}
      />

      {showGlobeBadge && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full backdrop-blur-md bg-black/30 border border-white/15 text-white/70 text-xs font-medium pointer-events-none">
          🌍 ZOOM OUT FOR GLOBE VIEW
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <GlassButton onClick={handleTerrain} title="Toggle Terrain">
          {terrainEnabled ? "⛰️" : "🏔️"}
        </GlassButton>
        <GlassButton onClick={handleResetNorth} title="Reset North">
          <span
            className="inline-block transition-transform duration-300"
            style={{ transform: `rotate(${-compassDeg}deg)` }}
          >
            🧭
          </span>
        </GlassButton>
        <GlassButton onClick={handleLocate} title="My Location">
          📍
        </GlassButton>
        <GlassButton onClick={handle3DTilt} title="Toggle 3D Tilt">
          🗼
        </GlassButton>
        <div className="w-10 h-px bg-white/10" />
        <GlassButton onClick={handleZoomIn} title="Zoom In">
          +
        </GlassButton>
        <GlassButton onClick={handleZoomOut} title="Zoom Out">
          −
        </GlassButton>
      </div>

      <div className="absolute bottom-3 left-3 z-10 p-3 rounded-2xl backdrop-blur-md bg-black/30 border border-white/15">
        <div className="text-white/90 text-xs font-semibold mb-2 tracking-wide uppercase">
          MAP LEGEND
        </div>
        <div className="space-y-1.5">
          {[
            { label: "Transport", color: TYPE_COLORS.transport },
            { label: "Hotels", color: TYPE_COLORS.hotel },
            { label: "Restaurants", color: TYPE_COLORS.restaurant },
            { label: "Hidden Gems", color: TYPE_COLORS.hidden_gem },
            { label: "Attractions", color: TYPE_COLORS.attraction },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-white/70 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .maplibre-popup-custom .maplibregl-popup-content {
          border-radius: 12px !important;
          padding: 10px 14px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .maplibre-popup-custom .maplibregl-popup-tip {
          display: none;
        }
      `}</style>
    </div>
  );
}
