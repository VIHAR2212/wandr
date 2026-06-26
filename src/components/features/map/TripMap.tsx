"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

var DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
var LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

var TYPE_COLORS: Record<string, string> = {
  transport: "#3b82f6", hotel: "#f97316", restaurant: "#22c55e",
  attraction: "#14b8a6", hidden_gem: "#a855f7", activity: "#ec4899",
  shopping: "#eab308", default: "#6b7280",
};
var TYPE_EMOJIS: Record<string, string> = {
  transport: "🚗", hotel: "🏨", restaurant: "🍽️", attraction: "📍",
  hidden_gem: "💎", activity: "🎯", shopping: "🛍️", default: "📌",
};
var LEGEND = [
  { label: "Transport", key: "transport", color: "#3b82f6", emoji: "🚗" },
  { label: "Hotels", key: "hotel", color: "#f97316", emoji: "🏨" },
  { label: "Restaurants", key: "restaurant", color: "#22c55e", emoji: "🍽️" },
  { label: "Hidden Gems", key: "hidden_gem", color: "#a855f7", emoji: "💎" },
  { label: "Attractions", key: "attraction", color: "#14b8a6", emoji: "📍" },
  { label: "Activities", key: "activity", color: "#ec4899", emoji: "🎯" },
  { label: "Shopping", key: "shopping", color: "#eab308", emoji: "🛍️" },
];

function extractStops(trip: any): any[] {
  if (!trip) return [];
  if (Array.isArray(trip.stops)) return trip.stops;
  if (Array.isArray(trip.itinerary)) {
    var out: any[] = [];
    trip.itinerary.forEach(function (day: any, di: number) {
      if (Array.isArray(day.stops)) {
        day.stops.forEach(function (s: any, i: number) {
          out.push({
            id: s.id || "s-" + di + "-" + i,
            day: s.day || di + 1,
            name: s.name || s.location || s.place || "Unknown",
            type: s.type || s.category || "default",
            description: s.description || s.details || "",
            emoji: s.emoji,
            coordinates: s.coordinates || s.location_coords,
            time: s.time, cost: s.cost != null ? s.cost : s.price,
            rating: s.rating, tips: s.tips,
          });
        });
      }
    });
    return out;
  }
  return [];
}

export default function TripMap(props: any) {
  var trip = props.trip;
  var isDark = props.isDark !== false;

  var containerRef = useRef<HTMLDivElement>(null);
  var mapRef = useRef<any>(null);
  var markersRef = useRef<any[]>([]);
  var initDone = useRef(false);

  var [mounted, setMounted] = useState(false);
  var [mapReady, setMapReady] = useState(false);
  var [terrainOn, setTerrainOn] = useState(false);
  var [compassDeg, setCompassDeg] = useState(0);
  var [isFull, setIsFull] = useState(false);
  var [activeFilter, setActiveFilter] = useState<string | null>(null);
  var [selectedDay, setSelectedDay] = useState<number | null>(null);
  var [showGlobe, setShowGlobe] = useState(true);

  var allStops = extractStops(trip);
  var withCoords = allStops.filter(function (s: any) { return s.coordinates && s.coordinates.length === 2; });
  var filtered = withCoords.filter(function (s: any) {
    var t = (s.type || "").toLowerCase();
    if (activeFilter && t !== activeFilter && t !== "default") return false;
    if (selectedDay !== null && s.day !== selectedDay) return false;
    return true;
  });
  var days = allStops.map(function (s: any) { return s.day; }).filter(Boolean).filter(function (v: any, i: any, a: any[]) { return a.indexOf(v) === i; }).sort() as number[];

  function countType(type: string) {
    return allStops.filter(function (s: any) { return (s.type || "").toLowerCase() === type; }).length;
  }

  // ─── Client-only mount guard ──────────────────────────────────────
  useEffect(function () { setMounted(true); }, []);

  // ─── Initialize map ONCE ──────────────────────────────────────────
  useEffect(function () {
    if (!mounted || !containerRef.current || initDone.current) return;
    initDone.current = true;

    var container = containerRef.current;
    if (container.getBoundingClientRect().height < 10) container.style.height = "500px";

    // Dynamic import — prevents SSR crash
    import("maplibre-gl").then(function (mod) {
      var maplibregl = mod.default;

      // Inject CSS if not already present
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        var css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/maplibre-gl@5.2.0/dist/maplibre-gl.css";
        document.head.appendChild(css);
      }

      try {
        var map = new maplibregl.Map({
          container: container,
          style: isDark ? DARK_STYLE : LIGHT_STYLE,
          center: [74.0, 15.0], zoom: 2, pitch: 0, bearing: 0,
          attributionControl: false,
        });
        (map as any).setProjection({ type: "globe" });
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
        mapRef.current = map;

        map.on("load", function () {
          setMapReady(true);
          drawMap(withCoords);
        });
        map.on("zoomend", function () { setShowGlobe(map.getZoom() < 3.5); });
        map.on("rotateend", function () { setCompassDeg(map.getBearing()); });

        var ro = new ResizeObserver(function () { mapRef.current && mapRef.current.resize(); });
        ro.observe(container);

        // Store cleanup on ref
        (map as any)._cleanup = function () {
          ro.disconnect();
          markersRef.current.forEach(function (m: any) { m.remove(); });
          markersRef.current = [];
          map.remove();
          mapRef.current = null;
        };
      } catch (e) {
        console.error("Map init error:", e);
      }
    });

    return function () {
      if (mapRef.current && (mapRef.current as any)._cleanup) {
        (mapRef.current as any)._cleanup();
      }
      initDone.current = false;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ─── Redraw when filters change ───────────────────────────────────
  useEffect(function () {
    if (!mapReady || !mapRef.current) return;
    drawMap(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, selectedDay, mapReady]);

  // ─── Draw map content ─────────────────────────────────────────────
  function drawMap(stops: any[]) {
    var map = mapRef.current;
    if (!map) return;
    var ml = (window as any).maplibregl || require("maplibre-gl");

    // Clean old layers
    ["rg", "rm", "rd", "rdots"].forEach(function (s) { try { if (map.getSource(s)) map.removeSource(s); } catch (e) {} });
    ["rgl", "rml", "rdl", "rdotl"].forEach(function (id) { try { if (map.getLayer(id)) map.removeLayer(id); } catch (e) {} });

    // Route
    if (stops.length >= 2) {
      var coords = stops.map(function (s: any) { return s.coordinates; });
      var gj = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }] };
      try {
        map.addSource("rg", { type: "geojson", data: gj });
        map.addLayer({ id: "rgl", type: "line", source: "rg", paint: { "line-color": "#f97316", "line-width": 14, "line-opacity": 0.12, "line-blur": 10 }, layout: { "line-cap": "round", "line-join": "round" } });
        map.addSource("rm", { type: "geojson", data: gj });
        map.addLayer({ id: "rml", type: "line", source: "rm", paint: { "line-color": "#f97316", "line-width": 3.5, "line-opacity": 0.85 }, layout: { "line-cap": "round", "line-join": "round" } });
        map.addSource("rd", { type: "geojson", data: gj });
        map.addLayer({ id: "rdl", type: "line", source: "rd", paint: { "line-color": "#fbbf24", "line-width": 2, "line-opacity": 0.5, "line-dasharray": [0, 4, 3] }, layout: { "line-cap": "round", "line-join": "round" } });
      } catch (e) { console.error("Route layers error:", e); }
    }

    // Markers
    markersRef.current.forEach(function (m: any) { try { m.remove(); } catch (e) {} });
    markersRef.current = [];

    stops.forEach(function (stop: any) {
      try {
        var stopType = (stop.type || "").toLowerCase();
        var color = TYPE_COLORS[stopType] || TYPE_COLORS.default;
        var emoji = stop.emoji || TYPE_EMOJIS[stopType] || "📍";
        var dayNum = stop.day || 1;

        var el = document.createElement("div");
        el.style.cssText = "display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:" + color + ";border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 3px 14px rgba(0,0,0,0.4);font-size:18px;cursor:pointer;transition:transform 0.2s;z-index:1;";
        el.textContent = emoji;
        el.onmouseenter = function () { el.style.transform = "scale(1.2)"; };
        el.onmouseleave = function () { el.style.transform = "scale(1)"; };

        var descH = stop.description ? '<div style="font-size:12px;color:#444;margin-top:6px;line-height:1.4;">' + stop.description + '</div>' : "";
        var costH = stop.cost ? '<div style="font-size:12px;color:#16a34a;font-weight:600;">₹' + Number(stop.cost).toLocaleString() + '</div>' : "";
        var ratH = stop.rating ? '<div style="font-size:12px;color:#eab308;">★ ' + stop.rating + '/5</div>' : "";
        var html = '<div style="font-family:system-ui,sans-serif;padding:4px 2px;">' +
          '<div style="font-size:14px;font-weight:700;color:#111;">' + (stop.name || "Stop") + '</div>' +
          '<div style="font-size:11px;color:#888;margin-top:2px;"><span style="background:' + color + '18;color:' + color + ';padding:1px 6px;border-radius:4px;font-weight:600;">Day ' + dayNum + '</span>' +
          (stop.time ? ' ⏰ ' + stop.time : '') + (stop.type ? ' • ' + stop.type : '') + '</div>' +
          descH + '<div style="display:flex;gap:12px;margin-top:6px;">' + costH + ratH + '</div></div>';

        var popup = new ml.Popup({ offset: 15, closeButton: true, className: "wandr-popup", maxWidth: "260px" }).setHTML(html);
        var marker = new ml.Marker({ element: el, anchor: "center" }).setLngLat(stop.coordinates).setPopup(popup).addTo(map);
        markersRef.current.push(marker);
      } catch (e) { console.error("Marker error:", e); }
    });

    // Fit bounds
    if (stops.length > 0) {
      try {
        var b = new ml.LngLatBounds();
        stops.forEach(function (s: any) { b.extend(s.coordinates); });
        map.fitBounds(b, { padding: 70, maxZoom: 13, duration: 1000 });
      } catch (e) {}
    }
  }

  // ─── Toolbar ───────────────────────────────────────────────────────
  function doZoomIn() { mapRef.current && mapRef.current.easeTo({ zoom: (mapRef.current.getZoom() || 4) + 1.5, duration: 350 }); }
  function doZoomOut() { mapRef.current && mapRef.current.easeTo({ zoom: Math.max(1, (mapRef.current.getZoom() || 4) - 1.5), duration: 350 }); }); }
  function doNorth() { mapRef.current && mapRef.current.easeTo({ bearing: 0, duration: 400 }); setCompassDeg(0); }
  function do3D() { mapRef.current && mapRef.current.easeTo({ pitch: mapRef.current.getPitch() > 10 ? 0 : 60, duration: 700 }); }
  function doLocate() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lng = pos.coords.longitude, lat = pos.coords.latitude;
      mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
    }, function () {});
  }
  function doReset() {
    setActiveFilter(null); setSelectedDay(null);
    drawMap(withCoords);
    if (mapRef.current) mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    setCompassDeg(0);
  }
  function doFull() {
    setIsFull(function (p) { return !p; });
    setTimeout(function () { mapRef.current && mapRef.current.resize(); }, 150);
  }
  function doTerrain() {
    if (!mapRef.current) return;
    setTerrainOn(function (p) {
      try {
        if (!p) { mapRef.current.addSource("tsrc", { type: "raster-dem", url: "https://demotiles.maplibre.org/terrain-tiles.json", tileSize: 256 }); mapRef.current.setTerrain({ source: "tsrc", exaggeration: 1.5 }); }
        else { mapRef.current.setTerrain(null); if (mapRef.current.getSource("tsrc")) mapRef.current.removeSource("tsrc"); }
      } catch (e) {}
      return !p;
    });
  }

  // ─── Placeholder before mount ─────────────────────────────────────
  if (!mounted) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-gray-900" style={{ height: "560px", minHeight: "420px" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className={"relative w-full rounded-2xl overflow-hidden transition-all duration-300 " + (isFull ? "fixed inset-4 z-50 rounded-3xl" : "")}
      style={isFull ? undefined : { height: "560px", minHeight: "420px" }}>

      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      {!mapReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
            <span className="text-white/60 text-sm">Loading map...</span>
          </div>
        </div>
      )}

      {showGlobe && mapReady && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full backdrop-blur-md bg-black/30 border border-white/15 text-white/70 text-[11px] font-medium pointer-events-none">
          🌍 ZOOM OUT FOR GLOBE VIEW
        </div>
      )}

      {mapReady && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 text-xs font-medium">
          <span>📊</span><span>{withCoords.length} stops</span><span>•</span><span>{days.length} days</span>
        </div>
      )}

      {mapReady && days.length > 1 && (
        <div className="absolute top-14 left-3 z-10 flex flex-wrap gap-1.5 max-w-[200px]">
          <button onClick={function () { setSelectedDay(null); drawMap(filtered); }} className={"px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border " + (selectedDay === null ? "bg-orange-500/80 text-white border-orange-400/40" : "bg-black/20 text-white/50 border-white/10")}>All</button>
          {days.map(function (d: number) {
            return (<button key={d} onClick={function () { setSelectedDay(d === selectedDay ? null : d); }} className={"px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border " + (selectedDay === d ? "bg-orange-500/80 text-white border-orange-400/40" : "bg-black/20 text-white/50 border-white/10")}>D{d}</button>);
          })}
        </div>
      )}

      {mapReady && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <button onClick={doReset} title="Reset" className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-base">🔄</button>
          <button onClick={doTerrain} title="Terrain" className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-base">{terrainOn ? "⛰️" : "🏔️"}</button>
          <button onClick={doNorth} title="North" className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-base"><span style={{ display: "inline-block", transform: "rotate(" + (-compassDeg) + "deg)", transition: "transform 0.3s" }}>🧭</span></button>
          <button onClick={doLocate} title="Location" className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-base">📍</button>
          <button onClick={do3D} title="3D" className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-base">🗼</button>
          <button onClick={doFull} title="Fullscreen" className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-base">{isFull ? "⛶" : "⤢"}</button>
          <div className="w-10 h-px bg-white/10 mx-auto" />
          <button onClick={doZoomIn} title="Zoom In" className="w-8 h-8 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-sm">+</button>
          <button onClick={doZoomOut} title="Zoom Out" className="w-8 h-8 flex items-center justify-center rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-white/80 hover:bg-white/20 cursor-pointer text-sm">−</button>
        </div>
      )}

      {mapReady && (
        <div className="absolute bottom-3 left-3 z-10 p-3 rounded-2xl backdrop-blur-md bg-black/30 border border-white/15">
          <div className="text-white/90 text-[10px] font-bold mb-2 tracking-widest uppercase">Map Legend</div>
          <div className="space-y-1">
            {LEGEND.filter(function (l) { return countType(l.key) > 0; }).map(function (item) {
              return (
                <button key={item.key} onClick={function () { setActiveFilter(activeFilter === item.key ? null : item.key); }}
                  className={"flex items-center gap-2 w-full text-left px-1.5 py-1 rounded-lg transition cursor-pointer " + (activeFilter === item.key ? "bg-white/10" : "hover:bg-white/5")}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color, opacity: activeFilter && activeFilter !== item.key ? 0.3 : 1 }} />
                  <span className="text-[11px] text-white/70">{item.emoji} {item.label}</span>
                  <span className="ml-auto text-[10px] text-white/30">{countType(item.key)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: "@keyframes pulse-ring{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}.wandr-popup .maplibregl-popup-content{border-radius:14px!important;padding:12px 16px!important;box-shadow:0 12px 40px rgba(0,0,0,0.3)!important;background:rgba(255,255,255,0.97)!important}.wandr-popup .maplibregl-popup-close-button{font-size:18px!important;color:#999!important;right:6px!important;top:6px!important}.wandr-popup .maplibregl-popup-tip{display:none}" }} />
    </div>
  );
}
