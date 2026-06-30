/**
 * Cover-page signature motif: a low-opacity arc tracing this specific trip's
 * actual origin -> destination route, with a pin at the destination.
 *
 * This intentionally replaces a generic stock "compass / plane / passport
 * stamp" icon set. It's pure geometry (no images, no network, no font
 * glyphs), so it's robust, and it's grounded in this trip's real data rather
 * than decoration that would look the same on every export.
 */

export interface MotifPoint {
  x: number;
  y: number;
}

/**
 * Returns a polyline approximating a gentle upward-bowing arc between two
 * points in an arbitrary 2D box (mm space, matching jsPDF's coordinate
 * system), suitable for feeding straight into doc.lines() as connected
 * segments.
 */
export function buildArcPoints(
  start: MotifPoint,
  end: MotifPoint,
  opts: { segments?: number; bow?: number } = {}
): MotifPoint[] {
  const segments = opts.segments ?? 28;
  const bow = opts.bow ?? 0.22;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  // Perpendicular unit vector, always lifting "upward" on the page regardless
  // of left/right direction between origin and destination.
  let px = -dy / dist;
  let py = dx / dist;
  if (py > 0) {
    px = -px;
    py = -py;
  }

  const liftAmount = dist * bow;
  const midX = (start.x + end.x) / 2 + px * liftAmount;
  const midY = (start.y + end.y) / 2 + py * liftAmount;

  const points: MotifPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * midX + t * t * end.x;
    const y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * midY + t * t * end.y;
    points.push({ x, y });
  }
  return points;
}

/** Angle (radians) of travel at the very end of the arc, for orienting a pin/marker glyph. */
export function arcEndAngle(points: MotifPoint[]): number {
  if (points.length < 2) return 0;
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  return Math.atan2(b.y - a.y, b.x - a.x);
}