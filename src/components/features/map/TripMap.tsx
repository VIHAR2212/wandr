"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

/* ─── Stop shape (all optional — AI output varies wildly) ─── */
interface Stop {
  name?: string;
  lat?: number;
  lng?: number;
  type?: string;
  day?: number;
  description?: string;
  time?: string;
  duration?: string;
  locationName?: string;
}

interface TripMapProps {
  trip: any;
}

/* ─── Color map ─── */
const TYPE_COLORS: Record<string, string> = {
  attraction: "#f59e0b",
  hotel: "#3b82f6",
  restaurant: "#ef4444",
  cafe: "#a855f7",
  shopping: "#ec4899",
  transport: "#6b7280",
  activity: "#10b981",
  museum: "#f59e0b",
  temple: "#f59e0b",
  park: "#10b981",
  sightseeing: "#f59e0b",
  beach: "#06b6d4",
  default: "#f97316",
};

function getColor(type: string): string {
  const t = (type || "").toLowerCase();
  for (const [key, val] of Object.entries(TYPE_COLORS)) {
    if (t.includes(key)) return val;
  }
  return TYPE_COLORS.default;
}

/* ─── Free geocoder (Nominatim, no API key, 1 req/s) ─── */
const geoCache = new Map<string, [number, number] | null>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodePlace(
  name: string,
  context?: string
): Promise<[number, number] | null> {
  const query = (context ? `${name}, ${context}` : name).toLowerCase().trim();
  if (geoCache.has(query)) return geoCache.get(query) || null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "WandrAI/1.0 (wandr-inky.vercel.app)" } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const coords: [number, number] = [Number(data[0].lon), Number(data[0].lat)];
      geoCache.set(query, coords);
      return coords;
    }
  } catch (_) {
    /* network error */
  }
  geoCache.set(query, null);
  return null;
}

/* ─────────────────────────────────────────────────────────────
   extractRawItems — pulls ALL stop-like items from any trip shape,
   INCLUDING those missing coordinates (so we can geocode them).
   Returns items with their resolved coords + original name.
───────────────────────────────────────────────────────────── */
interface RawItem {
  name: string;
  lat: number | null;
  lng: number | null;
  type: string;
  day: number | null;
  description: string;
  time: string;
  duration: string;
}

function extractRawItems(trip: any): RawItem[] {
  if (!trip) return [];

  function resolveCoords(s: any): [number | null, number | null] {
    const nested = s?.location && typeof s.location === "object" ? s.location : s?.geo || s?.position || s?.coords || null;
    if (nested) {
      const nLat = nested.lat ?? nested.latitude ?? null;
      const nLng = nested.lng ?? nested.lon ?? nested.long ?? nested.longitude ?? null;
      if (nLat != null && nLng != null) {
        const la = Number(nLat);
        const lo = Number(nLng);
        if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];
      }
    }
    const dLat = s?.lat ?? s?.latitude ?? null;
    const dLng = s?.lng ?? s?.lon ?? s?.long ?? s?.longitude ?? null;
    if (dLat != null && dLng != null) {
      const la = Number(dLat);
      const lo = Number(dLng);
      if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];
    }
    if (Array.isArray(s?.coordinates) && s.coordinates.length >= 2) {
      const lo = Number(s.coordinates[0]);
      const la = Number(s.coordinates[1]);
      if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];
    }
    if (Array.isArray(s?.latlng) && s.latlng.length >= 2) {
      const la = Number(s.latlng[0]);
      const lo = Number(s.latlng[1]);
      if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];
    }
    return [null, null];
  }

  function mapItem(s: any, i: number, dayNum: number | null): RawItem {
    const [lat, lng] = resolveCoords(s);
    const locStr = typeof s?.location === "string" ? s.location : "";
    return {
      name: s?.name || s?.title || s?.place || s?.placeName || s?.attraction || locStr || `Stop ${i + 1}`,
      lat,
      lng,
      type: s?.type || s?.category || s?.placeType || "attraction",
      day: dayNum,
      description: s?.description || s?.details || "",
      time: s?.time || s?.startTime || "",
      duration: s?.duration || "",
    };
  }

  const result: RawItem[] = [];
  const dayArray: any[] = trip?.itinerary || trip?.days || trip?.schedule || [];

  if (Array.isArray(dayArray) && dayArray.length > 0) {
    for (const day of dayArray) {
      const dayNum = day?.day ?? day?.dayNumber ?? day?.dayNum ?? day?.number ?? null;
      const items: any[] = day?.stops || day?.activities || day?.items || day?.places || [];
      for (let i = 0; i < items.length; i++) {
        result.push(mapItem(items[i], i, dayNum));
      }
    }
  } else if (Array.isArray(trip?.stops)) {
    for (let i = 0; i < trip.stops.length; i++) {
      result.push(mapItem(trip.stops[i], i, trip.stops[i]?.day ?? null));
    }
  } else if (Array.isArray(trip?.places)) {
    for (let i = 0; i < trip.places.length; i++) {
      result.push(mapItem(trip.places[i], i, null));
    }
  }

  return result;
}

/* ══════════════════════════════════════════════════════════════════ */
export default function TripMap({ trip }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mlRef = useRef<any>(null);
  const initDoneRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [stopsReady, setStopsReady] = useState<Stop[]>([]);

  /* ── Step 1: Extract raw items + geocode missing coords ── */
  useEffect(() => {
    if (!mounted) return;

    const rawItems = extractRawItems(trip);
    if (rawItems.length === 0) {
      setLoading(false);
      const shape = trip ? `Keys: ${Object.keys(trip).join(", ")}` : "trip is null";
      setError(`No stops found. ${shape}`);
      return;
    }

    const needsGeo = rawItems.filter((r) => r.lat === null || r.lng === null);

    if (needsGeo.length === 0) {
      /* All stops already have coords — map immediately */
      setStopsReady(
        rawItems.map((r) => ({
          name: r.name,
          lat: r.lat!,
          lng: r.lng!,
          type: r.type,
          day: r.day ?? undefined,
          description: r.description,
          time: r.time,
          duration: r.duration,
        }))
      );
      return;
    }

    /* Geocode stops that are missing coords */
    const context = typeof trip?.destination === "string" ? trip.destination : "";
    let cancelled = false;

    (async () => {
      for (let i = 0; i < needsGeo.length; i++) {
        if (cancelled) return;
        const item = needsGeo[i];
        setGeoStatus(`Geocoding ${i + 1}/${needsGeo.length}: ${item.name}`);
        const coords = await geocodePlace(item.name, context || undefined);
        if (coords && !cancelled) {
          item.lat = coords[1];
          item.lng = coords[0];
        }
        if (i < needsGeo.length - 1) await sleep(1100);
      }

      if (!cancelled) {
        setGeoStatus(null);
        const withCoords = rawItems.filter((r) => r.lat !== null && r.lng !== null);
        if (withCoords.length === 0) {
          setLoading(false);
          setError("Could not find coordinates for any stops. The place names may not be recognized.");
          return;
        }
        setStopsReady(
          withCoords.map((r) => ({
            name: r.name,
            lat: r.lat!,
            lng: r.lng!,
            type: r.type,
            day: r.day ?? undefined,
            description: r.description,
            time: r.time,
            duration: r.duration,
          }))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, trip]);

  /* ── Step 2: Derived state from stopsReady ── */
  const validStops = stopsReady.filter(
    (s) => !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)) && Number(s.lat) !== 0 && Number(s.lng) !== 0
  );

  const days = Array.from(
    new Set(stopsReady.map((s) => s.day).filter((d): d is number => d != null))
  ).sort((a, b) => a - b);

  const filteredStops = validStops.filter((s) => {
    if (activeDay !== null && s.day !== activeDay) return false;
    if (activeTypes.size > 0 && !activeTypes.has((s.type || "").toLowerCase())) return false;
    return true;
  });

  const allTypes = Array.from(new Set(validStops.map((s) => (s.type || "").toLowerCase())));

  /* ── Mounted guard ── */
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  /* ── Inject MapLibre CSS ── */
  useEffect(() => {
    if (!mounted) return;
    const id = "maplibre-css-tripmap";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@5.2.0/dist/maplibre-gl.css";
    document.head.appendChild(link);
  }, [mounted]);

  /* ── Update map sources when filters change ── */
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
    try {
      const stopsSrc = map.getSource("stops") as any;
      if (stopsSrc) {
        stopsSrc.setData({
          type: "FeatureCollection",
          features: filteredStops.map((s, i) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [Number(s.lng), Number(s.lat)] as [number, number],
            },
            properties: {
              id: i,
              name: s.name,
              type: s.type,
              day: s.day,
              description: s.description,
              time: s.time,
              duration: s.duration,
              color: getColor(s.type || ""),
            },
          })),
        });
      }

      const routesSrc = map.getSource("routes") as any;
      if (routesSrc) {
        routesSrc.setData({
          type: "FeatureCollection",
          features:
            filteredStops.length > 1
              ? filteredStops.slice(0, -1).map((s, i) => ({
                  type: "Feature" as const,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: [
                      [Number(s.lng), Number(s.lat)] as [number, number],
                      [Number(filteredStops[i + 1].lng), Number(filteredStops[i + 1].lat)] as [number, number],
                    ],
                  },
                  properties: { color: getColor(s.type || "") },
                }))
              : [],
        });
      }

      if (filteredStops.length > 0) {
        const bounds = new ml.LngLatBounds();
        filteredStops.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      }
    } catch (e) {
      console.error("Map layer update error:", e);
    }
  }, [filteredStops]);

  useEffect(() => {
    if (!mounted || !mapRef.current) return;
    updateMapLayers();
  }, [mounted, filteredStops, updateMapLayers]);

  /* ── Step 3: Init map (runs after geocoding finishes) ── */
  useEffect(() => {
    if (!mounted) return;
    if (initDoneRef.current) return;
    if (!containerRef.current) return;
    /* Wait until geocoding is done and stops are available */
    if (stopsReady.length === 0) return;
    if (geoStatus) return;

    if (validStops.length === 0) {
      setLoading(false);
      setError("No valid stops with coordinates found after geocoding.");
      return;
    }

    initDoneRef.current = true;
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError("Map took too long to load. Check your connection and refresh.");
      }
    }, 15000);

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        mlRef.current = maplibregl;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
          center: [Number(validStops[0].lng), Number(validStops[0].lat)] as [number, number],
          zoom: 2,
          attributionControl: false,
        });

        mapRef.current = map;

        try {
          (map as any).setProjection({ type: "globe" });
        } catch (_) {
          /* flat map fallback */
        }

        const finishLoading = (errMsg?: string) => {
          clearTimeout(timeout);
          if (!cancelled) {
            setLoading(false);
            if (errMsg) setError(errMsg);
          }
        };

        map.on("load", () => {
          finishLoading();
          if (cancelled) return;

          try {
            map.addSource("stops", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: validStops.map((s, i) => ({
                  type: "Feature" as const,
                  geometry: {
                    type: "Point" as const,
                    coordinates: [Number(s.lng), Number(s.lat)] as [number, number],
                  },
                  properties: {
                    id: i,
                    name: s.name,
                    type: s.type,
                    day: s.day,
                    description: s.description,
                    time: s.time,
                    duration: s.duration,
                    color: getColor(s.type || ""),
                  },
                })),
              },
            });

            map.addLayer({
              id: "stops-circle",
              type: "circle",
              source: "stops",
              paint: {
                "circle-radius": 7,
                "circle-color": ["get", "color"],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              },
            });

            map.addLayer({
              id: "stops-label",
              type: "symbol",
              source: "stops",
              layout: {
                "text-field": ["get", "name"],
                "text-size": 12,
                "text-offset": [0, 1.8],
                "text-anchor": "top",
                "text-optional": true,
              },
              paint: {
                "text-color": "#e5e7eb",
                "text-halo-color": "#000000",
                "text-halo-width": 1,
              },
            });

            map.addSource("routes", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features:
                  validStops.length > 1
                    ? validStops.slice(0, -1).map((s, i) => ({
                        type: "Feature" as const,
                        geometry: {
                          type: "LineString" as const,
                          coordinates: [
                            [Number(s.lng), Number(s.lat)] as [number, number],
                            [Number(validStops[i + 1].lng), Number(validStops[i + 1].lat)] as [number, number],
                          ],
                        },
                        properties: { color: getColor(s.type || "") },
                      }))
                    : [],
              },
            });

            map.addLayer({
              id: "routes-line",
              type: "line",
              source: "routes",
              layout: {
                "line-cap": "round",
                "line-join": "round",
              },
              paint: {
                "line-color": ["get", "color"],
                "line-width": 2.5,
                "line-opacity": 0.8,
                "line-dasharray": [2, 2],
              },
            });

            if (validStops.length > 1) {
              const bounds = new maplibregl.LngLatBounds();
              validStops.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
              map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1500 });
            }
          } catch (layerErr) {
            console.error("Layer setup error:", layerErr);
          }
        });

        map.on("error", (e: any) => {
          console.error("MapLibre error:", e);
          finishLoading("Failed to load map style. Check your connection.");
        });

        map.on("click", "stops-circle", (e: any) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          const dayLabel = props.day != null ? `Day ${props.day}` : "";
          const color = props.color || "#f97316";
          const html = `
            <div style="color:#111;font-family:system-ui,sans-serif;max-width:260px;">
              <span style="display:inline-block;background:${color};color:#fff;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;margin-bottom:6px;">${dayLabel}</span>
              <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${props.name || ""}</div>
              ${props.type ? `<div style="font-size:12px;color:#666;margin-bottom:4px;">${props.type}</div>` : ""}
              ${props.time ? `<div style="font-size:12px;color:#888;">${props.time}${props.duration ? ` · ${props.duration}` : ""}</div>` : ""}
              ${props.description ? `<div style="font-size:12px;color:#555;margin-top:6px;">${props.description}</div>` : ""}
            </div>`;
          new (mlRef.current as any).Popup({ offset: 14, maxWidth: "280px" })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        });

        map.on("mouseenter", "stops-circle", () => {
          if (map.getCanvas()) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "stops-circle", () => {
          if (map.getCanvas()) map.getCanvas().style.cursor = "";
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(
          new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
          }),
          "bottom-right"
        );
      } catch (err) {
        clearTimeout(timeout);
        if (!cancelled) {
          setLoading(false);
          setError("Failed to initialize map. Please refresh.");
          console.error("Map init error:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (_) {
          /* noop */
        }
        mapRef.current = null;
        initDoneRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, stopsReady, geoStatus, validStops]);

  /* ── Toolbar helpers ── */
  function handleZoomIn() {
    if (mapRef.current) {
      mapRef.current.easeTo({ zoom: (mapRef.current.getZoom() || 0) + 1, duration: 350 });
    }
  }

  function handleZoomOut() {
    if (mapRef.current) {
      mapRef.current.easeTo({ zoom: Math.max(1, (mapRef.current.getZoom() || 0) - 1), duration: 350 });
    }
  }

  function handleResetView() {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml || validStops.length === 0) return;
    try {
      const bounds = new ml.LngLatBounds();
      validStops.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
    } catch (_) {
      /* noop */
    }
  }

  function handle3DToggle() {
    if (!mapRef.current) return;
    try {
      const current = mapRef.current.getPitch();
      mapRef.current.easeTo({ pitch: current > 0 ? 0 : 60, duration: 800 });
    } catch (_) {
      /* noop */
    }
  }

  function handleLocate() {
    if (!mapRef.current || validStops.length === 0) return;
    mapRef.current.flyTo({
      center: [Number(validStops[0].lng), Number(validStops[0].lat)] as [number, number],
      zoom: 12,
      duration: 1500,
    });
  }

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  /* ══════════════ RENDER ══════════════ */
  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-900/50 rounded-2xl">
        <div className="text-gray-500 text-sm">Preparing map...</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${fullscreen ? "fixed inset-0 z-50" : "h-full min-h-[500px]"} rounded-2xl overflow-hidden`}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* geocoding progress */}
      {geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400">{geoStatus}</p>
        </div>
      )}

      {/* loading spinner */}
      {loading && !geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400">Loading map...</p>
        </div>
      )}

      {/* error state */}
      {error && !loading && !geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10 px-6">
          <div className="text-red-400 text-lg font-semibold mb-2">Map Error</div>
          <p className="text-gray-400 text-sm text-center max-w-xs">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              initDoneRef.current = false;
              if (mapRef.current) {
                try { mapRef.current.remove(); } catch (_) { /* noop */ }
                mapRef.current = null;
              }
              mlRef.current = null;
              setStopsReady([]);
              setMounted(false);
              setTimeout(() => setMounted(true), 50);
            }}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* day filter pills */}
      {days.length > 1 && !loading && !geoStatus && (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveDay(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${activeDay === null ? "bg-orange-500/90 text-white border-orange-400/40" : "bg-black/30 text-gray-300 border-white/15 hover:bg-white/15"}`}
          >
            All Days
          </button>
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDay(activeDay === d ? null : d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${activeDay === d ? "bg-orange-500/90 text-white border-orange-400/40" : "bg-black/30 text-gray-300 border-white/15 hover:bg-white/15"}`}
            >
              Day {d}
            </button>
          ))}
        </div>
      )}

      {/* type legend */}
      {allTypes.length > 1 && !loading && !geoStatus && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5 backdrop-blur-md bg-black/30 rounded-xl p-2 border border-white/10">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${activeTypes.has(t) ? "opacity-40 line-through" : "opacity-100"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(t) }} />
              <span className="text-gray-300 capitalize">{t}</span>
            </button>
          ))}
        </div>
      )}

      {/* toolbar */}
      {!loading && !geoStatus && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button onClick={handleZoomIn} className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-lg" title="Zoom in">+</button>
          <button onClick={handleZoomOut} className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-lg" title="Zoom out">−</button>
          <button onClick={handle3DToggle} className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm" title="Toggle 3D">3D</button>
          <button onClick={handleLocate} className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors" title="Go to first stop">📍</button>
          <button onClick={handleResetView} className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm" title="Fit all stops">⊡</button>
          <button onClick={() => setFullscreen(!fullscreen)} className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm" title="Toggle fullscreen">{fullscreen ? "✕" : "⛶"}</button>
        </div>
      )}
    </div>
  );
}
