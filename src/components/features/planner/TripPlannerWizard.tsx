'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MapPin, Calendar, Users, Wallet, Compass, Utensils,
  Hotel, Train, ChevronRight, ChevronLeft, Sparkles, Loader2, Wand2, X
} from 'lucide-react';
import type { TripFormData, TripPurpose, FoodPreference, HotelType, TransportType } from '@/types';
import { cn, formatCurrency, safeSetItem } from '@/lib/utils';
import { GlassFilter } from '@/components/ui/button';

const STEPS = ['Route', 'Budget & Travelers', 'Purpose & Food', 'Accommodation', 'Review'];

const INDIAN_PLACES = [
  // States & Regions
  'Andaman & Nicobar Islands, India',
  'Andhra Pradesh, India',
  'Arunachal Pradesh, India',
  'Assam, India',
  'Bihar, India',
  'Chhattisgarh, India',
  'Goa, India',
  'Gujarat, India',
  'Haryana, India',
  'Himachal Pradesh, India',
  'Jammu & Kashmir, India',
  'Jharkhand, India',
  'Karnataka, India',
  'Kerala, India',
  'Ladakh, India',
  'Lakshadweep, India',
  'Madhya Pradesh, India',
  'Maharashtra, India',
  'Manipur, India',
  'Meghalaya, India',
  'Mizoram, India',
  'Nagaland, India',
  'Odisha, India',
  'Punjab, India',
  'Rajasthan, India',
  'Sikkim, India',
  'Tamil Nadu, India',
  'Telangana, India',
  'Tripura, India',
  'Uttar Pradesh, India',
  'Uttarakhand, India',
  'West Bengal, India',
  // Major Cities
  'Agra, India',
  'Ahmedabad, India',
  'Aizawl, India',
  'Ajmer, India',
  'Allahabad, India',
  'Amritsar, India',
  'Aurangabad, India',
  'Bangalore, India',
  'Bhopal, India',
  'Bhubaneswar, India',
  'Chandigarh, India',
  'Chennai, India',
  'Coimbatore, India',
  'Dehradun, India',
  'Delhi, India',
  'Dharamshala, India',
  'Dwarka, India',
  'Gangtok, India',
  'Guwahati, India',
  'Gwalior, India',
  'Hampi, India',
  'Haridwar, India',
  'Hyderabad, India',
  'Indore, India',
  'Jaipur, India',
  'Jaisalmer, India',
  'Jammu, India',
  'Jodhpur, India',
  'Kochi, India',
  'Kodaikanal, India',
  'Kohima, India',
  'Kolkata, India',
  'Kovalam, India',
  'Kufri, India',
  'Kullu, India',
  'Kurukshetra, India',
  'Leh, India',
  'Lonavala, India',
  'Lucknow, India',
  'Ludhiana, India',
  'Madurai, India',
  'Manali, India',
  'Mangalore, India',
  'Mathura, India',
  'Meerut, India',
  'Mumbai, India',
  'Munnar, India',
  'Mussoorie, India',
  'Mysore, India',
  'Nagpur, India',
  'Nainital, India',
  'Nashik, India',
  'Ooty, India',
  'Panjim, India',
  'Patna, India',
  'Pondicherry, India',
  'Port Blair, India',
  'Puri, India',
  'Pushkar, India',
  'Raipur, India',
  'Ranchi, India',
  'Rishikesh, India',
  'Shimla, India',
  'Shillong, India',
  'Siliguri, India',
  'Srinagar, India',
  'Surat, India',
  'Tirupati, India',
  'Udaipur, India',
  'Vadodara, India',
  'Varanasi, India',
  'Varkala, India',
  'Vijayawada, India',
  'Visakhapatnam, India',
  // Popular Tourist Destinations
  'Alleppey, India',
  'Andaman Islands, India',
  'Auli, India',
  'Badrinath, India',
  'Bandhavgarh, India',
  'Bir Billing, India',
  'Chopta, India',
  'Coorg, India',
  'Darjeeling, India',
  'Dhanaulti, India',
  'Dooars, India',
  'Dudhwa, India',
  'Dzukou Valley, India',
  'Ellora, India',
  'Gokarna, India',
  'Gulmarg, India',
  'Jog Falls, India',
  'Kanha, India',
  'Kaziranga, India',
  'Kedarnath, India',
  'Khajuraho, India',
  'Khandala, India',
  'Kodagu, India',
  'Konark, India',
  'Lansdowne, India',
  'Lakshadweep Islands, India',
  'Mahabaleshwar, India',
  'Majuli, India',
  'Mandu, India',
  'McLeod Ganj, India',
  'Mawlynnong, India',
  'Mount Abu, India',
  'Munsiyari, India',
  'Nagarhole, India',
  'Nubra Valley, India',
  'Pachmarhi, India',
  'Pangong Lake, India',
  'Ranthambore, India',
  'Sabrimala, India',
  'Sandakphu, India',
  'Sariska, India',
  'Shoja, India',
  'Spiti Valley, India',
  'Sundarbans, India',
  'Tawang, India',
  'Thekkady, India',
  'Valley of Flowers, India',
  'Wayanad, India',
  'Zanskar, India',
  // Kashmir specific
  'Kashmir, India',
  'Pahalgam, India',
  'Sonamarg, India',
];

const PURPOSES: { value: TripPurpose; label: string; emoji: string }[] = [
  { value: 'ADVENTURE', label: 'Adventure', emoji: '🧗' },
  { value: 'DEVOTIONAL', label: 'Devotional', emoji: '🛕' },
  { value: 'HIKING', label: 'Hiking', emoji: '🥾' },
  { value: 'HONEYMOON', label: 'Romantic', emoji: '💍' },
  { value: 'FAMILY', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'PHOTOGRAPHY', label: 'Photography', emoji: '📷' },
  { value: 'BUSINESS', label: 'Business', emoji: '💼' },
  { value: 'FOOD_EXPLORATION', label: 'Food Trail', emoji: '🍜' },
  { value: 'WELLNESS', label: 'Wellness', emoji: '🧘' },
  { value: 'CULTURAL', label: 'Cultural', emoji: '🏛️' },
  { value: 'SOLO', label: 'Solo', emoji: '🎒' },
  { value: 'BACKPACKING', label: 'Backpacking', emoji: '⛺' },
];

const FOOD_PREFS: { value: FoodPreference; label: string; desc: string }[] = [
  { value: 'VEG', label: 'Vegetarian', desc: 'No meat or fish' },
  { value: 'JAIN', label: 'Jain', desc: 'No root vegetables' },
  { value: 'VEGAN', label: 'Vegan', desc: 'No animal products' },
  { value: 'HALAL', label: 'Halal', desc: 'Halal certified only' },
  { value: 'NON_VEG', label: 'Non-Veg', desc: 'All cuisines welcome' },
];

const HOTEL_TYPES: { value: HotelType; label: string; price: string }[] = [
  { value: 'HOSTEL', label: 'Hostel / Dorm', price: '₹500–₹1,500/night' },
  { value: 'BUDGET', label: 'Budget Hotel', price: '₹1,500–₹3,000/night' },
  { value: 'STANDARD', label: 'Standard', price: '₹3,000–₹6,000/night' },
  { value: 'COMFORT', label: 'Comfort', price: '₹6,000–₹12,000/night' },
  { value: 'LUXURY', label: 'Luxury', price: '₹12,000–₹25,000/night' },
  { value: 'ULTRA_LUXURY', label: 'Ultra Luxury', price: '₹25,000+/night' },
  { value: 'HOMESTAY', label: 'Homestay', price: 'Local experience' },
  { value: 'CAMPING', label: 'Camping', price: 'Nature immersion' },
];

const TRANSPORT_TYPES: { value: TransportType; label: string; emoji: string }[] = [
  { value: 'FLIGHT', label: 'Flight', emoji: '✈️' },
  { value: 'TRAIN', label: 'Train', emoji: '🚂' },
  { value: 'BUS', label: 'Bus', emoji: '🚌' },
  { value: 'CAR_RENTAL', label: 'Car Rental', emoji: '🚗' },
  { value: 'TAXI', label: 'Taxi/Cab', emoji: '🚕' },
  { value: 'METRO', label: 'Metro', emoji: '🚇' },
  { value: 'FERRY', label: 'Ferry', emoji: '⛴️' },
  { value: 'BICYCLE', label: 'Bicycle', emoji: '🚲' },
];

const ROUTE_SUGGESTIONS = [
  { from: 'Mumbai', to: 'Kashmir' },
  { from: 'Delhi', to: 'Goa' },
  { from: 'Mumbai', to: 'Manali' },
  { from: 'Delhi', to: 'Kerala' },
  { from: 'Bangalore', to: 'Rajasthan' },
  { from: 'Mumbai', to: 'Andaman' },
];

// ── Autocomplete hook ──────────────────────────────────────────────
function usePlaceAutocomplete(value: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const q = value.trim().toLowerCase();
    if (q.length === 0) {
      setSuggestions([]);
      return;
    }
    const filtered = INDIAN_PLACES.filter(p =>
      p.toLowerCase().startsWith(q) || p.toLowerCase().includes(`, ${q}`)
    ).slice(0, 7);
    setSuggestions(filtered);
  }, [value]);

  return suggestions;
}

// ── PlaceInput component ───────────────────────────────────────────
function PlaceInput({
  value,
  onChange,
  placeholder,
  icon,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const suggestions = usePlaceAutocomplete(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showDropdown = open && suggestions.length > 0;

  function highlight(text: string) {
    const q = value.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-primary font-semibold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="glass-input pr-8"
          autoComplete="off"
        />
        {value && (
          <button
            onMouseDown={e => {
              e.preventDefault();
              onChange('');
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl border border-border overflow-hidden"
            style={{
              background: 'var(--glass-bg, rgba(20,20,20,0.92))',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={s}
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(s);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-primary/10',
                  i !== suggestions.length - 1 && 'border-b border-border/50'
                )}
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{highlight(s)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Smart Recommendations ──────────────────────────────────────────
function getSmartRecommendations(budget: number, travelers: number, days: number) {
  const perDayPerPerson = days > 0 ? budget / (days * travelers) : budget;
  let transport: TransportType[] = [];
  let hotel: HotelType = 'STANDARD';

  if (perDayPerPerson <= 1500) {
    transport = ['BUS', 'TRAIN', 'BICYCLE', 'WALKING' as TransportType];
    hotel = 'HOSTEL';
  } else if (perDayPerPerson <= 3000) {
    transport = ['TRAIN', 'BUS', 'TAXI'];
    hotel = 'BUDGET';
  } else if (perDayPerPerson <= 6000) {
    transport = ['TRAIN', 'BUS', 'CAR_RENTAL', 'TAXI'];
    hotel = 'STANDARD';
  } else if (perDayPerPerson <= 12000) {
    transport = ['FLIGHT', 'TRAIN', 'CAR_RENTAL', 'TAXI'];
    hotel = 'COMFORT';
  } else {
    transport = ['FLIGHT', 'CAR_RENTAL', 'TAXI'];
    hotel = 'LUXURY';
  }

  return { transport, hotel };
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

const defaultForm: TripFormData = {
  origin: '',
  destination: '',
  startDate: '',
  endDate: '',
  travelers: 2,
  budget: 50000,
  currency: 'INR',
  purposes: ['ADVENTURE'],
  foodPreference: 'NON_VEG',
  hotelPreference: 'STANDARD',
  transportPreferences: ['FLIGHT', 'TRAIN'],
  specialRequests: '',
  includeHiddenGems: true,
  flexibleBudget: false,
  smartBudget: true,
};

export function TripPlannerWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TripFormData>(defaultForm);
  const [loading, setLoading] = useState(false);

  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  function update<K extends keyof TripFormData>(key: K, value: TripFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function togglePurpose(p: TripPurpose) {
    setForm(prev => ({
      ...prev,
      purposes: prev.purposes.includes(p)
        ? prev.purposes.filter(x => x !== p)
        : [...prev.purposes, p],
    }));
  }

  function toggleTransport(t: TransportType) {
    setForm(prev => ({
      ...prev,
      transportPreferences: prev.transportPreferences.includes(t)
        ? prev.transportPreferences.filter(x => x !== t)
        : [...prev.transportPreferences, t],
    }));
  }

  useEffect(() => {
    if (form.smartBudget && form.budget > 0 && form.travelers > 0) {
      const duration = form.startDate && form.endDate
        ? Math.max(1, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
        : 5;
      const rec = getSmartRecommendations(form.budget, form.travelers, duration);
      setForm(prev => ({
        ...prev,
        transportPreferences: rec.transport,
        hotelPreference: rec.hotel,
      }));
    }
  }, [form.budget, form.travelers, form.startDate, form.endDate, form.smartBudget]);

  function canProceed() {
    if (step === 0) return form.origin && form.destination;
    if (step === 1) return form.startDate && form.endDate && form.travelers > 0 && form.budget > 0;
    if (step === 2) return form.purposes.length > 0;
    return true;
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate trip');
      safeSetItem('generating_trip_id', data.tripId);
      window.location.href = `/trip/${data.tripId}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function getDuration() {
    if (!form.startDate || !form.endDate) return 0;
    const diff = new Date(form.endDate).getTime() - new Date(form.startDate).getTime();
    return Math.max(0, Math.round(diff / 86400000));
  }

  const duration = getDuration();
  const perDay = duration > 0 ? Math.round(form.budget / duration) : 0;
  const perPerson = form.travelers > 0 ? Math.round(form.budget / form.travelers) : 0;

  return (
    <div className="glass-card p-2">
      {/* Progress Bar */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  i === step
                    ? 'bg-primary text-primary-foreground'
                    : i < step
                    ? 'bg-primary/15 text-primary cursor-pointer hover:bg-primary/25'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px]"
                  style={{ borderColor: i <= step ? 'currentColor' : 'transparent' }}>
                  {i < step ? '✓' : i + 1}
                </span>
                {s}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn('w-4 h-px', i < step ? 'bg-primary/40' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 min-h-[360px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Step 0: Route */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Where are you going?</h2>
                  <p className="text-muted-foreground text-sm">Enter your starting point and dream destination.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Starting From
                    </label>
                    <PlaceInput
                      value={form.origin}
                      onChange={val => update('origin', val)}
                      placeholder="Mumbai, India"
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Compass className="w-4 h-4 text-muted-foreground" />
                      Destination
                    </label>
                    <PlaceInput
                      value={form.destination}
                      onChange={val => update('destination', val)}
                      placeholder="Gujarat, India"
                      icon={<Compass className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {/* Liquid Glass Route Suggestion Chips */}
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Popular routes</p>
                  <div className="flex flex-wrap gap-2">
                    {ROUTE_SUGGESTIONS.map(({ from, to }) => (
                      <button
                        key={`${from}-${to}`}
                        onClick={() => {
                          update('origin', `${from}, India`);
                          update('destination', `${to}, India`);
                        }}
                        className="relative px-4 py-2 rounded-full text-xs font-medium text-foreground transition-all duration-200 hover:scale-105 active:scale-95 hover:text-primary"
                        style={{
                          boxShadow: 'inset 3px 3px 0.5px -3.5px rgba(255,255,255,0.09), inset -3px -3px 0.5px -3.5px rgba(255,255,255,0.85), inset 1px 1px 1px -0.5px rgba(255,255,255,0.6), inset -1px -1px 1px -0.5px rgba(255,255,255,0.6), inset 0 0 6px 6px rgba(255,255,255,0.12), inset 0 0 2px 2px rgba(255,255,255,0.06), 0 0 12px rgba(0,0,0,0.15)',
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-full -z-10"
                          style={{ backdropFilter: 'url("#container-glass") blur(4px)' }}
                        />
                        {from} → {to}
                      </button>
                    ))}
                  </div>
                </div>

                <GlassFilter />
              </div>
            )}

            {/* Step 1: Budget & Travelers */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Budget & Travelers</h2>
                  <p className="text-muted-foreground text-sm">AI will optimize everything within your budget.</p>
                </div>

                <div className="glass-panel rounded-2xl p-4 border-primary/20 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wand2 className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-foreground">Good for Trip</div>
                        <div className="text-xs text-muted-foreground">Auto-selects transport & hotel based on budget</div>
                      </div>
                    </div>
                    <button
                      onClick={() => update('smartBudget', !form.smartBudget)}
                      className={cn(
                        'relative w-10 h-6 rounded-full transition-colors',
                        form.smartBudget ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        form.smartBudget ? 'left-5' : 'left-1'
                      )} />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      Currency
                    </label>
                    <select
                      value={form.currency}
                      onChange={e => update('currency', e.target.value)}
                      className="glass-input"
                    >
                      <option value="INR">₹ Indian Rupee (INR)</option>
                      <option value="USD">$ US Dollar (USD)</option>
                      <option value="EUR">€ Euro (EUR)</option>
                      <option value="GBP">£ British Pound (GBP)</option>
                      <option value="AED">د.إ UAE Dirham (AED)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Total Budget
                    </label>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={e => update('budget', Number(e.target.value))}
                      min={1000}
                      step={1000}
                      className="glass-input text-lg font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Quick presets</div>
                  <div className="flex flex-wrap gap-2">
                    {[10000, 25000, 50000, 100000, 200000, 500000].map(b => (
                      <button
                        key={b}
                        onClick={() => update('budget', b)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-sm border transition-all',
                          form.budget === b
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        {formatCurrency(b, form.currency)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => update('startDate', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      min={form.startDate || new Date().toISOString().split('T')[0]}
                      onChange={e => update('endDate', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>

                {duration > 0 && (
                  <div className="glass-panel px-4 py-3 rounded-2xl text-sm text-foreground">
                    📅 <strong>{duration} {duration === 1 ? 'day' : 'days'}</strong> trip ({fmtDate(form.startDate)} to {fmtDate(form.endDate)})
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Number of Travelers
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => update('travelers', Math.max(1, form.travelers - 1))}
                      className="w-10 h-10 rounded-xl border border-border hover:bg-muted/60 flex items-center justify-center text-foreground transition-colors"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold text-foreground w-12 text-center">{form.travelers}</span>
                    <button
                      onClick={() => update('travelers', Math.min(20, form.travelers + 1))}
                      className="w-10 h-10 rounded-xl border border-border hover:bg-muted/60 flex items-center justify-center text-foreground transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {duration > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Budget', value: formatCurrency(form.budget, form.currency) },
                      { label: 'Per Day', value: formatCurrency(perDay, form.currency) },
                      { label: 'Per Person', value: formatCurrency(perPerson, form.currency) },
                    ].map(({ label, value }) => (
                      <div key={label} className="glass-panel rounded-2xl p-4 text-center">
                        <div className="text-lg font-bold text-foreground">{value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {form.smartBudget && form.budget > 0 && (
                  <div className="glass-panel rounded-2xl p-4 border-primary/20 border">
                    <div className="text-xs text-primary font-medium mb-2">✨ Smart Budget selected:</div>
                    <div className="text-sm text-muted-foreground">
                      Transport: {form.transportPreferences.map(t => TRANSPORT_TYPES.find(x => x.value === t)?.label).join(', ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Stay: {HOTEL_TYPES.find(h => h.value === form.hotelPreference)?.label} ({HOTEL_TYPES.find(h => h.value === form.hotelPreference)?.price})
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Purpose & Food */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Trip style & food</h2>
                  <p className="text-muted-foreground text-sm">Select multiple purposes and your food preference.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-muted-foreground" />
                    Trip Purposes <span className="text-xs text-muted-foreground">(select multiple)</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {PURPOSES.map(p => (
                      <button
                        key={p.value}
                        onClick={() => togglePurpose(p.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl text-xs font-medium border transition-all',
                          form.purposes.includes(p.value)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/40'
                        )}
                      >
                        <span className="text-xl">{p.emoji}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-muted-foreground" />
                    Food Preference
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FOOD_PREFS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => update('foodPreference', f.value)}
                        className={cn(
                          'flex flex-col items-start gap-0.5 px-4 py-3 rounded-2xl text-sm border text-left transition-all',
                          form.foodPreference === f.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-foreground hover:border-primary/50'
                        )}
                      >
                        <span className="font-medium">{f.label}</span>
                        <span className="text-xs text-muted-foreground">{f.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={form.specialRequests}
                    onChange={e => update('specialRequests', e.target.value)}
                    placeholder="E.g., Add Pavagadh in Gujarat, wheelchair accessible, specific temples to visit..."
                    rows={2}
                    className="glass-input resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Accommodation & Transport */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Stay & Transport</h2>
                  <p className="text-muted-foreground text-sm">
                    {form.smartBudget ? 'Auto-selected by Smart Budget. Turn it off in Step 2 to customize.' : 'Choose your preferences.'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-muted-foreground" />
                    Accommodation Type
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {HOTEL_TYPES.map(h => (
                      <button
                        key={h.value}
                        onClick={() => update('hotelPreference', h.value)}
                        className={cn(
                          'flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all',
                          form.hotelPreference === h.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        )}
                      >
                        <Hotel className={cn('w-5 h-5', form.hotelPreference === h.value ? 'text-primary' : 'text-muted-foreground')} />
                        <div>
                          <div className={cn('font-medium text-sm', form.hotelPreference === h.value ? 'text-primary' : 'text-foreground')}>
                            {h.label}
                          </div>
                          <div className="text-xs text-muted-foreground">{h.price}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <Train className="w-4 h-4 text-muted-foreground" />
                    Preferred Transport <span className="text-xs text-muted-foreground">(select multiple)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TRANSPORT_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => toggleTransport(t.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                          form.transportPreferences.includes(t.value)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => update('includeHiddenGems', !form.includeHiddenGems)}
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors',
                      form.includeHiddenGems ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      form.includeHiddenGems ? 'left-5' : 'left-1'
                    )} />
                  </button>
                  <span className="text-sm text-foreground">✨ Include hidden gems most travelers miss</span>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Ready to plan!</h2>
                  <p className="text-muted-foreground text-sm">Review your trip details before AI builds your itinerary.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Route', value: `${form.origin} → ${form.destination}` },
                    { label: 'Dates', value: form.startDate && form.endDate ? `${fmtDate(form.startDate)} to ${fmtDate(form.endDate)} (${duration}d)` : '—' },
                    { label: 'Travelers', value: `${form.travelers} ${form.travelers === 1 ? 'person' : 'people'}` },
                    { label: 'Budget', value: formatCurrency(form.budget, form.currency) },
                    { label: 'Purposes', value: form.purposes.map(p => PURPOSES.find(x => x.value === p)?.emoji + ' ' + PURPOSES.find(x => x.value === p)?.label).join(', ') },
                    { label: 'Food', value: FOOD_PREFS.find(f => f.value === form.foodPreference)?.label || '' },
                    { label: 'Accommodation', value: HOTEL_TYPES.find(h => h.value === form.hotelPreference)?.label || '' },
                    { label: 'Transport', value: form.transportPreferences.map(t => TRANSPORT_TYPES.find(x => x.value === t)?.emoji).join(' ') },
                  ].map(({ label, value }) => (
                    <div key={label} className="glass-panel rounded-2xl px-4 py-3">
                      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                      <div className="text-sm font-medium text-foreground">{value}</div>
                    </div>
                  ))}
                </div>

                {form.specialRequests && (
                  <div className="glass-panel rounded-2xl px-4 py-3 border-yellow-500/20 border">
                    <div className="text-xs text-yellow-500 font-medium mb-0.5">Special Requests</div>
                    <div className="text-sm text-foreground">{form.specialRequests}</div>
                  </div>
                )}

                <div className="glass-panel rounded-2xl p-4 border-primary/20 border">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium mb-1">
                    <Sparkles className="w-4 h-4" />
                    AI will generate for you:
                  </div>
                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                    {['Hour-by-hour itinerary', 'Hotel recommendations', 'Restaurant picks', 'Transport schedule', 'Budget breakdown', 'Hidden gems', 'Safety info', 'Packing list', 'Weather forecast', 'Local tips'].map(item => (
                      <span key={item}>• {item}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6 pt-0 flex items-center justify-between gap-4">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="btn-premium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-premium flex items-center gap-2 px-8 py-3 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Building your trip...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate My Trip
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
