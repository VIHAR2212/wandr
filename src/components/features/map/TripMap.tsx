"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

/* ───────── type helpers (trip: any to avoid GeneratedTrip mismatch) ───────── */
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

/* ───────── stop type → color ───────── */
const TYPE_COLORS: Record<string, string> = {
  attraction: "#f59e0b",
  hotel: "#3b82f6",
  restaurant: "#ef4444",
  cafe: "#a855f7",
  shopping: "#ec4899",
  transport: "#6b7280",
  activity: "#10b981",
  default: "#f97316",
};

function getColor(type: string): string {
  const t = (type || "").toLowerCase();
  for (const [key, val] of Object.entries(TYPE_COLORS)) {
    if (t.includes(key)) return val;
  }
  return TYPE_COLORS.default;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function TripMap({ trip }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  // Store the maplibregl module so LngLatBounds / Popup are available outside the init closure
  const mlRef = useRef<any>(null);
  const initDoneRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);

  /* ────── extract stops ────── */
  const stops: Stop[] = (trip?.itinerary || trip?.stops || [])
    .flatMap((day: any) => {
      const items = day?.stops || day?.activities || day?.items || [];
      return items.map((s: any, i: number) => ({
        name: s?.name || s?.title || `Stop ${i + 1}`,
        lat: Number(s?.location?.lat ?? s?.lat ?? s?.coordinates?.[1]),
        lng: Number(s?.location?.lng ?? s?.lng ?? s?.coordinates?.[0]),
        type: s?.type || s?.category || "attraction",
        day: day?.day ?? day?.dayNumber ?? null,
        description: s?.description || s?.details || "",
        time: s?.time || s?.startTime || "",
        duration: s?.duration || "",
      }));
    })
    .filter(
      (s: Stop) =>
        !isNaN(Number(s.lat)) &&
        !isNaN(Number(s.lng)) &&
        s.lat !== 0 &&
        s.lng !== 0
    );

  const validStops = stops.filter((s) => s.lat != null && s.lng != null);

  /* ────── derived ────── */
  const days = Array.from(
    new Set(
      stops.map((s) => s.day).filter((d): d is number => d != null)
    )
  ).sort();

  const filteredStops = validStops.filter((s) => {
    if (activeDay !== null && s.day !== activeDay) return false;
    if (
      activeTypes.size > 0 &&
      !activeTypes.has((s.type || "").toLowerCase())
    )
      return false;
    return true;
  });

  const allTypes = Array.from(
    new Set(validStops.map((s) => (s.type || "").toLowerCase()))
  );

  /* ────── mounted guard ────── */
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  /* ────── inject CSS via <link> (SSR safe) ────── */
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

  /* ────── update sources & layers when filters change ────── */
  const updateMapLayers = useCallback(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
    try {
      /* ── stops source ── */
      const src = map.getSource("stops") as any;
      if (src) {
        src.setData({
          type: "FeatureCollection",
          features: filteredStops.map((s, i) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              // FIX: wrap in Number() and assert as [number, number] so
              // GeoJSON Position = number[] is satisfied
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

      /* ── routes source ── */
      const lineSrc = map.getSource("routes") as any;
      if (lineSrc) {
        lineSrc.setData({
          type: "FeatureCollection",
          features:
            filteredStops.length > 1
              ? filteredStops.slice(0, -1).map((s, i) => ({
                  type: "Feature" as const,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: [
                      [Number(s.lng), Number(s.lat)] as [number, number],
                      [
                        Number(filteredStops[i + 1].lng),
                        Number(filteredStops[i + 1].lat),
                      ] as [number, number],
                    ],
                  },
                  properties: { color: getColor(s.type || "") },
                }))
              : [],
        });
      }

      /* ── refit bounds ── */
      if (filteredStops.length > 0) {
        // FIX: use ml.LngLatBounds (the module ref), NOT new (map as any).LngLatBounds
        const bounds = new ml.LngLatBounds();
        filteredStops.forEach((s) =>
          // FIX: Number() wrap for bounds.extend
          bounds.extend([Number(s.lng), Number(s.lat)])
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      }
    } catch (e) {
      console.error("Map layer update error:", e);
    }
  }, [filteredStops]);

  useEffect(() => {
    if (!mounted) return;
    if (!mapRef.current) return;
    updateMapLayers();
  }, [mounted, filteredStops, updateMapLayers]);

  /* ────── init map (once) ────── */
  useEffect(() => {
    if (!mounted) return;
    if (initDoneRef.current) return;
    if (!containerRef.current) return;
    if (validStops.length === 0) {
      setLoading(false);
      setError("No valid stops with coordinates found.");
      return;
    }

    initDoneRef.current = true;
    let cancelled = false;

    /* timeout: force-stop loading after 15s */
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError(
          "Map took too long to load. Check your connection and refresh."
        );
      }
    }, 15000);

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        // Store module reference so helpers outside this closure can use LngLatBounds / Popup
        mlRef.current = maplibregl;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style:
            "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
          // FIX: Number() wrap — validStops[0].lat/lng are number | undefined
          center: [Number(validStops[0].lng), Number(validStops[0].lat)],
          zoom: 2,
          attributionControl: false,
        });

        mapRef.current = map;

        /* globe projection — call AFTER constructor, NOT inside options */
        try {
          (map as any).setProjection({ type: "globe" });
        } catch (_) {
          /* globe not supported in this build — flat map is fine */
        }

        /* ── always resolve loading state ── */
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
            /* ── stops source ── */
            map.addSource("stops", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: validStops.map((s, i) => ({
                  type: "Feature" as const,
                  geometry: {
                    type: "Point" as const,
                    // FIX: Number() + tuple assertion
                    coordinates: [Number(s.lng), Number(s.lat)] as [
                      number,
                      number
                    ],
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

            /* circle layer */
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

            /* symbol / label layer */
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

            /* ── routes source ── */
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
                            [
                              Number(validStops[i + 1].lng),
                              Number(validStops[i + 1].lat),
                            ] as [number, number],
                          ],
                        },
                        properties: { color: getColor(s.type || "") },
                      }))
                    : [],
              },
            });

            /* routes line layer
               CRITICAL: line-cap and line-join go in LAYOUT, not paint */
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

            /* fit to all stops */
            if (validStops.length > 1) {
              // FIX: use maplibregl.LngLatBounds (module), not (map as any).LngLatBounds
              const bounds = new maplibregl.LngLatBounds();
              validStops.forEach((s) =>
                bounds.extend([Number(s.lng), Number(s.lat)])
              );
              map.fitBounds(bounds, {
                padding: 60,
                maxZoom: 14,
                duration: 1500,
              });
            }
          } catch (layerErr) {
            console.error("Layer setup error:", layerErr);
          }
        });

        /* catch style / network errors */
        map.on("error", (e: any) => {
          console.error("MapLibre error:", e);
          finishLoading("Failed to load map style. Check your connection.");
        });

        /* popup on click */
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
          // FIX: use mlRef (the stored module) for Popup — maplibregl not in scope here
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

        /* built-in controls */
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
  }, [mounted]);

  /* ────── toolbar helpers ────── */
  function handleZoomIn() {
    if (mapRef.current) {
      mapRef.current.easeTo({
        zoom: (mapRef.current.getZoom() || 0) + 1,
        duration: 350,
      });
    }
  }

  function handleZoomOut() {
    if (mapRef.current) {
      mapRef.current.easeTo({
        zoom: Math.max(1, (mapRef.current.getZoom() || 0) - 1),
        duration: 350,
      });
    }
  }

  function handleResetView() {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml || validStops.length === 0) return;
    try {
      // FIX: use ml.LngLatBounds (module ref), not (map as any).LngLatBounds
      const bounds = new ml.LngLatBounds();
      validStops.forEach((s) =>
        bounds.extend([Number(s.lng), Number(s.lat)])
      );
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
    if (mapRef.current && validStops.length > 0) {
      mapRef.current.flyTo({
        // FIX: Number() wrap — lat/lng are number | undefined
        center: [Number(validStops[0].lng), Number(validStops[0].lat)],
        zoom: 12,
        duration: 1500,
      });
    }
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
    <div
      className={`relative w-full ${
        fullscreen ? "fixed inset-0 z-50" : "h-full min-h-[500px]"
      } rounded-2xl overflow-hidden`}
    >
      {/* map canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── loading spinner ── */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-400">Loading map...</p>
        </div>
      )}

      {/* ── error state ── */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10">
          <div className="text-red-400 text-lg font-semibold mb-2">
            Map Error
          </div>
          <p className="text-gray-400 text-sm text-center max-w-xs">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              initDoneRef.current = false;
              if (mapRef.current) {
                try {
                  mapRef.current.remove();
                } catch (_) {
                  /* noop */
                }
                mapRef.current = null;
              }
              mlRef.current = null;
              setMounted(false);
              setTimeout(() => setMounted(true), 50);
            }}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── day filter pills ── */}
      {days.length > 1 && !loading && (
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

      {/* ── type legend (clickable) ── */}
      {allTypes.length > 1 && !loading && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5 backdrop-blur-md bg-black/30 rounded-xl p-2 border border-white/10">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
                activeTypes.has(t) ? "opacity-40 line-through" : "opacity-100"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getColor(t) }}
              />
              <span className="text-gray-300 capitalize">{t}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── toolbar (right side) ── */}
      {!loading && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-lg"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-lg"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={handle3DToggle}
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
            title="Toggle 3D"
          >
            3D
          </button>
          <button
            onClick={handleLocate}
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors"
            title="Go to first stop"
          >
            📍
          </button>
          <button
            onClick={handleResetView}
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
            title="Fit all stops"
          >
            ⊡
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="w-9 h-9 flex items-center justify-center backdrop-blur-md bg-black/30 border border-white/15 rounded-lg text-white hover:bg-white/15 transition-colors text-sm"
            title="Toggle fullscreen"
          >
            {fullscreen ? "✕" : "⛶"}
          </button>
        </div>
      )}
    </div>
  );
}
