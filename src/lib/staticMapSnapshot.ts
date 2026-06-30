/**
 * Builds a static map image (PNG data URL) for the PDF's destination map
 * section, by compositing raster XYZ tiles onto an offscreen canvas. This
 * deliberately reuses the exact tile sources already in
 * src/components/features/map/TripMap.tsx (Stadia dark tiles, OSM fallback)
 * instead of introducing a new mapping service or API key.
 *
 * This must run in the browser (uses document/canvas/Image), so it's only
 * called from client components, and it never throws — any failure resolves
 * to `null` so the caller can simply skip the map section.
 */

interface Pin {
  lat: number;
  lng: number;
  color?: [number, number, number];
  radius?: number;
}

interface SnapshotOptions {
  widthPx?: number;
  heightPx?: number;
  zoom?: number;
  extraPins?: Pin[];
  timeoutMs?: number;
}

const TILE_SIZE = 256;

function lonToTileX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2
  ) * Math.pow(2, zoom);
}

function loadImage(src: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => reject(new Error('tile timeout')), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('tile failed'));
    };
    img.src = src;
  });
}

async function renderWithTileUrl(
  tileUrlFn: (z: number, x: number, y: number) => string,
  centerLat: number,
  centerLng: number,
  opts: Required<Pick<SnapshotOptions, 'widthPx' | 'heightPx' | 'zoom' | 'timeoutMs'>>,
  extraPins: Pin[]
): Promise<string> {
  const { widthPx, heightPx, zoom, timeoutMs } = opts;

  const centerTileX = lonToTileX(centerLng, zoom);
  const centerTileY = latToTileY(centerLat, zoom);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  const originPxX = centerTileX * TILE_SIZE - widthPx / 2;
  const originPxY = centerTileY * TILE_SIZE - heightPx / 2;

  const firstTileX = Math.floor(originPxX / TILE_SIZE);
  const firstTileY = Math.floor(originPxY / TILE_SIZE);
  const lastTileX = Math.floor((originPxX + widthPx) / TILE_SIZE);
  const lastTileY = Math.floor((originPxY + heightPx) / TILE_SIZE);

  const maxTileIndex = Math.pow(2, zoom) - 1;
  const loads: Promise<void>[] = [];

  for (let tx = firstTileX; tx <= lastTileX; tx++) {
    for (let ty = firstTileY; ty <= lastTileY; ty++) {
      const wrappedX = ((tx % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
      if (ty < 0 || ty > maxTileIndex) continue;
      const drawX = tx * TILE_SIZE - originPxX;
      const drawY = ty * TILE_SIZE - originPxY;
      const url = tileUrlFn(zoom, wrappedX, ty);
      loads.push(
        loadImage(url, timeoutMs)
          .then((img) => {
            ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
          })
          .catch(() => {
            // Leave that tile blank rather than failing the whole snapshot.
          })
      );
    }
  }

  await Promise.all(loads);

  // Destination pin, drawn directly (not a font glyph, so no encoding risk).
  drawPin(ctx, widthPx / 2, heightPx / 2, [235, 153, 71], 9);

  // Any extra stops (e.g. itinerary activity locations), drawn smaller.
  for (const pin of extraPins) {
    const px = (lonToTileX(pin.lng, zoom) - centerTileX) * TILE_SIZE + widthPx / 2;
    const py = (latToTileY(pin.lat, zoom) - centerTileY) * TILE_SIZE + heightPx / 2;
    if (px < 0 || px > widthPx || py < 0 || py > heightPx) continue;
    drawPin(ctx, px, py, pin.color ?? [57, 163, 198], pin.radius ?? 4);
  }

  return canvas.toDataURL('image/png');
}

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, rgb: [number, number, number], r: number) {
  const [red, g, b] = rgb;
  ctx.save();
  ctx.fillStyle = `rgb(${red}, ${g}, ${b})`;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Returns a PNG data URL of the destination area, or null if every tile
 * source failed (e.g. offline, blocked by network policy). Never throws.
 */
export async function getDestinationMapSnapshot(
  lat: number | null | undefined,
  lng: number | null | undefined,
  options: SnapshotOptions = {}
): Promise<string | null> {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (typeof document === 'undefined') return null;

  const opts = {
    widthPx: options.widthPx ?? 920,
    heightPx: options.heightPx ?? 520,
    zoom: options.zoom ?? 12,
    timeoutMs: options.timeoutMs ?? 6000,
  };
  const extraPins = options.extraPins ?? [];

  try {
    return await renderWithTileUrl(
      (z, x, y) => `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/${z}/${x}/${y}.png`,
      lat,
      lng,
      opts,
      extraPins
    );
  } catch {
    try {
      return await renderWithTileUrl(
        (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
        lat,
        lng,
        opts,
        extraPins
      );
    } catch {
      return null;
    }
  }
}