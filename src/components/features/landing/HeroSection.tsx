'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Globe, MapPin, Star, TrendingUp, Users, Play } from 'lucide-react';

const stats = [
  { label: 'Trips Planned', value: '2.4M+', icon: Globe },
  { label: 'Countries', value: '190+', icon: MapPin },
  { label: 'Happy Travelers', value: '340K+', icon: Users },
  { label: 'Avg. Satisfaction', value: '4.9★', icon: Star },
];

const floatingCards = [
  {
    title: 'Tokyo → Kyoto',
    meta: '5 days · ₹45,000',
    detail: 'Cherry blossom season',
    emoji: '🌸',
    position: 'right-4 top-8',
    delay: 0,
  },
  {
    title: 'Goa Coastal Tour',
    meta: '3 days · ₹12,000',
    detail: 'Beach + Portuguese heritage',
    emoji: '🏖️',
    position: 'left-0 top-52',
    delay: 0.15,
  },
  {
    title: 'Leh-Ladakh Adventure',
    meta: '7 days · ₹28,000',
    detail: 'Himalayan road trip',
    emoji: '🏔️',
    position: 'right-8 bottom-16',
    delay: 0.3,
  },
];

const DEMO_TRIP = {
  destination: 'Manali, Himachal Pradesh',
  duration: '5 Days',
  budget: '₹35,000',
  travelers: 2,
  highlights: ['Solang Valley Snow Point', 'Rohtang Pass', 'Old Manali Cafes', 'Hadimba Temple', 'Beas River Rafting'],
  hotels: ['The Orchard Greens Resort', 'Snow Valley Resorts'],
  dailyCost: '₹7,000/day',
  transport: 'Volvo Bus from Delhi',
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-earth-50 via-background to-ocean-50/40 dark:hidden" />
        {/* Dark mode: forest/ocean scene (different from the card image) */}
        <div
          className="absolute inset-0 hidden dark:block bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 hidden dark:block bg-black/60" />
        {/* Blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-blob"
          style={{ background: 'radial-gradient(circle, hsl(25 72% 60% / 0.5), transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl animate-blob"
          style={{ background: 'radial-gradient(circle, hsl(195 60% 50% / 0.4), transparent)', animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-muted-foreground mb-8">
              </div>
            </motion.div>

            <motion.h1
              className="text-display text-5xl sm:text-6xl lg:text-7xl leading-[1.08] mb-6"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Your AI{' '}
              <span className="italic text-primary">travel</span>
              <br />companion.
            </motion.h1>

            <motion.p
              className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Tell us your dream destination, budget, and travel style.
              We build a complete trip — hour-by-hour, within your exact budget,
              with hidden gems most travelers never find.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link href="/plan" className="btn-premium text-base px-8 py-4 rounded-2xl">
                Start Planning Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-medium glass-panel hover:bg-white/60 dark:hover:bg-white/10 transition-colors border border-border">
                <Play className="w-4 h-4 fill-current" />
                See Example Trip
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-14"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass-panel px-4 py-3 rounded-2xl">
                  <Icon className="w-4 h-4 text-primary mb-1.5" />
                  <div className="text-xl font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Floating Cards (no overlapping image) */}
          <div className="relative h-[500px] hidden lg:block">
            {/* Central card - itinerary preview style, NOT a photo */}
            <motion.div
              className="absolute inset-8 glass-card rounded-4xl p-6 flex flex-col gap-4"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">AI Generated Trip</div>
                  <h3 className="text-display text-xl font-semibold text-foreground">Manali Escape</h3>
                  <p className="text-sm text-muted-foreground">Delhi → Manali · 5 days</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">₹35,000</div>
                  <div className="text-xs text-muted-foreground">for 2 people</div>
                </div>
              </div>

              {/* Day breakdown */}
              <div className="flex-1 space-y-2">
                {[
                  { day: 'Day 1', activity: 'Delhi → Manali (Volvo Bus)', cost: '₹2,400', icon: '🚌' },
                  { day: 'Day 2', activity: 'Solang Valley & Snow Point', cost: '₹3,200', icon: '🏔️' },
                  { day: 'Day 3', activity: 'Rohtang Pass Trek', cost: '₹4,500', icon: '🥾' },
                  { day: 'Day 4', activity: 'Old Manali & Beas Rafting', cost: '₹2,800', icon: '🌊' },
                  { day: 'Day 5', activity: 'Hadimba Temple + Return', cost: '₹2,100', icon: '🛕' },
                ].map((item) => (
                  <div key={item.day} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-primary">{item.day}</span>
                      <p className="text-sm text-foreground truncate">{item.activity}</p>
                    </div>
                    <span className="text-sm font-medium text-foreground">{item.cost}</span>
                  </div>
                ))}
              </div>

              {/* Budget bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Budget used</span>
                  <span>₹35,000 / ₹35,000</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '98%' }} />
                </div>
              </div>
            </motion.div>

            {/* Floating mini cards */}
            {floatingCards.map((card, i) => (
              <motion.div
                key={i}
                className={`absolute ${card.position} w-48 glass-card rounded-2xl p-4 z-10`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + card.delay }}
                style={{ animation: `float ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${card.delay * 2}s` }}
              >
                <div className="text-2xl mb-2">{card.emoji}</div>
                <div className="text-sm font-semibold text-foreground">{card.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{card.meta}</div>
                <div className="text-xs text-primary mt-1">{card.detail}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Trip Preview Section */}
      <div id="demo" className="w-full max-w-7xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 rounded-3xl"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="text-caption text-primary mb-2">Live Demo Trip</div>
              <h2 className="text-display text-2xl font-bold text-foreground">{DEMO_TRIP.destination}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {DEMO_TRIP.duration} · {DEMO_TRIP.travelers} Travelers · Budget: {DEMO_TRIP.budget} · {DEMO_TRIP.dailyCost}
              </p>
            </div>
            <Link href="/plan" className="btn-premium">
              Plan Your Own <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-semibold text-foreground mb-3">📍 Day Highlights</div>
              <div className="space-y-2">
                {DEMO_TRIP.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                    {h}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground mb-3">🏨 Hotels Recommended</div>
              <div className="space-y-2">
                {DEMO_TRIP.hotels.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-primary">★</span>{h}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold text-foreground mb-3">🚌 Transport</div>
                <div className="text-sm text-muted-foreground">{DEMO_TRIP.transport}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground mb-3">💰 Budget Breakdown</div>
              <div className="space-y-2">
                {[
                  { label: 'Transport', amount: '₹4,800', pct: 14 },
                  { label: 'Hotels', amount: '₹14,000', pct: 40 },
                  { label: 'Food', amount: '₹8,000', pct: 23 },
                  { label: 'Activities', amount: '₹6,000', pct: 17 },
                  { label: 'Misc', amount: '₹2,200', pct: 6 },
                ].map(({ label, amount, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium">{amount}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-forest-500" />
              <span>AI planned this in <strong className="text-foreground">23 seconds</strong> · Budget used: <strong className="text-primary">100%</strong> — no waste</span>
            </div>
            <Link href="/auth/register" className="text-sm text-primary font-medium hover:underline">
              Create free account to plan your trip →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
