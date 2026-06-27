"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

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
  trip: any; // MUST stay `any` — GeneratedTrip lacks id/stops + no index sig
}

// Stadia Maps — free tier, proper sprites + glyphs, no tile cancellations on Vercel
const STADIA_KEY      = process.env.NEXT_PUBLIC_STADIA_KEY ?? "179f7f04-21e9-4724-9549-a8c717c42294";
const MAP_STYLE_DARK  = `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${STADIA_KEY}`;
const MAP_STYLE_LIGHT = `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${STADIA_KEY}`;

const TYPE_COLORS: Record<string, string> = {
  attraction:  "#f59e0b",
  hotel:       "#3b82f6",
  restaurant:  "#ef4444",
  cafe:        "#a855f7",
  shopping:    "#ec4899",
  transport:   "#6b7280",
  activity:    "#10b981",
  museum:      "#f59e0b",
  temple:      "#f59e0b",
  park:        "#10b981",
  sightseeing: "#f59e0b",
  beach:       "#06b6d4",
  default:     "#f97316",
};

function getColor(type: string): string {
  const t = (type || "").toLowerCase();
  for (const [key, val] of Object.entries(TYPE_COLORS)) {
    if (t.includes(key)) return val;
  }
  return TYPE_COLORS.default;
}

/* ── Nominatim geocoder (client-side fallback only) ── */
const geoCache = new Map<string, [number, number] | null>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodePlace(name: string, context?: string): Promise<[number, number] | null> {
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
  } catch (_) { /* network error */ }
  geoCache.set(query, null);
  return null;
}

/* ──────────────────────────────────────────────────────────────
   extractRawItems — pulls ALL stop-like items from ANY trip shape.

   YOUR ACTUAL SHAPE (from generate-trip/route.ts):
     trip.days[].activities[].{ title, location:"string", lat:0, lng:0, type, time, description, duration }

   Also handles:
     trip.itinerary[].activities[]  (GeneratedTrip shape from TripResultView)
     trip.itinerary[].stops[]
     trip.days[].stops[]
     trip.stops[]   (flat)
     trip.places[]  (flat)

   Treats lat:0 / lng:0 as "missing" — needs geocoding.
   Uses activity.location (string) as geocode query when name is generic.
────────────────────────────────────────────────────────────── */
interface RawItem {
  name: string;
  lat: number | null;
  lng: number | null;
  type: string;
  day: number | null;
  description: string;
  time: string;
  duration: string;
  locationHint: string; // plain-string location field for geocoding
}

function extractRawItems(trip: any): RawItem[] {
  if (!trip) return [];

  function resolveCoords(s: any): [number | null, number | null] {
    // nested objects
    const nested =
      (s?.location && typeof s.location === "object" ? s.location : null) ||
      s?.geo || s?.position || s?.coords || null;

    if (nested) {
      const la = Number(nested.lat ?? nested.latitude ?? NaN);
      const lo = Number(nested.lng ?? nested.lon ?? nested.long ?? nested.longitude ?? NaN);
      if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];
    }

    // direct fields
    const la = Number(s?.lat ?? s?.latitude ?? NaN);
    const lo = Number(s?.lng ?? s?.lon ?? s?.long ?? s?.longitude ?? NaN);
    if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];

    // GeoJSON coordinates [lng, lat]
    if (Array.isArray(s?.coordinates) && s.coordinates.length >= 2) {
      const glo = Number(s.coordinates[0]);
      const gla = Number(s.coordinates[1]);
      if (!isNaN(gla) && !isNaN(glo) && (gla !== 0 || glo !== 0)) return [gla, glo];
    }

    return [null, null];
  }

  function mapItem(s: any, i: number, dayNum: number | null): RawItem {
    const [lat, lng] = resolveCoords(s);
    // location may be a plain string like "Agra, India" — use for geocoding
    const locStr = typeof s?.location === "string" ? s.location : "";
    const name = s?.name || s?.title || s?.place || s?.placeName || s?.attraction || `Stop ${i + 1}`;
    return {
      name,
      lat,
      lng,
      type:         s?.type || s?.category || s?.placeType || "sightseeing",
      day:          dayNum,
      description:  s?.description || s?.details || "",
      time:         s?.time || s?.startTime || "",
      duration:     typeof s?.duration === "number" ? `${s.duration}m` : (s?.duration || ""),
      locationHint: locStr, // e.g. "Taj Mahal, Agra" — used as geocode query
    };
  }

  const result: RawItem[] = [];

  // ── YOUR SHAPE: trip.days[].activities[]  (normalisedDays in TripResultView)
  // ── ALSO:       trip.itinerary[].activities[] / .stops[]
  const dayArray: any[] = trip?.days || trip?.itinerary || trip?.schedule || [];

  if (Array.isArray(dayArray) && dayArray.length > 0) {
    for (const day of dayArray) {
      const dayNum =
        day?.dayNumber ?? day?.day ?? day?.dayNum ?? day?.number ?? null;
      const items: any[] =
        day?.activities || day?.stops || day?.items || day?.places || [];
      for (let i = 0; i < items.length; i++) {
        result.push(mapItem(items[i], i, dayNum));
      }
    }
  }

  // ── flat trip.stops[]
  if (result.length === 0 && Array.isArray(trip?.stops)) {
    for (let i = 0; i < trip.stops.length; i++) {
      result.push(mapItem(trip.stops[i], i, trip.stops[i]?.day ?? null));
    }
  }

  // ── flat trip.places[]
  if (result.length === 0 && Array.isArray(trip?.places)) {
    for (let i = 0; i < trip.places.length; i++) {
      result.push(mapItem(trip.places[i], i, null));
    }
  }

  return result;
}

/* ══════════════════════════════════════════════════════════════════ */
export default function TripMap({ trip }: TripMapProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<any>(null);
  const mlRef          = useRef<any>(null);
  const initDoneRef    = useRef(false);
  const stopsForInitRef = useRef<Stop[]>([]);

  const [mounted,     setMounted]     = useState(false);
  const [isDark,      setIsDark]      = useState(true); // default dark until detected
  const [loading,     setLoading]     = useState(true);
  const [geoStatus,   setGeoStatus]   = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [activeDay,   setActiveDay]   = useState<number | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [fullscreen,  setFullscreen]  = useState(false);
  const [stopsReady,  setStopsReady]  = useState<Stop[]>([]);

  /* ── Mounted guard ── */
  useEffect(() => {
    setMounted(true);

    // Detect dark mode — check both next-themes class and system preference
    const checkDark = () => {
      const htmlDark = document.documentElement.classList.contains("dark");
      const sysDark  = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(htmlDark || sysDark);
    };

    checkDark();

    // Watch for theme changes (next-themes toggles .dark on <html>)
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Also watch system preference
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", checkDark);

    return () => {
      setMounted(false);
      observer.disconnect();
      mq.removeEventListener("change", checkDark);
    };
  }, []);

  /* ── Inject MapLibre CSS (SSR safe) ── */
  useEffect(() => {
    if (!mounted) return;
    const id = "maplibre-css-tripmap";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id   = id;
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@5.2.0/dist/maplibre-gl.css";
    document.head.appendChild(link);
  }, [mounted]);

  /* ── Step 1: Extract raw items + geocode those with lat:0/lng:0 ── */
  useEffect(() => {
    if (!mounted) return;

    const rawItems = extractRawItems(trip);

    if (rawItems.length === 0) {
      setLoading(false);
      const shape = trip
        ? `Keys found: ${Object.keys(trip).join(", ")}`
        : "trip prop is null/undefined";
      setError(`No stops found in trip data. ${shape}`);
      console.warn("[TripMap] raw trip:", JSON.stringify(trip, null, 2));
      return;
    }

    // Items WITH valid coords (non-zero, non-NaN)
    const withCoords   = rawItems.filter((r) => r.lat !== null && r.lng !== null);
    // Items WITHOUT valid coords — need geocoding
    const needsGeo     = rawItems.filter((r) => r.lat === null || r.lng === null);

    // If everything already has coords, skip geocoding entirely
    if (needsGeo.length === 0) {
      setStopsReady(
        withCoords.map((r) => ({
          name:        r.name,
          lat:         r.lat!,
          lng:         r.lng!,
          type:        r.type,
          day:         r.day ?? undefined,
          description: r.description,
          time:        r.time,
          duration:    r.duration,
        }))
      );
      return;
    }

    // Build destination context for Nominatim queries
    const context =
      typeof trip?.destination === "string"
        ? trip.destination
        : typeof trip?.title === "string"
        ? trip.title
        : "";

    let cancelled = false;

    (async () => {
      for (let i = 0; i < needsGeo.length; i++) {
        if (cancelled) return;
        const item = needsGeo[i];

        // Use "Activity Title, Location String" as query — much more accurate than title alone
        // e.g. "Visit Taj Mahal, Agra, India" instead of just "Visit Taj Mahal"
        const queryName =
          item.locationHint
            ? `${item.locationHint}` // "Taj Mahal, Agra" is already descriptive
            : item.name;

        setGeoStatus(`Finding location ${i + 1}/${needsGeo.length}: ${queryName}`);

        const coords = await geocodePlace(queryName, context || undefined);
        if (coords && !cancelled) {
          item.lat = coords[1]; // lat
          item.lng = coords[0]; // lng
        }

        if (i < needsGeo.length - 1) await sleep(1100); // Nominatim rate limit
      }

      if (!cancelled) {
        setGeoStatus(null);
        const all = [...withCoords, ...needsGeo];
        const valid = all.filter((r) => r.lat !== null && r.lng !== null);

        if (valid.length === 0) {
          setLoading(false);
          setError("Could not find coordinates for any stops. Check your internet connection.");
          return;
        }

        setStopsReady(
          valid.map((r) => ({
            name:        r.name,
            lat:         r.lat!,
            lng:         r.lng!,
            type:        r.type,
            day:         r.day ?? undefined,
            description: r.description,
            time:        r.time,
            duration:    r.duration,
          }))
        );
      }
    })();

    return () => { cancelled = true; };
  }, [mounted, trip]);

  /* ── Derived state ── */
  const validStops = stopsReady.filter(
    (s) => !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)) &&
           Number(s.lat) !== 0   && Number(s.lng) !== 0
  );

  const days = Array.from(
    new Set(stopsReady.map((s) => s.day).filter((d): d is number => d != null))
  ).sort((a, b) => a - b);

  const filteredStops = validStops.filter((s) => {
    if (activeDay !== null && s.day !== activeDay) return false;
    if (activeTypes.size > 0 && !activeTypes.has((s.type || "").toLowerCase())) return false;
    return true;
  });

  const allTypes = Array.from(
    new Set(validStops.map((s) => (s.type || "").toLowerCase()))
  );

  /* ── Update map sources when filters change ── */
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    const ml  = mlRef.current;
    if (!map || !ml) return;
    try {
      const stopsSrc = map.getSource("stops") as any;
      if (stopsSrc) {
        stopsSrc.setData({
          type: "FeatureCollection",
          features: filteredStops.map((s, i) => ({
            type:     "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [Number(s.lng), Number(s.lat)] as [number, number] },
            properties: {
              id: i, name: s.name, type: s.type, day: s.day,
              description: s.description, time: s.time,
              duration: s.duration, color: getColor(s.type || ""),
            },
          })),
        });
      }
      const routesSrc = map.getSource("routes") as any;
      if (routesSrc) {
        routesSrc.setData({
          type: "FeatureCollection",
          features: filteredStops.length > 1
            ? filteredStops.slice(0, -1).map((s, i) => ({
                type:     "Feature" as const,
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
      console.error("[TripMap] layer update error:", e);
    }
  }, [filteredStops]);

  useEffect(() => {
    if (!mounted || !mapRef.current) return;
    updateMapLayers();
  }, [mounted, filteredStops, updateMapLayers]);

  /* ── Step 2: Init map ONCE when stopsReady and geocoding done ── */
  useEffect(() => {
    if (!mounted)              return;
    if (initDoneRef.current)   return;
    if (!containerRef.current) return;
    if (stopsReady.length === 0) return;
    if (geoStatus)             return; // still geocoding

    const stops = stopsReady.filter(
      (s) => !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)) &&
             Number(s.lat) !== 0   && Number(s.lng) !== 0
    );

    if (stops.length === 0) {
      setLoading(false);
      setError("No valid stops with coordinates found after geocoding.");
      return;
    }

    stopsForInitRef.current = stops;
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

        const initStops = stopsForInitRef.current;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style:     isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
          center:    [Number(initStops[0].lng), Number(initStops[0].lat)] as [number, number],
          zoom:      2,
          attributionControl: false,
        });

        mapRef.current = map;

        // Globe projection AFTER constructor (never inside options)
        try { (map as any).setProjection({ type: "globe" }); } catch (_) {}

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
            // ── stops source
            map.addSource("stops", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: initStops.map((s, i) => ({
                  type:     "Feature" as const,
                  geometry: { type: "Point" as const, coordinates: [Number(s.lng), Number(s.lat)] as [number, number] },
                  properties: {
                    id: i, name: s.name, type: s.type, day: s.day,
                    description: s.description, time: s.time,
                    duration: s.duration, color: getColor(s.type || ""),
                  },
                })),
              },
            });

            map.addLayer({
              id: "stops-circle", type: "circle", source: "stops",
              paint: {
                "circle-radius":       7,
                "circle-color":        ["get", "color"],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              },
            });

            map.addLayer({
              id: "stops-label", type: "symbol", source: "stops",
              layout: {
                "text-field":    ["get", "name"],
                "text-size":     12,
                "text-offset":   [0, 1.8],
                "text-anchor":   "top",
                "text-optional": true,
              },
              paint: {
                "text-color":      isDark ? "#e5e7eb" : "#1a1a2e",
                "text-halo-color": isDark ? "#000000" : "#ffffff",
                "text-halo-width": 1.5,
              },
            });

            // ── routes source
            map.addSource("routes", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: initStops.length > 1
                  ? initStops.slice(0, -1).map((s, i) => ({
                      type:     "Feature" as const,
                      geometry: {
                        type: "LineString" as const,
                        coordinates: [
                          [Number(s.lng), Number(s.lat)] as [number, number],
                          [Number(initStops[i + 1].lng), Number(initStops[i + 1].lat)] as [number, number],
                        ],
                      },
                      properties: { color: getColor(s.type || "") },
                    }))
                  : [],
              },
            });

            // line-cap / line-join MUST be in layout (not paint)
            map.addLayer({
              id: "routes-line", type: "line", source: "routes",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color":     ["get", "color"],
                "line-width":     2.5,
                "line-opacity":   0.8,
                "line-dasharray": [2, 2],
              },
            });

            if (initStops.length > 1) {
              const bounds = new maplibregl.LngLatBounds();
              initStops.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
              map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1500 });
            }
          } catch (layerErr) {
            console.error("[TripMap] layer setup error:", layerErr);
          }
        });

        map.on("error", (e: any) => {
          console.error("[TripMap] MapLibre error:", e);
          finishLoading("Failed to load map style. Check your connection.");
        });

        // Popup on click
        map.on("click", "stops-circle", (e: any) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          const dayLabel = props.day != null ? `Day ${props.day}` : "";
          const color    = props.color || "#f97316";
          const html = `
            <div style="color:#111;font-family:system-ui,sans-serif;max-width:260px;">
              <span style="display:inline-block;background:${color};color:#fff;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;margin-bottom:6px;">${dayLabel}</span>
              <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${props.name || ""}</div>
              ${props.type        ? `<div style="font-size:12px;color:#666;margin-bottom:4px;">${props.type}</div>` : ""}
              ${props.time        ? `<div style="font-size:12px;color:#888;">${props.time}${props.duration ? ` · ${props.duration}` : ""}</div>` : ""}
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
          console.error("[TripMap] init error:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, stopsReady, geoStatus, isDark]);

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
    const ml  = mlRef.current;
    if (!map || !ml || filteredStops.length === 0) return;
    try {
      const bounds = new ml.LngLatBounds();
      filteredStops.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
    } catch (_) {}
  }
  function handle3DToggle() {
    if (!mapRef.current) return;
    try {
      const p = mapRef.current.getPitch();
      mapRef.current.easeTo({ pitch: p > 0 ? 0 : 60, duration: 800 });
    } catch (_) {}
  }
  function handleLocate() {
    if (!mapRef.current || filteredStops.length === 0) return;
    mapRef.current.flyTo({
      center:   [Number(filteredStops[0].lng), Number(filteredStops[0].lat)] as [number, number],
      zoom:     12,
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
      <div className="w-full h-[560px] flex items-center justify-center bg-gray-900/50 rounded-2xl">
        <div className="text-gray-500 text-sm">Preparing map...</div>
      </div>
    );
  }

  return (
    /*
     * FIX: Use explicit h-[560px] instead of h-full.
     * h-full collapses to 0 when parent has no explicit height,
     * making the absolute-positioned canvas 0×0 — completely invisible.
     * The parent in TripResultView also needs:
     *   <div className="relative w-full h-[600px] min-h-[500px]">
     */
    <div
      className={`relative w-full ${
        fullscreen ? "fixed inset-0 z-50" : "h-[560px]"
      } rounded-2xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
    >
      {/* MapLibre canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Geocoding status */}
      {geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/85 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400 text-center px-6">{geoStatus}</p>
        </div>
      )}

      {/* Loading spinner */}
      {loading && !geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400">Loading map...</p>
        </div>
      )}

      {/* Error state */}
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
                try { mapRef.current.remove(); } catch (_) {}
                mapRef.current = null;
              }
              mlRef.current = null;
              stopsForInitRef.current = [];
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

      {/* Day filter pills */}
      {days.length > 1 && !loading && !geoStatus && !error && (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveDay(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${
              activeDay === null
                ? "bg-orange-500/90 text-white border-orange-400/40"
                : "bg-black/30 text-gray-300 border-white/15 hover:bg-white/15"
            }`}
          >
            All Days
          </button>
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDay(activeDay === d ? null : d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${
                activeDay === d
                  ? "bg-orange-500/90 text-white border-orange-400/40"
                  : "bg-black/30 text-gray-300 border-white/15 hover:bg-white/15"
              }`}
            >
              Day {d}
            </button>
          ))}
        </div>
      )}

      {/* Type legend */}
      {allTypes.length > 1 && !loading && !geoStatus && !error && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5 backdrop-blur-md bg-black/30 rounded-xl p-2 border border-white/10">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
                activeTypes.has(t) ? "opacity-40 line-through" : "opacity-100"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(t) }} />
              <span className="text-gray-300 capitalize">{t}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {!loading && !geoStatus && !error && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          {(
            [
              { label: "+",  title: "Zoom in",         fn: handleZoomIn },
              { label: "−",  title: "Zoom out",        fn: handleZoomOut },
              { label: "3D", title: "Toggle 3D",       fn: handle3DToggle },
              { label: "📍", title: "Go to first stop", fn: handleLocate },
              { label: "⊡",  title: "Fit all stops",   fn: handleResetView },
            ] as const
          ).map(({ label, title, fn }) => (
            <button
              key={title}
              onClick={fn}
              title={title}
              className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            title="Toggle fullscreen"
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
          >
            {fullscreen ? "✕" : "⛶"}
          </button>
        </div>
      )}
    </div>
  );
}
