"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ───────────────────────────────────────────────────────────────────
interface TripStop {
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
}

interface TripMapProps {
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

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const LEGEND_ITEMS = [
  { label: "Transport", key: "transport", color: "#3b82f6", emoji: "🚗" },
  { label: "Hotels", key: "hotel", color: "#f97316", emoji: "🏨" },
  { label: "Restaurants", key: "restaurant", color: "#22c55e", emoji: "🍽️" },
  { label: "Hidden Gems", key: "hidden_gem", color: "#a855f7", emoji: "💎" },
  { label: "Attractions", key: "attraction", color: "#14b8a6", emoji: "📍" },
  { label: "Activities", key: "activity", color: "#ec4899", emoji: "🎯" },
  { label: "Shopping", key: "shopping", color: "#eab308", emoji: "🛍️" },
];

// ─── Glass Button ────────────────────────────────────────────────────────────
function GlassBtn({ onClick, children, title, size = "md" }: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
  return (
    <button
      onClick={onClick}
      title={title}
      className={`${sz} flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200 cursor-pointer select-none`}
    >
      {children}
    </button>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function Tooltip({ text, visible, x, y }: { text: string; visible: boolean; x: number; y: number }) {
  if (!visible) return null;
  return (
    <div
      className="fixed z-[999] px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] font-medium pointer-events-none whitespace-nowrap backdrop-blur-sm border border-white/10"
      style={{ left: x + 12, top: y - 10 }}
    >
      {text}
    </div>
  );
}

// ─── Extract stops from any trip shape ────────────────────────────────────────
function extractStops(trip: any): TripStop[] {
  if (!trip) return [];
  if (Array.isArray(trip.stops)) return trip.stops;
  if (Array.isArray(trip.itinerary)) {
    const result: TripStop[] = [];
    trip.itinerary.forEach(function (day: any, dayIdx: number) {
      if (Array.isArray(day.stops)) {
        day.stops.forEach(function (s: any, i: number) {
          result.push({
            id: s.id || "s-" + dayIdx + "-" + i,
            day: s.day || dayIdx + 1,
            name: s.name || s.location || s.place || "Unknown",
            type: s.type || s.category || "default",
            description: s.description || s.details || "",
            emoji: s.emoji,
            coordinates: s.coordinates || s.location_coords,
            time: s.time,
            cost: s.cost != null ? s.cost : s.price,
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

// ─── Coordinate display ──────────────────────────────────────────────────────
function CoordDisplay({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const [coords, setCoords] = useState({ lng: 0, lat: 0, zoom: 0 });

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = function () {
      const c = map.getCenter();
      setCoords({ lng: c.lng, lat: c.lat, zoom: map.getZoom() });
    };
    map.on("move", update);
    map.on("zoom", update);
    update();
    return function () {
      map.off("move", update);
      map.off("zoom", update);
    };
  }, [mapRef]);

  return (
    <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1.5 rounded-xl backdrop-blur-md bg-black/30 border border-white/15">
      <div className="text-white/40 text-[10px] font-mono">
        {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
        <span className="ml-1.5 text-white/25">z{coords.zoom.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TripMap({ trip, isDark = true }: TripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [showGlobeBadge, setShowGlobeBadge] = useState(true);
  const [terrainOn, setTerrainOn] = useState(false);
  const [compassDeg, setCompassDeg] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState({ text: "", visible: false, x: 0, y: 0 });
  const [statsVisible, setStatsVisible] = useState(false);

  const allStops = extractStops(trip);
  const stopsWithCoords = allStops.filter(
    function (s) { return s.coordinates && s.coordinates.length === 2; }
  );

  const filteredStops = stopsWithCoords.filter(function (s) {
    const type = (s.type || "").toLowerCase();
    if (activeFilter && type !== activeFilter && type !== "default") return false;
    if (selectedDay !== null && s.day !== selectedDay) return false;
    return true;
  });

  const uniqueDays = [...new Set(allStops.map(function (s) { return s.day; }).filter(Boolean))].sort() as number[];

  // ─── Build GeoJSON ────────────────────────────────────────────────────
  const buildGeoJSON = useCallback(function (stops: TripStop[]) {
    const coords = stops.map(function (s) { return s.coordinates as [number, number]; });
    if (coords.length < 2) return null;
    return {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coords },
      }],
    };
  }, []);

  // ─── Render markers ───────────────────────────────────────────────────
  const renderMarkers = useCallback(function (map: maplibregl.Map, stops: TripStop[]) {
    markersRef.current.forEach(function (m) { m.remove(); });
    markersRef.current = [];

    stops.forEach(function (stop) {
      const stopType = (stop.type || "").toLowerCase();
      const color = TYPE_COLORS[stopType] || TYPE_COLORS.default;
      const emoji = stop.emoji || TYPE_EMOJIS[stopType] || "📍";
      const dayNum = stop.day || 1;

      const el = document.createElement("div");
      el.style.cssText =
        "position:relative;display:flex;align-items:center;justify-content:center;" +
        "width:38px;height:38px;border-radius:50%;" +
        "background:" + color + ";border:2.5px solid rgba(255,255,255,0.9);" +
        "box-shadow:0 3px 14px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.08),0 0 20px " + color + "44;" +
        "font-size:18px;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;z-index:1;";
      el.textContent = emoji;
      el.addEventListener("mouseenter", function () {
        el.style.transform = "scale(1.25)";
        el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.5),0 0 30px " + color + "66";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "scale(1)";
        el.style.boxShadow = "0 3px 14px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.08),0 0 20px " + color + "44";
      });

      var descHtml = stop.description
        ? '<div style="font-size:12px;color:#444;margin-top:8px;line-height:1.5;">' + stop.description + '</div>'
        : "";
      var tipsHtml = stop.tips
        ? '<div style="font-size:11px;color:#f97316;margin-top:6px;padding:6px 8px;background:#fff7ed;border-radius:8px;">💡 ' + stop.tips + '</div>'
        : "";
      var costHtml = stop.cost
        ? '<div style="font-size:12px;color:#16a34a;font-weight:600;">₹' + Number(stop.cost).toLocaleString() + '</div>'
        : "";
      var ratingHtml = stop.rating
        ? '<div style="font-size:12px;color:#eab308;">★ ' + stop.rating + '/5</div>'
        : "";
      var timeHtml = stop.time
        ? '<span>⏰ ' + stop.time + '</span>'
        : "";
      var typeHtml = stop.type
        ? '<span>• ' + stop.type + '</span>'
        : "";

      var popupHtml =
        '<div style="font-family:system-ui,-apple-system,sans-serif;padding:6px 2px 2px;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
            '<span style="font-size:16px;">' + emoji + '</span>' +
            '<div style="font-size:14px;font-weight:700;color:#111;line-height:1.2;">' + (stop.name || "Stop") + '</div>' +
          '</div>' +
          '<div style="font-size:11px;color:#888;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">' +
            '<span style="background:' + color + '18;color:' + color + ';padding:1px 7px;border-radius:6px;font-weight:600;">Day ' + dayNum + '</span>' +
            timeHtml + " " + typeHtml +
          '</div>' +
          descHtml + tipsHtml +
          '<div style="display:flex;gap:12px;margin-top:8px;">' +
            costHtml + ratingHtml +
          '</div>' +
        '</div>';

      var popup = new maplibregl.Popup({
        offset: 18,
        closeButton: true,
        className: "wandr-popup",
        maxWidth: "280px",
      }).setHTML(popupHtml);

      var marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(stop.coordinates as [number, number])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, []);

  // ─── Render route layers ──────────────────────────────────────────────
  const renderRoute = useCallback(function (map: maplibregl.Map, stops: TripStop[]) {
    var geojson = buildGeoJSON(stops);
    if (!geojson) return;

    ["route-glow", "route-main", "route-dash"].forEach(function (src) {
      if (map.getSource(src)) map.removeSource(src);
    });
    ["route-glow-l", "route-main-l", "route-dash-l", "route-dots-l"].forEach(function (id) {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource("route-dots")) map.removeSource("route-dots");

    map.addSource("route-glow", { type: "geojson", data: geojson });
    map.addLayer({
      id: "route-glow-l", type: "line", source: "route-glow",
      paint: { "line-color": "#f97316", "line-width": 14, "line-opacity": 0.12, "line-blur": 10 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    map.addSource("route-main", { type: "geojson", data: geojson });
    map.addLayer({
      id: "route-main-l", type: "line", source: "route-main",
      paint: { "line-color": "#f97316", "line-width": 3.5, "line-opacity": 0.85 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    map.addSource("route-dash", { type: "geojson", data: geojson });
    map.addLayer({
      id: "route-dash-l", type: "line", source: "route-dash",
      paint: { "line-color": "#fbbf24", "line-width": 2, "line-opacity": 0.5, "line-dasharray": [0, 4, 3] },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    if (stops.length > 1) {
      var dotFeats = stops.map(function (s) {
        return {
          type: "Feature" as const,
          properties: { idx: 0 },
          geometry: { type: "Point" as const, coordinates: s.coordinates as [number, number] },
        };
      });
      map.addSource("route-dots", {
        type: "geojson",
        data: { type: "FeatureCollection" as const, features: dotFeats },
      });
      map.addLayer({
        id: "route-dots-l", type: "circle", source: "route-dots",
        paint: {
          "circle-radius": 4.5,
          "circle-color": "#fff",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#f97316",
        },
      });
    }
  }, [buildGeoJSON]);

  // ─── Fit bounds ───────────────────────────────────────────────────────
  const fitToStops = useCallback(function (map: maplibregl.Map, stops: TripStop[]) {
    if (stops.length === 0) return;
    var bounds = new maplibregl.LngLatBounds();
    stops.forEach(function (s) { bounds.extend(s.coordinates as [number, number]); });
    map.fitBounds(bounds, {
      padding: { top: 70, bottom: 70, left: 70, right: 70 },
      maxZoom: 13,
      duration: 1200,
    });
  }, []);

  // ─── Initialize Map ────────────────────────────────────────────────────
  useEffect(function () {
    if (!mapContainer.current) return;
    var container = mapContainer.current;
    var rect = container.getBoundingClientRect();
    if (rect.height < 10) container.style.height = "500px";

    var map = new maplibregl.Map({
      container: container,
      style: isDark ? DARK_STYLE : LIGHT_STYLE,
      center: [74.0, 15.0],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    (map as any).setProjection({ type: "globe" });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("error", function (e: any) { console.error("MapLibre error:", e.error || e); });

    map.on("load", function () {
      setMapReady(true);
      renderRoute(map, stopsWithCoords);
      renderMarkers(map, stopsWithCoords);
      if (stopsWithCoords.length > 0) fitToStops(map, stopsWithCoords);
    });

    map.on("zoomend", function () { setShowGlobeBadge(map.getZoom() < 3.5); });
    map.on("rotateend", function () { setCompassDeg(map.getBearing()); });

    mapRef.current = map;

    var ro = new ResizeObserver(function () { if (mapRef.current) mapRef.current.resize(); });
    ro.observe(container);

    return function () {
      ro.disconnect();
      markersRef.current.forEach(function (m) { m.remove(); });
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [trip, isDark, stopsWithCoords, renderRoute, renderMarkers, fitToStops]);

  // ─── Re-render when filter/day changes ─────────────────────────────────
  useEffect(function () {
    var map = mapRef.current;
    if (!map || !mapReady) return;
    renderRoute(map, filteredStops);
    renderMarkers(map, filteredStops);
    if (filteredStops.length > 0) fitToStops(map, filteredStops);
  }, [activeFilter, selectedDay, mapReady, renderRoute, renderMarkers, fitToStops, filteredStops]);

  // ─── Toolbar ───────────────────────────────────────────────────────────
  var zoomIn = function () {
    if (mapRef.current) mapRef.current.easeTo({ zoom: (mapRef.current.getZoom() || 4) + 1.5, duration: 350 });
  };
  var zoomOut = function () {
    if (mapRef.current) mapRef.current.easeTo({ zoom: Math.max(1, (mapRef.current.getZoom() || 4) - 1.5), duration: 350 });
  };
  var resetNorth = function () {
    if (mapRef.current) mapRef.current.easeTo({ bearing: 0, duration: 400 });
    setCompassDeg(0);
  };
  var toggle3D = function () {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ pitch: mapRef.current.getPitch() > 10 ? 0 : 60, duration: 700 });
  };
  var toggleTerrain = function () {
    if (!mapRef.current) return;
    setTerrainOn(function (prev) {
      var next = !prev;
      try {
        if (next) {
          mapRef.current!.addSource("terrain-src", { type: "raster-dem", url: "https://demotiles.maplibre.org/terrain-tiles.json", tileSize: 256 });
          mapRef.current!.setTerrain({ source: "terrain-src", exaggeration: 1.5 });
        } else {
          mapRef.current!.setTerrain(null as any);
          if (mapRef.current!.getSource("terrain-src")) mapRef.current!.removeSource("terrain-src");
        }
      } catch (e) { console.error("Terrain:", e); }
      return next;
    });
  };
  var locateMe = function () {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lng = pos.coords.longitude;
        var lat = pos.coords.latitude;
        mapRef.current!.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
        var el = document.createElement("div");
        el.style.cssText = "width:22px;height:22px;border-radius:50%;background:rgba(59,130,246,0.25);border:3px solid #3b82f6;box-shadow:0 0 14px rgba(59,130,246,0.5);animation:pulse-ring 2s ease-out infinite;";
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(mapRef.current!);
      },
      function () {}
    );
  };
  var toggleFullscreen = function () {
    setIsFullscreen(function (p) { return !p; });
    setTimeout(function () { if (mapRef.current) mapRef.current.resize(); }, 100);
  };
  var resetView = function () {
    if (!mapRef.current) return;
    renderRoute(mapRef.current, stopsWithCoords);
    renderMarkers(mapRef.current, stopsWithCoords);
    fitToStops(mapRef.current, stopsWithCoords);
    setActiveFilter(null);
    setSelectedDay(null);
    mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    setCompassDeg(0);
  };

  var showTip = function (text: string, e: React.MouseEvent) {
    setTooltip({ text: text, visible: true, x: e.clientX, y: e.clientY });
  };
  var hideTip = function () {
    setTooltip(function (t) { return { text: t.text, visible: false, x: t.x, y: t.y }; });
  };

  var stopCountByType = function (type: string) {
    return allStops.filter(function (s) { return (s.type || "").toLowerCase() === type; }).length;
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Tooltip text={tooltip.text} visible={tooltip.visible} x={tooltip.x} y={tooltip.y} />

      <div
        className={"relative w-full rounded-2xl overflow-hidden transition-all duration-300 " + (isFullscreen ? "fixed inset-4 z-50 rounded-3xl" : "")}
        style={isFullscreen ? undefined : { height: "560px", minHeight: "420px" }}
      >
        <div
          ref={mapContainer}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />

        {!mapReady && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
              <span className="text-white/60 text-sm font-medium">Loading map...</span>
            </div>
          </div>
        )}

        {showGlobeBadge && mapReady && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full backdrop-blur-md bg-black/30 border border-white/15 text-white/70 text-[11px] font-medium pointer-events-none tracking-wide">
            🌍 ZOOM OUT FOR GLOBE VIEW
          </div>
        )}

        {mapReady && (
          <button
            onClick={function () { setStatsVisible(!statsVisible); }}
            className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 text-xs font-medium hover:bg-white/15 transition cursor-pointer"
          >
            <span className="text-sm">📊</span>
            <span>{stopsWithCoords.length} stops</span>
            <span>•</span>
            <span>{uniqueDays.length} days</span>
            <span className="text-white/40">{statsVisible ? "▲" : "▼"}</span>
          </button>
        )}

        {mapReady && uniqueDays.length > 1 && (
          <div className="absolute top-14 left-3 z-10 flex flex-wrap gap-1.5 max-w-[200px]">
            <button
              onClick={function () { setSelectedDay(null); }}
              className={"px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border " + (selectedDay === null ? "bg-orange-500/80 text-white border-orange-400/40" : "bg-black/20 text-white/50 border-white/10 hover:bg-white/10")}
            >
              All
            </button>
            {uniqueDays.map(function (d) {
              return (
                <button
                  key={d}
                  onClick={function () { setSelectedDay(selectedDay === d ? null : d); }}
                  className={"px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border " + (selectedDay === d ? "bg-orange-500/80 text-white border-orange-400/40" : "bg-black/20 text-white/50 border-white/10 hover:bg-white/10")}
                >
                  D{d}
                </button>
              );
            })}
          </div>
        )}

        {statsVisible && mapReady && (
          <div className="absolute top-14 left-3 z-10 p-3 rounded-2xl backdrop-blur-md bg-black/40 border border-white/15 min-w-[180px]">
            <div className="text-white/90 text-[10px] font-bold mb-2 tracking-widest uppercase">Trip Stats</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Total Stops</span>
                <span className="text-white font-semibold">{allStops.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">On Map</span>
                <span className="text-green-400 font-semibold">{stopsWithCoords.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Days</span>
                <span className="text-white font-semibold">{uniqueDays.length}</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              {LEGEND_ITEMS.filter(function (l) { return stopCountByType(l.key) > 0; }).map(function (l) {
                return (
                  <div key={l.key} className="flex justify-between text-xs items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px]">{l.emoji}</span>
                      <span className="text-white/50">{l.label}</span>
                    </span>
                    <span className="text-white/80 font-medium">{stopCountByType(l.key)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mapReady && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <GlassBtn onClick={resetView} title="Reset View">🔄</GlassBtn>
            <GlassBtn onClick={toggleTerrain} title="Toggle Terrain">
              {terrainOn ? "⛰️" : "🏔️"}
            </GlassBtn>
            <GlassBtn onClick={resetNorth} title="Reset North">
              <span className="inline-block transition-transform duration-300" style={{ transform: "rotate(" + (-compassDeg) + "deg)" }}>
                🧭
              </span>
            </GlassBtn>
            <GlassBtn onClick={locateMe} title="My Location">📍</GlassBtn>
            <GlassBtn onClick={toggle3D} title="Toggle 3D">🗼</GlassBtn>
            <GlassBtn onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              {isFullscreen ? "⛶" : "⤢"}
            </GlassBtn>
            <div className="w-10 h-px bg-white/10 mx-auto" />
            <GlassBtn onClick={zoomIn} title="Zoom In" size="sm">+</GlassBtn>
            <GlassBtn onClick={zoomOut} title="Zoom Out" size="sm">−</GlassBtn>
          </div>
        )}

        {mapReady && (
          <div className="absolute bottom-3 left-3 z-10 p-3 rounded-2xl backdrop-blur-md bg-black/30 border border-white/15">
            <div className="text-white/90 text-[10px] font-bold mb-2 tracking-widest uppercase">Map Legend</div>
            <div className="space-y-1">
              {LEGEND_ITEMS.filter(function (item) { return stopCountByType(item.key) > 0; }).map(function (item) {
                return (
                  <button
                    key={item.key}
                    onClick={function () { setActiveFilter(activeFilter === item.key ? null : item.key); }}
                    onMouseEnter={function (e) { showTip(item.label + ": " + stopCountByType(item.key) + " stops", e); }}
                    onMouseLeave={hideTip}
                    className={"flex items-center gap-2 w-full text-left px-1.5 py-1 rounded-lg transition cursor-pointer " + (activeFilter === item.key ? "bg-white/10" : "hover:bg-white/5")}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color, opacity: activeFilter && activeFilter !== item.key ? 0.3 : 1 }}
                    />
                    <span className="text-[11px] text-white/70">{item.emoji} {item.label}</span>
                    <span className="ml-auto text-[10px] text-white/30">{stopCountByType(item.key)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mapReady && <CoordDisplay mapRef={mapRef} />}
      </div>

      <style jsx global>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .wandr-popup .maplibregl-popup-content {
          border-radius: 14px !important;
          padding: 12px 16px !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08) !important;
          background: rgba(255,255,255,0.97) !important;
          backdrop-filter: blur(12px);
        }
        .wandr-popup .maplibregl-popup-close-button {
          font-size: 18px !important;
          color: #999 !important;
          right: 6px !important;
          top: 6px !important;
        }
        .wandr-popup .maplibregl-popup-tip { display: none; }
      `}</style>
    </>
  );
}
