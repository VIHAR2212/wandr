'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, Wallet, Clock, Download,
  MessageCircle, Navigation, Shield, Package, ChevronDown,
  ChevronUp, Star, AlertTriangle, Utensils, Hotel, Sparkles
} from 'lucide-react';
import { TripMap } from '@/components/features/map/TripMap';
import { TripChat } from '@/components/features/chat/TripChat';
import { TrackingOverlay } from '@/components/features/tracking/TrackingOverlay';
import LiquidLoading from '@/components/features/itinerary/LiquidLoading';
import { formatCurrency, formatDate, activityTypeIcon, activityTypeColor, safetyScoreColor, safetyScoreLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { TripFormData, GeneratedTrip, TripDay } from '@/types';
import COMMUNITY_ROUTE_DB from '@/lib/flightDatabase.json';

interface TripData {
  tripId: string;
  formData: TripFormData;
  generatedTrip: GeneratedTrip;
  createdAt: string;
}

type Tab = 'itinerary' | 'map' | 'budget' | 'hotels' | 'food' | 'packing' | 'safety' | 'chat';

function normalizeTripData(raw: any, tripId: string): TripData {
  const fd: TripFormData = {
    origin: raw.origin || '',
    destination: raw.destination || '',
    startDate: raw.startDate ? new Date(raw.startDate).toISOString().split('T')[0] : '',
    endDate: raw.endDate ? new Date(raw.endDate).toISOString().split('T')[0] : '',
    travelers: raw.travelers || 1,
    budget: raw.budget || 0,
    currency: raw.currency || 'INR',
    purposes: raw.purposes || (raw.purpose ? [raw.purpose] : ['ADVENTURE']),
    foodPreference: raw.foodPref || raw.foodPreference || 'NON_VEG',
    hotelPreference: raw.hotelPref || raw.hotelPreference || 'STANDARD',
    transportPreferences: raw.transportPref || raw.transportPreferences || [],
    specialRequests: '',
    includeHiddenGems: true,
    flexibleBudget: false,
    smartBudget: false,
  };

  const rawDays = Array.isArray(raw.itinerary) ? raw.itinerary : [];
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
    })),
  }));

  const rawHotels = Array.isArray(raw.hotels) ? raw.hotels : [];
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
  }));

  const rawRestaurants = Array.isArray(raw.restaurants) ? raw.restaurants : [];
  const restaurants = rawRestaurants.map((r: any) => ({
    name: r.name || '',
    cuisine: r.cuisine || '',
    priceRange: r.priceRange || '',
    location: r.location || '',
    rating: Number(r.rating) || 0,
    openingHours: r.openingHours || '',
    mustTry: Array.isArray(r.mustTry) ? r.mustTry : (typeof r.mustTry === 'string' ? [r.mustTry] : []),
  }));

  const rawGems = Array.isArray(raw.hiddenGems) ? raw.hiddenGems : [];
  const hiddenGems = rawGems.map((g: any) => ({
    name: g.name || '',
    crowdLevel: g.crowdLevel || 'LOW',
    description: g.description || '',
    location: g.howToReach || g.location || '',
    bestTime: g.bestTime || '',
    insiderTip: g.whySpecial || g.insiderTip || '',
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
    title: raw.title || `Trip to ${raw.destination || 'Unknown'}`,
    summary: `A ${dayCount}-day trip to ${raw.destination || 'Unknown'}`,
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
  };
}

export function TripResultView({ tripId }: { tripId: string }) {
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [showTracking, setShowTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrip = useCallback(() => {
    const cookies = document.cookie.split(';');
    const tripCookie = cookies.find((c: string) => c.trim().startsWith(`trip_${tripId}=`));
    if (tripCookie) {
      try {
        const val = tripCookie.split('=').slice(1).join('=');
        const data = JSON.parse(decodeURIComponent(val));
        setTripData(data);
        setLoading(false);
        localStorage.removeItem('generating_trip_id');
        return;
      } catch { /* fall through */ }
    }
    fetch(`/api/trips/${tripId}`)
      .then((r: Response) => r.json())
      .then((d: any) => {
        if (d.trip) {
          const normalized = normalizeTripData(d.trip, tripId);
          setTripData(normalized);
          localStorage.removeItem('generating_trip_id');
        } else {
          const generatingId = localStorage.getItem('generating_trip_id');
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
      localStorage.removeItem('generating_trip_id');
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
    window.print();
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
                  : '— days',
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
                                            <span className={cn('text-2xs px-2 py-0.5 rounded-full font-medium', activityTypeColor(act.type)}>{act.type}</span>
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
          {activeTab === 'map' && <TripMap trip={trip} formData={fd} />}

          {/* BUDGET */}
          {activeTab === 'budget' && trip.budget && (() => {
            const bTransport = Number(trip.budget.transport) || 0;
            const bAccommodation = Number(trip.budget.accommodation) || 0;
            const bFood = Number(trip.budget.food) || 0;
            const bActivities = Number(trip.budget.activities) || 0;
            const bMisc = Number(trip.budget.miscellaneous) || 0;
            const bEmergency = Number(trip.budget.emergencyFund) || 0;
            const computedTotal = bTransport + bAccommodation + bFood + bActivities + bMisc + bEmergency;
            const computedPerDay = computedTotal / (fd.startDate && fd.endDate ? (Math.ceil((new Date(fd.endDate).getTime() - new Date(fd.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1);
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
                (trip.hotels.map((hotel: any, i: number) => (
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
                  ))
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
          {activeTab === 'chat' && <TripChat tripId={tripId} tripContext={fd} />}
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
          tripData={{ tripId, formData: fd, generatedTrip: trip, createdAt: tripData.createdAt }}
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
