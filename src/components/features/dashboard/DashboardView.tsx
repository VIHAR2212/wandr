'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Plus, MapPin, Calendar, Users, Wallet, ArrowRight,
  Globe, TrendingUp, Compass, Sparkles, Trash2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Trip {
  id: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  status: string;
  purpose: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  CONFIRMED: 'bg-ocean-500/10 text-ocean-600 dark:text-ocean-400',
  ACTIVE: 'bg-forest-500/10 text-forest-600 dark:text-forest-400',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-red-500/10 text-red-500',
};

const PURPOSE_EMOJI: Record<string, string> = {
  ADVENTURE: '🧗', DEVOTIONAL: '🛕', HIKING: '🥾', HONEYMOON: '💍',
  FAMILY: '👨‍👩‍👧', PHOTOGRAPHY: '📷', BUSINESS: '💼', FOOD_EXPLORATION: '🍜',
  WELLNESS: '🧘', CULTURAL: '🏛️', SOLO: '🎒', BACKPACKING: '⛺',
};

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const firstName = name?.split(' ')[0] || 'Traveler';
  if (hour >= 5 && hour < 12) {
    const msgs = [
      `Good morning, ${firstName} — time to plan a new adventure`,
      `Rise and shine, ${firstName} — where to next?`,
      `Morning, ${firstName} — a new destination awaits`,
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (hour >= 12 && hour < 17) {
    const msgs = [
      `Good afternoon, ${firstName} — perfect time to daydream about trips`,
      `Hey ${firstName} — grab lunch and plan your next escape`,
      `Afternoon, ${firstName} — your next journey is just a click away`,
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (hour >= 17 && hour < 21) {
    const msgs = [
      `Evening, ${firstName} — grab a coffee and explore new destinations`,
      `Good evening, ${firstName} — wind down with some trip planning`,
      `Hey ${firstName} — the best trips are planned over evening coffee`,
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  const msgs = [
    `Late night, ${firstName} — the best trips are planned at midnight`,
    `Burning the midnight oil, ${firstName}? Perfect time to plan`,
    `Night owl mode, ${firstName} — let's find your next adventure`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ─── Liquid Glass SVG Filter (hidden, referenced via CSS) ───────────────────
function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden>
      <defs>
        <filter
          id="trash-glass"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.065 0.065"
            numOctaves="1"
            seed="3"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="1.5" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="55"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="3" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

// ─── Liquid Glass Trash Zone ─────────────────────────────────────────────────
interface TrashZoneProps {
  isDragging: boolean;
  onDrop: (tripId: string) => void;
}

function LiquidGlassTrashZone({ isDragging, onDrop }: TrashZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [justDropped, setJustDropped] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tripId = e.dataTransfer.getData('tripId');
    if (tripId) {
      setJustDropped(true);
      onDrop(tripId);
      setTimeout(() => setJustDropped(false), 600);
    }
    setIsOver(false);
  };

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed bottom-8 right-8 z-50"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Outer glow ring — pulses red when hovering */}
          <div
            className={cn(
              'absolute inset-0 rounded-full transition-all duration-300',
              isOver
                ? 'shadow-[0_0_0_3px_rgba(239,68,68,0.6),0_0_32px_rgba(239,68,68,0.4)]'
                : 'shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_24px_rgba(0,0,0,0.3)]'
            )}
          />

          {/* Liquid glass body */}
          <div
            className={cn(
              'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden',
              // The frosted glass base
              'bg-white/[0.06] dark:bg-white/[0.04]',
              // Inset highlight ring
              isOver
                ? 'ring-2 ring-red-400/60 ring-inset'
                : 'ring-1 ring-white/20 ring-inset',
              // Deep shadow stack mimicking the LiquidButton from 21st.dev
              isOver
                ? 'shadow-[0_0_6px_rgba(239,68,68,0.05),0_2px_8px_rgba(239,68,68,0.15),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_0_0_6px_6px_rgba(239,68,68,0.08),inset_0_0_2px_2px_rgba(239,68,68,0.04),0_0_16px_rgba(239,68,68,0.2)]'
                : 'shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.1)]',
              // Scale up slightly on hover
              isOver ? 'scale-110' : 'scale-100'
            )}
          >
            {/* Backdrop blur distortion layer — the actual "liquid glass" lens */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ backdropFilter: 'url("#trash-glass") blur(8px)' }}
            />

            {/* Top specular highlight — the glass "shine" */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-5 rounded-b-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

            {/* Bottom inner shadow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-4 rounded-t-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

            {/* Trash icon */}
            <motion.div
              className="relative z-10 pointer-events-none"
              animate={
                justDropped
                  ? { scale: [1, 1.4, 0.9, 1], rotate: [0, -8, 8, 0] }
                  : isOver
                  ? { scale: 1.15, rotate: -5 }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.35 }}
            >
              <Trash2
                className={cn(
                  'w-8 h-8 transition-colors duration-200',
                  isOver ? 'text-red-400' : 'text-white/60'
                )}
                strokeWidth={1.5}
              />
            </motion.div>
          </div>

          {/* Drop hint label */}
          <motion.p
            className={cn(
              'absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium transition-colors duration-200',
              isOver ? 'text-red-400' : 'text-white/40'
            )}
            animate={{ opacity: isOver ? 1 : 0.6 }}
          >
            {isOver ? 'Release to delete' : 'Drop to delete'}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Draggable Trip Card wrapper ─────────────────────────────────────────────
interface DraggableTripCardProps {
  trip: Trip;
  index: number;
  onDragStart: (tripId: string) => void;
  onDragEnd: () => void;
}

function DraggableTripCard({ trip, index, onDragStart, onDragEnd }: DraggableTripCardProps) {
  const [isDraggingThis, setIsDraggingThis] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('tripId', trip.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingThis(true);
    onDragStart(trip.id);
  };

  const handleDragEnd = () => {
    setIsDraggingThis(false);
    onDragEnd();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: isDraggingThis ? 0.4 : 1, y: 0, scale: isDraggingThis ? 0.97 : 1 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          'cursor-grab active:cursor-grabbing select-none',
          isDraggingThis && 'pointer-events-none'
        )}
      >
      <Link href={`/trip/${trip.id}`} className="glass-card-hover block p-6 group">
        {/* Status + Purpose */}
        <div className="flex items-center justify-between mb-4">
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLORS[trip.status] ?? STATUS_COLORS.PLANNING)}>
            {trip.status}
          </span>
          <span className="text-xl">{PURPOSE_EMOJI[trip.purpose] ?? '✈️'}</span>
        </div>

        {/* Route */}
        <h3 className="font-bold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
          {trip.title || `${trip.origin} → ${trip.destination}`}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <MapPin className="w-3.5 h-3.5" />
          {trip.origin} → {trip.destination}
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-2xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3" />Dates
            </div>
            <div className="text-xs font-medium text-foreground">{formatDate(trip.startDate)}</div>
          </div>
          <div>
            <div className="text-2xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <Users className="w-3 h-3" />People
            </div>
            <div className="text-xs font-medium text-foreground">{trip.travelers}</div>
          </div>
          <div>
            <div className="text-2xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <Wallet className="w-3 h-3" />Budget
            </div>
            <div className="text-xs font-medium text-foreground">{formatCurrency(trip.budget, trip.currency)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>Created {formatDate(trip.createdAt)}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export function DashboardView() {
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/trips')
      .then(r => r.json())
      .then(d => setTrips(d.trips ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteTrip = async (tripId: string) => {
    // Optimistic removal
    setTrips(prev => prev.filter(t => t.id !== tripId));
    setDraggingId(null);

    try {
      await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
    } catch {
      // Optionally: refetch to restore if API fails
      fetch('/api/trips')
        .then(r => r.json())
        .then(d => setTrips(d.trips ?? []));
    }
  };

  const filters = ['ALL', 'PLANNING', 'CONFIRMED', 'ACTIVE', 'COMPLETED'];
  const filtered = activeFilter === 'ALL' ? trips : trips.filter(t => t.status === activeFilter);

  const stats = {
    total: trips.length,
    active: trips.filter(t => t.status === 'ACTIVE').length,
    completed: trips.filter(t => t.status === 'COMPLETED').length,
    totalBudget: trips.reduce((s, t) => s + t.budget, 0),
  };

  return (
    <>
      {/* Hidden SVG filter — must be in DOM for backdrop-filter to reference */}
      <GlassFilter />

      {/* Floating liquid glass trash zone */}
      <LiquidGlassTrashZone
        isDragging={draggingId !== null}
        onDrop={handleDeleteTrip}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Greeting */}
        <div className="mb-8">
          <p className="text-lg text-muted-foreground">
            {getGreeting(session?.user?.name || '')}
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-display text-3xl sm:text-4xl font-bold text-foreground mb-2">My Trips</h1>
            <p className="text-muted-foreground">Manage and track all your travel plans.</p>
          </div>
          <Link href="/plan" className="btn-premium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Trip
          </Link>
        </div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {[
            { label: 'Total Trips', value: stats.total, icon: Globe, color: 'text-primary' },
            { label: 'Active', value: stats.active, icon: TrendingUp, color: 'text-forest-500' },
            { label: 'Completed', value: stats.completed, icon: Compass, color: 'text-ocean-500' },
            { label: 'Total Budgeted', value: formatCurrency(stats.totalBudget), icon: Wallet, color: 'text-earth-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-5">
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                activeFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {f === 'ALL' ? 'All Trips' : f.charAt(0) + f.slice(1).toLowerCase()}
              {f !== 'ALL' && (
                <span className="ml-2 text-xs opacity-70">
                  {trips.filter(t => t.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Drag hint — shows when there are trips */}
        {!loading && trips.length > 0 && (
          <p className="text-xs text-muted-foreground/50 mb-4 flex items-center gap-1.5">
            <Trash2 className="w-3 h-3" />
            Drag any trip card to the trash to delete it
          </p>
        )}

        {/* Trip Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-64 rounded-3xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 glass-card rounded-3xl">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No trips yet</h3>
            <p className="text-muted-foreground mb-6">Plan your first AI-powered trip in minutes.</p>
            <Link href="/plan" className="btn-premium inline-flex gap-2">
              <Plus className="w-4 h-4" />
              Plan a Trip
            </Link>
          </div>
        ) : (
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {filtered.map((trip, i) => (
                <DraggableTripCard
                  key={trip.id}
                  trip={trip}
                  index={i}
                  onDragStart={(id) => setDraggingId(id)}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </>
  );
}
