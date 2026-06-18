'use client';
// src/components/features/landing/HeroSection.tsx
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Globe, MapPin, Star, TrendingUp, Users } from 'lucide-react';

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
    color: 'from-sunset-300/40 to-sunset-400/20',
    position: '-right-8 top-16',
    delay: 0,
  },
  {
    title: 'Goa Coastal Tour',
    meta: '3 days · ₹12,000',
    detail: 'Beach + Portuguese heritage',
    color: 'from-ocean-300/40 to-ocean-400/20',
    position: '-left-8 top-48',
    delay: 0.15,
  },
  {
    title: 'Leh-Ladakh Adventure',
    meta: '7 days · ₹28,000',
    detail: 'Himalayan road trip',
    color: 'from-forest-300/40 to-forest-400/20',
    position: '-right-4 bottom-24',
    delay: 0.3,
  },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-earth-50 via-background to-ocean-50/40 dark:opacity-0 transition-opacity duration-500" />
        
        {/* Dark mode: nature photo */}
        <div
          className="absolute inset-0 opacity-0 dark:opacity-100 bg-cover bg-center transition-opacity duration-500"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 dark:bg-background/70 transition-colors duration-500" />

        {/* Mesh blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-30 blur-3xl animate-blob"
          style={{ background: 'radial-gradient(circle, hsl(25 72% 60% / 0.4), transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-25 blur-3xl animate-blob"
          style={{ background: 'radial-gradient(circle, hsl(195 60% 50% / 0.4), transparent)', animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full opacity-20 blur-3xl animate-blob"
          style={{ background: 'radial-gradient(circle, hsl(120 40% 50% / 0.3), transparent)', animationDelay: '4s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-muted-foreground mb-8">
                <span className="w-2 h-2 rounded-full bg-forest-400 animate-pulse-soft" />
                AI-Powered Travel Planning
              </div>
            </motion.div>

            <motion.h1
              className="text-display text-5xl sm:text-6xl lg:text-7xl leading-[1.08] mb-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            >
              Your AI{' '}
              <span className="italic text-primary">travel</span>
              <br />
              companion.
            </motion.h1>

            <motion.p
              className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            >
              Tell us your dream destination, budget, and travel style. 
              We build a complete trip — hour-by-hour, within your exact budget,
              with hidden gems most travelers never find.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            >
              <Link href="/plan" className="btn-premium text-base px-8 py-4 rounded-2xl">
                Start Planning Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-medium glass-panel hover:bg-white/60 dark:hover:bg-white/10 transition-colors border border-border"
              >
                <TrendingUp className="w-4 h-4" />
                See Example Trip
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: 'easeOut' }}
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

          {/* Right — Floating Cards */}
          <div className="relative h-[520px] hidden lg:block">
            {/* Central mock card */}
            <motion.div
              className="absolute inset-0 m-8 glass-card rounded-4xl p-8 flex flex-col"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            >
              <div
                className="flex-1 rounded-3xl bg-cover bg-center mb-6"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80')" }}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-display text-xl font-semibold">Swiss Alps Escape</h3>
                  <span className="tag-pill">7 Days</span>
                </div>
                <p className="text-sm text-muted-foreground">Interlaken · Grindelwald · Zermatt</p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-2xl font-bold text-primary">₹1,85,000</span>
                  <span className="text-xs text-muted-foreground">for 2 travelers</span>
                </div>
              </div>
            </motion.div>

            {/* Floating mini cards */}
            {floatingCards.map((card, i) => (
              <motion.div
                key={i}
                className={`absolute ${card.position} w-52 glass-card rounded-2xl p-4`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 + card.delay } }}
                style={{ animation: `float ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${card.delay * 2}s` }}
              >
                <div className={`h-2 rounded-full bg-gradient-to-r ${card.color} mb-3`} />
                <div className="text-sm font-semibold text-foreground">{card.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{card.meta}</div>
                <div className="text-xs text-primary mt-1">{card.detail}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
