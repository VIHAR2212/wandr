/**
 * PDF design tokens for Wandr AI trip exports.
 *
 * These are NOT new colors invented for the PDF — they're the exact same
 * HSL values from src/app/globals.css (light + dark themes), converted to
 * 0-255 RGB triples because jsPDF only accepts RGB. The intent is that the
 * PDF and the live site are unmistakably the same product.
 *
 * Treatment: the cover band uses the site's real dark theme (brand-true,
 * matches the on-screen trip page). The interior pages use the site's real
 * LIGHT theme — this app already ships a full light theme (see
 * `darkMode: ['class']` + the `:root` block in globals.css), so this isn't
 * an invented "cream PDF" default, it's the second theme this exact product
 * already defines. It also keeps the document genuinely printable.
 */

export type RGB = [number, number, number];

export const DARK = {
  background: [0, 0, 0] as RGB,
  surface: [20, 20, 20] as RGB,
  foreground: [243, 240, 237] as RGB,
  muted: [166, 166, 166] as RGB,
  primary: [235, 153, 71] as RGB,
  accent: [57, 163, 198] as RGB,
};

export const LIGHT = {
  background: [250, 248, 245] as RGB,
  surface: [255, 255, 255] as RGB,
  surfaceMuted: [243, 238, 230] as RGB,
  border: [228, 220, 206] as RGB,
  foreground: [41, 34, 31] as RGB,
  muted: [120, 110, 100] as RGB,
  primary: [167, 85, 27] as RGB,
  accent: [41, 133, 163] as RGB,
};

export const PALETTE = {
  sunset500: [245, 104, 26] as RGB,
  forest500: [26, 153, 81] as RGB,
  ocean500: [30, 127, 196] as RGB,
  earth500: [166, 112, 64] as RGB,
  earth300: [212, 168, 118] as RGB,
};

export const TYPE = {
  display: 'times' as const,
  body: 'helvetica' as const,
};

export function fmtCurPdf(formatted: string): string {
  // jsPDF's standard 14 fonts (incl. helvetica) don't contain the ₹ glyph (U+20B9) —
  // it silently falls back to an unrelated character, which is the "'2.0K" bug.
  // Swap to "Rs." for PDF text only; the live site keeps the real ₹ symbol since
  // it renders through real web fonts and is unaffected.
  return formatted.replace('₹', 'Rs. ');
}