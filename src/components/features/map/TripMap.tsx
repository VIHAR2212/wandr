"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapProps {
  trip?: any;
  userLocation?: { lat: number; lng: number } | null;
  showRoute?: boolean;
  tripData?: any;
  isTracking?: boolean;
  onTrackingToggle?: () => void;
  userPosition?: { lat: number; lng: number } | null;
  userTransportMode?: string | null;
  allStopCoords?: { lat: number; lng: number }[];
}

function createIcon(emoji: string, bgColor: string, size: number = 36): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.45)}px;border:3px solid white;box-shadow:0 0 0 2px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:1000;">${emoji}</div>`,
    className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2 - 4],
  });
}

function createUserIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FFA500);display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 0 0 3px rgba(255,215,0,0.4),0 0 16px rgba(255,215,0,0.5),0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:2000;animation:up 2s ease-in-out infinite;"><style>@keyframes up{0%,100%{box-shadow:0 0 0 3px rgba(255,215,0,0.4),0 0 16px rgba(255,215,0,0.5),0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 0 6px rgba(255,215,0,0.2),0 0 28px rgba(255,215,0,0.7),0 2px 12px rgba(0,0,0,0.3)}}</style>\u{1F464}</div>`,
    className: "", iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -25],
  });
}

function createTransportIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#1D4ED8);display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.4),0 0 20px rgba(59,130,246,0.5),0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:2000;animation:tp 1.5s ease-in-out infinite;"><style>@keyframes tp{0%,100%{box-shadow:0 0 0 3px rgba(59,130,246,0.4),0 0 20px rgba(59,130,246,0.5),0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 0 7px rgba(59,130,246,0.15),0 0 32px rgba(59,130,246,0.6),0 2px 12px rgba(0,0,0,0.3)}}</style>${emoji}</div>`,
    className: "", iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -26],
  });
}

const icons = {
  flight: createIcon("\u2708\uFE0F", "#3B82F6"),
  train: createIcon("\uD83D\uDE82", "#3B82F6"),
  bus: createIcon("\uD83D\uDE8C", "#3B82F6"),
  transport: createIcon("\uD83D\uDE97", "#3B82F6"),
  hotel: createIcon("\uD83C\uDFE8", "#F97316"),
  restaurant: createIcon("\uD83C\uDF7D\uFE0F", "#22C55E"),
  hiddenGem: createIcon("\u2728", "#A855F7"),
  attraction: createIcon("\uD83D\uDCCD", "#14B8A6"),
  user: createUserIcon(),
  flightActive: createTransportIcon("\u2708\uFE0F"),
  trainActive: createTransportIcon("\uD83D\uDE82"),
  busActive: createTransportIcon("\uD83D\uDE8C"),
  carActive: createTransportIcon("\uD83D\uDE97"),
  stopDot: createIcon("\u2B24", "rgba(255,255,255,0.4)", 14),
  stopDotConfirmed: createIcon("\u2705", "rgba(34,197,94,0.7)", 14),
};

function getTransportIcon(title?: string): L.DivIcon {
  if (!title) return icons.transport;
  const t = title.toLowerCase();
  if (t.includes("flight") || t.includes("airport")) return icons.flight;
  if (t.includes("train") || t.includes("rail") || t.includes("metro")) return icons.train;
  if (t.includes("bus") || t.includes("coach")) return icons.bus;
  return icons.transport;
}

function getActiveTransportIcon(mode?: string | null): L.DivIcon {
  if (!mode) return icons.user;
  switch (mode.toUpperCase()) {
    case "FLIGHT": return icons.flightActive;
    case "TRAIN": return icons.trainActive;
    case "BUS": return icons.busActive;
    default: return icons.carActive;
  }
}

const PAN_THROTTLE = 400;

export default function TripMap({
  trip, tripData, userLocation, showRoute,
  isTracking = false, onTrackingToggle,
  userPosition, userTransportMode, allStopCoords
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trackingMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const stopGroupRef = useRef<L.LayerGroup | null>(null);
  const trailLineRef = useRef<L.Polyline | null>(null);
  const trailPointsRef = useRef<Array<[number, number]>>([]);
  const lastPanRef = useRef(0);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const [routePoints, setRoutePoints] = useState<Array<{ lat: number; lng: number; name: string; type: string }>>([]);
  const data = trip || tripData;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([19.076, 72.877], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
    layersGroupRef.current = L.layerGroup().addTo(map);
    stopGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; layersGroupRef.current = null; stopGroupRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !data || !layersGroupRef.current) return;
    const map = mapRef.current;
    const group = layersGroupRef.current;
    group.clearLayers();
    const points: Array<{ lat: number; lng: number; name: string; type: string }> = [];

    (data.days || []).forEach((day: any) => {
      (day.activities || []).forEach((act: any) => {
        if (act.lat && act.lng) {
          const isT = act.type === "transport" || act.type === "TRANSPORT";
          points.push({ lat: act.lat, lng: act.lng, name: act.title, type: act.type || "activity" });
          L.marker([act.lat, act.lng], { icon: isT ? getTransportIcon(act.title) : icons.attraction, zIndexOffset: 500 })
            .addTo(group).bindPopup(`<div style="min-width:160px"><b>${isT ? "\uD83D\uDE97" : "\uD83D\uDCCD"} ${act.title}</b><br><small>${(act.description || "").substring(0, 100)}</small></div>`);
        }
      });
    });

    (data.hotels || []).forEach((h: any) => {
      if (h.lat && h.lng) {
        points.push({ lat: h.lat, lng: h.lng, name: h.name, type: "hotel" });
        L.marker([h.lat, h.lng], { icon: icons.hotel, zIndexOffset: 600 })
          .addTo(group).bindPopup(`<div style="min-width:160px"><b>\uD83C\uDFE8 ${h.name}</b><br>${h.rating ? `\u2B50 ${h.rating} \u00b7 ` : ""}<small>${h.location || ""}</small></div>`);
      }
    });

    (data.restaurants || []).forEach((r: any) => {
      if (r.lat && r.lng) {
        points.push({ lat: r.lat, lng: r.lng, name: r.name, type: "restaurant" });
        L.marker([r.lat, r.lng], { icon: icons.restaurant, zIndexOffset: 600 })
          .addTo(group).bindPopup(`<div style="min-width:160px"><b>\uD83C\uDF7D\uFE0F ${r.name}</b><br>${r.cuisine ? `${r.cuisine} \u00b7 ` : ""}${r.rating ? `\u2B50 ${r.rating}<br>` : ""}<small>Must try: ${r.mustTry || "\u2014"}</small></div>`);
      }
    });

    (data.hiddenGems || []).forEach((g: any) => {
      if (g.lat && g.lng) {
        points.push({ lat: g.lat, lng: g.lng, name: g.name, type: "hiddenGem" });
        L.marker([g.lat, g.lng], { icon: icons.hiddenGem, zIndexOffset: 700 })
          .addTo(group).bindPopup(`<div style="min-width:160px"><b>\u2728 ${g.name}</b><br><small>${(g.description || "").substring(0, 100)}</small></div>`);
      }
    });

    if (points.length > 1) {
      L.polyline(points.map(p => [p.lat, p.lng]), { color: "#3B82F6", weight: 3, opacity: 0.6, dashArray: "8, 12" }).addTo(group);
      L.polyline(points.map(p => [p.lat, p.lng]), { color: "#60A5FA", weight: 6, opacity: 0.15, lineCap: "round", lineJoin: "round" }).addTo(group);
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    }
    setRoutePoints(points);
  }, [data]);

  // ─── Itinerary stop dots ──────────────────────────────
  useEffect(() => {
    if (!stopGroupRef.current || !allStopCoords || allStopCoords.length === 0) return;
    const g = stopGroupRef.current;
    g.clearLayers();
    allStopCoords.forEach(c => { L.marker([c.lat, c.lng], { icon: icons.stopDot, zIndexOffset: 100 }).addTo(g); });
    if (allStopCoords.length > 1 && routePoints.length === 0) {
      mapRef.current?.fitBounds(L.latLngBounds(allStopCoords.map(c => [c.lat, c.lng])), { padding: [80, 80], maxZoom: 13 });
    }
  }, [allStopCoords, routePoints.length]);

  // ─── User / Transport marker (LAG-FIXED) ──────────────
  useEffect(() => {
    if (!mapRef.current || !layersGroupRef.current) return;
    const group = layersGroupRef.current;
    const pos = userPosition || userLocation;
    if (!pos) return;

    // Skip if position barely moved (< 0.0002 degrees ≈ 20m)
    const lp = lastPosRef.current;
    if (lp && Math.abs(lp.lat - pos.lat) < 0.0002 && Math.abs(lp.lng - pos.lng) < 0.0002) return;
    lastPosRef.current = { lat: pos.lat, lng: pos.lng };

    const isActive = !!userTransportMode;
    const markerIcon = isActive ? getActiveTransportIcon(userTransportMode) : icons.user;
    const label = isActive ? `\uD83D\uDE80 ${userTransportMode}` : "\uD83D\uDC64 Your Location";

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([pos.lat, pos.lng]);
      userMarkerRef.current.setIcon(markerIcon);
      userMarkerRef.current.setPopupContent(`<div style="min-width:140px"><b>${label}</b><br><small>${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}</small></div>`);
    } else {
      userMarkerRef.current = L.marker([pos.lat, pos.lng], { icon: markerIcon, zIndexOffset: 2500 })
        .addTo(group).bindPopup(`<div style="min-width:140px"><b>${label}</b><br><small>${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}</small></div>`);
    }

    // Throttled panning — max once per 400ms
    const now = Date.now();
    if (now - lastPanRef.current > PAN_THROTTLE) {
      mapRef.current.panTo([pos.lat, pos.lng], { animate: true, duration: 0.6 });
      lastPanRef.current = now;
    }

    // Trail line — update in-place
    if (isActive) {
      trailPointsRef.current.push([pos.lat, pos.lng]);
      if (trailLineRef.current) {
        trailLineRef.current.setLatLngs(trailPointsRef.current);
      } else {
        trailLineRef.current = L.polyline(trailPointsRef.current, {
          color: "#60A5FA", weight: 4, opacity: 0.8, lineCap: "round", lineJoin: "round",
        }).addTo(group);
      }
    } else {
      if (trailLineRef.current) { group.removeLayer(trailLineRef.current); trailLineRef.current = null; }
      trailPointsRef.current = [];
    }
  }, [userPosition, userLocation, userTransportMode]);

  // ─── Notification ─────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ─── Legacy tracking ──────────────────────────────────
  useEffect(() => {
    if (!isTracking || routePoints.length < 2 || !mapRef.current || !layersGroupRef.current) return;
    const map = mapRef.current;
    const group = layersGroupRef.current;
    const dot = L.marker([routePoints[0].lat, routePoints[0].lng], { icon: icons.user, zIndexOffset: 1500 }).addTo(group);
    let ci = 0, step = 0, lastN = -1;
    const run = () => {
      if (ci >= routePoints.length - 1) { group.removeLayer(dot); onTrackingToggle?.(); return; }
      const s = routePoints[ci], e = routePoints[ci + 1], p = step / 80;
      dot.setLatLng([s.lat + (e.lat - s.lat) * p, s.lng + (e.lng - s.lng) * p]);
      if (step % 10 === 0) map.panTo([s.lat + (e.lat - s.lat) * p, s.lng + (e.lng - s.lng) * p], { animate: true, duration: 0.5 });
      step++;
      if (step >= 80) { ci++; step = 0; if (ci !== lastN && ci < routePoints.length) { lastN = ci; if (Notification?.permission === "granted") new Notification("Wandr", { body: `Arrived at ${routePoints[ci].name}` }); } }
      animationFrameRef.current = window.requestAnimationFrame(run);
    };
    animationFrameRef.current = window.requestAnimationFrame(run);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); group.removeLayer(dot); };
  }, [isTracking, routePoints]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-white/10">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs space-y-1.5 font-medium shadow-lg">
        <div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#3B82F6] text-[12px]">{"\u2708\uFE0F"}</span><span className="text-white/80">Transport</span></div>
        <div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F97316] text-[12px]">{"\uD83C\uDFE8"}</span><span className="text-white/80">Hotels</span></div>
        <div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#22C55E] text-[12px]">{"\uD83C\uDF7D\uFE0F"}</span><span className="text-white/80">Restaurants</span></div>
        <div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#A855F7] text-[12px]">{"\u2728"}</span><span className="text-white/80">Hidden Gems</span></div>
        <div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#14B8A6] text-[12px]">{"\uD83D\uDCCD"}</span><span className="text-white/80">Attractions</span></div>
        {(userPosition || userLocation || isTracking) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
            {userTransportMode ? (
              <><span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[14px]" style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", boxShadow: "0 0 8px rgba(59,130,246,0.5)" }}>
                {userTransportMode === "FLIGHT" ? "\u2708\uFE0F" : userTransportMode === "TRAIN" ? "\uD83D\uDE82" : userTransportMode === "BUS" ? "\uD83D\uDE8C" : "\uD83D\uDE97"}</span>
                <span className="text-blue-300 font-bold">{userTransportMode}</span></>
            ) : (
              <><span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[14px]" style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", boxShadow: "0 0 8px rgba(255,215,0,0.5)" }}>{"\uD83D\uDC64"}</span>
                <span className="text-yellow-300 font-bold">Your Location</span></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
