'use client';
import { useEffect, useRef } from 'react';
import type { GeneratedTrip, TripFormData } from '@/types';

interface Props {
  trip: GeneratedTrip;
  formData: TripFormData;
  userLocation?: { lat: number; lng: number } | null;
  showRoute?: boolean;
}

export function TripMap({ trip, userLocation, showRoute = false }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    import('leaflet').then((L: any) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      let centerLat = 20.5937;
      let centerLng = 78.9629;
      let zoom = 5;

      const firstActivity = trip.days?.[0]?.activities?.find((a: any) => a.lat && a.lng);
      if (firstActivity?.lat && firstActivity?.lng) {
        centerLat = firstActivity.lat;
        centerLng = firstActivity.lng;
        zoom = 12;
      } else if (trip.hotels?.[0]?.lat && trip.hotels?.[0]?.lng) {
        centerLat = trip.hotels[0].lat;
        centerLng = trip.hotels[0].lng;
        zoom = 12;
      }

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.setView([centerLat, centerLng], zoom);

      const bounds: [number, number][] = [];

      const createIcon = (emoji: string, color: string) =>
        L.divIcon({
          html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });

      (trip.hotels ?? []).forEach((hotel: any) => {
        if (!hotel.lat || !hotel.lng) return;
        bounds.push([hotel.lat, hotel.lng]);
        L.marker([hotel.lat, hotel.lng], { icon: createIcon('🏨', '#a67040') })
          .addTo(map)
          .bindPopup(`<b>${hotel.name}</b><br/>${hotel.type}<br/>⭐ ${hotel.rating}`);
      });

      (trip.restaurants ?? []).forEach((r: any) => {
        if (!r.lat || !r.lng) return;
        bounds.push([r.lat, r.lng]);
        L.marker([r.lat, r.lng], { icon: createIcon('🍽️', '#f5681a') })
          .addTo(map)
          .bindPopup(`<b>${r.name}</b><br/>${r.cuisine}<br/>💰 ${r.priceRange}`);
      });

      (trip.hiddenGems ?? []).forEach((gem: any) => {
        if (!gem.lat || !gem.lng) return;
        bounds.push([gem.lat, gem.lng]);
        L.marker([gem.lat, gem.lng], { icon: createIcon('✨', '#1a9951') })
          .addTo(map)
          .bindPopup(`<b>${gem.name}</b><br/>${gem.description}<br/>💡 ${gem.insiderTip}`);
      });

      (trip.days ?? []).forEach((day: any) => {
        (day.activities ?? []).forEach((act: any) => {
          if (!act.lat || !act.lng) return;
          bounds.push([act.lat, act.lng]);
          const emoji =
            act.type === 'SIGHTSEEING' ? '📸' : act.type === 'TRANSPORT' ? '🚌' : '📍';
          L.marker([act.lat, act.lng], { icon: createIcon(emoji, '#1e7fc4') })
            .addTo(map)
            .bindPopup(
              `<b>${act.title}</b><br/>⏰ ${act.time} · ${act.duration}m<br/>${act.description.slice(0, 100)}...`
            );
        });
      });

      if (userLocation) {
        bounds.push([userLocation.lat, userLocation.lng]);
        L.marker([userLocation.lat, userLocation.lng], {
          icon: createIcon('📍', '#e63946'),
        })
          .addTo(map)
          .bindPopup('Your current location')
          .openPopup();
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds as any, { padding: [40, 40] });
      }

      if (showRoute && bounds.length > 1) {
        L.polyline(bounds as any, {
          color: '#a67040',
          weight: 3,
          opacity: 0.6,
          dashArray: '8 6',
        }).addTo(map);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [trip, userLocation, showRoute]);

  return (
    <div className="space-y-4">
      <div className="glass-card overflow-hidden rounded-3xl">
        <div ref={mapRef} className="w-full" style={{ height: '520px' }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { emoji: '🏨', label: 'Hotels', count: trip.hotels?.length ?? 0 },
          { emoji: '🍽️', label: 'Restaurants', count: trip.restaurants?.length ?? 0 },
          { emoji: '✨', label: 'Hidden Gems', count: trip.hiddenGems?.length ?? 0 },
          {
            emoji: '📍',
            label: 'Activities',
            count: trip.days?.reduce((a: number, d: any) => a + (d.activities?.length ?? 0), 0) ?? 0,
          },
        ].map(({ emoji, label, count }: { emoji: string; label: string; count: number }) => (
          <div key={label} className="glass-panel rounded-2xl px-4 py-3 text-center">
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-lg font-bold text-foreground">{count}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
