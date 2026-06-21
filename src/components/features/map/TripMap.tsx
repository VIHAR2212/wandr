"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Next.js Leaflet Icon Bug
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
}

export default function TripMap({ tripData, isTracking = false, onTrackingToggle }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trackingMarkerRef = useRef<L.CircleMarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [routePoints, setRoutePoints] = useState<Array<{lat: number, lng: number, name: string, type: string}>>([]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([19.076, 72.877], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Plot Data & Build Route
  useEffect(() => {
    if (!mapRef.current || !tripData) return;
    const map = mapRef.current;
    
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const points: Array<{lat: number, lng: number, name: string, type: string}> = [];

    const hotelIcon = new L.DivIcon({ html: `<div style="background:#8b5cf6;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5)">🏨</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
    const restoIcon = new L.DivIcon({ html: `<div style="background:#ef4444;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5)">🍽️</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
    const attrIcon = new L.DivIcon({ html: `<div style="background:#3b82f6;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5)">📍</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });

    const itinerary = tripData.itinerary || [];
    itinerary.forEach((day: any) => {
      (day.activities || []).forEach((act: any) => {
        if (act.lat && act.lng) {
          points.push({ lat: act.lat, lng: act.lng, name: act.title, type: 'activity' });
          L.marker([act.lat, act.lng], { icon: attrIcon })
            .addTo(map)
            .bindPopup(`<b>${act.title}</b><br>${act.time}<br><small>${act.description?.substring(0, 80)}...</small>`);
        }
      });
    });

    (tripData.hotels || []).forEach((h: any) => {
      if (h.lat && h.lng) {
        points.push({ lat: h.lat, lng: h.lng, name: h.name, type: 'hotel' });
        L.marker([h.lat, h.lng], { icon: hotelIcon })
          .addTo(map)
          .bindPopup(`<b>🏨 ${h.name}</b><br>₹${h.pricePerNight}/night<br><small>${h.description}</small>`);
      }
    });

    (tripData.restaurants || []).forEach((r: any) => {
      if (r.lat && r.lng) {
        points.push({ lat: r.lat, lng: r.lng, name: r.name, type: 'restaurant' });
        L.marker([r.lat, r.lng], { icon: restoIcon })
          .addTo(map)
          .bindPopup(`<b>🍽️ ${r.name}</b><br>Cuisine: ${r.cuisine}<br>Must Try: ${r.mustTry}`);
      }
    });

    if (points.length > 1) {
      L.polyline(points.map(p => [p.lat, p.lng]), { color: '#3b82f6', weight: 4, dashArray: '10, 10' }).addTo(map);
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [50, 50] });
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    }

    setRoutePoints(points);

  }, [tripData]);

  // 3. Request Notification Permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 4. Live Tracking Simulation Logic
  useEffect(() => {
    if (!isTracking || routePoints.length < 2 || !mapRef.current) return;

    const map = mapRef.current;
    
    const trackingDot = L.circleMarker([routePoints[0].lat, routePoints[0].lng], {
      radius: 10,
      color: '#ffffff',
      fillColor: '#10b981',
      fillOpacity: 1,
      weight: 4
    }).addTo(map);
    
    trackingMarkerRef.current = trackingDot;

    let currentIndex = 0;
    let step = 0;
    const totalStepsBetweenPoints = 60; // Frames to move from A to B
    let lastNotifiedIndex = -1;

    const animate = () => {
      if (currentIndex >= routePoints.length - 1) {
        if (trackingMarkerRef.current) map.removeLayer(trackingMarkerRef.current);
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
          if (arrivedAt.type === 'hotel') emoji = "🏨";
          if (arrivedAt.type === 'restaurant') emoji = "🍽️";
          
          const notifText = `Arrived at ${emoji} ${arrivedAt.name}`;
          
          if (Notification.permission === "granted") {
            new Notification("Wandr Journey Update", { body: notifText });
          }
          alert(`✅ Journey Update:\n${notifText}`);
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (trackingMarkerRef.current) map.removeLayer(trackingMarkerRef.current);
    };
  }, [isTracking, routePoints]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-white/10">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />
      
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs space-y-1.5 font-medium">
        <div className="flex items-center gap-2"><span className="text-base">📍</span> Attractions</div>
        <div className="flex items-center gap-2"><span className="text-base">🏨</span> Hotels</div>
        <div className="flex items-center gap-2"><span className="text-base">🍽️</span> Restaurants</div>
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
