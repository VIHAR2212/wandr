'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Plus, MapPin, Calendar, Users, Wallet, ArrowRight,
  Globe, TrendingUp, Compass, Sparkles
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

export function DashboardView() {
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/trips')
      .then(r => r.json())
      .then(d => setTrips(d.trips ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filters = ['ALL', 'PLANNING', 'CONFIRMED', 'ACTIVE', 'COMPLETED'];
  const filtered = activeFilter === 'ALL' ? trips : trips.filter(t => t.status === activeFilter);

  const stats = {
    total: trips.length,
    active: trips.filter(t => t.status === 'ACTIVE').length,
    completed: trips.filter(t => t.status === 'COMPLETED').length,
    totalBudget: trips.reduce((s, t) => s + t.budget, 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Greeting — only addition, no other UI changed */}
      <div className="mb-8">
        <p className="text-lg text-muted-foreground">
          {getGreeting(session?.user?.name || '')}
        </p>
      </div>

      {/* Header — EXACTLY your original code */}
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

      {/* Stats — EXACTLY your original code */}
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

      {/* Filter tabs — EXACTLY your original code */}
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

      {/* Trip Grid — EXACTLY your original code */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-64 rounded-3xl" />)}
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
          transition={{ duration: 0.3, staggerChildren: 0.05 }}
        >
          {filtered.map((trip, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
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
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
