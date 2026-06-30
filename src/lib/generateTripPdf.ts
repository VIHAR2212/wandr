import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';
import { DARK, LIGHT, PALETTE, TYPE, fmtCurPdf } from './pdfTheme';
import { buildArcPoints } from './flightPathMotif';
import { getDestinationMapSnapshot } from './staticMapSnapshot';
import type { GeneratedTrip, TripFormData } from '@/types';

interface GeoContext {
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  /** Flight data from COMMUNITY_ROUTE_DB — used to fill Rs.0 flight rows */
  communityFlight?: any;
}

/* ------------------------------------------------------------------ */
/*  Destination scenery image — Wikipedia + Wikimedia Commons           */
/* ------------------------------------------------------------------ */

/** Load a remote image via <img> + canvas → JPEG data-URL (browser only). */
function imageToBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxW = 900;
        const scale = Math.min(1, maxW / (img.naturalWidth || 1));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function fetchDestinationImage(destination: string): Promise<string | null> {
  try {
    // e.g. "Rajasthan, India" → "Rajasthan"
    const destName = destination.split(',')[0].trim();
    if (!destName) return null;

    // --- Method 1: Wikipedia pageimages API (most reliable) ---
    try {
      const wikiApi =
        `https://en.wikipedia.org/w/api.php` +
        `?action=query&titles=${encodeURIComponent(destName)}` +
        `&prop=pageimages&format=json&pithumbsize=900&origin=*`;
      const wikiResp = await fetch(wikiApi, { signal: AbortSignal.timeout(6000) });
      if (wikiResp.ok) {
        const wikiData = await wikiResp.json();
        const pages = wikiData?.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const thumbUrl = pages[pageId]?.thumbnail?.source;
          if (thumbUrl) {
            const b64 = await imageToBase64(thumbUrl);
            if (b64) return b64;
          }
        }
      }
    } catch {
      // Fall through to Method 2
    }

    // --- Method 2: Wikimedia Commons search as fallback ---
    try {
      const query = encodeURIComponent(`${destName} landscape scenery travel tourist`);
      const searchUrl =
        `https://commons.wikimedia.org/w/api.php` +
        `?action=query&generator=search&gsrnamespace=6` +
        `&gsrsearch=${query}&gsrlimit=8` +
        `&prop=imageinfo&iiprop=url|size&iiurlwidth=900` +
        `&format=json&origin=*`;

      const resp = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
      const data = await resp.json();
      const cmPages = data?.query?.pages;
      if (cmPages) {
        const images = Object.values(cmPages) as any[];
        const pick =
          images.find((img: any) => {
            const w = img.imageinfo?.[0]?.width || 0;
            const h = img.imageinfo?.[0]?.height || 0;
            return w >= 600 && w > h * 0.9;
          }) ||
          images.find((img: any) => (img.imageinfo?.[0]?.width || 0) >= 500) ||
          images[0];
        const thumbUrl = pick?.imageinfo?.[0]?.thumburl;
        if (thumbUrl) {
          const b64 = await imageToBase64(thumbUrl);
          if (b64) return b64;
        }
      }
    } catch {
      // Give up silently
    }

    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Transport cost helpers                                            */
/* ------------------------------------------------------------------ */

function estimateTrainCost(actTitle: string): number {
  const t = actTitle.toLowerCase();
  if (
    t.includes('shatabdi') ||
    t.includes('rajdhani') ||
    t.includes('duronto') ||
    t.includes('vande bharat')
  ) {
    return 2000;
  }
  if (t.includes('express') || t.includes('superfast')) return 1200;
  return 800;
}

function resolveActivityCost(
  act: any,
  communityFlight: any,
  transportBudget: number,
  zeroCostTransportCount: number,
): number {
  const baseCost = Number(act.cost) || 0;
  if (baseCost > 0) return baseCost;

  const type = (act.type || '').toLowerCase();
  if (type !== 'transport') return 0;

  const title = (act.title || '').toLowerCase();

  // Flight → community flight data
  if (communityFlight && (title.includes('flight') || title.includes('arrival'))) {
    return Number(communityFlight.avgPrice) || 0;
  }

  // Train → rough Indian railway estimate
  if (title.includes('train')) {
    return estimateTrainCost(act.title || '');
  }

  // Other transport (taxi, bus, etc.) — if budget has surplus, distribute
  if (zeroCostTransportCount > 0) {
    // We'll handle distribution at a higher level; return 0 here as placeholder
  }

  return 0;
}

/**
 * Builds the document and returns the jsPDF instance. No browser-only side
 * effects (no `.save()`), so this half is testable in plain Node — only
 * `downloadTripPDF` below needs an actual browser.
 */
export async function buildTripPDF(
  trip: GeneratedTrip,
  fd: TripFormData,
  geo: GeoContext = {},
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const usableW = pageW - margin * 2;
  let y = margin;

  const fmtCur = (amt: number) => fmtCurPdf(formatCurrency(amt, fd.currency));

  // ---------------------------------------------------------------- helpers

  const setFont = (
    size: number,
    color = LIGHT.foreground,
    style: 'normal' | 'bold' = 'normal',
    font: string = TYPE.body,
  ) => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont(font, style);
  };

  const fillRect = (
    x: number,
    yy: number,
    w: number,
    h: number,
    color: readonly number[],
    r = 0,
  ) => {
    doc.setFillColor(color[0], color[1], color[2]);
    if (r > 0) doc.roundedRect(x, yy, w, h, r, r, 'F');
    else doc.rect(x, yy, w, h, 'F');
  };

  const withOpacity = (alpha: number, draw: () => void) => {
    const gsAlpha = (doc as any).GState
      ? new (doc as any).GState({ opacity: alpha })
      : null;
    if (gsAlpha) (doc as any).setGState(gsAlpha);
    draw();
    if (gsAlpha) (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  };

  const drawRatingDots = (
    x: number,
    yy: number,
    rating: number,
    color: readonly number[],
  ) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const r = 1.1;
    doc.setDrawColor(color[0], color[1], color[2]);
    for (let i = 0; i < 5; i++) {
      const cx = x + i * (r * 2.4);
      const filled = i < full || (i === full && half);
      if (filled) {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.circle(cx, yy, r, 'F');
      } else {
        doc.setLineWidth(0.25);
        doc.circle(cx, yy, r, 'S');
      }
    }
    return x + 5 * (r * 2.4);
  };

  const addFooter = (pageLabel?: string) => {
    const totalPages = doc.getNumberOfPages();
    const p = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.setFontSize(7);
    doc.setFont(TYPE.body, 'normal');
    doc.setTextColor(LIGHT.muted[0], LIGHT.muted[1], LIGHT.muted[2]);
    doc.text('Generated by Wandr AI', margin, pageH - 9);
    doc.text(`Page ${p} of ${totalPages}`, pageW / 2, pageH - 9, {
      align: 'center',
    });
    doc.text(new Date().toLocaleDateString(), pageW - margin, pageH - 9, {
      align: 'right',
    });
    if (pageLabel) {
      doc.setDrawColor(LIGHT.border[0], LIGHT.border[1], LIGHT.border[2]);
      doc.setLineWidth(0.2);
      doc.line(margin, pageH - 13, pageW - margin, pageH - 13);
    }
  };

  const drawInteriorHeader = () => {
    doc.setFontSize(8);
    doc.setFont(TYPE.body, 'bold');
    doc.setTextColor(LIGHT.primary[0], LIGHT.primary[1], LIGHT.primary[2]);
    doc.text('WANDR', margin, 13);
    doc.setFont(TYPE.body, 'normal');
    doc.setTextColor(LIGHT.muted[0], LIGHT.muted[1], LIGHT.muted[2]);
    doc.text(`Trip to ${fd.destination || ''}`, pageW - margin, 13, {
      align: 'right',
    });
    doc.setDrawColor(LIGHT.border[0], LIGHT.border[1], LIGHT.border[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, 16, pageW - margin, 16);
  };

  const newInteriorPage = () => {
    addFooter();
    doc.addPage();
    fillRect(0, 0, pageW, pageH, LIGHT.background);
    drawInteriorHeader();
    y = 26;
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 22) {
      newInteriorPage();
      return true;
    }
    return false;
  };

  const sectionHeader = (
    title: string,
    accent: readonly number[] = LIGHT.primary,
  ) => {
    checkPage(20);
    y += 6;
    setFont(14, LIGHT.foreground, 'bold', TYPE.display);
    doc.text(title, margin, y);
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(1);
    const w = doc.getTextWidth(title);
    doc.line(margin, y + 2, margin + Math.min(w, 42), y + 2);
    y += 10;
  };

  // ============================================================ PAGE 1: COVER

  fillRect(0, 0, pageW, pageH, DARK.background);

  // Signature motif: this trip's actual origin -> destination arc, low opacity.
  if (
    geo.originLat != null &&
    geo.originLng != null &&
    geo.destLat != null &&
    geo.destLng != null
  ) {
    const start = { x: margin + 14, y: 150 };
    const end = { x: pageW - margin - 14, y: 118 };
    const points = buildArcPoints(start, end, { bow: 0.18 });
    withOpacity(0.16, () => {
      doc.setDrawColor(DARK.primary[0], DARK.primary[1], DARK.primary[2]);
      doc.setLineWidth(0.6);
      for (let i = 0; i < points.length - 1; i++) {
        doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
      }
      doc.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      doc.circle(start.x, start.y, 1.6, 'F');
      doc.setFillColor(DARK.primary[0], DARK.primary[1], DARK.primary[2]);
      doc.circle(end.x, end.y, 2.2, 'F');
    });
  }

  // Brand mark + eyebrow
  setFont(9, DARK.primary, 'bold');
  doc.text(
    'WANDR  \u00b7  AI-GENERATED TRIP',
    pageW / 2,
    28,
    { align: 'center' },
  );

  setFont(28, DARK.foreground, 'bold', TYPE.display);
  doc.text(trip.title, pageW / 2, 46, {
    align: 'center',
    maxWidth: usableW,
  });

  setFont(10, DARK.muted, 'normal');
  doc.text(trip.summary, pageW / 2, 58, {
    align: 'center',
    maxWidth: usableW - 20,
  });

  doc.setDrawColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
  doc.setLineWidth(0.8);
  doc.line(pageW / 2 - 24, 66, pageW / 2 + 24, 66);

  const dateRange =
    fd.startDate && fd.endDate
      ? `${fd.startDate}  \u2013  ${fd.endDate}`
      : '';
  if (dateRange) {
    setFont(8.5, DARK.muted);
    doc.text(dateRange, pageW / 2, 74, { align: 'center' });
  }

  // ---------- Destination scenery image in the blank space ----------
  const coverImgTop = 82;
  const coverImgH = 90;
  try {
    const destImage = await fetchDestinationImage(fd.destination || '');
    if (destImage) {
      // Draw a subtle rounded-rect frame
      fillRect(margin - 0.5, coverImgTop - 0.5, usableW + 1, coverImgH + 1, [30, 30, 30] as any, 3);
      doc.addImage(destImage, 'JPEG', margin, coverImgTop, usableW, coverImgH, undefined, 'FAST');

      // Dark gradient overlay at bottom so the cards below don't clash
      const overlaySteps = 20;
      for (let i = 0; i < overlaySteps; i++) {
        const frac = i / overlaySteps;
        const alpha = frac * frac * 0.85; // quadratic fade
        const segY = coverImgTop + coverImgH - (overlaySteps - i) * (coverImgH / (overlaySteps * 2.5));
        const segH = coverImgH / (overlaySteps * 2.5);
        withOpacity(alpha, () => {
          doc.setFillColor(0, 0, 0);
          doc.rect(margin, segY, usableW, segH, 'F');
        });
      }
    }
  } catch {
    // Scenery image is a nice-to-have; never break the cover.
  }

  // Overview cards, dark surfaces
  const duration =
    fd.startDate && fd.endDate
      ? `${Math.ceil((new Date(fd.endDate).getTime() - new Date(fd.startDate).getTime()) / 86400000) + 1} days`
      : '\u2013 days';

  const overview = [
    { label: 'DESTINATION', value: fd.destination, accent: DARK.primary },
    { label: 'DURATION', value: duration, accent: DARK.accent },
    {
      label: 'TRAVELERS',
      value: String(fd.travelers),
      accent: PALETTE.sunset500,
    },
    {
      label: 'TOTAL BUDGET',
      value: fmtCur(
        Number(
          (trip.budget as any)?.actualCost ??
            (trip.budget as any)?.total ??
            fd.budget,
        ) || 0,
      ),
      accent: PALETTE.forest500,
    },
  ];

  const cardW = (usableW - 12) / 2;
  const cardH = 22;
  const cardsTop = 188;
  overview.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = margin + col * (cardW + 12);
    const cy = cardsTop + row * (cardH + 8);

    fillRect(cx, cy, cardW, cardH, DARK.surface, 3);
    fillRect(cx, cy + 4, 1.6, cardH - 8, item.accent, 1);

    setFont(7, DARK.muted, 'normal');
    doc.text(item.label, cx + 8, cy + 9);
    setFont(12, DARK.foreground, 'bold');
    doc.text(item.value, cx + 8, cy + 17, { maxWidth: cardW - 14 });
  });

  setFont(7, [110, 110, 110] as any, 'normal');
  doc.text('Generated by Wandr AI', pageW / 2, pageH - 12, {
    align: 'center',
  });

  // ============================================================ INTERIOR PAGES

  doc.addPage();
  fillRect(0, 0, pageW, pageH, LIGHT.background);
  drawInteriorHeader();
  y = 26;

  // ---------- Budget Breakdown ----------
  sectionHeader('> Budget Breakdown', LIGHT.accent);

  const b = trip.budget as any;
  const budgetItems = [
    { label: 'Transport', amount: Number(b?.transport) || 0, color: PALETTE.ocean500 },
    { label: 'Accommodation', amount: Number(b?.accommodation) || 0, color: PALETTE.forest500 },
    { label: 'Food', amount: Number(b?.food) || 0, color: PALETTE.sunset500 },
    { label: 'Activities', amount: Number(b?.activities) || 0, color: LIGHT.accent },
    { label: 'Miscellaneous', amount: Number(b?.miscellaneous) || 0, color: PALETTE.earth500 },
    { label: 'Emergency', amount: Number(b?.emergencyFund) || 0, color: PALETTE.earth300 },
  ].filter((item) => item.amount > 0);

  const barMaxW = usableW * 0.45;
  const maxAmount = Math.max(...budgetItems.map((i) => i.amount), 1);

  budgetItems.forEach((item) => {
    checkPage(11);
    const barW = Math.max(2, (item.amount / maxAmount) * barMaxW);
    setFont(8.5, LIGHT.muted);
    doc.text(item.label, margin, y + 4);
    setFont(8.5, LIGHT.foreground, 'bold');
    doc.text(fmtCur(item.amount), pageW - margin, y + 4, {
      align: 'right',
    });
    fillRect(margin + 38, y + 6, barMaxW + 10, 2.4, LIGHT.surfaceMuted, 1.2);
    fillRect(margin + 38, y + 6, barW, 2.4, item.color, 1.2);
    y += 10;
  });

  y += 3;
  checkPage(16);
  doc.setDrawColor(LIGHT.border[0], LIGHT.border[1], LIGHT.border[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  setFont(9.5, LIGHT.foreground, 'bold');
  doc.text('Total Budget', margin, y);
  doc.text(fmtCur(Number(b?.actualCost ?? b?.total) || 0), pageW - margin, y, {
    align: 'right',
  });
  y += 6;
  setFont(7.5, LIGHT.muted);
  doc.text(
    `Per Day: ${fmtCur(Number(b?.perDay) || 0)}   \u00b7   Per Person: ${fmtCur(Number(b?.perPerson) || 0)}`,
    margin,
    y,
  );
  y += 14;

  // ---------- Pre-calculate transport cost distribution ----------
  const transportBudget = Number(b?.transport) || 0;
  const days = trip.days ?? [];
  const allTransportActs: any[] = [];
  days.forEach((day: any) => {
    (day.activities ?? []).forEach((a: any) => {
      if ((a.type || '').toLowerCase() === 'transport') allTransportActs.push(a);
    });
  });

  // First pass: resolve what we can (flights from communityFlight, trains from estimate)
  const resolvedCosts = new Map<any, number>();
  let knownTransportTotal = 0;
  let zeroCostCount = 0;

  allTransportActs.forEach((act) => {
    const cost = resolveActivityCost(act, geo.communityFlight, transportBudget, 0);
    resolvedCosts.set(act, cost);
    if (cost > 0) {
      knownTransportTotal += cost;
    } else {
      zeroCostCount++;
    }
  });

  // If there's surplus budget and zero-cost transport acts, distribute evenly
  const surplus = Math.max(0, transportBudget - knownTransportTotal);
  const distributedPerAct =
    zeroCostCount > 0 ? Math.round(surplus / zeroCostCount) : 0;

  // Final cost resolver for any activity
  const getActCost = (act: any): number => {
    const base = Number(act.cost) || 0;
    if (base > 0) return base;
    const type = (act.type || '').toLowerCase();
    if (type !== 'transport') return 0;
    const resolved = resolvedCosts.get(act);
    if (resolved !== undefined && resolved > 0) return resolved;
    return distributedPerAct;
  };

  // ---------- Day-by-day itinerary ----------
  const allActivityPins: { lat: number; lng: number }[] = [];

  days.forEach((day: any, dayIdx: number) => {
    checkPage(20);
    fillRect(margin, y - 2, usableW, 9, LIGHT.primary, 2);
    setFont(10.5, [255, 255, 255] as any, 'bold');
    doc.text(`Day ${day.dayNumber}: ${day.theme}`, margin + 6, y + 4);
    if (day.date) {
      setFont(7, [255, 235, 220] as any);
      doc.text(day.date, pageW - margin - 4, y + 4, { align: 'right' });
    }
    y += 12;

    if (day.summary) {
      setFont(8, LIGHT.muted);
      doc.text(day.summary, margin + 2, y, { maxWidth: usableW - 4 });
      y += 6;
    }

    const acts = day.activities ?? [];
    acts.forEach((a: any) => {
      if (a.lat != null && a.lng != null)
        allActivityPins.push({ lat: a.lat, lng: a.lng });
    });

    if (acts.length > 0) {
      checkPage(Math.min(acts.length * 9 + 14, pageH - 50));

      autoTable(doc, {
        startY: y,
        head: [['Time', 'Activity', 'Location', 'Duration', 'Cost', 'Type']],
        body: acts.map((act: any) => [
          act.time || '\u2013',
          act.title || '',
          act.location || '',
          act.duration ? `${act.duration}m` : '',
          fmtCur(getActCost(act)),
          act.type || '',
        ]),
        margin: { left: margin, right: margin },
        styles: {
          font: TYPE.body,
          fontSize: 7.5,
          cellPadding: 2.6,
          textColor: LIGHT.foreground as any,
          lineColor: LIGHT.border as any,
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: LIGHT.surfaceMuted as any,
          textColor: LIGHT.muted as any,
          fontSize: 7,
          fontStyle: 'bold',
          lineColor: LIGHT.border as any,
          lineWidth: 0.3,
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 17, fontStyle: 'bold' },
          1: { cellWidth: 43 },
          2: { cellWidth: 34 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 20, halign: 'center' },
        },
        didDrawCell: (data: any) => {
          // --- FIX: Erase default black text in Type column, draw colored ---
          if (data.section === 'body' && data.column.index === 5) {
            // Cover the default autoTable text with the row's background color
            const isAlt = data.row.index % 2 === 1;
            const bg = isAlt ? [255, 255, 255] : LIGHT.background;
            doc.setFillColor(bg[0], bg[1], bg[2]);
            doc.rect(
              data.cell.x + 0.3,
              data.cell.y + 0.3,
              data.cell.width - 0.6,
              data.cell.height - 0.6,
              'F',
            );

            // Now draw the colored type label
            const typeColors: Record<string, readonly number[]> = {
              TRANSPORT: PALETTE.ocean500,
              SIGHTSEEING: LIGHT.accent,
              ADVENTURE: PALETTE.sunset500,
              RESTAURANT: PALETTE.sunset500,
              SHOPPING: LIGHT.primary,
              ACCOMMODATION: PALETTE.forest500,
              REST: LIGHT.muted,
            };
            const col =
              typeColors[String(data.cell.raw).toUpperCase()] || LIGHT.muted;
            doc.setTextColor(col[0], col[1], col[2]);
            doc.setFontSize(6.5);
            doc.setFont(TYPE.body, 'bold');
            doc.text(
              String(data.cell.raw),
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1.2,
              { align: 'center' },
            );
          }
          // Color the cost column
          if (data.section === 'body' && data.column.index === 4) {
            doc.setTextColor(LIGHT.primary[0], LIGHT.primary[1], LIGHT.primary[2]);
          }
        },
      });

      y = (doc as any).lastAutoTable?.finalY + 6;
    }

    if (dayIdx < days.length - 1) {
      checkPage(8);
      y += 3;
      doc.setDrawColor(LIGHT.border[0], LIGHT.border[1], LIGHT.border[2]);
      doc.setLineWidth(0.2);
      doc.line(margin + 10, y, pageW - margin - 10, y);
      y += 5;
    }
  });

  // ---------- Destination map ----------
  if (geo.destLat != null && geo.destLng != null) {
    try {
      const snapshot = await getDestinationMapSnapshot(geo.destLat, geo.destLng, {
        widthPx: 1000,
        heightPx: 560,
        zoom: 12,
        extraPins: allActivityPins
          .slice(0, 12)
          .map((p) => ({ ...p, color: LIGHT.accent as any, radius: 3.5 })),
      });
      if (snapshot) {
        const imgW = usableW;
        const imgH = imgW * (560 / 1000);
        checkPage(imgH + 20);
        y += 4;
        sectionHeader("Where You\u2019re Headed", LIGHT.primary);
        fillRect(margin - 1, y - 1, imgW + 2, imgH + 2, LIGHT.border, 3);
        doc.addImage(snapshot, 'PNG', margin, y, imgW, imgH, undefined, 'FAST');
        y += imgH + 12;
      }
    } catch {
      // Map is a nice-to-have; never let it break the rest of the document.
    }
  }

  // ---------- Hotels ----------
  if (trip.hotels && trip.hotels.length > 0) {
    y += 2;
    sectionHeader('> Recommended Stays', LIGHT.accent);

    (trip.hotels as any[]).forEach((hotel) => {
      checkPage(20);
      fillRect(margin, y - 1, usableW, 16, LIGHT.surfaceMuted, 2);
      setFont(9.5, LIGHT.foreground, 'bold');
      doc.text(hotel.name || 'Hotel', margin + 5, y + 5);
      setFont(7.5, LIGHT.muted);
      const loc = hotel.type || hotel.location || '';
      doc.text(loc, margin + 5, y + 10.5);
      if (hotel.rating) {
        drawRatingDots(
          margin + 5 + doc.getTextWidth(loc) + 5,
          y + 9.3,
          Number(hotel.rating),
          PALETTE.sunset500,
        );
      }
      setFont(7.5, LIGHT.foreground, 'bold');
      doc.text(
        `${fmtCur(Number(hotel.pricePerNight) || 0)}/night`,
        pageW - margin - 5,
        y + 10.5,
        { align: 'right' },
      );
      y += 20;
    });
  }

  // ---------- Food & Dining ----------
  if (trip.restaurants && trip.restaurants.length > 0) {
    y += 2;
    sectionHeader('> Food & Dining', PALETTE.sunset500);

    (trip.restaurants as any[]).forEach((r) => {
      checkPage(18);
      setFont(9, LIGHT.foreground, 'bold');
      doc.text(r.name || 'Restaurant', margin, y + 2);
      let metaY = y + 7;
      setFont(7.5, LIGHT.muted);
      doc.text(r.cuisine || '', margin, metaY);
      if (r.rating) {
        drawRatingDots(
          margin + doc.getTextWidth(r.cuisine || '') + 6,
          metaY - 1.2,
          Number(r.rating),
          PALETTE.sunset500,
        );
      }
      const priceText =
        r.priceRange ||
        (r.pricePerPerson
          ? `${fmtCur(Number(r.pricePerPerson) || 0)}/person`
          : '');
      if (priceText)
        doc.text(priceText, pageW - margin, metaY, { align: 'right' });

      if (r.mustTry?.length) {
        setFont(7.5, LIGHT.accent);
        doc.text(
          `Must try: ${r.mustTry.join(', ')}`,
          margin,
          metaY + 5,
          { maxWidth: usableW },
        );
        y = metaY + 11;
      } else {
        y = metaY + 7;
      }
    });
  }

  // ---------- Packing Checklist ----------
  if (trip.packingList && trip.packingList.length > 0) {
    y += 2;
    sectionHeader('> Packing Checklist', LIGHT.primary);

    (trip.packingList as any[]).forEach((cat) => {
      checkPage(16);
      setFont(8.5, LIGHT.foreground, 'bold');
      doc.text(cat.category || 'Packing', margin, y + 2);

      const rawItems = Array.isArray(cat.items)
        ? cat.items
        : Array.isArray(cat)
          ? cat
          : [];
      const itemNames = rawItems
        .map((it: any) =>
          typeof it === 'string' ? it : it?.name || it?.item || '',
        )
        .filter(Boolean);

      if (itemNames.length === 0) {
        setFont(7, [...LIGHT.muted] as any, 'normal');
        doc.text('No items listed for this category.', margin + 3, y + 7);
        y += 11;
      } else {
        const joined = itemNames.join('  \u00b7  ');
        setFont(7, LIGHT.muted);
        doc.text(joined, margin + 3, y + 7, { maxWidth: usableW - 6 });
        const lineCount = doc.splitTextToSize(joined, usableW - 6).length;
        y += Math.max(12, lineCount * 4 + 8);
      }
    });
  }

  // ---------- Safety & Tips ----------
  const safety = trip.safety as any;
  if (safety && (safety.tips?.length || safety.overallScore)) {
    y += 2;
    sectionHeader('> Safety & Tips', PALETTE.sunset500);

    if (safety.overallScore) {
      const scoreColor =
        safety.overallScore >= 7
          ? PALETTE.forest500
          : safety.overallScore >= 4
            ? PALETTE.sunset500
            : [219, 39, 89];
      checkPage(14);
      fillRect(margin, y - 1, 56, 9, scoreColor as any, 2);
      setFont(8.5, [255, 255, 255] as any, 'bold');
      doc.text(`Safety Score: ${safety.overallScore}/10`, margin + 5, y + 5);
      y += 14;
    }

    (safety.tips || [])
      .slice(0, 10)
      .forEach((tip: string) => {
        checkPage(8);
        setFont(7.5, LIGHT.muted);
        doc.text(`\u2022  ${tip}`, margin + 2, y + 2, {
          maxWidth: usableW - 4,
        });
        y += 6;
      });
  }

  // ---------- Closing sign-off ----------
  checkPage(34);
  y += 6;
  doc.setDrawColor(LIGHT.border[0], LIGHT.border[1], LIGHT.border[2]);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2 - 20, y, pageW / 2 + 20, y);
  y += 9;
  setFont(11, LIGHT.primary, 'bold', TYPE.display);
  doc.text('Have an amazing trip.', pageW / 2, y, { align: 'center' });
  y += 6;
  setFont(7.5, LIGHT.muted);
  doc.text('\u2014 Team Wandr AI', pageW / 2, y, { align: 'center' });

  addFooter();

  return doc;
}

/**
 * Browser-only convenience wrapper: builds the document, then triggers the
 * actual file download. This is what the "Download PDF" button should call.
 */
export async function downloadTripPDF(
  trip: GeneratedTrip,
  fd: TripFormData,
  geo: GeoContext = {},
): Promise<void> {
  const doc = await buildTripPDF(trip, fd, geo);
  const safeName = (trip.title || 'Wandr_Trip')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
  doc.save(`${safeName || 'Wandr_Trip'}.pdf`);
}
