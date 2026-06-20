'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, Wallet, Clock, Download,
  MessageCircle, Navigation, Shield, Package, ChevronDown,
  ChevronUp, Star, AlertTriangle, Utensils, Hotel, Sparkles
} from 'lucide-react';
import { TripChat } from '@/components/features/chat/TripChat';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Raw trip data from API
interface RawTrip {
  id: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  travelers: number;
  purpose: string;
  budget: number;
  currency: string;
  foodPref: string;
  hotelPref: string;
  transportPref: string[];
  itinerary: {
    days?: any[];
    hotels?: any[];
    restaurants?: any[];
    hiddenGems?: any[];
  };
  budgetBreakdown?: any;
  packingList?: any[];
  weatherInfo?: any;
  safetyInfo?: any;
  createdAt: string;
}

type Tab = 'itinerary' | 'map' | 'budget' | 'hotels' | 'food' | 'packing' | 'safety' | 'chat';

export function TripResultView({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<RawTrip | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState(false);

  // Extracted data
  const days = trip?.itinerary?.days ?? [];
  const hotels = trip?.itinerary?.hotels ?? [];
  const restaurants = trip?.itinerary?.restaurants ?? [];
  const hiddenGems = trip?.itinerary?.hiddenGems ?? [];
  const budgetData = trip?.budgetBreakdown ?? {};
  const packingList = trip?.packingList ?? [];
  const safetyData = trip?.safetyInfo ?? {};
  const weatherData = trip?.weatherInfo ?? {};

  const totalBudget = Number(budgetData.total) || trip?.budget || 0;
  const duration = trip?.duration || 0;

  useEffect(() => {
    fetch(`/api/trips/${tripId}`)
      .then(r => r.json())
      .then(d => {
        if (d.trip) {
          setTrip(d.trip);
        } else {
          setError('Trip not found.');
        }
      })
      .catch(() => setError('Failed to load trip.'))
      .finally(() => setLoading(false));
  }, [tripId]);

  // PDF download using browser print
  function handleDownloadPDF() {
    window.print();
  }

  if (loading) return <TripSkeleton />;
  if (error || !trip) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-xl font-semibold text-foreground mb-2">Trip not found</p>
      <p className="text-muted-foreground mb-6">{error || 'This trip link may have expired.'}</p>
      <a href="/plan" className="btn-premium inline-flex">Plan a new trip</a>
    </div>
  );

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
              <p className="text-muted-foreground max-w-2xl">{trip.origin} → {trip.destination} · {duration} days</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setActiveTab('chat')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                AI Chat
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
              { icon: MapPin, label: 'Destination', value: trip.destination },
              { icon: Calendar, label: 'Duration', value: `${duration} days` },
              { icon: Users, label: 'Travelers', value: `${trip.travelers} people` },
              { icon: Wallet, label: 'Total Budget', value: formatCurrency(totalBudget, trip.currency) },
              { icon: Wallet, label: 'Per Day', value: duration > 0 ? formatCurrency(Math.round(totalBudget / duration), trip.currency) : '—' },
              { icon: Wallet, label: 'Per Person', value: trip.travelers > 0 ? formatCurrency(Math.round(totalBudget / trip.travelers), trip.currency) : '—' },
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
              {days.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="text-muted-foreground">No itinerary data available.</p>
                </div>
              ) : (
                days.map((day: any, idx: number) => (
                  <div key={idx} className="glass-card overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-6 text-left"
                      onClick={() => setExpandedDay(expandedDay === day.day ? 0 : day.day)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-xs text-primary font-medium leading-none">Day</span>
                          <span className="text-lg font-bold text-primary leading-none">{day.day}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{day.theme || `Day ${day.day}`}</h3>
                          <p className="text-sm text-muted-foreground">{day.date || ''} · {day.activities?.length ?? 0} activities</p>
                        </div>
                      </div>
                      {expandedDay === day.day ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                      {expandedDay === day.day && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6">
                            <div className="relative space-y-0">
                              {(day.activities ?? []).map((act: any, i: number) => (
                                <div key={i} className="flex gap-4 pb-6 last:pb-0">
                                  <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-muted/60 flex-shrink-0">
                                      {act.type === 'restaurant' ? '🍽️' : act.type === 'transport' ? '🚗' : act.type === 'accommodation' ? '🏨' : '📍'}
                                    </div>
                                    {i < (day.activities?.length ?? 0) - 1 && (
                                      <div className="w-px flex-1 bg-border mt-1" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pb-2">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-mono text-muted-foreground">{act.time}</span>
                                          <span className="text-2xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                                            {act.type || 'activity'}
                                          </span>
                                        </div>
                                        <h4 className="font-medium text-foreground">{act.title}</h4>
                                      </div>
                                      {act.cost > 0 && (
                                        <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                          {formatCurrency(act.cost, trip.currency)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">{act.description}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      {act.location}
                                    </div>
                                    {act.tips && (
                                      <div className="mt-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                                        💡 {act.tips}
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
                ))
              )}
            </div>
          )}

          {/* MAP */}
          {activeTab === 'map' && (
            <div className="glass-card p-6">
              {mapError ? (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Map unavailable</h3>
                  <p className="text-muted-foreground text-sm">The AI didn't return location coordinates for this trip. Try regenerating with more specific destinations.</p>
                </div>
              ) : (
                <DynamicMap
                  days={days}
                  destination={trip.destination}
                  onError={() => setMapError(true)}
                />
              )}
            </div>
          )}

          {/* BUDGET */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h2 className="font-bold text-lg text-foreground mb-6">Budget Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Budget', value: formatCurrency(totalBudget, trip.currency), color: 'text-foreground' },
                    { label: 'Per Day', value: duration > 0 ? formatCurrency(Math.round(totalBudget / duration), trip.currency) : '—', color: 'text-primary' },
                    { label: 'Per Person', value: trip.travelers > 0 ? formatCurrency(Math.round(totalBudget / trip.travelers), trip.currency) : '—', color: 'text-foreground' },
                    { label: 'Remaining', value: formatCurrency(Math.max(0, totalBudget - (Number(budgetData.total) || 0)), trip.currency), color: 'text-green-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="glass-panel rounded-2xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className={`text-xl font-bold ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Accommodation', value: Number(budgetData.accommodation) || 0, color: 'bg-earth-400' },
                    { label: 'Food', value: Number(budgetData.food) || 0, color: 'bg-sunset-400' },
                    { label: 'Transport', value: Number(budgetData.transport) || 0, color: 'bg-ocean-400' },
                    { label: 'Activities', value: Number(budgetData.activities) || 0, color: 'bg-forest-400' },
                    { label: 'Miscellaneous', value: Number(budgetData.misc) || 0, color: 'bg-primary/70' },
                  ].map(({ label, value, color }) => {
                    const pct = totalBudget > 0 ? Math.round((value / totalBudget) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-foreground">{label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">{pct}%</span>
                            <span className="font-medium text-foreground">{formatCurrency(value, trip.currency)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(pct, 100)}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* HOTELS */}
          {activeTab === 'hotels' && (
            hotels.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Hotel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hotel data available.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {hotels.map((hotel: any, i: number) => (
                  <div key={i} className="glass-card p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{hotel.name}</h3>
                        <p className="text-sm text-muted-foreground">{hotel.area || ''}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{formatCurrency(hotel.pricePerNight, trip.currency)}</div>
                        <div className="text-xs text-muted-foreground">per night</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      <span className="text-sm font-medium">{hotel.rating || '—'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{hotel.description || ''}</p>
                    {hotel.bookingTip && (
                      <div className="text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                        💡 {hotel.bookingTip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* FOOD */}
          {activeTab === 'food' && (
            <div className="space-y-4">
              {restaurants.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No restaurant data available.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {restaurants.map((r: any, i: number) => (
                    <div key={i} className="glass-card p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{r.name}</h3>
                        <span className="text-xs font-medium text-sunset-500 bg-sunset-500/10 px-2 py-1 rounded-full">{r.priceRange || ''}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{r.cuisine || ''}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3" />{r.location || ''}
                      </div>
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        <span className="text-sm">{r.rating || '—'}</span>
                        {r.diet && <span className="text-xs text-muted-foreground ml-2">{r.diet}</span>}
                      </div>
                      {r.mustTry && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Must try: </span>
                          <span className="text-foreground">{typeof r.mustTry === 'string' ? r.mustTry : Array.isArray(r.mustTry) ? r.mustTry.join(', ') : ''}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {hiddenGems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />Hidden Gems
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {hiddenGems.map((gem: any, i: number) => (
                      <div key={i} className="glass-card p-5 border-primary/20 border">
                        <h4 className="font-semibold text-foreground mb-2">{gem.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{gem.description || ''}</p>
                        {gem.whySpecial && (
                          <div className="text-xs text-muted-foreground mb-2">Why special: {gem.whySpecial}</div>
                        )}
                        {gem.howToReach && (
                          <div className="text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                            📍 {gem.howToReach}
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
            packingList.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No packing list data available.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packingList.map((item: any, i: number) => (
                  <div key={i} className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-4 h-4 rounded flex items-center justify-center text-xs', item.essential ? 'bg-primary/15 text-primary' : 'bg-muted')}>
                        {item.essential ? '!' : '·'}
                      </div>
                      <span className={item.essential ? 'text-foreground font-medium text-sm' : 'text-muted-foreground text-sm'}>
                        {item.item || item.name || `Item ${i + 1}`}
                      </span>
                    </div>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground ml-6">{item.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* SAFETY */}
          {activeTab === 'safety' && (
            <div className="space-y-6">
              {safetyData.overallScore ? (
                <>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="glass-card p-6">
                      <div className="text-center">
                        <div className={cn('text-5xl font-bold mb-2',
                          Number(safetyData.overallScore) >= 7 ? 'text-green-500' :
                          Number(safetyData.overallScore) >= 4 ? 'text-yellow-500' : 'text-red-500'
                        )}>
                          {safetyData.overallScore}/10
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Safety Score</div>
                      </div>
                    </div>
                    <div className="glass-card p-6 sm:col-span-2">
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />Scam Alerts
                      </h3>
                      <div className="space-y-2">
                        {(safetyData.scamAlerts ?? []).map((alert: string, i: number) => (
                          <div key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">⚠</span>{alert}
                          </div>
                        ))}
                        {(!safetyData.scamAlerts || safetyData.scamAlerts.length === 0) && (
                          <p className="text-sm text-muted-foreground">No specific scam alerts for this destination.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-green-500 mb-2">✓ Safe Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {(safetyData.safeAreas ?? []).map((a: string) => <span key={a} className="tag-pill">{a}</span>)}
                      </div>
                    </div>
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-red-500 mb-2">⚠ Avoid</h3>
                      <div className="flex flex-wrap gap-2">
                        {(safetyData.avoidAreas ?? []).map((a: string) => <span key={a} className="tag-pill">{a}</span>)}
                      </div>
                    </div>
                  </div>

                  {safetyData.emergencyNumber && (
                    <div className="glass-card p-5">
                      <h3 className="font-semibold text-foreground mb-2">Emergency Number</h3>
                      <a href={`tel:${safetyData.emergencyNumber}`} className="text-lg font-mono font-bold text-primary">
                        {safetyData.emergencyNumber}
                      </a>
                    </div>
                  )}

                  {(safetyData.tips ?? []).length > 0 && (
                    <div className="glass-card p-5">
                      <h3 className="font-semibold text-foreground mb-3">Safety Tips</h3>
                      <div className="space-y-2">
                        {safetyData.tips.map((tip: string, i: number) => (
                          <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">·</span>{tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-card p-12 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No safety data available.</p>
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {activeTab === 'chat' && (
            <TripChat tripId={tripId} tripContext={{
              destination: trip.destination,
              startDate: trip.startDate,
              endDate: trip.endDate,
              budget: trip.budget,
              currency: trip.currency,
              travelers: trip.travelers,
              foodPref: trip.foodPref,
            }} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Weather Info */}
      {activeTab === 'itinerary' && weatherData.expected && (
        <div className="mt-6 glass-card p-5">
          <h3 className="font-semibold text-foreground mb-3">🌤 Weather Forecast</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Expected</div>
              <div className="text-sm font-medium text-foreground">{weatherData.expected}</div>
            </div>
            {weatherData.avgTemp && (
              <div>
                <div className="text-sm text-muted-foreground">Avg Temp</div>
                <div className="text-sm font-medium text-foreground">{weatherData.avgTemp}</div>
              </div>
            )}
          </div>
          {(weatherData.tips ?? []).length > 0 && (
            <div className="mt-3 space-y-1">
              {weatherData.tips.map((tip: string, i: number) => (
                <div key={i} className="text-xs text-muted-foreground">· {tip}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Dynamic map component with error handling
function DynamicMap({ days, destination, onError }: { days: any[]; destination: string; onError: () => void }) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('@/components/features/map/TripMap')
      .then(mod => setMapComponent(() => mod.TripMap))
      .catch(() => onError());
  }, [onError]);

  if (!MapComponent) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Loading map...</div>
      </div>
    );
  }

  // Build a simple trip object for the map
  const allLocations: any[] = [];
  days.forEach((day: any) => {
    (day.activities ?? []).forEach((act: any) => {
      if (act.location) {
        allLocations.push({
          name: act.title,
          location: act.location,
          lat: act.lat,
          lng: act.lng,
          type: act.type,
        });
      }
    });
  });

  if (allLocations.length === 0 || !allLocations.some(l => l.lat && l.lng)) {
    onError();
    return null;
  }

  return <MapComponent trip={{ days, hotels: [], restaurants: [] }} formData={{ destination }} />;
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
