"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapProps {
  trip?: any;
  userLocation?: { lat: number; lng: number };
  showRoute?: boolean;
  tripData?: any;
  isTracking?: boolean;
  onTrackingToggle?: () => void;
  userPosition?: { lat: number; lng: number } | null;
}

// ─── Custom icon factory ──────────────────────────────────
function createIcon(emoji: string, bgColor: string, size: number = 36): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${bgColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${Math.round(size * 0.45)}px;
        border: 3px solid white;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.15), 0 0 12px ${bgColor}60, 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
        z-index: 1000;
      ">${emoji}</div>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

// Golden pulsing user location icon
function createUserIcon(): L.DivIcon {
  return L.divIcon({
    html: `
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
    `,
    className: "",
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -28],
  });
}

// ─── Icon instances ───────────────────────────────────────
const icons = {
  flight:     createIcon("✈️", "#3B82F6"),
  train:      createIcon("🚆", "#10B981"),
  bus:        createIcon("🚌", "#F97316"),
  transport:  createIcon("🚗", "#8B5CF6"),
  hotel:      createIcon("🏨", "#F97316"),
  restaurant: createIcon("🍽️", "#22C55E"),
  hiddenGem:  createIcon("✨", "#A855F7"),
  attraction: createIcon("📍", "#14B8A6"),
  user:       createUserIcon(),
};

function getTransportIcon(title?: string): L.DivIcon {
  if (!title) return icons.transport;
  const t = title.toLowerCase();
  if (t.includes("flight") || t.includes("airport")) return icons.flight;
  if (t.includes("train") || t.includes("rail") || t.includes("metro")) return icons.train;
  if (t.includes("bus") || t.includes("coach")) return icons.bus;
  return icons.transport;
}

// ─── Color helpers ────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  hotel:     "#F97316",
  restaurant:"#22C55E",
  hiddenGem: "#A855F7",
  transport: "#3B82F6",
  sightseeing:"#14B8A6",
  activity:  "#14B8A6",
};

const TYPE_EMOJIS: Record<string, string> = {
  hotel: "🏨",
  restaurant: "🍽️",
  hiddenGem: "✨",
  transport: "🚗",
  sightseeing: "📍",
  activity: "📍",
};

// ─── Component ────────────────────────────────────────────
export default function TripMap({ trip, tripData, userLocation, showRoute, isTracking = false, onTrackingToggle, userPosition }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trackingMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [routePoints, setRoutePoints] = useState<Array<{ lat: number; lng: number; name: string; type: string }>>([]);
  const [isDark, setIsDark] = useState(false);

  // Accept both `trip` (from TripResultView Map tab) and `tripData` (from TrackingOverlay)
  const data = trip || tripData;

  // ─── Detect dark mode ─────────────────────────────────
  useEffect(() => {
    const check = () => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ─── Tile URLs: Carto Dark Matter (dark) / Carto Positron (light) ───
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove old tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
  }, [isDark]);

  // ─── Initialize map ───────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([19.076, 72.877], 5);

    // Default tiles (will be replaced by dark/light effect)
    const tileUrl = document.documentElement.classList.contains("dark")
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // ─── Plot markers and routes with colors ───────────────
  useEffect(() => {
    if (!mapRef.current || !data || !layersGroupRef.current) return;
    const map = mapRef.current;
    const group = layersGroupRef.current;

    group.clearLayers();
    const points: Array<{ lat: number; lng: number; name: string; type: string }> = [];

    // Collect all points by type for colored grouping
    const pointsByType: Record<string, Array<{ lat: number; lng: number; name: string }>> = {};

    // Days / Activities
    const days = data.days || [];
    days.forEach((day: any) => {
      (day.activities || []).forEach((act: any) => {
        if (act.lat && act.lng) {
          const isTransport = act.type === "transport";
          const icon = isTransport ? getTransportIcon(act.title) : icons.attraction;
          points.push({ lat: act.lat, lng: act.lng, name: act.title, type: act.type || "activity" });

          const type = isTransport ? "transport" : (act.type || "activity");
          if (!pointsByType[type]) pointsByType[type] = [];
          pointsByType[type].push({ lat: act.lat, lng: act.lng, name: act.title });

          const color = TYPE_COLORS[type] || "#14B8A6";
          const emoji = TYPE_EMOJIS[type] || "📍";

          L.marker([act.lat, act.lng], { icon, zIndexOffset: 500 })
            .addTo(group)
            .bindPopup(
              `<div style="min-width:160px; font-family:system-ui,sans-serif;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                  <span style="font-size:16px;">${emoji}</span>
                  <b style="color:#1a1a2e;">${act.title}</b>
                </div>
                <div style="color:#666; font-size:12px;">${act.time || ""}</div>
                <div style="color:#888; font-size:11px; margin-top:4px; line-height:1.4;">
                  ${(act.description || "").substring(0, 120)}${(act.description || "").length > 120 ? "..." : ""}
                </div>
              </div>`
            );
        }
      });
    });

    // Hotels
    (data.hotels || []).forEach((h: any) => {
      if (h.lat && h.lng) {
        points.push({ lat: h.lat, lng: h.lng, name: h.name, type: "hotel" });
        if (!pointsByType["hotel"]) pointsByType["hotel"] = [];
        pointsByType["hotel"].push({ lat: h.lat, lng: h.lng, name: h.name });

        L.marker([h.lat, h.lng], { icon: icons.hotel, zIndexOffset: 600 })
          .addTo(group)
          .bindPopup(
            `<div style="min-width:160px; font-family:system-ui,sans-serif;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:16px;">🏨</span>
                <b style="color:#1a1a2e;">${h.name}</b>
              </div>
              <div style="color:#F97316; font-size:12px; font-weight:600;">
                ${h.rating ? `⭐ ${h.rating} · ` : ""}
              </div>
              <div style="color:#888; font-size:11px;">${h.location || h.area || ""}</div>
            </div>`
          );
      }
    });

    // Restaurants
    (data.restaurants || []).forEach((r: any) => {
      if (r.lat && r.lng) {
        points.push({ lat: r.lat, lng: r.lng, name: r.name, type: "restaurant" });
        if (!pointsByType["restaurant"]) pointsByType["restaurant"] = [];
        pointsByType["restaurant"].push({ lat: r.lat, lng: r.lng, name: r.name });

        L.marker([r.lat, r.lng], { icon: icons.restaurant, zIndexOffset: 600 })
          .addTo(group)
          .bindPopup(
            `<div style="min-width:160px; font-family:system-ui,sans-serif;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:16px;">🍽️</span>
                <b style="color:#1a1a2e;">${r.name}</b>
              </div>
              <div style="color:#22C55E; font-size:12px; font-weight:600;">
                ${r.cuisine ? `${r.cuisine} · ` : ""}${r.rating ? `⭐ ${r.rating}` : ""}
              </div>
              <div style="color:#888; font-size:11px; margin-top:2px;">
                Must try: <b>${r.mustTry || "—"}</b>
              </div>
            </div>`
          );
      }
    });

    // Hidden Gems
    (data.hiddenGems || []).forEach((g: any) => {
      if (g.lat && g.lng) {
        points.push({ lat: g.lat, lng: g.lng, name: g.name, type: "hiddenGem" });
        if (!pointsByType["hiddenGem"]) pointsByType["hiddenGem"] = [];
        pointsByType["hiddenGem"].push({ lat: g.lat, lng: g.lng, name: g.name });

        L.marker([g.lat, g.lng], { icon: icons.hiddenGem, zIndexOffset: 700 })
          .addTo(group)
          .bindPopup(
            `<div style="min-width:160px; font-family:system-ui,sans-serif;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:16px;">✨</span>
                <b style="color:#1a1a2e;">${g.name}</b>
              </div>
              <div style="color:#888; font-size:11px; line-height:1.4;">
                ${(g.description || g.whySpecial || "").substring(0, 120)}
              </div>
              <div style="color:#A855F7; font-size:11px; font-weight:600; margin-top:4px;">Hidden Gem</div>
            </div>`
          );
      }
    });

    // ─── Draw colorful route lines ──────────────────────
    if (points.length > 1) {
      // Outer glow — indigo
      L.polyline(points.map((p) => [p.lat, p.lng]), {
        color: "#6366F1",
        weight: 8,
        opacity: 0.15,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);

      // Main dashed route — purple
      L.polyline(points.map((p) => [p.lat, p.lng]), {
        color: "#8B5CF6",
        weight: 3,
        opacity: 0.7,
        dashArray: "10, 14",
      }).addTo(group);

      // Colored dots at each point (small colored circles as waypoints)
      points.forEach((p, i) => {
        const color = TYPE_COLORS[p.type] || "#14B8A6";
        const dotIcon = L.divIcon({
          html: `<div style="
            width:8px; height:8px; border-radius:50%;
            background:${color};
            border:2px solid white;
            box-shadow: 0 0 6px ${color}80;
          "></div>`,
          className: "",
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });
        L.marker([p.lat, p.lng], { icon: dotIcon, zIndexOffset: 400, interactive: false }).addTo(group);
      });

      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
        padding: [60, 60],
        maxZoom: 14,
      });
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    }

    setRoutePoints(points);
  }, [data]);

  // ─── User position marker (golden dot) ──────────────────
  useEffect(() => {
    if (!mapRef.current || !layersGroupRef.current) return;

    if (userMarkerRef.current) {
      layersGroupRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    const pos = userPosition || userLocation;
    if (pos) {
      userMarkerRef.current = L.marker([pos.lat, pos.lng], {
        icon: icons.user,
        zIndexOffset: 1000,
      })
        .addTo(layersGroupRef.current)
        .bindPopup(
          `<div style="min-width:120px; font-family:system-ui,sans-serif;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">👤</span>
              <b style="color:#1a1a2e;">Your Location</b>
            </div>
            <div style="color:#888; font-size:11px; margin-top:4px;">
              ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}
            </div>
          </div>`
        );
    }
  }, [userPosition, userLocation]);

  // ─── Notification permission ───────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ─── Tracking animation ───────────────────────────────
  useEffect(() => {
    if (!isTracking || routePoints.length < 2 || !mapRef.current || !layersGroupRef.current) return;
    const map = mapRef.current;
    const group = layersGroupRef.current;

    const trackingDot = L.marker([routePoints[0].lat, routePoints[0].lng], {
      icon: icons.user,
      zIndexOffset: 1500,
    }).addTo(group);

    // Tracking trail line — golden
    const trailLine = L.polyline([[routePoints[0].lat, routePoints[0].lng]], {
      color: "#FBBF24",
      weight: 4,
      opacity: 0.8,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(group);

    let currentIndex = 0;
    let step = 0;
    const totalStepsBetweenPoints = 80;
    let lastNotifiedIndex = -1;

    const animate = () => {
      if (currentIndex >= routePoints.length - 1) {
        group.removeLayer(trackingDot);
        group.removeLayer(trailLine);
        onTrackingToggle?.();
        return;
      }
      const start = routePoints[currentIndex];
      const end = routePoints[currentIndex + 1];
      const progress = step / totalStepsBetweenPoints;
      const currentLat = start.lat + (end.lat - start.lat) * progress;
      const currentLng = start.lng + (end.lng - start.lng) * progress;

      trackingDot.setLatLng([currentLat, currentLng]);

      // Update trail
      const pts = trailLine.getLatLngs() as L.LatLng[];
      pts.push(L.latLng(currentLat, currentLng));
      trailLine.setLatLngs(pts);

      // Throttled panning
      if (step % 3 === 0) {
        map.panTo([currentLat, currentLng], { animate: true, duration: 0.4 });
      }

      step++;

      if (step >= totalStepsBetweenPoints) {
        currentIndex++;
        step = 0;
        if (currentIndex !== lastNotifiedIndex && currentIndex < routePoints.length) {
          lastNotifiedIndex = currentIndex;
          const arrivedAt = routePoints[currentIndex];
          const emoji = TYPE_EMOJIS[arrivedAt.type] || "📍";
          const notifText = `Arrived at ${emoji} ${arrivedAt.name}`;
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Wandr Journey Update", { body: notifText });
          }
        }
      }
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      group.removeLayer(trackingDot);
      group.removeLayer(trailLine);
    };
  }, [isTracking, routePoints]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border/30">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* Legend — adaptive glass card */}
      <div className={`absolute top-4 left-4 z-10 p-3.5 rounded-2xl border text-xs space-y-2 shadow-lg backdrop-blur-xl ${
        isDark
          ? "bg-black/60 border-white/10 text-white"
          : "bg-white/90 border-gray-200/60 text-gray-700"
      }`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-gray-400" : "text-gray-400"}`}>Map Legend</p>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-[12px] shadow-sm shadow-blue-500/30">✈️</span>
          <span className="font-medium">Transport</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-[12px] shadow-sm shadow-orange-500/30">🏨</span>
          <span className="font-medium">Hotels</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-[12px] shadow-sm shadow-green-500/30">🍽️</span>
          <span className="font-medium">Restaurants</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 text-[12px] shadow-sm shadow-purple-500/30">✨</span>
          <span className="font-medium">Hidden Gems</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-500 text-[12px] shadow-sm shadow-teal-500/30">📍</span>
          <span className="font-medium">Attractions</span>
        </div>
        {(userPosition || userLocation || isTracking) && (
          <div className={`flex items-center gap-2.5 mt-2 pt-2 border-t ${isDark ? "border-white/10" : "border-gray-200/60"}`}>
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
          <div className="flex items-center gap-2 text-green-400 font-bold mt-2 pt-2 border-t border-white/10 animate-pulse">
            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
            Live Tracking Active
          </div>
        )}
      </div>
    </div>
  );
}
