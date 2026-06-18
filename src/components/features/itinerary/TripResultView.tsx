'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, Wallet, Clock, Download,
  MessageCircle, Navigation, Shield, Package, ChevronDown,
  ChevronUp, Star, AlertTriangle, Utensils, Hotel, Sparkles
} from 'lucide-react';
import { TripMap } from '@/components/features/map/TripMap';
import { TripChat } from '@/components/features/chat/TripChat';
import { TrackingOverlay } from '@/components/features/tracking/TrackingOverlay';
import { formatCurrency, formatDate, activityTypeIcon, activityTypeColor, safetyScoreColor, safetyScoreLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { GeneratedTrip, TripDay, TripFormData } from '@/types';

interface TripData {
  tripId: string;
  formData: TripFormData;
  generatedTrip: GeneratedTrip;
  createdAt: string;
}

type Tab = 'itinerary' | 'map' | 'budget' | 'hotels' | 'food' | 'packing' | 'safety' | 'chat';

export function TripResultView({ tripId }: { tripId: string }) {
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [showTracking, setShowTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try cookie first (fresh generation)
    const cookies = document.cookie.split(';');
    const tripCookie = cookies.find(c => c.trim().startsWith(`trip_${tripId}=`));
    if (tripCookie) {
      try {
        const val = tripCookie.split('=').slice(1).join('=');
        const data = JSON.parse(decodeURIComponent(val));
        setTripData(data);
        setLoading(false);
        return;
      } catch { /* fall through */ }
    }
    // Try API for saved trips
    fetch(`/api/trips/${tripId}`)
      .then(r => r.json())
      .then(d => {
        if (d.trip) {
          setTripData({
            tripId,
            formData: d.trip as TripFormData,
            generatedTrip: d.trip.itinerary as GeneratedTrip,
            createdAt: d.trip.createdAt,
          });
        } else {
          setError('Trip not found. It may have expired.');
        }
      })
      .catch(() => setError('Failed to load trip.'))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return <TripSkeleton />;
  if (error || !tripData) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-xl font-semibold text-foreground mb-2">Trip not found</p>
      <p className="text-muted-foreground mb-6">{error || 'This trip link may have expired.'}</p>
      <a href="/plan" className="btn-premium inline-flex">Plan a new trip</a>
    </div>
  );

  const { formData: fd, generatedTrip: trip } = tripData;

  const tabs: { id: Tab; label: string; icon: typeof MapPin }[] = [
    { id: 'itinerary', label: 'Itinerary', icon: Calendar },
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'budget', label: 'Budget', icon: Wallet },
    { id: 'hotels', label: 'Hotels', icon: Hotel },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'packing', label: 'Packing', icon: Package },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'chat', label: 'AI Chat', icon: MessageCircle },
  ];

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
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: MapPin, label: 'Destination', value: fd.destination },
              { icon: Calendar, label: 'Duration', value: `${fd.startDate ? `${new Date(fd.endDate).getDate() - new Date(fd.startDate).getDate() + 1}` : '—'} days` },
              { icon: Users, label: 'Travelers', value: `${fd.travelers} people` },
              { icon: Wallet, label: 'Total Cost', value: formatCurrency(trip.budget?.actualCost ?? trip.budget?.total ?? fd.budget, fd.currency) },
              { icon: Wallet, label: 'Per Day', value: formatCurrency(trip.budget?.perDay ?? 0, fd.currency) },
              { icon: Wallet, label: 'Per Person', value: formatCurrency(trip.budget?.perPerson ?? 0, fd.currency) },
            ].map(({ icon: Icon, label, value }) => (
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
        {tabs.map(tab => {
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
              {(trip.days ?? []).map((day: TripDay) => (
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
                        <p className="text-sm text-muted-foreground">{formatDate(day.date)} · {formatCurrency(day.totalCost, fd.currency)}</p>
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
                          <p className="text-sm text-muted-foreground mb-6 pb-4 border-t border-border pt-4">{day.summary}</p>
                          <div className="relative space-y-0">
                            {(day.activities ?? []).map((act, i) => (
                              <div key={i} className="flex gap-4 pb-6 last:pb-0">
                                {/* Timeline */}
                                <div className="flex flex-col items-center">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-muted/60 flex-shrink-0">
                                    {activityTypeIcon(act.type)}
                                  </div>
                                  {i < (day.activities?.length ?? 0) - 1 && (
                                    <div className="w-px flex-1 bg-border mt-1" />
                                  )}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0 pb-2">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-muted-foreground">{act.time}</span>
                                        <span className={cn('text-2xs px-2 py-0.5 rounded-full font-medium', activityTypeColor(act.type))}>
                                          {act.type}
                                        </span>
                                      </div>
                                      <h4 className="font-medium text-foreground">{act.title}</h4>
                                    </div>
                                    {act.cost > 0 && (
                                      <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                        {formatCurrency(act.cost, fd.currency)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-1">{act.description}</p>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    {act.location}
                                    {act.duration && <span className="ml-2 flex items-center gap-1"><Clock className="w-3 h-3" />{act.duration}m</span>}
                                  </div>
                                  {act.notes && (
                                    <div className="mt-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                                      💡 {act.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* MAP */}
          {activeTab === 'map' && <TripMap trip={trip} formData={fd} />}

          {/* BUDGET */}
          {activeTab === 'budget' && trip.budget && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h2 className="font-bold text-lg text-foreground mb-6">Budget Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Budget', value: formatCurrency(trip.budget.total, fd.currency), color: 'text-foreground' },
                    { label: 'Actual Cost', value: formatCurrency(trip.budget.actualCost ?? trip.budget.total, fd.currency), color: 'text-primary' },
                    { label: 'Per Day', value: formatCurrency(trip.budget.perDay, fd.currency), color: 'text-foreground' },
                    { label: 'Per Person', value: formatCurrency(trip.budget.perPerson, fd.currency), color: 'text-foreground' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="glass-panel rounded-2xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className={`text-xl font-bold ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Budget bars */}
                <div className="space-y-4">
                  {[
                    { label: 'Transport', value: trip.budget.transport, color: 'bg-ocean-400' },
                    { label: 'Accommodation', value: trip.budget.accommodation, color: 'bg-earth-400' },
                    { label: 'Food', value: trip.budget.food, color: 'bg-sunset-400' },
                    { label: 'Activities', value: trip.budget.activities, color: 'bg-forest-400' },
                    { label: 'Miscellaneous', value: trip.budget.miscellaneous, color: 'bg-primary/70' },
                    { label: 'Emergency Fund', value: trip.budget.emergencyFund, color: 'bg-muted-foreground/30' },
                  ].map(({ label, value, color }) => {
                    const pct = Math.round((value / trip.budget.total) * 100);
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

              {/* Detailed breakdown */}
              {(trip.budget.breakdown ?? []).length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-foreground mb-4">Detailed Breakdown</h3>
                  <div className="space-y-3">
                    {trip.budget.breakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.category}</div>
                          <div className="text-xs text-muted-foreground">{item.details}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground">{formatCurrency(item.amount, fd.currency)}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HOTELS */}
          {activeTab === 'hotels' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {(trip.hotels ?? []).map((hotel, i) => (
                <div key={i} className="glass-card p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{hotel.name}</h3>
                      <p className="text-sm text-muted-foreground">{hotel.type}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{formatCurrency(hotel.pricePerNight, fd.currency)}</div>
                      <div className="text-xs text-muted-foreground">per night</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3" />{hotel.location}
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                    <span className="text-sm font-medium">{hotel.rating}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(hotel.amenities ?? []).map(a => (
                      <span key={a} className="tag-pill">{a}</span>
                    ))}
                  </div>
                  {(hotel.pros ?? []).length > 0 && (
                    <div className="space-y-1">
                      {hotel.pros!.map(p => <div key={p} className="text-xs text-forest-600 dark:text-forest-400">✓ {p}</div>)}
                      {(hotel.cons ?? []).map(c => <div key={c} className="text-xs text-muted-foreground">· {c}</div>)}
                    </div>
                  )}
                  {hotel.bookingUrl && (
                    <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-4 w-full py-2 rounded-xl border border-border text-sm font-medium text-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors block">
                      View & Book
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* FOOD */}
          {activeTab === 'food' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {(trip.restaurants ?? []).map((r, i) => (
                  <div key={i} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{r.name}</h3>
                      <span className="text-xs font-medium text-sunset-500 bg-sunset-500/10 px-2 py-1 rounded-full">{r.priceRange}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{r.cuisine}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />{r.location}
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      <span className="text-sm">{r.rating}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.openingHours}</span>
                    </div>
                    {(r.mustTry ?? []).length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Must try: </span>
                        <span className="text-foreground">{r.mustTry!.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {(trip.hiddenGems ?? []).length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />Hidden Gems
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {trip.hiddenGems.map((gem, i) => (
                      <div key={i} className="glass-card p-5 border-primary/20 border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{gem.name}</h4>
                          <span className={cn(
                            'text-2xs px-2 py-0.5 rounded-full font-medium',
                            gem.crowdLevel === 'LOW' ? 'bg-forest-500/10 text-forest-600' :
                            gem.crowdLevel === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-600' :
                            'bg-red-500/10 text-red-600'
                          )}>{gem.crowdLevel} crowds</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{gem.description}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <MapPin className="w-3 h-3" />{gem.location}
                          <span className="ml-2">· Best: {gem.bestTime}</span>
                        </div>
                        <div className="text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                          💡 {gem.insiderTip}
                        </div>
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
              {(trip.packingList ?? []).map((cat, i) => (
                <div key={i} className="glass-card p-5">
                  <h3 className="font-semibold text-foreground mb-3">{cat.category}</h3>
                  <div className="space-y-2">
                    {(cat.items ?? []).map((item, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <div className={cn('w-4 h-4 rounded flex items-center justify-center text-xs', item.essential ? 'bg-primary/15 text-primary' : 'bg-muted')} >
                          {item.essential ? '!' : '·'}
                        </div>
                        <span className={item.essential ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                          {item.name}
                        </span>
                        {item.quantity && <span className="text-xs text-muted-foreground ml-auto">{item.quantity}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SAFETY */}
          {activeTab === 'safety' && trip.safety && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="glass-card p-6 col-span-1">
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${safetyScoreColor(trip.safety.overallScore)} mb-2`}>
                      {trip.safety.overallScore}/10
                    </div>
                    <div className="font-medium text-foreground">{safetyScoreLabel(trip.safety.overallScore)}</div>
                    <div className="text-sm text-muted-foreground mt-1">Safety Score</div>
                  </div>
                </div>
                <div className="glass-card p-6 sm:col-span-2">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />Scam Alerts
                  </h3>
                  <div className="space-y-2">
                    {(trip.safety.scamAlerts ?? []).map((alert, i) => (
                      <div key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">⚠</span>{alert}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-foreground mb-3">Emergency Contacts</h3>
                  <div className="space-y-3">
                    {(trip.safety.emergencyContacts ?? []).map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{c.name}</span>
                        <a href={`tel:${c.number}`} className="text-sm font-mono font-semibold text-primary">{c.number}</a>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-foreground mb-3">Nearby Hospitals</h3>
                  <div className="space-y-3">
                    {(trip.safety.hospitals ?? []).map((h, i) => (
                      <div key={i}>
                        <div className="text-sm font-medium text-foreground">{h.name}</div>
                        <div className="text-xs text-muted-foreground">{h.address} · {h.distance}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-forest-600 dark:text-forest-400 mb-2">✓ Safe Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {(trip.safety.safeAreas ?? []).map(a => <span key={a} className="tag-pill">{a}</span>)}
                  </div>
                </div>
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-red-500 mb-2">⚠ Avoid</h3>
                  <div className="flex flex-wrap gap-2">
                    {(trip.safety.avoidAreas ?? []).map(a => <span key={a} className="tag-pill">{a}</span>)}
                  </div>
                </div>
              </div>

              {(trip.safety.vaccinations ?? []).length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-foreground mb-3">Recommended Vaccinations</h3>
                  <div className="flex flex-wrap gap-2">
                    {trip.safety.vaccinations!.map(v => <span key={v} className="tag-pill">{v}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {activeTab === 'chat' && (
            <TripChat tripId={tripId} tripContext={fd} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Seasonal Tips */}
      {activeTab === 'itinerary' && (trip.seasonalTips ?? []).length > 0 && (
        <div className="mt-6 glass-card p-5">
          <h3 className="font-semibold text-foreground mb-3">🌤 Seasonal Tips</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {trip.seasonalTips.map((tip, i) => (
              <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">·</span>{tip}
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
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-9 w-24 rounded-xl" />)}
      </div>
      {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-3xl" />)}
    </div>
  );
}
