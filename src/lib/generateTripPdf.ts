// src/lib/generateTripPdf.ts
// Wandr AI — Premium trip PDF with dark cover + light interior pages.
// Uses the site's actual design tokens (amber primary, teal accent, Inter font).
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfParams {
  trip: any;
  formData: any;
  formatCurrency: (amount: number, currency?: string) => string;
}

/* ═══════════════════════════════════════════════════════════════════
   FONT LOADING — Inter supports ₹ ★ • — é etc.
   Falls back to Helvetica if loading fails.
   ═══════════════════════════════════════════════════════════════════ */
function arrBufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function loadFonts(doc: jsPDF): Promise<boolean> {
  const urls = [
    '/fonts/Inter-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/nicokant/fonts@main/inter/Inter-Regular.ttf',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      doc.addFileToVFS('Inter-Regular.ttf', arrBufToBase64(buf));
      doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
      // Synthetic bold via the same file
      doc.addFileToVFS('Inter-Bold.ttf', arrBufToBase64(buf));
      doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
      return true;
    } catch { /* next */ }
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════════
   COLOR SYSTEM — pulled from site's CSS custom properties.
   Dark mode: --primary: hsl(30,80%,60%) = amber, --accent: hsl(195,55%,50%) = teal
   ═══════════════════════════════════════════════════════════════════ */
const C = {
  // Cover (dark)
  coverBg:    [10, 10, 10],
  amber:      [235, 153, 71],   // hsl(30,80%,60%)
  amberDark:  [180, 110, 40],
  teal:       [57, 198, 163],   // hsl(195,55%,50%)
  tealDark:   [35, 140, 120],
  white:      [255, 255, 255],
  white80:    [255, 255, 255],
  white40:    [180, 190, 200],
  // Interior (light)
  pageBg:     [253, 248, 243],  // earth-50 warm off-white
  cardBg:     [255, 255, 255],
  textDark:   [26, 26, 26],
  textMid:    [107, 114, 128],  // gray-500
  textLight:  [160, 165, 175],
  border:     [220, 222, 226],
  rowAlt:     [247, 245, 241],
  // Type colors
  transport:  [59, 130, 246],
  sightseeing:[16, 185, 129],
  adventure:  [234, 88, 12],
  restaurant: [219, 39, 119],
  shopping:   [124, 58, 237],
  rest:       [148, 163, 184],
  accommodation:[234, 88, 12],
};

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
function setFont(doc: jsPDF, size: number, color: number[], style: 'normal' | 'bold' = 'normal') {
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  if (useInter) {
    doc.setFont('Inter', style);
  } else {
    doc.setFont('helvetica', style);
  }
}

let useInter = false;

function checkPage(doc: jsPDF, y: number, needed: number, pageW: number, pageH: number, margin: number): number {
  if (y + needed > pageH - 25) {
    addFooter(doc, pageW, pageH, margin);
    doc.addPage();
    // Light page background
    doc.setFillColor(C.pageBg[0], C.pageBg[1], C.pageBg[2]);
    doc.rect(0, 0, pageW, pageH, 'F');
    return margin;
  }
  return y;
}

function addFooter(doc: jsPDF, pageW: number, pageH: number, m: number) {
  const total = doc.getNumberOfPages();
  const p = doc.getNumberOfPages();
  doc.setFillColor(C.textLight[0], C.textLight[1], C.textLight[2]);
  doc.setFontSize(7);
  if (useInter) doc.setFont('Inter', 'normal'); else doc.setFont('helvetica', 'normal');
  doc.text('Wandr AI', m, pageH - 8);
  doc.text(`Page ${p} / ${total}`, pageW / 2, pageH - 8, { align: 'center' });
  doc.text(new Date().toLocaleDateString(), pageW - m, pageH - 8, { align: 'right' });
}

function drawRRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: number[]) {
  doc.setFillColor(fill[0], fill[1], fill[2]);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function drawPill(doc: jsPDF, x: number, y: number, w: number, h: number, color: number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
}

function fmtDuration(d: any): string {
  if (!d) return '';
  if (typeof d === 'number') return d >= 60 ? `${Math.floor(d / 60)}h ${d % 60}m` : `${d}m`;
  return String(d);
}

function stars(n: number): string {
  if (!n || n <= 0) return '';
  let s = '';
  for (let i = 0; i < Math.min(Math.round(n), 5); i++) s += '\u2605 ';
  return s.trim();
}

/* ═══════════════════════════════════════════════════════════════════
   DESTINATION SKYLINE — simple geometric silhouette on the cover
   ═══════════════════════════════════════════════════════════════════ */
function drawSkyline(doc: jsPDF, dest: string, x: number, baseY: number, w: number) {
  const d = (dest || '').toLowerCase();
  doc.setFillColor(C.white[0], C.white[1], C.white[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.07 }));

  const draw = (pts: Array<[number, number, number, number]>) => {
    pts.forEach(([bx, by, bw, bh]) => doc.rect(x + bx, baseY - by, bw, bh, 'F'));
  };

  if (d.includes('delhi') || d.includes('new delhi')) {
    draw([[0, 18, 8, 18], [12, 24, 5, 24], [22, 30, 3, 30], [30, 20, 10, 20], [44, 35, 4, 35], [52, 15, 12, 15], [68, 28, 6, 28], [78, 22, 8, 22], [90, 14, 6, 14], [100, 26, 4, 26], [108, 18, 10, 18], [122, 12, 5, 12], [130, 20, 8, 20]]);
  } else if (d.includes('mumbai')) {
    draw([[0, 14, 12, 14], [16, 22, 6, 22], [26, 30, 4, 30], [34, 20, 8, 20], [46, 28, 5, 28], [55, 12, 14, 12], [73, 35, 4, 35], [81, 25, 7, 25], [92, 18, 6, 18], [102, 30, 4, 30], [110, 15, 10, 15], [124, 22, 6, 22]]);
  } else if (d.includes('agra')) {
    draw([[15, 12, 10, 12], [30, 38, 5, 38], [40, 35, 5, 35], [50, 12, 10, 12], [65, 42, 3, 42], [72, 38, 3, 38], [80, 12, 10, 12], [100, 20, 6, 20], [110, 15, 5, 15], [118, 25, 4, 25], [128, 18, 6, 18]]);
  } else if (d.includes('jaipur')) {
    draw([[0, 20, 6, 20], [10, 32, 4, 32], [18, 36, 4, 36], [26, 32, 4, 32], [34, 36, 4, 36], [42, 32, 4, 32], [50, 36, 4, 36], [58, 32, 4, 32], [66, 20, 10, 20], [80, 15, 6, 15], [90, 25, 5, 25], [100, 35, 4, 35], [108, 28, 5, 28], [118, 15, 10, 15], [132, 22, 4, 22]]);
  } else if (d.includes('varanasi')) {
    draw([[0, 22, 4, 22], [8, 30, 3, 30], [15, 26, 3, 26], [22, 34, 3, 34], [30, 20, 10, 20], [44, 28, 4, 28], [52, 18, 6, 18], [62, 32, 3, 32], [70, 24, 5, 24], [80, 36, 3, 36], [88, 20, 8, 20], [100, 28, 4, 28], [108, 16, 6, 16], [118, 22, 5, 22], [128, 30, 4, 30]]);
  } else if (d.includes('goa')) {
    draw([[0, 10, 14, 10], [18, 28, 4, 28], [26, 32, 3, 32], [33, 14, 10, 14], [47, 26, 4, 26], [55, 10, 12, 10], [71, 20, 5, 20], [80, 30, 3, 30], [87, 12, 8, 12], [99, 18, 5, 18], [108, 26, 4, 26], [116, 10, 10, 10], [130, 22, 4, 22]]);
  } else if (d.includes('kerala') || d.includes('kochi') || d.includes('alleppey')) {
    draw([[0, 8, 12, 8], [16, 18, 4, 18], [24, 12, 10, 12], [38, 22, 4, 22], [46, 10, 8, 10], [58, 16, 5, 16], [67, 20, 4, 20], [75, 8, 12, 8], [91, 24, 4, 24], [99, 14, 6, 14], [109, 18, 5, 18], [118, 10, 8, 10], [130, 16, 4, 16]]);
  } else {
    // Generic: mountain range + trees
    draw([[0, 12, 10, 12], [14, 22, 6, 22], [24, 30, 4, 30], [32, 18, 8, 18], [44, 26, 5, 26], [53, 14, 10, 14], [67, 28, 4, 28], [75, 20, 6, 20], [85, 32, 3, 32], [92, 18, 8, 18], [104, 24, 5, 24], [113, 12, 8, 12], [125, 20, 5, 20], [134, 16, 4, 16]]);
  }

  doc.setGState(new (doc as any).GState({ opacity: 1 }));
}

/* ═══════════════════════════════════════════════════════════════════
   SCHEMATIC MAP — plot itinerary stops as dots connected by lines
   ═══════════════════════════════════════════════════════════════════ */
function drawSchematicMap(doc: jsPDF, trip: any, x: number, y: number, w: number, h: number) {
  const pad = 10;
  const stops: Array<{ name: string; lat: number; lng: number; day: number }> = [];

  (trip.days || []).forEach((day: any) => {
    (day.activities || []).forEach((act: any) => {
      const lat = Number(act.lat);
      const lng = Number(act.lng);
      if (lat && lng && lat !== 0 && lng !== 0) {
        const t = (act.type || '').toUpperCase();
        if (t !== 'TRANSPORT') {
          stops.push({ name: act.title || act.name || '', lat, lng, day: day.dayNumber ?? 0 });
        }
      }
    });
  });

  if (stops.length < 2) return y;

  const lats = stops.map(s => s.lat);
  const lngs = stops.map(s => s.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);
  const mapW = w - pad * 2;
  const mapH = h - pad * 2;

  const toX = (lng: number) => x + pad + ((lng - minLng) / lngRange) * mapW;
  const toY = (lat: number) => y + pad + mapH - ((lat - minLat) / latRange) * mapH;

  // Background
  drawRRect(doc, x, y, w, h, 4, [245, 242, 238]);
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 4, 4, 'S');

  // Route lines
  doc.setDrawColor(C.amber[0], C.amber[1], C.amber[2]);
  doc.setLineWidth(0.8);
  for (let i = 0; i < stops.length - 1; i++) {
    doc.line(toX(stops[i].lng), toY(stops[i].lat), toX(stops[i + 1].lng), toY(stops[i + 1].lat));
  }

  // Dots
  stops.forEach((s, i) => {
    const cx = toX(s.lng);
    const cy = toY(s.lat);
    const isFirst = i === 0;
    const isLast = i === stops.length - 1;
    const color = isFirst || isLast ? C.amber : C.teal;
    const r = isFirst || isLast ? 3 : 2;

    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(cx, cy, r, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(cx, cy, r, 'S');

    // Labels for first, last, and every 3rd stop
    if (isFirst || isLast || i % 3 === 0) {
      setFont(doc, 5.5, C.textMid);
      const label = s.name.length > 20 ? s.name.substring(0, 18) + '..' : s.name;
      doc.text(label, cx, cy + r + 3, { align: 'center', maxWidth: 30 });
    }
  });

  return y + h + 6;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════ */
export async function generateTripPdf({ trip, formData: fd, formatCurrency: fmtCur }: PdfParams) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const usableW = pageW - margin * 2;
  let y = 0;

  // Load Inter font for ₹ ★ • — support
  useInter = await loadFonts(doc);
  console.log('[PDF] Font loaded:', useInter ? 'Inter' : 'Helvetica (fallback)');

  // ── SECTION: DARK COVER + OVERVIEW ──────────────────────────────
  // Cover background
  doc.setFillColor(C.coverBg[0], C.coverBg[1], C.coverBg[2]);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Amber accent bar at very top
  doc.setFillColor(C.amber[0], C.amber[1], C.amber[2]);
  doc.rect(0, 0, pageW, 3, 'F');

  // Brand mark
  setFont(doc, 8, C.white40);
  doc.text('WANDR AI', pageW / 2, 14, { align: 'center' });

  // Destination skyline
  drawSkyline(doc, fd.destination, margin, pageH * 0.62, usableW);

  // Trip title
  setFont(doc, 28, C.white, 'bold');
  doc.text(trip.title || 'Your Trip', pageW / 2, pageH * 0.36, { align: 'center' });

  // Summary
  setFont(doc, 10, C.white80);
  const summary = trip.summary || `${fd.duration || ''}-day trip to ${fd.destination || 'your destination'}`;
  doc.text(summary, pageW / 2, pageH * 0.41, { align: 'center', maxWidth: usableW - 20 });

  // Teal decorative line
  doc.setDrawColor(C.teal[0], C.teal[1], C.teal[2]);
  doc.setLineWidth(0.8);
  doc.line(pageW / 2 - 25, pageH * 0.445, pageW / 2 + 25, pageH * 0.445);

  // Date range
  setFont(doc, 9, C.white40);
  const dateRange = fd.startDate && fd.endDate
    ? `${fd.startDate}  \u2192  ${fd.endDate}`
    : '';
  if (dateRange) doc.text(dateRange, pageW / 2, pageH * 0.47, { align: 'center' });

  // Overview pills
  const duration = fd.startDate && fd.endDate
    ? `${Math.ceil((new Date(fd.endDate).getTime() - new Date(fd.startDate).getTime()) / 86400000) + 1} days`
    : '-- days';
  const budgetVal = trip.budget?.actualCost ?? trip.budget?.total ?? fd.budget ?? 0;

  const pills = [
    { label: 'Destination', value: fd.destination || '--', accent: C.amber },
    { label: 'Duration', value: String(duration), accent: C.teal },
    { label: 'Travelers', value: String(fd.travelers || 1), accent: C.amberDark },
    { label: 'Budget', value: fmtCur(Number(budgetVal) || 0), accent: C.tealDark },
  ];

  const pillY = pageH * 0.53;
  const pillW = (usableW - 18) / 2;
  const pillH = 14;
  pills.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = margin + col * (pillW + 18);
    const py = pillY + row * (pillH + 5);

    drawRRect(doc, px, py, pillW, pillH, 3, [20, 20, 22]);
    drawPill(doc, px + 2, py + 3, 2, pillH - 6, p.accent);

    setFont(doc, 6, C.white40);
    doc.text(p.label, px + 8, py + 5);
    setFont(doc, 9.5, C.white, 'bold');
    doc.text(p.value, px + 8, py + 10.5);
  });

  // Budget breakdown on cover
  y = pillY + Math.ceil(pills.length / 2) * (pillH + 5) + 8;

  setFont(doc, 12, C.white, 'bold');
  doc.text('Budget Breakdown', margin, y);
  doc.setDrawColor(C.amber[0], C.amber[1], C.amber[2]);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 35, y + 2);
  y += 8;

  const budgetCats = [
    { label: 'Transport', key: 'transport', color: C.transport },
    { label: 'Accommodation', key: 'accommodation', color: C.teal },
    { label: 'Food', key: 'food', color: C.amber },
    { label: 'Activities', key: 'activities', color: [124, 58, 237] },
    { label: 'Miscellaneous', key: 'miscellaneous', color: C.textLight },
    { label: 'Emergency', key: 'emergencyFund', color: C.textLight },
  ].filter(b => (Number(trip.budget?.[b.key]) || 0) > 0);

  const barMaxW = usableW * 0.4;
  const maxAmt = Math.max(...budgetCats.map(b => Number(trip.budget?.[b.key]) || 0), 1);

  budgetCats.forEach(b => {
    const amt = Number(trip.budget?.[b.key]) || 0;
    const barW = Math.max(2, (amt / maxAmt) * barMaxW);

    setFont(doc, 8, C.white80);
    doc.text(b.label, margin, y + 3.5);
    setFont(doc, 8, C.white, 'bold');
    doc.text(fmtCur(amt), pageW - margin, y + 3.5, { align: 'right' });

    // Track
    drawPill(doc, margin + 34, y + 6, barMaxW + 10, 2, [50, 50, 55]);
    // Fill
    drawPill(doc, margin + 34, y + 6, barW, 2, b.color);
    y += 9;
  });

  // Total line
  y += 2;
  doc.setDrawColor(C.white40[0], C.white40[1], C.white40[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  setFont(doc, 10, C.amber, 'bold');
  doc.text('Total Budget', margin, y + 1);
  doc.text(fmtCur(budgetVal), pageW - margin, y + 1, { align: 'right' });
  y += 5;
  setFont(doc, 7, C.white40);
  doc.text(`Per Day: ${fmtCur(trip.budget?.perDay || 0)}    |    Per Person: ${fmtCur(trip.budget?.perPerson || 0)}`, margin, y + 1);

  // ── NEW PAGE: LIGHT INTERIOR ──────────────────────────────────
  doc.addPage();
  doc.setFillColor(C.pageBg[0], C.pageBg[1], C.pageBg[2]);
  doc.rect(0, 0, pageW, pageH, 'F');
  y = margin;

  // ── SECTION: DAY-BY-DAY ITINERARY ──────────────────────────────
  const days: any[] = trip.days ?? [];

  days.forEach((day, dayIdx) => {
    y = checkPage(doc, y, 30, pageW, pageH, margin);

    // Day header bar
    drawRRect(doc, margin, y, usableW, 9, 2, [20, 20, 22]);
    setFont(doc, 10, C.white, 'bold');
    doc.text(`Day ${day.dayNumber ?? dayIdx + 1}: ${day.theme || ''}`, margin + 5, y + 6.2);
    if (day.date) {
      setFont(doc, 7, C.white40);
      doc.text(String(day.date), pageW - margin - 4, y + 6, { align: 'right' });
    }
    y += 12;

    if (day.summary) {
      setFont(doc, 7.5, C.textMid);
      doc.text(String(day.summary), margin + 2, y, { maxWidth: usableW - 4 });
      y += 6;
    }

    const acts: any[] = day.activities ?? [];
    if (acts.length > 0) {
      y = checkPage(doc, y, 12, pageW, pageH, margin);

      autoTable(doc, {
        startY: y,
        head: [['Time', 'Activity', 'Location', 'Duration', 'Cost', 'Type']],
        body: acts.map(act => [
          act.time || '--',
          act.title || '',
          act.location || '',
          fmtDuration(act.duration),
          fmtCur(Number(act.cost) || 0),
          act.type || '',
        ]),
        margin: { left: margin, right: margin, top: 0, bottom: 0 },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          textColor: [C.textDark[0], C.textDark[1], C.textDark[2]],
          lineColor: [C.border[0], C.border[1], C.border[2]],
          lineWidth: 0.15,
          font: useInter ? 'Inter' : 'helvetica',
        },
        headStyles: {
          fillColor: [245, 243, 240],
          textColor: C.textMid,
          fontSize: 6.5,
          fontStyle: 'bold',
          font: useInter ? 'Inter' : 'helvetica',
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          0: { cellWidth: 16, fontStyle: 'bold' },
          1: { cellWidth: 42 },
          2: { cellWidth: 36 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'center' },
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            const typeColors: Record<string, number[]> = {
              TRANSPORT: C.transport,
              SIGHTSEEING: C.sightseeing,
              ADVENTURE: C.adventure,
              RESTAURANT: C.restaurant,
              SHOPPING: C.shopping,
              ACCOMMODATION: C.accommodation,
              REST: C.rest,
            };
            const col = typeColors[data.cell.raw] || C.textMid;
            doc.setTextColor(col[0], col[1], col[2]);
            doc.setFontSize(6.5);
            if (useInter) doc.setFont('Inter', 'bold'); else doc.setFont('helvetica', 'bold');
            doc.text(String(data.cell.raw), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, { align: 'center' });
          }
          if (data.section === 'body' && data.column.index === 4) {
            doc.setTextColor(C.amber[0], C.amber[1], C.amber[2]);
          }
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable?.finalY + 8;
    }

    if (dayIdx < days.length - 1) {
      y = checkPage(doc, y, 8, pageW, pageH, margin);
      doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
      doc.setLineWidth(0.2);
      doc.line(margin + 10, y, pageW - margin - 10, y);
      y += 5;
    }
  });

  // ── SECTION: SCHEMATIC MAP ─────────────────────────────────────
  y = checkPage(doc, y, 65, pageW, pageH, margin);
  setFont(doc, 12, C.textDark, 'bold');
  doc.text('Route Map', margin, y);
  doc.setDrawColor(C.amber[0], C.amber[1], C.amber[2]);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + 28, y + 2);
  y += 8;
  y = drawSchematicMap(doc, trip, margin, y, usableW, 55);

  // ── SECTION: HOTELS ────────────────────────────────────────────
  const hotels: any[] = trip.hotels || [];
  if (hotels.length > 0) {
    y = checkPage(doc, y, 30, pageW, pageH, margin);
    setFont(doc, 12, C.textDark, 'bold');
    doc.text('Recommended Stays', margin, y);
    doc.setDrawColor(C.teal[0], C.teal[1], C.teal[2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 38, y + 2);
    y += 8;

    hotels.forEach((hotel) => {
      y = checkPage(doc, y, 18, pageW, pageH, margin);
      drawRRect(doc, margin, y, usableW, 16, 3, C.cardBg);
      doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, usableW, 16, 3, 3, 'S');

      drawPill(doc, margin + 3, y + 3, 2, 10, C.teal);

      setFont(doc, 9, C.textDark, 'bold');
      doc.text(hotel.name || 'Hotel', margin + 9, y + 5);
      setFont(doc, 7, C.textMid);
      const hMeta = [
        hotel.type || hotel.location || hotel.area || '',
        hotel.rating ? `${stars(hotel.rating)} ${hotel.rating}` : '',
        `${fmtCur(Number(hotel.pricePerNight) || 0)}/night`,
      ].filter(Boolean).join('  \u00b7  ');
      doc.text(hMeta, margin + 9, y + 10.5);
      if (hotel.amenities?.length) {
        setFont(doc, 6, C.tealDark);
        doc.text(hotel.amenities.slice(0, 6).join('  \u00b7  '), margin + 9, y + 13.5, { maxWidth: usableW - 18 });
      }
      y += 20;
    });
  }

  // ── SECTION: FOOD & DINING ──────────────────────────────────────
  const restaurants: any[] = trip.restaurants || [];
  if (restaurants.length > 0) {
    y = checkPage(doc, y, 30, pageW, pageH, margin);
    setFont(doc, 12, C.textDark, 'bold');
    doc.text('Food & Dining', margin, y);
    doc.setDrawColor(C.amber[0], C.amber[1], C.amber[2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 28, y + 2);
    y += 8;

    restaurants.forEach((r) => {
      y = checkPage(doc, y, 18, pageW, pageH, margin);
      setFont(doc, 9, C.textDark, 'bold');
      doc.text(r.name || 'Restaurant', margin, y + 3);
      setFont(doc, 7, C.textMid);
      const rMeta = [
        r.cuisine,
        r.rating ? `${stars(r.rating)} ${r.rating}` : '',
        r.priceRange || `${fmtCur(Number(r.pricePerPerson) || 0)}/person`,
      ].filter(Boolean).join('  \u00b7  ');
      doc.text(rMeta, margin, y + 8);
      if (r.mustTry?.length) {
        setFont(doc, 7, C.amberDark);
        doc.text(`Must try: ${Array.isArray(r.mustTry) ? r.mustTry.join(', ') : r.mustTry}`, margin, y + 12);
        y += 4;
      }
      y += 10;
    });
  }

  // ── SECTION: PACKING CHECKLIST (FIXED — groups by category) ────
  const rawPacking: any[] = trip.packingList || [];
  if (rawPacking.length > 0) {
    y = checkPage(doc, y, 30, pageW, pageH, margin);
    setFont(doc, 12, C.textDark, 'bold');
    doc.text('Packing Checklist', margin, y);
    doc.setDrawColor([124, 58, 237][0], [124, 58, 237][1], [124, 58, 237][2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 36, y + 2);
    y += 8;

    // BUG FIX: The AI returns a FLAT array [{item, reason, category, essential}],
    // NOT [{category, items: [...]}]. Group by category first.
    const groups: Record<string, any[]> = {};
    rawPacking.forEach((p: any) => {
      const cat = p.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });

    const catColors: Record<string, number[]> = {
      clothing: C.amber,
      accessories: C.teal,
      electronics: C.transport,
      toiletries: [219, 39, 119],
      documents: C.textMid,
      essential: C.sightseeing,
      other: C.textLight,
    };

    Object.entries(groups).forEach(([cat, items]) => {
      y = checkPage(doc, y, 14, pageW, pageH, margin);

      // Category header with colored dot
      const cc = catColors[cat.toLowerCase()] || C.textMid;
      doc.setFillColor(cc[0], cc[1], cc[2]);
      doc.circle(margin + 2, y + 2.5, 1.5, 'F');

      setFont(doc, 8.5, C.textDark, 'bold');
      doc.text(cat.charAt(0).toUpperCase() + cat.slice(1), margin + 6, y + 4);
      y += 7;

      items.forEach((item: any) => {
        y = checkPage(doc, y, 5, pageW, pageH, margin);
        const name = item.item || item.name || '';
        const essential = item.essential ? '\u2713 ' : '\u25cb ';
        setFont(doc, 7, C.textMid);
        doc.text(`${essential}${name}`, margin + 5, y + 3);
        y += 4.5;
      });
      y += 3;
    });
  }

  // ── SECTION: SAFETY & TIPS (FIXED — full data, no truncation) ──
  // BUG FIX: try both trip.safety and trip.safetyInfo paths
  const safety: any = trip.safety || trip.safetyInfo || null;
  if (safety) {
    y = checkPage(doc, y, 30, pageW, pageH, margin);
    setFont(doc, 12, C.textDark, 'bold');
    doc.text('Safety & Travel Tips', margin, y);
    doc.setDrawColor(C.amber[0], C.amber[1], C.amber[2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 38, y + 2);
    y += 8;

    // Safety score
    if (safety.overallScore) {
      const sc = Number(safety.overallScore);
      const scColor = sc >= 7 ? C.sightseeing : sc >= 4 ? C.amber : C.restaurant;
      drawRRect(doc, margin, y, 48, 8, 2, scColor);
      setFont(doc, 8, C.white, 'bold');
      doc.text(`Safety Score: ${sc}/10`, margin + 4, y + 5.5);
      y += 12;
    }

    // Tips — show ALL, not just 5
    const tips: string[] = safety.tips || [];
    if (tips.length > 0) {
      setFont(doc, 8, C.textDark, 'bold');
      doc.text('Tips', margin, y);
      y += 5;
      tips.forEach((tip: string) => {
        y = checkPage(doc, y, 5, pageW, pageH, margin);
        setFont(doc, 7, C.textMid);
        doc.text(`\u2022  ${tip}`, margin + 3, y + 3);
        y += 4.5;
      });
      y += 3;
    }

    // Scam alerts
    const scams: string[] = safety.scamAlerts || [];
    if (scams.length > 0) {
      setFont(doc, 8, C.textDark, 'bold');
      doc.text('Scam Alerts', margin, y);
      y += 5;
      scams.forEach((s: string) => {
        y = checkPage(doc, y, 5, pageW, pageH, margin);
        setFont(doc, 7, C.restaurant);
        doc.text(`\u2022  ${s}`, margin + 3, y + 3);
        y += 4.5;
      });
      y += 3;
    }

    // Emergency info
    if (safety.emergencyNumber) {
      setFont(doc, 8, C.textDark, 'bold');
      doc.text(`Emergency: ${safety.emergencyNumber}`, margin, y);
      y += 6;
    }

    // Hospitals
    const hospitals: any[] = safety.hospitals || [];
    if (hospitals.length > 0) {
      setFont(doc, 8, C.textDark, 'bold');
      doc.text('Nearby Hospitals', margin, y);
      y += 5;
      hospitals.forEach((h: any) => {
        y = checkPage(doc, y, 5, pageW, pageH, margin);
        setFont(doc, 7, C.textMid);
        doc.text(`\u2022  ${h.name || 'Hospital'}${h.distance ? `  \u2014  ${h.distance}` : ''}${h.phone ? `  \u2014  ${h.phone}` : ''}`, margin + 3, y + 3);
        y += 4.5;
      });
    }
  }

  // ── FINAL FOOTER ──────────────────────────────────────────────
  addFooter(doc, pageW, pageH, margin);

  // ── SAVE ──────────────────────────────────────────────────────
  const safeName = (trip.title || 'Wandr_Trip').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').substring(0, 40);
  doc.save(`${safeName}.pdf`);
}
