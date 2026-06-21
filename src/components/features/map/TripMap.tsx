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
  tripData: any;
  isTracking?: boolean;
  onTrackingToggle?: () => void;
  userPosition?: { lat: number; lng: number } | null;
}

// ─── Custom icon factory ──────────────────────────────────
// All icons: 36x36px, colored circle, white halo, emoji glyph, high z-index

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
        box-shadow: 0 0 0 2px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.3);
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
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(255,215,0,0.4), 0 0 16px rgba(255,215,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
        z-index: 2000;
        animation: userPulse 2s ease-in-out infinite;
      ">
        <style>
          @keyframes userPulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(255,215,0,0.4), 0 0 16px rgba(255,215,0,0.5), 0 2px 8px rgba(0,0,0,0.3); }
            50% { box-shadow: 0 0 0 6px rgba(255,215,0,0.2), 0 0 28px rgba(255,215,0,0.7), 0 2px 12px rgba(0,0,0,0.3); }
          }
        </style>
        👤
      </div>
    `,
    className: "",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -25],
  });
}

// ─── Icon instances ───────────────────────────────────────
const icons = {
  flight:     createIcon("✈️", "#3B82F6"),  // Blue — flights
  train:      createIcon("🚆", "#3B82F6"),  // Blue — trains
  bus:        createIcon("🚌", "#3B82F6"),  // Blue — buses
  transport:  createIcon("🚗", "#3B82F6"),  // Blue — generic transport
  hotel:      createIcon("🏨", "#F97316"),  // Orange — hotels
  restaurant: createIcon("🍽️", "#22C55E"),  // Green — restaurants
  hiddenGem:  createIcon("✨", "#A855F7"),  // Purple — hidden gems
  attraction: createIcon("📍", "#14B8A6"),  // Teal — attractions/activities
  user:       createUserIcon(),              // Gold — user location
};

function getTransportIcon(title?: string): L.DivIcon {
  if (!title) return icons.transport;
  const t = title.toLowerCase();
  if (t.includes("flight") || t.includes("airport")) return icons.flight;
  if (t.includes("train") || t.includes("rail") || t.includes("metro")) return icons.train;
  if (t.includes("bus") || t.includes("coach")) return icons.bus;
  return icons.transport;
}

// ─── Component ────────────────────────────────────────────
export default function TripMap({ tripData, isTracking = false, onTrackingToggle, userPosition }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trackingMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [routePoints, setRoutePoints] = useState<Array<{ lat: number; lng: number; name: string; type: string }>>([]);

  // ─── Initialize map ────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([19.076, 72.877], 5);

    // Dark-themed tile layer for better icon contrast
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersGroupRef.current = null;
    };
  }, []);

  // ─── Plot markers and routes ────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !tripData || !layersGroupRef.current) return;
    const map = mapRef.current;
    const group = layersGroupRef.current;

    group.clearLayers();
    const points: Array<{ lat: number; lng: number; name: string; type: string }> = [];

    // Days / Activities
    const days = tripData.days || [];
    days.forEach((day: any) => {
      (day.activities || []).forEach((act: any) => {
        if (act.lat && act.lng) {
          const isTransport = act.type === "transport";
          const icon = isTransport ? getTransportIcon(act.title) : icons.attraction;
          points.push({ lat: act.lat, lng: act.lng, name: act.title, type: act.type || "activity" });
          L.marker([act.lat, act.lng], { icon, zIndexOffset: 500 })
            .addTo(group)
            .bindPopup(
              `<div style="min-width:160px"><b>${isTransport ? "🚗" : "📍"} ${act.title}</b><br>` +
              `<span style="color:#888">${act.time || ""}</span><br>` +
              `<small>${(act.description || "").substring(0, 100)}${(act.description || "").length > 100 ? "..." : ""}</small></div>`
            );
        }
      });
    });

    // Hotels
    (tripData.hotels || []).forEach((h: any) => {
      if (h.lat && h.lng) {
        points.push({ lat: h.lat, lng: h.lng, name: h.name, type: "hotel" });
        L.marker([h.lat, h.lng], { icon: icons.hotel, zIndexOffset: 600 })
          .addTo(group)
          .bindPopup(
            `<div style="min-width:160px"><b>🏨 ${h.name}</b><br>` +
            `${h.rating ? `⭐ ${h.rating} · ` : ""}` +
            `<small>${h.location || h.area || ""}</small></div>`
          );
      }
    });

    // Restaurants
    (tripData.restaurants || []).forEach((r: any) => {
      if (r.lat && r.lng) {
        points.push({ lat: r.lat, lng: r.lng, name: r.name, type: "restaurant" });
        L.marker([r.lat, r.lng], { icon: icons.restaurant, zIndexOffset: 600 })
          .addTo(group)
          .bindPopup(
            `<div style="min-width:160px"><b>🍽️ ${r.name}</b><br>` +
            `${r.cuisine ? `${r.cuisine} · ` : ""}` +
            `${r.rating ? `⭐ ${r.rating}<br>` : ""}` +
            `<small>Must try: ${r.mustTry || "—"}</small></div>`
          );
      }
    });

    // Hidden Gems
    (tripData.hiddenGems || []).forEach((g: any) => {
      if (g.lat && g.lng) {
        points.push({ lat: g.lat, lng: g.lng, name: g.name, type: "hiddenGem" });
        L.marker([g.lat, g.lng], { icon: icons.hiddenGem, zIndexOffset: 700 })
          .addTo(group)
          .bindPopup(
            `<div style="min-width:160px"><b>✨ ${g.name}</b><br>` +
            `<small>${(g.description || g.whySpecial || "").substring(0, 100)}</small><br>` +
            `<em style="color:#A855F7">Hidden Gem</em></div>`
          );
      }
    });

    // Draw route polyline connecting all points
    if (points.length > 1) {
      L.polyline(points.map((p) => [p.lat, p.lng]), {
        color: "#3B82F6",
        weight: 3,
        opacity: 0.6,
        dashArray: "8, 12",
      }).addTo(group);

      // Also draw a subtle filled polyline for the route path
      L.polyline(points.map((p) => [p.lat, p.lng]), {
        color: "#60A5FA",
        weight: 6,
        opacity: 0.15,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);

      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
        padding: [60, 60],
        maxZoom: 14,
      });
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    }

    setRoutePoints(points);
  }, [tripData]);

  // ─── User position marker (golden dot) ──────────────────
  useEffect(() => {
    if (!mapRef.current || !layersGroupRef.current) return;

    // Remove old user marker
    if (userMarkerRef.current) {
      layersGroupRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userPosition) {
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], {
        icon: icons.user,
        zIndexOffset: 1000,
      })
        .addTo(layersGroupRef.current)
        .bindPopup(
          `<div style="min-width:120px"><b>👤 Your Location</b><br>` +
          `<small>${userPosition.lat.toFixed(4)}, ${userPosition.lng.toFixed(4)}</small></div>`
        );
    }
  }, [userPosition]);

  // ─── Tracking animation ─────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isTracking || routePoints.length < 2 || !mapRef.current || !layersGroupRef.current) return;
    const map = mapRef.current;
    const group = layersGroupRef.current;

    const trackingDot = L.marker([routePoints[0].lat, routePoints[0].lng], {
      icon: icons.user,
      zIndexOffset: 1500,
    }).addTo(group);

    let currentIndex = 0;
    let step = 0;
    const totalStepsBetweenPoints = 80;
    let lastNotifiedIndex = -1;

    const animate = () => {
      if (currentIndex >= routePoints.length - 1) {
        group.removeLayer(trackingDot);
        onTrackingToggle?.();
        return;
      }
      const start = routePoints[currentIndex];
      const end = routePoints[currentIndex + 1];
      const progress = step / totalStepsBetweenPoints;
      const currentLat = start.lat + (end.lat - start.lat) * progress;
      const currentLng = start.lng + (end.lng - start.lng) * progress;

      trackingDot.setLatLng([currentLat, currentLng]);
      map.panTo([currentLat, currentLng], { animate: true, duration: 0.5 });
      step++;

      if (step >= totalStepsBetweenPoints) {
        currentIndex++;
        step = 0;
        if (currentIndex !== lastNotifiedIndex && currentIndex < routePoints.length) {
          lastNotifiedIndex = currentIndex;
          const arrivedAt = routePoints[currentIndex];
          let emoji = "📍";
          if (arrivedAt.type === "hotel") emoji = "🏨";
          if (arrivedAt.type === "restaurant") emoji = "🍽️";
          if (arrivedAt.type === "hiddenGem") emoji = "✨";
          if (arrivedAt.type === "transport") emoji = "🚗";
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
    };
  }, [isTracking, routePoints]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-white/10">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs space-y-1.5 font-medium shadow-lg">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#3B82F6] text-[12px]">✈️</span>
          <span className="text-white/80">Transport</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F97316] text-[12px]">🏨</span>
          <span className="text-white/80">Hotels</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#22C55E] text-[12px]">🍽️</span>
          <span className="text-white/80">Restaurants</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#A855F7] text-[12px]">✨</span>
          <span className="text-white/80">Hidden Gems</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#14B8A6] text-[12px]">📍</span>
          <span className="text-white/80">Attractions</span>
        </div>
        {(userPosition || isTracking) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[14px]"
              style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 8px rgba(255,215,0,0.5)" }}>
              👤
            </span>
            <span className="text-yellow-300 font-bold">Your Location</span>
          </div>
        )}
        {isTracking && (
          <div className="flex items-center gap-2 text-green-400 font-bold mt-2 pt-2 border-t border-white/20 animate-pulse">
            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
            Live Tracking Active
          </div>
        )}
      </div>
    </div>
  );
}
