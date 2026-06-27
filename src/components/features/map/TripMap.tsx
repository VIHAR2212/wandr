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
}

interface TripMapProps {
  trip: any;
}

// Stadia Maps Alidade Smooth Dark — free, no API key needed for dev/Vercel
const STADIA_DARK_STYLE: any = {
  version: 8,
  name: "Wandr Dark",
  sources: {
    stadia: {
      type: "raster",
      tiles: [
        "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
      ],
      tileSize: 256,
      attribution: "&copy; Stadia Maps &copy; OpenMapTiles &copy; OSM",
      maxzoom: 20,
    },
  },
  layers: [
    { id: "stadia-tiles", type: "raster", source: "stadia", minzoom: 0, maxzoom: 20 },
  ],
};

// OSM fallback — CSS dark filter applied, always works
const OSM_FALLBACK_STYLE: any = {
  version: 8,
  name: "Wandr OSM",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "osm-tiles", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 },
  ],
};

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

interface RawItem {
  name: string;
  lat: number | null;
  lng: number | null;
  type: string;
  day: number | null;
  description: string;
  time: string;
  duration: string;
  locationHint: string;
}

function extractRawItems(trip: any): RawItem[] {
  if (!trip) return [];

  function resolveCoords(s: any): [number | null, number | null] {
    const nested =
      (s?.location && typeof s.location === "object" ? s.location : null) ||
      s?.geo || s?.position || s?.coords || null;
    if (nested) {
      const la = Number(nested.lat ?? nested.latitude ?? NaN);
      const lo = Number(nested.lng ?? nested.lon ?? nested.long ?? nested.longitude ?? NaN);
      if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];
    }
    const la = Number(s?.lat ?? s?.latitude ?? NaN);
    const lo = Number(s?.lng ?? s?.lon ?? s?.long ?? s?.longitude ?? NaN);
    if (!isNaN(la) && !isNaN(lo) && (la !== 0 || lo !== 0)) return [la, lo];
    if (Array.isArray(s?.coordinates) && s.coordinates.length >= 2) {
      const glo = Number(s.coordinates[0]);
      const gla = Number(s.coordinates[1]);
      if (!isNaN(gla) && !isNaN(glo) && (gla !== 0 || glo !== 0)) return [gla, glo];
    }
    return [null, null];
  }

  function mapItem(s: any, i: number, dayNum: number | null): RawItem {
    const [lat, lng] = resolveCoords(s);
    const locStr = typeof s?.location === "string" ? s.location : "";
    const name = s?.name || s?.title || s?.place || s?.placeName || s?.attraction || `Stop ${i + 1}`;
    return {
      name, lat, lng,
      type: s?.type || s?.category || s?.placeType || "sightseeing",
      day: dayNum,
      description: s?.description || s?.details || "",
      time: s?.time || s?.startTime || "",
      duration: typeof s?.duration === "number" ? `${s.duration}m` : s?.duration || "",
      locationHint: locStr,
    };
  }

  const result: RawItem[] = [];
  const dayArray: any[] = trip?.days || trip?.itinerary || trip?.schedule || [];

  if (Array.isArray(dayArray) && dayArray.length > 0) {
    for (const day of dayArray) {
      const dayNum = day?.dayNumber ?? day?.day ?? day?.dayNum ?? day?.number ?? null;
      const items: any[] = day?.activities || day?.stops || day?.items || day?.places || [];
      for (let i = 0; i < items.length; i++) result.push(mapItem(items[i], i, dayNum));
    }
  }
  if (result.length === 0 && Array.isArray(trip?.stops)) {
    for (let i = 0; i < trip.stops.length; i++)
      result.push(mapItem(trip.stops[i], i, trip.stops[i]?.day ?? null));
  }
  if (result.length === 0 && Array.isArray(trip?.places)) {
    for (let i = 0; i < trip.places.length; i++)
      result.push(mapItem(trip.places[i], i, null));
  }
  return result;
}

const KNOWN: Record<string, [number, number]> = {
  andaman: [92.7265, 11.7401], "port blair": [92.7265, 11.6234],
  havelock: [92.9982, 11.981], "neil island": [92.8748, 11.8345],
  delhi: [77.209, 28.6139], "new delhi": [77.209, 28.6139],
  mumbai: [72.8777, 19.076], bangalore: [77.5946, 12.9716],
  bengaluru: [77.5946, 12.9716], goa: [74.124, 15.2993],
  jaipur: [75.7873, 26.9124], agra: [78.0081, 27.1767],
  "taj mahal": [78.0421, 27.1751], varanasi: [82.9739, 25.3176],
  kerala: [76.2711, 10.8505], kochi: [76.2673, 9.9312],
  hyderabad: [78.4867, 17.385], chennai: [80.2707, 13.0827],
  kolkata: [88.3639, 22.5726], pune: [73.8567, 18.5204],
  manali: [77.1892, 32.2396], shimla: [77.1734, 31.1048],
  leh: [77.5771, 34.1526], ladakh: [77.5771, 34.1526],
  udaipur: [73.6833, 24.5854], jodhpur: [73.0243, 26.2389],
  mysore: [76.6394, 12.2958], mysuru: [76.6394, 12.2958],
  ooty: [76.695, 11.4102], darjeeling: [88.2627, 27.036],
  rishikesh: [78.2676, 30.0869], haridwar: [78.1642, 29.9457],
  amritsar: [74.8723, 31.634], chandigarh: [76.7794, 30.7333],
  srinagar: [74.7973, 34.0837], kashmir: [74.7973, 34.0837],
  coorg: [75.8069, 12.3375], munnar: [77.0595, 10.0889],
  alleppey: [76.3388, 9.4981], pondicherry: [79.8083, 11.9416],
  hampi: [76.46, 15.335], khajuraho: [79.9199, 24.8318],
  ranthambore: [76.5026, 26.0173], india: [78.9629, 20.5937],
  dubai: [55.2708, 25.2048], singapore: [103.8198, 1.3521],
  bangkok: [100.5018, 13.7563], paris: [2.3522, 48.8566],
  london: [-0.1276, 51.5074], "new york": [-74.006, 40.7128],
  tokyo: [139.6917, 35.6895], bali: [115.1889, -8.4095],
  phuket: [98.3923, 7.8804], maldives: [73.2207, 3.2028],
  nepal: [84.124, 28.3949], kathmandu: [85.324, 27.7172],
  "sri lanka": [80.7718, 7.8731], colombo: [79.8612, 6.9271],
};

function findKnownCoords(text: string): [number, number] | null {
  const lower = text.toLowerCase();
  if (KNOWN[lower]) return KNOWN[lower];
  for (const [key, coords] of Object.entries(KNOWN)) {
    if (lower.includes(key)) return coords;
  }
  return null;
}

// Minimal inline CSS — just enough for MapLibre to render correctly.
// We inject this synchronously so it's ready before Map() constructor runs.
const MAPLIBRE_CSS = `
.maplibregl-map{overflow:hidden;position:relative;width:100%;height:100%}
.maplibregl-canvas-container{position:absolute;top:0;left:0;width:100%;height:100%}
.maplibregl-canvas{display:block;position:absolute;left:0;top:0}
.maplibregl-missing-css{display:none}
.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{position:absolute;pointer-events:none;z-index:2}
.maplibregl-ctrl-top-left{top:0;left:0}
.maplibregl-ctrl-top-right{top:0;right:0}
.maplibregl-ctrl-bottom-left{bottom:0;left:0}
.maplibregl-ctrl-bottom-right{bottom:0;right:0}
.maplibregl-ctrl{pointer-events:auto;float:left;clear:both}
.maplibregl-ctrl-top-right .maplibregl-ctrl{float:right;clear:right}
.maplibregl-ctrl-group{background:#1f2937;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.maplibregl-ctrl-group button{background:#1f2937;border:none;border-bottom:1px solid rgba(255,255,255,.1);color:#e5e7eb;cursor:pointer;display:block;height:36px;width:36px;outline:none}
.maplibregl-ctrl-group button:last-child{border-bottom:none}
.maplibregl-ctrl-group button:hover{background:#374151}
.maplibregl-ctrl-icon{display:block;width:100%;height:100%;background-repeat:no-repeat;background-position:center;filter:invert(1) opacity(.8)}
.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29 29'%3E%3Cpath fill='%23333' d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5z'/%3E%3C/svg%3E")}
.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29 29'%3E%3Cpath fill='%23333' d='M10 13c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h9c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-9z'/%3E%3C/svg%3E")}
.maplibregl-popup{position:absolute;top:0;left:0;will-change:transform}
.maplibregl-popup-anchor-top .maplibregl-popup-tip{border-bottom-color:#fff;border-top:none}
.maplibregl-popup-anchor-bottom .maplibregl-popup-tip{border-top-color:#fff;border-bottom:none;align-self:flex-end}
.maplibregl-popup-tip{width:0;height:0;border:10px solid transparent;z-index:1}
.maplibregl-popup-content{background:#fff;border-radius:10px;padding:12px 16px;box-shadow:0 4px 20px rgba(0,0,0,.35);pointer-events:auto}
.maplibregl-popup-close-button{background:none;border:none;cursor:pointer;position:absolute;right:6px;top:4px;font-size:18px;line-height:1;color:#666;padding:0}
.maplibregl-popup-close-button:hover{color:#333}
`;

export default function TripMap({ trip }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mlRef = useRef<any>(null);
  const mapLoadedRef = useRef(false);
  const stopsRef = useRef<Stop[]>([]);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [stopsVersion, setStopsVersion] = useState(0);

  // Inject CSS synchronously on first render — must be before Map() runs
  useEffect(() => {
    const id = "maplibre-css-wandr";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = MAPLIBRE_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // ── EFFECT A: extract stops + geocode ──
  useEffect(() => {
    if (!mounted) return;
    const rawItems = extractRawItems(trip);
    if (rawItems.length === 0) {
      setLoading(false);
      setError(`No stops found. Keys: ${trip ? Object.keys(trip).join(", ") : "null"}`);
      return;
    }

    const withCoords = rawItems.filter((r) => r.lat !== null && r.lng !== null);
    const needsGeo = rawItems.filter((r) => r.lat === null || r.lng === null);

    const destination =
      typeof trip?.destination === "string" ? trip.destination :
      typeof trip?.title === "string" ? trip.title : "";
    const destCoords = findKnownCoords(destination) || [78.9629, 20.5937];

    if (needsGeo.length === 0) {
      stopsRef.current = withCoords.map((r) => ({
        name: r.name, lat: r.lat!, lng: r.lng!, type: r.type,
        day: r.day ?? undefined, description: r.description,
        time: r.time, duration: r.duration,
      }));
      setStopsVersion((v) => v + 1);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      for (let i = 0; i < needsGeo.length; i++) {
        if (cancelled) return;
        const item = needsGeo[i];
        const query = item.locationHint || item.name;
        const known = findKnownCoords(query) || findKnownCoords(destination);
        if (known) {
          item.lat = known[1] + i * 0.005;
          item.lng = known[0] + i * 0.005;
        }
      }
      const stillMissing = needsGeo.filter((r) => r.lat === null || r.lng === null);
      if (stillMissing.length > 0 && !cancelled) {
        try {
          setGeoStatus(`Finding ${stillMissing.length} location${stillMissing.length > 1 ? "s" : ""}...`);
          const res = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              queries: stillMissing.map((item) => item.locationHint || `${item.name}, ${destination}`),
              destination,
            }),
          });
          if (res.ok && !cancelled) {
            const { results } = (await res.json()) as { results: ([number, number] | null)[] };
            results.forEach((coords, i) => {
              if (coords) { stillMissing[i].lat = coords[1]; stillMissing[i].lng = coords[0]; }
            });
          }
        } catch (e) {
          console.warn("[TripMap] geocode API failed:", e);
        }
      }
      if (cancelled) return;
      setGeoStatus(null);
      const all = [...withCoords, ...needsGeo].map((r, idx) => ({
        name: r.name,
        lat: r.lat ?? (destCoords[1] + idx * 0.01),
        lng: r.lng ?? (destCoords[0] + idx * 0.01),
        type: r.type, day: r.day ?? undefined,
        description: r.description, time: r.time, duration: r.duration,
      }));
      stopsRef.current = all;
      setStopsVersion((v) => v + 1);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, trip]);

  const validStops = stopsRef.current.filter(
    (s) => !isNaN(Number(s.lat)) && !isNaN(Number(s.lng))
  );
  const days = Array.from(
    new Set(stopsRef.current.map((s) => s.day).filter((d): d is number => d != null))
  ).sort((a, b) => a - b);
  const filteredStops = validStops.filter((s) => {
    if (activeDay !== null && s.day !== activeDay) return false;
    if (activeTypes.size > 0 && !activeTypes.has((s.type || "").toLowerCase())) return false;
    return true;
  });
  const allTypes = Array.from(new Set(validStops.map((s) => (s.type || "").toLowerCase())));

  const applyStops = useCallback(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
    const stops = stopsRef.current.filter((s) => !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)));
    const visible = stops.filter((s) => {
      if (activeDay !== null && s.day !== activeDay) return false;
      if (activeTypes.size > 0 && !activeTypes.has((s.type || "").toLowerCase())) return false;
      return true;
    });
    try {
      const stopsSrc = map.getSource("stops") as any;
      if (stopsSrc) {
        stopsSrc.setData({
          type: "FeatureCollection",
          features: visible.map((s, i) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [Number(s.lng), Number(s.lat)] as [number, number] },
            properties: {
              id: i, name: s.name, type: s.type, day: s.day,
              description: s.description, time: s.time, duration: s.duration,
              color: getColor(s.type || ""),
            },
          })),
        });
      }
      const routesSrc = map.getSource("routes") as any;
      if (routesSrc) {
        routesSrc.setData({
          type: "FeatureCollection",
          features: visible.length > 1
            ? visible.slice(0, -1).map((s, i) => ({
                type: "Feature" as const,
                geometry: {
                  type: "LineString" as const,
                  coordinates: [
                    [Number(s.lng), Number(s.lat)] as [number, number],
                    [Number(visible[i + 1].lng), Number(visible[i + 1].lat)] as [number, number],
                  ],
                },
                properties: { color: getColor(s.type || "") },
              }))
            : [],
        });
      }
      if (visible.length > 0) {
        const bounds = new ml.LngLatBounds();
        visible.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      }
    } catch (e) {
      console.error("[TripMap] applyStops error:", e);
    }
  }, [activeDay, activeTypes]);

  // ── EFFECT C: re-apply stops when data or filters change ──
  useEffect(() => {
    if (!mounted || !mapLoadedRef.current) return;
    applyStops();
  }, [stopsVersion, mounted, applyStops]);

  // ── EFFECT B: init map ONCE ──
  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    let destroyed = false;
    let loadTimeout: ReturnType<typeof setTimeout>;
    let usedFallback = false;

    const finishLoading = (errMsg?: string) => {
      clearTimeout(loadTimeout);
      if (!destroyed) {
        setLoading(false);
        if (errMsg) setError(errMsg);
      }
    };

    // Safety timeout
    loadTimeout = setTimeout(() => {
      if (!destroyed) finishLoading("Map took too long to load. Refresh the page.");
    }, 20000);

    const initMap = async (style: any, isFallback: boolean) => {
      const ml = mlRef.current;
      if (!ml || destroyed || !containerRef.current) return;

      // Remove previous map instance if retrying with fallback
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
        mapLoadedRef.current = false;
      }

      const map = new ml.Map({
        container: containerRef.current,
        style,
        center: [78.9629, 20.5937] as [number, number],
        zoom: 4,
        pitch: 0,
        bearing: 0,
        failIfMajorPerformanceCaveat: false,
        maxParallelImageRequests: 6,
        attributionControl: false,
      });

      mapRef.current = map;

      // KEY FIX: listen on "styledata" not "load"
      // "load" waits for ALL tiles — can stall forever if tiles error.
      // "styledata" fires as soon as the style JSON is parsed, before tiles fetch.
      map.once("styledata", () => {
        if (destroyed) return;
        mapLoadedRef.current = true;

        // Apply dark filter on canvas for OSM fallback (Stadia is already dark)
        if (isFallback) {
          const canvas = map.getCanvas();
          if (canvas) {
            canvas.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.6)";
          }
        }

        // Force correct canvas size
        map.resize();
        finishLoading();

        try {
          map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({
            id: "stops-circle", type: "circle", source: "stops",
            paint: {
              "circle-radius": 7,
              "circle-color": ["get", "color"],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
          map.addLayer({
            id: "stops-label", type: "symbol", source: "stops",
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
              "text-halo-width": 1.5,
            },
          });
          map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({
            id: "routes-line", type: "line", source: "routes",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ["get", "color"],
              "line-width": 2.5,
              "line-opacity": 0.8,
              "line-dasharray": [2, 2],
            },
          });
          applyStops();
        } catch (layerErr) {
          console.error("[TripMap] layer setup error:", layerErr);
        }
      });

      map.on("error", (e: any) => {
        const msg: string = e?.error?.message || e?.message || "";
        console.warn("[TripMap] map error:", msg);

        // If Stadia tiles fail and we haven't fallen back yet, retry with OSM
        if (!isFallback && !usedFallback && (msg.includes("tile") || msg.includes("fetch") || msg.includes("network") || msg.includes("403") || msg.includes("401"))) {
          usedFallback = true;
          console.warn("[TripMap] Stadia tiles failed, falling back to OSM");
          initMap(OSM_FALLBACK_STYLE, true);
          return;
        }

        if (msg.includes("WebGL") || msg.includes("Failed to initialize")) {
          finishLoading("WebGL not available. Try a different browser.");
        }
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
            ${props.time ? `<div style="font-size:12px;color:#888;">${props.time}${props.duration ? ` &middot; ${props.duration}` : ""}</div>` : ""}
            ${props.description ? `<div style="font-size:12px;color:#555;margin-top:6px;">${props.description}</div>` : ""}
          </div>`;
        new ml.Popup({ offset: 14, maxWidth: "280px" }).setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      map.on("mouseenter", "stops-circle", () => { if (map.getCanvas()) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "stops-circle", () => { if (map.getCanvas()) map.getCanvas().style.cursor = ""; });
      map.addControl(new ml.NavigationControl(), "top-right");
      map.addControl(new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "bottom-right");
    };

    (async () => {
      try {
        const mlModule = await import("maplibre-gl");
        const maplibregl = (mlModule as any).default ?? mlModule;
        if (destroyed || !containerRef.current) { clearTimeout(loadTimeout); return; }
        mlRef.current = maplibregl;
        await initMap(STADIA_DARK_STYLE, false);
      } catch (err) {
        clearTimeout(loadTimeout);
        if (!destroyed) {
          finishLoading("Failed to initialize map. Please refresh.");
          console.error("[TripMap] init error:", err);
        }
      }
    })();

    return () => {
      destroyed = true;
      clearTimeout(loadTimeout);
      if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; }
      mlRef.current = null;
      mapLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  function handleZoomIn() { mapRef.current?.easeTo({ zoom: (mapRef.current.getZoom() || 0) + 1, duration: 350 }); }
  function handleZoomOut() { mapRef.current?.easeTo({ zoom: Math.max(1, (mapRef.current.getZoom() || 0) - 1), duration: 350 }); }
  function handleResetView() {
    const map = mapRef.current; const ml = mlRef.current;
    if (!map || !ml || filteredStops.length === 0) return;
    try {
      const bounds = new ml.LngLatBounds();
      filteredStops.forEach((s) => bounds.extend([Number(s.lng), Number(s.lat)]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
    } catch (_) {}
  }
  function handle3DToggle() {
    if (!mapRef.current) return;
    try { const p = mapRef.current.getPitch(); mapRef.current.easeTo({ pitch: p > 0 ? 0 : 60, duration: 800 }); } catch (_) {}
  }
  function handleLocate() {
    if (!mapRef.current || filteredStops.length === 0) return;
    mapRef.current.flyTo({ center: [Number(filteredStops[0].lng), Number(filteredStops[0].lat)] as [number, number], zoom: 12, duration: 1500 });
  }
  function toggleType(type: string) {
    setActiveTypes((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
  }

  if (!mounted) {
    return (
      <div className="w-full h-[560px] flex items-center justify-center bg-gray-900/50 rounded-2xl">
        <div className="text-gray-500 text-sm">Preparing map...</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${fullscreen ? "fixed inset-0 z-50" : "h-[560px]"} rounded-2xl overflow-hidden bg-gray-900`}>
      {/* MapLibre canvas — sits behind everything at z-0 */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* Geocoding status */}
      {geoStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/85 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400 text-center px-6">{geoStatus}</p>
        </div>
      )}

      {/* Loading spinner — only shown while map is initializing */}
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
              setError(null); setLoading(true);
              if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; }
              mlRef.current = null; mapLoadedRef.current = false;
              stopsRef.current = []; setStopsVersion(0);
              setMounted(false); setTimeout(() => setMounted(true), 50);
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

      {/* Type legend */}
      {allTypes.length > 1 && !loading && !geoStatus && !error && (
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

      {/* Toolbar */}
      {!loading && !geoStatus && !error && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          {([
            { label: "+", title: "Zoom in", fn: handleZoomIn },
            { label: "\u2212", title: "Zoom out", fn: handleZoomOut },
            { label: "3D", title: "Toggle 3D", fn: handle3DToggle },
            { label: "\uD83D\uDCCD", title: "Go to first stop", fn: handleLocate },
            { label: "\u2297", title: "Fit all stops", fn: handleResetView },
          ] as const).map(({ label, title, fn }) => (
            <button
              key={title} onClick={fn} title={title}
              className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setFullscreen(!fullscreen)} title="Toggle fullscreen"
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
          >
            {fullscreen ? "\u2715" : "\u26F6"}
          </button>
        </div>
      )}
    </div>
  );
}
