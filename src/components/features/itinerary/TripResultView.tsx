'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, Wallet, Clock, Download,
  MessageCircle, Navigation, Shield, Package, ChevronDown,
  ChevronUp, Star, AlertTriangle, Utensils, Hotel, Sparkles
} from 'lucide-react';
import TripMap from '@/components/features/map/TripMap';
import { TripChat } from '@/components/features/chat/TripChat';
import SendToWhatsAppButton from "@/components/trip/SendToWhatsAppButton";
import { TrackingOverlay } from '@/components/features/tracking/TrackingOverlay';
import LiquidLoading from '@/components/features/itinerary/LiquidLoading';
import { formatCurrency, formatDate, activityTypeIcon, activityTypeColor, safetyScoreColor, safetyScoreLabel, safeGetItem, safeRemoveItem } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { TripFormData, GeneratedTrip, TripDay } from '@/types';
import COMMUNITY_ROUTE_DB from '@/lib/flightDatabase.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TripData {
  tripId: string;
  formData: TripFormData;
  generatedTrip: GeneratedTrip;
  createdAt: string;
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
}



type Tab = 'itinerary' | 'map' | 'budget' | 'hotels' | 'food' | 'packing' | 'safety' | 'chat';

function normalizeTripData(raw: any, tripId: string): TripData {
  const itineraryObj: any =
    raw.itinerary && typeof raw.itinerary === 'object' && !Array.isArray(raw.itinerary)
      ? raw.itinerary
      : { days: Array.isArray(raw.itinerary) ? raw.itinerary : [] };

  const fd: TripFormData = {
    origin: raw.origin || '',
    destination: raw.destination || '',
    startDate: raw.startDate ? new Date(raw.startDate).toISOString().split('T')[0] : '',
    endDate: raw.endDate ? new Date(raw.endDate).toISOString().split('T')[0] : '',
    travelers: raw.travelers || 1,
    budget: raw.budget || 0,
    currency: raw.currency || 'INR',
    purposes: itineraryObj.purposes || raw.purposes || (raw.purpose ? [raw.purpose] : ['ADVENTURE']),
    foodPreference: raw.foodPref || raw.foodPreference || 'NON_VEG',
    hotelPreference: raw.hotelPref || raw.hotelPreference || 'STANDARD',
    transportPreferences: raw.transportPref || raw.transportPreferences || [],
    specialRequests: itineraryObj.specialRequests || '',
    includeHiddenGems: true,
    flexibleBudget: false,
    smartBudget: false,
  };

  const rawDays = Array.isArray(itineraryObj.days) ? itineraryObj.days : [];
  const days: TripDay[] = rawDays.map((d: any, i: number) => ({
    dayNumber: d.day || i + 1,
    date: d.date || '',
    theme: d.theme || `Day ${i + 1}`,
    summary: d.summary || '',
    totalCost: (d.activities || []).reduce((s: number, a: any) => s + (Number(a.cost) || 0), 0),
    activities: (d.activities || []).map((a: any) => ({
      time: a.time || '',
      title: a.title || '',
      description: a.description || '',
      location: a.location || '',
      cost: Number(a.cost) || 0,
      type: a.type || 'sightseeing',
      duration: a.duration || null,
      notes: a.tips || a.notes || '',
      lat: a.lat || null,
      lng: a.lng || null,
    })),
  }));

  const rawHotels = Array.isArray(itineraryObj.hotels) ? itineraryObj.hotels : [];
  const hotels = rawHotels.map((h: any) => ({
    name: h.name || '',
    type: h.area || h.type || '',
    pricePerNight: Number(h.pricePerNight) || 0,
    location: h.area || h.location || '',
    rating: Number(h.rating) || 0,
    amenities: Array.isArray(h.amenities) ? h.amenities : [],
    pros: h.description ? [h.description] : (Array.isArray(h.pros) ? h.pros : []),
    cons: Array.isArray(h.cons) ? h.cons : [],
    bookingUrl: h.bookingUrl || '',
    lat: h.lat || null,
    lng: h.lng || null,
  }));

  const rawRestaurants = Array.isArray(itineraryObj.restaurants) ? itineraryObj.restaurants : [];
  const restaurants = rawRestaurants.map((r: any) => ({
    name: r.name || '',
    cuisine: r.cuisine || '',
    priceRange: r.priceRange || '',
    location: r.location || '',
    rating: Number(r.rating) || 0,
    openingHours: r.openingHours || '',
    mustTry: Array.isArray(r.mustTry) ? r.mustTry : (typeof r.mustTry === 'string' ? [r.mustTry] : []),
    lat: r.lat || null,
    lng: r.lng || null,
  }));

  const rawGems = Array.isArray(itineraryObj.hiddenGems) ? itineraryObj.hiddenGems : [];
  const hiddenGems = rawGems.map((g: any) => ({
    name: g.name || '',
    crowdLevel: g.crowdLevel || 'LOW',
    description: g.description || '',
    location: g.howToReach || g.location || '',
    bestTime: g.bestTime || '',
    insiderTip: g.whySpecial || g.insiderTip || g.why || '',
  }));

  const bb: any = raw.budgetBreakdown || {};
  const budgetTotal = Number(bb.total) || 0;
  const dayCount = Math.max(days.length, 1);
  const travelerCount = Math.max(Number(raw.travelers), 1);

  const budget: any = {
    actualCost: budgetTotal,
    total: budgetTotal,
    perDay: Math.round(budgetTotal / dayCount),
    perPerson: Math.round(budgetTotal / travelerCount),
    transport: Number(bb.transport) || 0,
    accommodation: Number(bb.accommodation) || 0,
    food: Number(bb.food) || 0,
    activities: Number(bb.activities) || 0,
    miscellaneous: Number(bb.misc) || 0,
    emergencyFund: 0,
    breakdown: [] as any[],
  };

  const rawPacking = Array.isArray(raw.packingList) ? raw.packingList : [];
  let packingList: any[];
  if (rawPacking.length > 0 && rawPacking[0]?.category) {
    packingList = rawPacking;
  } else {
    const essentials = rawPacking.filter((p: any) => p.essential);
    const optional = rawPacking.filter((p: any) => !p.essential);
    packingList = [
      { category: 'Essentials', items: essentials.map((p: any) => ({ name: p.item || p.name || '', essential: true, quantity: p.quantity || 1 })) },
      { category: 'Optional', items: optional.map((p: any) => ({ name: p.item || p.name || '', essential: false, quantity: p.quantity || 1 })) },
    ].filter((c: any) => c.items.length > 0);
  }

  const si: any = raw.safetyInfo || raw.safety || {};
  const safety: any = {
    overallScore: Number(si.overallScore) || 0,
    scamAlerts: Array.isArray(si.scamAlerts) ? si.scamAlerts : [],
    emergencyContacts: Array.isArray(si.emergencyContacts) ? si.emergencyContacts : (si.emergencyNumber ? [{ name: 'Emergency', number: String(si.emergencyNumber) }] : []),
    hospitals: Array.isArray(si.hospitals) ? si.hospitals : [],
    safeAreas: Array.isArray(si.safeAreas) ? si.safeAreas : [],
    avoidAreas: Array.isArray(si.avoidAreas) ? si.avoidAreas : [],
    vaccinations: Array.isArray(si.vaccinations) ? si.vaccinations : [],
    tips: Array.isArray(si.tips) ? si.tips : [],
  };

  const generatedTrip: GeneratedTrip = {
    title: itineraryObj.title || raw.title || `Trip to ${raw.destination || 'Unknown'}`,
    summary: itineraryObj.summary || `A ${dayCount}-day trip to ${raw.destination || 'Unknown'}`,
    days,
    hotels,
    restaurants,
    hiddenGems,
    budget,
    packingList,
    safety,
    weather: raw.weatherInfo || raw.weather || {},
    seasonalTips: [],
  };

  return {
    tripId,
    formData: fd,
    generatedTrip,
    createdAt: raw.createdAt || new Date().toISOString(),
    originLat: raw.originLat ?? null,
    originLng: raw.originLng ?? null,
    destLat: raw.destLat ?? null,
    destLng: raw.destLng ?? null,
  };
}

export function TripResultView({ tripId }: { tripId: string }) {
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [showTracking, setShowTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Must be declared here, before any early return below — hooks can never
  // run conditionally. Declaring this after the early returns caused React
  // error #310 (hook count mismatch between the loading render and the
  // loaded render).
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  const loadTrip = useCallback(() => {
    fetch(`/api/trips/${tripId}`)
      .then((r: Response) => r.json())
      .then((d: any) => {
        if (d.trip) {
          const normalized = normalizeTripData(d.trip, tripId);
          setTripData(normalized);
          safeRemoveItem('generating_trip_id');
        } else {
          const generatingId = safeGetItem('generating_trip_id');
          if (generatingId === tripId) {
            setError('__GENERATING__');
          } else {
            setError('Trip not found. It may have expired.');
          }
        }
      })
      .catch(() => setError('Failed to load trip.'))
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  useEffect(() => {
    if (error !== '__GENERATING__') return;
    const timer = setInterval(() => { loadTrip(); }, 5000);
    const timeout = setTimeout(() => {
      clearInterval(timer);
      setError('Trip generation is taking too long. Please try again.');
      safeRemoveItem('generating_trip_id');
    }, 5 * 60 * 1000);
    return () => { clearInterval(timer); clearTimeout(timeout); };
  }, [error, loadTrip]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <LiquidLoading message="Loading your trip..." />
    </div>
  );
  if (error === '__GENERATING__') return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <LiquidLoading message="AI is crafting your perfect itinerary..." />
    </div>
  );
  if (error || !tripData) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-xl font-semibold text-foreground mb-2">Trip not found</p>
      <p className="text-muted-foreground mb-6">{error || 'This trip link may have expired.'}</p>
      <a href="/plan" className="btn-premium inline-flex">Plan a new trip</a>
    </div>
  );

  const { formData: fd, generatedTrip: trip } = tripData;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'itinerary', label: 'Itinerary', icon: Calendar },
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'budget', label: 'Budget', icon: Wallet },
    { id: 'hotels', label: 'Hotels', icon: Hotel },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'packing', label: 'Packing', icon: Package },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'chat', label: 'AI Chat', icon: MessageCircle },
  ];

  function handleDownloadPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 16;
    const usableW = pageW - margin * 2;
    let y = 0;

    const fmtCur = (amt: number) => formatCurrency(amt, fd.currency);

    // ---------- Color Palette ----------
    const C: Record<string, [number, number, number]> = {
      primary: [30, 58, 138],
      primaryLight: [59, 130, 246],
      accent: [14, 165, 133],
      accentLight: [52, 211, 153],
      dark: [15, 23, 42],
      mid: [71, 85, 105],
      light: [148, 163, 184],
      bg: [248, 250, 252],
      white: [255, 255, 255],
      rowAlt: [241, 245, 249],
      orange: [234, 88, 12],
      purple: [124, 58, 237],
      pink: [219, 39, 119],
    };

    // ---------- Helpers ----------
    const setFont = (size: number, color: number[] = C.dark, style: string = 'normal') => {
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      if (style === 'bold') doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
    };

    const checkPage = (needed: number) => {
      if (y + needed > pageH - 30) {
        addFooter(doc, pageW, pageH, margin);
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    const drawRoundedRect = (x: number, yy: number, w: number, h: number, r: number, fillColor: number[]) => {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.roundedRect(x, yy, w, h, r, r, 'F');
    };

    const drawBar = (x: number, yy: number, w: number, h: number, color: number[]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, yy, w, h, h / 2, h / 2, 'F');
    };

    const addFooter = (d: any, pW: number, pH: number, m: number) => {
      const totalPages = d.getNumberOfPages();
      const p = d.getNumberOfPages();
      d.setFontSize(7);
      d.setTextColor(C.light[0], C.light[1], C.light[2]);
      d.text('Generated by Wandr AI', m, pH - 8);
      d.text(`Page ${p} of ${totalPages}`, pW / 2, pH - 8, { align: 'center' });
      d.text(new Date().toLocaleDateString(), pW - m, pH - 8, { align: 'right' });
    };

    // ==================== PAGE 1: COVER + OVERVIEW + BUDGET ====================

    // --- Gradient Header Bar ---
    const headerH = 58;
    for (let i = 0; i < headerH; i++) {
      const t = i / headerH;
      const r = Math.round(C.primary[0] * (1 - t) + C.primaryLight[0] * t);
      const g = Math.round(C.primary[1] * (1 - t) + C.primaryLight[1] * t);
      const b = Math.round(C.primary[2] * (1 - t) + C.primaryLight[2] * t);
      doc.setFillColor(r, g, b);
      doc.rect(0, i, pageW, 1, 'F');
    }

    // Title on gradient
    doc.setFontSize(24);
    doc.setTextColor(C.white[0], C.white[1], C.white[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(trip.title, pageW / 2, 24, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 215, 245);
    doc.text(trip.summary, pageW / 2, 34, { align: 'center', maxWidth: usableW + 10 });

    // Decorative line
    doc.setDrawColor(C.accentLight[0], C.accentLight[1], C.accentLight[2]);
    doc.setLineWidth(0.8);
    doc.line(pageW / 2 - 30, 42, pageW / 2 + 30, 42);

    // Date range on header
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 240);
    const dateRange = fd.startDate && fd.endDate
      ? `${fd.startDate}  \u2192  ${fd.endDate}`
      : '';
    if (dateRange) {
      doc.text(dateRange, pageW / 2, 50, { align: 'center' });
    }

    y = headerH + 12;

    // --- Trip Overview Cards ---
    const duration = fd.startDate && fd.endDate
      ? `${Math.ceil((new Date(fd.endDate).getTime() - new Date(fd.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
      : '-- days';

    const overviewItems = [
      { label: 'Destination', value: fd.destination, color: C.primary },
      { label: 'Duration', value: duration, color: C.accent },
      { label: 'Travelers', value: String(fd.travelers), color: C.orange },
      { label: 'Total Budget', value: fmtCur(Number(trip.budget?.actualCost ?? trip.budget?.total ?? fd.budget) || 0), color: C.purple },
    ];

    const cardW = (usableW - 12) / 2;
    const cardH = 18;
    overviewItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = margin + col * (cardW + 12);
      const cy = y + row * (cardH + 6);

      drawRoundedRect(cx, cy, cardW, cardH, 3, C.bg);
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'S');

      drawBar(cx, cy + 3, 2.5, cardH - 6, item.color);

      setFont(6.5, C.light);
      doc.text(item.label, cx + 7, cy + 6.5);

      setFont(10, C.dark, 'bold');
      doc.text(item.value, cx + 7, cy + 13.5);
    });

    y += Math.ceil(overviewItems.length / 2) * (cardH + 6) + 10;

    // --- BUDGET SUMMARY (moved to page 1!) ---
    checkPage(85);

    setFont(13, C.dark, 'bold');
    doc.text('Budget Breakdown', margin, y);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setLineWidth(1.2);
    doc.line(margin, y + 1.5, margin + 38, y + 1.5);
    y += 8;

    const bTransport = Number(trip.budget?.transport) || 0;
    const bAccommodation = Number(trip.budget?.accommodation) || 0;
    const bFood = Number(trip.budget?.food) || 0;
    const bActivities = Number(trip.budget?.activities) || 0;
    const bMisc = Number(trip.budget?.miscellaneous) || 0;
    const bEmergency = Number(trip.budget?.emergencyFund) || 0;
    const budgetTotal = bTransport + bAccommodation + bFood + bActivities + bMisc + bEmergency;

    const budgetItems = [
      { label: 'Transport', amount: bTransport, color: C.primaryLight },
      { label: 'Accommodation', amount: bAccommodation, color: C.accent },
      { label: 'Food', amount: bFood, color: C.orange },
      { label: 'Activities', amount: bActivities, color: C.purple },
      { label: 'Miscellaneous', amount: bMisc, color: C.pink },
      { label: 'Emergency', amount: bEmergency, color: C.light },
    ].filter(b => b.amount > 0);

    const barMaxW = usableW * 0.45;
    const maxAmount = Math.max(...budgetItems.map(b => b.amount), 1);

    budgetItems.forEach((item) => {
      const barW = Math.max(2, (item.amount / maxAmount) * barMaxW);

      setFont(8.5, C.mid);
      doc.text(item.label, margin, y + 4);

      setFont(8.5, C.dark, 'bold');
      doc.text(fmtCur(item.amount), pageW - margin, y + 4, { align: 'right' });

      drawBar(margin + 35, y + 6.5, barMaxW + 10, 2.5, [230, 235, 242]);
      drawBar(margin + 35, y + 6.5, barW, 2.5, item.color);

      y += 10;
    });

    y += 2;
    doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    setFont(11, C.primary, 'bold');
    doc.text('Total Budget', margin, y + 2);
    doc.text(fmtCur(budgetTotal), pageW - margin, y + 2, { align: 'right' });

    y += 7;
    setFont(7.5, C.light);
    doc.text(`Per Day: ${fmtCur(trip.budget?.perDay || 0)}   |   Per Person: ${fmtCur(trip.budget?.perPerson || 0)}`, margin, y);

    y += 12;

    // ==================== DAY-BY-DAY ITINERARY ====================
    const days = trip.days ?? [];
    days.forEach((day, dayIdx) => {
      checkPage(40);

      drawRoundedRect(margin, y - 2, usableW, 8, 2, C.primary);
      setFont(11, C.white, 'bold');
      doc.text(`Day ${day.dayNumber}: ${day.theme}`, margin + 6, y + 3);
      setFont(7, [180, 200, 240]);
      if (day.date) doc.text(day.date, pageW - margin - 4, y + 3, { align: 'right' });
      y += 10;

      if (day.summary) {
        setFont(8, C.mid);
        doc.text(day.summary, margin + 2, y, { maxWidth: usableW - 4 });
        y += 6;
      }

      const acts = day.activities ?? [];
      if (acts.length > 0) {
        checkPage(acts.length * 9 + 14);

        autoTable(doc, {
          startY: y,
          head: [['Time', 'Activity', 'Location', 'Duration', 'Cost', 'Type']],
          body: acts.map((act) => [
            act.time || '--',
            act.title || '',
            act.location || '',
            act.duration ? `${act.duration}m` : '',
            fmtCur(Number(act.cost) || 0),
            act.type || '',
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [C.dark[0], C.dark[1], C.dark[2]], lineColor: [225, 230, 240], lineWidth: 0.2 },
          headStyles: {
            fillColor: C.bg,
            textColor: C.mid,
            fontSize: 7,
            fontStyle: 'bold',
            lineColor: [200, 210, 225],
            lineWidth: 0.3,
          },
          alternateRowStyles: { fillColor: C.rowAlt },
          columnStyles: {
            0: { cellWidth: 17, fontStyle: 'bold' },
            1: { cellWidth: 44 },
            2: { cellWidth: 34 },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
            5: { cellWidth: 20, halign: 'center' },
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 5) {
              const typeColors: Record<string, number[]> = {
                TRANSPORT: C.primaryLight,
                SIGHTSEEING: C.accent,
                ADVENTURE: C.orange,
                RESTAURANT: C.pink,
                SHOPPING: C.purple,
                ACCOMMODATION: [59, 130, 246],
                REST: C.light,
              };
              const col = typeColors[data.cell.raw] || C.mid;
              doc.setTextColor(col[0], col[1], col[2]);
              doc.setFontSize(6.5);
              doc.setFont('helvetica', 'bold');
              doc.text(data.cell.raw, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, { align: 'center' });
            }
            if (data.section === 'body' && data.column.index === 4) {
              doc.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
            }
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 6;
      }

      if (dayIdx < days.length - 1) {
        y += 4;
        doc.setDrawColor(230, 235, 242);
        doc.setLineWidth(0.2);
        doc.line(margin + 10, y, pageW - margin - 10, y);
        y += 4;
      }
    });

    // ---------- Hotels Section ----------
    if (trip.hotels && trip.hotels.length > 0) {
      checkPage(40);
      y += 4;
      setFont(13, C.dark, 'bold');
      doc.text('Recommended Stays', margin, y);
      doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.setLineWidth(1.2);
      doc.line(margin, y + 1.5, margin + 38, y + 1.5);
      y += 8;

      (trip.hotels as any[]).forEach((hotel) => {
        checkPage(20);
        drawRoundedRect(margin, y - 1, usableW, 14, 2, C.bg);
        setFont(9, C.dark, 'bold');
        doc.text(hotel.name || 'Hotel', margin + 5, y + 4);
        setFont(7, C.mid);
        const hotelMeta = `${hotel.type || hotel.location || ''}  \u00b7  ${hotel.rating ? '\u2605'.repeat(Math.round(hotel.rating)) + ' ' + hotel.rating : ''}  \u00b7  ${fmtCur(Number(hotel.pricePerNight) || 0)}/night`;
        doc.text(hotelMeta, margin + 5, y + 9.5);
        y += 18;
      });
    }

    // ---------- Restaurants Section ----------
    if (trip.restaurants && trip.restaurants.length > 0) {
      checkPage(40);
      y += 4;
      setFont(13, C.dark, 'bold');
      doc.text('Food & Dining', margin, y);
      doc.setDrawColor(C.orange[0], C.orange[1], C.orange[2]);
      doc.setLineWidth(1.2);
      doc.line(margin, y + 1.5, margin + 30, y + 1.5);
      y += 8;

      (trip.restaurants as any[]).forEach((r) => {
        checkPage(16);
        setFont(8.5, C.dark, 'bold');
        doc.text(r.name || 'Restaurant', margin, y + 2);
        setFont(7, C.mid);
        const meta = [
          r.cuisine,
          r.rating ? `\u2605 ${r.rating}` : '',
          r.priceRange || fmtCur(Number(r.pricePerPerson) || 0) + '/person',
        ].filter(Boolean).join('  \u00b7  ');
        doc.text(meta, margin, y + 7);
        if (r.mustTry?.length) {
          setFont(7, C.accent);
          doc.text(`Must try: ${r.mustTry.join(', ')}`, margin, y + 11);
          y += 4;
        }
        y += 10;
      });
    }

    // ---------- Packing Essentials ----------
    if (trip.packingList && trip.packingList.length > 0) {
      checkPage(30);
      y += 4;
      setFont(13, C.dark, 'bold');
      doc.text('Packing Checklist', margin, y);
      doc.setDrawColor(C.purple[0], C.purple[1], C.purple[2]);
      doc.setLineWidth(1.2);
      doc.line(margin, y + 1.5, margin + 35, y + 1.5);
      y += 8;

      (trip.packingList as any[]).forEach((cat) => {
        checkPage(16);
        setFont(8.5, C.dark, 'bold');
        doc.text(cat.category || 'Packing', margin, y + 2);
        const items = cat.items || (Array.isArray(cat) ? cat : []);
        const itemNames = items.map((it: any) => it.name || it.item || it).join(', ');
        setFont(7, C.mid);
        doc.text(itemNames, margin + 3, y + 7, { maxWidth: usableW - 6 });
        y += Math.max(12, Math.ceil(itemNames.length / 80) * 4 + 8);
      });
    }

    // ---------- Safety Info ----------
    if (trip.safety && (trip.safety as any).tips?.length) {
      checkPage(30);
      y += 4;
      setFont(13, C.dark, 'bold');
      doc.text('Safety & Tips', margin, y);
      doc.setDrawColor(C.orange[0], C.orange[1], C.orange[2]);
      doc.setLineWidth(1.2);
      doc.line(margin, y + 1.5, margin + 28, y + 1.5);
      y += 8;

      const safety = trip.safety as any;
      if (safety.overallScore) {
        const scoreColor = safety.overallScore >= 7 ? C.accent : safety.overallScore >= 4 ? C.orange : C.pink;
        drawRoundedRect(margin, y - 1, 50, 8, 2, scoreColor);
        setFont(8, scoreColor, 'bold');
        doc.text(`Safety Score: ${safety.overallScore}/10`, margin + 4, y + 4);
        y += 12;
      }

      (safety.tips || []).slice(0, 5).forEach((tip: string) => {
        checkPage(8);
        setFont(7, C.mid);
        doc.text(`\u2022  ${tip}`, margin + 2, y + 2);
        y += 6;
      });
    }

    // ---------- Footer on all pages ----------
    addFooter(doc, pageW, pageH, margin);

    // ---------- Save ----------
    const safeName = trip.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').substring(0, 40);
    doc.save(`${safeName || 'Wandr_Trip'}.pdf`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
      {/* Trip Header */}
      <div className="py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-caption text-primary">AI-Generated Trip</span>
              </div>
              <h1 className="text-display text-3xl sm:text-4xl font-bold text-foreground mb-2">{trip.title}</h1>
              <p className="text-muted-foreground max-w-2xl">{trip.summary}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowTracking(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Start Journey
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
  onClick={() => window.open(`https://wa.me/14155238886?text=${encodeURIComponent("send itinerary")}`, "_blank")}
  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 text-[#25D366] text-sm font-medium"
>
  <MessageCircle className="w-4 h-4" />
  Send to WhatsApp
</button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: MapPin, label: 'Destination', value: fd.destination },
              {
                icon: Calendar,
                label: 'Duration',
                value: fd.startDate && fd.endDate
                  ? `${Math.ceil((new Date(fd.endDate).getTime() - new Date(fd.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                  : '-- days',
              },
              { icon: Users, label: 'Travelers', value: `${fd.travelers} people` },
              { icon: Wallet, label: 'Total Cost', value: formatCurrency(Number(trip.budget?.actualCost ?? trip.budget?.total ?? fd.budget) || 0, fd.currency) },
              { icon: Wallet, label: 'Per Day', value: formatCurrency(Number(trip.budget?.perDay) || 0, fd.currency) },
              { icon: Wallet, label: 'Per Person', value: formatCurrency(Number(trip.budget?.perPerson) || 0, fd.currency) },
            ].map(({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
              <div key={label} className="glass-panel rounded-2xl px-4 py-3">
                <Icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-foreground truncate">{value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {tabs.map((tab: { id: Tab; label: string; icon: any }) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {/* ITINERARY */}
          {activeTab === 'itinerary' && (
            <div className="space-y-4">
              {(trip.days ?? []).map((day: TripDay) => {
                const destLower = fd.destination?.toLowerCase() || '';
                let sectorKey = '';
                if (destLower.includes('kochi') || destLower.includes('kerala')) sectorKey = 'BOM-COK';
                else if (destLower.includes('jaipur')) sectorKey = 'DEL-JAI';
                else if (destLower.includes('leh') || destLower.includes('ladakh')) sectorKey = 'DEL-IXL';
                else if (destLower.includes('kolkata') || destLower.includes('andaman')) sectorKey = 'CCU-IXZ';
                else if (destLower.includes('lisbon')) sectorKey = 'BOM-LIS';
                else if (destLower.includes('kyoto') || destLower.includes('osaka')) sectorKey = 'DEL-KIX';
                const communityFlight: any = sectorKey ? (COMMUNITY_ROUTE_DB as any)?.[sectorKey]?.[0] : null;

                const displayDayCost = Number(day.totalCost) || (day.activities ?? []).reduce((sum: number, act: any) => {
                  const baseCost = Number(act.cost) || 0;
                  const isFlight = day.dayNumber === 1 && act.type === 'transport' && (act.title?.toLowerCase().includes('flight') || act.title?.toLowerCase().includes('arrival'));
                  return sum + (isFlight && communityFlight ? communityFlight.avgPrice : baseCost);
                }, 0);

                return (
                  <div key={day.dayNumber} className="glass-card overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-6 text-left"
                      onClick={() => setExpandedDay(expandedDay === day.dayNumber ? 0 : day.dayNumber)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-xs text-primary font-medium leading-none">Day</span>
                          <span className="text-lg font-bold text-primary leading-none">{day.dayNumber}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{day.theme}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(day.date)} · {formatCurrency(displayDayCost, fd.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground hidden sm:block">{day.activities?.length ?? 0} activities</span>
                        {expandedDay === day.dayNumber ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedDay === day.dayNumber && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6">
                            {day.summary && (
                              <p className="text-sm text-muted-foreground mb-6 pb-4 border-t border-border pt-4">{day.summary}</p>
                            )}
                            <div className="relative space-y-0">
                              {(day.activities ?? []).map((act: any, i: number) => {
                                const isFlightRow = day.dayNumber === 1 && act.type === 'transport' && (act.title?.toLowerCase().includes('flight') || act.title?.toLowerCase().includes('arrival'));
                                const finalTitle = isFlightRow && communityFlight ? `Flight via ${communityFlight.airline}` : act.title;
                                const finalDesc = isFlightRow && communityFlight ? `${communityFlight.flightNo} · ${communityFlight.aircraft} (${communityFlight.duration}). ${act.description}` : act.description;
                                const finalCost = isFlightRow && communityFlight ? communityFlight.avgPrice : (Number(act.cost) || 0);

                                return (
                                  <div key={i} className="flex gap-4 pb-6 last:pb-0">
                                    <div className="flex flex-col items-center">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-muted/60 flex-shrink-0">
                                        {activityTypeIcon(act.type)}
                                      </div>
                                      {i < (day.activities?.length ?? 0) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                                    </div>
                                    <div className="flex-1 min-w-0 pb-2">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono text-muted-foreground">{act.time}</span>
                                            <span className={cn('text-2xs px-2 py-0.5 rounded-full font-medium', activityTypeColor(act.type))}>{act.type}</span>
                                          </div>
                                          <h4 className="font-medium text-foreground">{finalTitle}</h4>
                                        </div>
                                        {finalCost > 0 && (
                                          <span className="text-sm font-semibold text-primary whitespace-nowrap">{formatCurrency(finalCost, fd.currency)}</span>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-1">{finalDesc}</p>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        {act.location}
                                        {act.duration && (
                                          <span className="ml-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {act.duration}m
                                          </span>
                                        )}
                                      </div>
                                      {act.notes && (
                                        <div className="mt-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                                          💡 {act.notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* MAP */}
          {activeTab === 'map' && (
            <div className="w-full" style={{ height: '560px' }}>
              <TripMap trip={trip} />
            </div>
          )}

          {/* BUDGET */}
          {activeTab === 'budget' && trip.budget && (() => {
            const bTransport = Number(trip.budget.transport) || 0;
            const bAccommodation = Number(trip.budget.accommodation) || 0;
            const bFood = Number(trip.budget.food) || 0;
            const bActivities = Number(trip.budget.activities) || 0;
            const bMisc = Number(trip.budget.miscellaneous) || 0;
            const bEmergency = Number(trip.budget.emergencyFund) || 0;
            const computedTotal = bTransport + bAccommodation + bFood + bActivities + bMisc + bEmergency;
            const computedPerDay = computedTotal / (fd.startDate && fd.endDate ? Math.ceil((new Date(fd.endDate).getTime() - new Date(fd.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1);
            const computedPerPerson = computedTotal / (Number(fd.travelers) || 1);

            return (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="font-bold text-lg text-foreground mb-6">Budget Overview</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Total Budget', value: formatCurrency(computedTotal, fd.currency), color: 'text-foreground' },
                      { label: 'Actual Cost', value: formatCurrency(computedTotal, fd.currency), color: 'text-primary' },
                      { label: 'Per Day', value: formatCurrency(computedPerDay, fd.currency), color: 'text-foreground' },
                      { label: 'Per Person', value: formatCurrency(computedPerPerson, fd.currency), color: 'text-foreground' },
                    ].map(({ label, value, color }: { label: string; value: string; color: string }) => (
                      <div key={label} className="glass-panel rounded-2xl p-4">
                        <div className="text-xs text-muted-foreground mb-1">{label}</div>
                        <div className={`text-xl font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Transport', value: bTransport, color: 'bg-ocean-400' },
                      { label: 'Accommodation', value: bAccommodation, color: 'bg-earth-400' },
                      { label: 'Food', value: bFood, color: 'bg-sunset-400' },
                      { label: 'Activities', value: bActivities, color: 'bg-forest-400' },
                      { label: 'Miscellaneous', value: bMisc, color: 'bg-primary/70' },
                      { label: 'Emergency Fund', value: bEmergency, color: 'bg-muted-foreground/30' },
                    ].map(({ label, value, color }: { label: string; value: number; color: string }) => {
                      const rawPct = (value / (computedTotal || 1)) * 100;
                      const pct = isNaN(rawPct) ? 0 : Math.round(rawPct);
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-foreground">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">{pct}%</span>
                              <span className="font-medium text-foreground">{formatCurrency(value, fd.currency)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {(trip.budget.breakdown ?? []).length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-foreground mb-4">Detailed Breakdown</h3>
                    <div className="space-y-3">
                      {trip.budget.breakdown.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <div className="text-sm font-medium text-foreground">{item.category}</div>
                            <div className="text-xs text-muted-foreground">{item.details}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">{formatCurrency(Number(item.amount) || 0, fd.currency)}</div>
                            <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* HOTELS */}
          {activeTab === 'hotels' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {(trip.hotels ?? []).length > 0 ? (
                trip.hotels.map((hotel: any, i: number) => (
                  <div key={i} className="glass-card p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{hotel.name}</h3>
                        <p className="text-sm text-muted-foreground">{hotel.type}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{formatCurrency(Number(hotel.pricePerNight) || 0, fd.currency)}</div>
                        <div className="text-xs text-muted-foreground">per night</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3" />
                      {hotel.location}
                    </div>
                    {hotel.rating > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        <span className="text-sm font-medium">{hotel.rating}</span>
                      </div>
                    )}
                    {(hotel.amenities ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(hotel.amenities as string[]).map((a: string) => (
                          <span key={a} className="tag-pill">{a}</span>
                        ))}
                      </div>
                    )}
                    {(hotel.pros ?? []).length > 0 && (
                      <div className="space-y-1">
                        {(hotel.pros as string[]).map((p: string) => (
                          <div key={p} className="text-xs text-forest-600 dark:text-forest-400">✓ {p}</div>
                        ))}
                        {(hotel.cons as string[]).map((c: string) => (
                          <div key={c} className="text-xs text-muted-foreground">· {c}</div>
                        ))}
                      </div>
                    )}
                    {hotel.bookingUrl && (
                      <a
                        href={hotel.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full py-2 rounded-xl border border-border text-sm font-medium text-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors block"
                      >
                        View & Book
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="glass-card p-12 text-center">
                  <Hotel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hotel data available for this trip.</p>
                </div>
              )}
            </div>
          )}

          {/* FOOD */}
          {activeTab === 'food' && (
            <div className="space-y-4">
              {(trip.restaurants ?? []).length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {(trip.restaurants ?? []).map((r: any, i: number) => (
                    <div key={i} className="glass-card p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{r.name}</h3>
                        <span className="text-xs font-medium text-sunset-500 bg-sunset-500/10 px-2 py-1 rounded-full">
                          {r.priceRange}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{r.cuisine}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3" />
                        {r.location}
                      </div>
                      {r.rating > 0 && (
                        <div className="flex items-center gap-1 mb-3">
                          <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                          <span className="text-sm">{r.rating}</span>
                          {r.openingHours && (
                            <span className="text-xs text-muted-foreground ml-2">{r.openingHours}</span>
                          )}
                        </div>
                      )}
                      {(r.mustTry ?? []).length > 0 && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Must try: </span>
                          <span className="text-foreground">
                            {(r.mustTry as string[]).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No restaurant data available for this trip.
                  </p>
                </div>
              )}

              {(trip.hiddenGems ?? []).length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Hidden Gems
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {trip.hiddenGems.map((gem: any, i: number) => (
                      <div key={i} className="glass-card p-5 border-primary/20 border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{gem.name}</h4>
                          <span
                            className={cn(
                              'text-2xs px-2 py-0.5 rounded-full font-medium',
                              gem.crowdLevel === 'LOW'
                                ? 'bg-forest-500/10 text-forest-600'
                                : gem.crowdLevel === 'MEDIUM'
                                ? 'bg-yellow-500/10 text-yellow-600'
                                : 'bg-red-500/10 text-red-600'
                            )}
                          >
                            {gem.crowdLevel || 'LOW'} crowds
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{gem.description}</p>
                        {gem.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <MapPin className="w-3 h-3" />
                            {gem.location}
                            {gem.bestTime && <span className="ml-2">· Best: {gem.bestTime}</span>}
                          </div>
                        )}
                        {gem.insiderTip && (
                          <div className="text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                            💡 {gem.insiderTip}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PACKING */}
          {activeTab === 'packing' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(trip.packingList ?? []).length > 0 ? (
                trip.packingList.map((cat: any, i: number) => (
                  <div key={i} className="glass-card p-5">
                    <h3 className="font-semibold text-foreground mb-3">{cat.category}</h3>
                    <div className="space-y-2">
                      {(cat.items ?? []).map((item: any, j: number) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <div
                            className={cn(
                              'w-4 h-4 rounded flex items-center justify-center text-xs',
                              item.essential
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted'
                            )}
                          >
                            {item.essential ? '!' : '·'}
                          </div>
                          <span
                            className={
                              item.essential
                                ? 'text-foreground font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {item.name}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              x{item.quantity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card p-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No packing list data available for this trip.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SAFETY */}
          {activeTab === 'safety' && trip.safety && (() => {
            const safeScore = Number(trip.safety.overallScore) || 0;
            return (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="glass-card p-6 col-span-1">
                    <div className="text-center">
                      <div className={`text-5xl font-bold ${safetyScoreColor(safeScore)} mb-2`}>
                        {safeScore}/10
                      </div>
                      <div className="font-medium text-foreground">{safetyScoreLabel(safeScore)}</div>
                      <div className="text-sm text-muted-foreground mt-1">Safety Score</div>
                    </div>
                  </div>
                  <div className="glass-card p-6 sm:col-span-2">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Scam Alerts
                    </h3>
                    {(trip.safety.scamAlerts ?? []).length > 0 ? (
                      <div className="space-y-2">
                        {(trip.safety.scamAlerts as string[]).map((alert: string, i: number) => (
                          <div key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">⚠</span>
                            <span>{alert}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specific scam alerts for this destination.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-foreground mb-3">Emergency Contacts</h3>
                    {(trip.safety.emergencyContacts ?? []).length > 0 ? (
                      <div className="space-y-3">
                        {(trip.safety.emergencyContacts as any[]).map((c: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-foreground">{c.name}</span>
                            <a
                              href={`tel:${c.number}`}
                              className="text-sm font-mono font-semibold text-primary"
                            >
                              {c.number}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No emergency contacts available.
                      </p>
                    )}
                  </div>
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-foreground mb-3">Safety Tips</h3>
                    {(trip.safety.tips ?? []).length > 0 ? (
                      <div className="space-y-2">
                        {(trip.safety.tips as string[]).map((tip: string, i: number) => (
                          <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">·</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specific safety tips available.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-forest-600 dark:text-forest-400 mb-2">
                      ✓ Safe Areas
                    </h3>
                    {(trip.safety.safeAreas ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(trip.safety.safeAreas as string[]).map((a: string) => (
                          <span key={a} className="tag-pill">{a}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specific safe areas listed.
                      </p>
                    )}
                  </div>
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-red-500 mb-2">
                      ⚠ Avoid
                    </h3>
                    {(trip.safety.avoidAreas ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(trip.safety.avoidAreas as string[]).map((a: string) => (
                          <span key={a} className="tag-pill">{a}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specific areas to avoid listed.
                      </p>
                    )}
                  </div>
                </div>

                {(trip.safety.vaccinations ?? []).length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-foreground mb-3">
                      Recommended Vaccinations
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(trip.safety.vaccinations as string[]).map((v: string) => (
                        <span key={v} className="tag-pill">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* CHAT */}
          {activeTab === 'chat' && <TripChat tripId={tripId} tripContext={fd} messages={chatMessages} setMessages={setChatMessages} />}
        </motion.div>
      </AnimatePresence>

      {/* Seasonal Tips */}
      {activeTab === 'itinerary' && (trip.seasonalTips ?? []).length > 0 && (
        <div className="mt-6 glass-card p-5">
          <h3 className="font-semibold text-foreground mb-3">🌤 Seasonal Tips</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {(trip.seasonalTips as string[]).map((tip: string, i: number) => (
              <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">·</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking overlay */}
      {showTracking && (
        <TrackingOverlay
          tripData={{
            tripId,
            formData: fd,
            generatedTrip: trip,
            createdAt: tripData.createdAt,
            originLat: tripData.originLat,
            originLng: tripData.originLng,
            destLat: tripData.destLat,
            destLng: tripData.destLng,
          }}
          onClose={() => setShowTracking(false)}
        />
      )}
    </div>
  );
}

function TripSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="skeleton h-8 w-2/3 rounded-2xl" />
      <div className="skeleton h-4 w-1/2 rounded-xl" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i: number) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i: number) => (
          <div key={i} className="skeleton h-9 w-24 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3].map((i: number) => (
        <div key={i} className="skeleton h-28 rounded-3xl" />
      ))}
    </div>
  );
}
