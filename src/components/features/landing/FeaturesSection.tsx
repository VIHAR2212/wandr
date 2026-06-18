'use client';
// src/components/features/landing/FeaturesSection.tsx
import { motion } from 'framer-motion';
import {
  Brain, Map, MessageCircle, Shield, Wallet, Clock,
  Camera, Users, Download, Bell, Sparkles, Navigation,
  UtensilsCrossed, Hotel, Luggage, BarChart3
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Travel Brain',
    description: 'Powered by Claude AI. Understands your style, learns preferences, plans like a seasoned travel agent.',
    color: 'text-primary',
    bg: 'bg-primary/8',
    size: 'col-span-2 row-span-2',
    accent: true,
  },
  {
    icon: Map,
    title: 'Interactive Maps',
    description: 'Live maps with hotels, routes, transport hubs, restaurants, and hidden gems.',
    color: 'text-ocean-500',
    bg: 'bg-ocean-500/8',
    size: '',
  },
  {
    icon: Wallet,
    title: 'Hard Budget Control',
    description: 'Budget is never exceeded. Every rupee accounted for, with detailed breakdowns.',
    color: 'text-forest-500',
    bg: 'bg-forest-500/8',
    size: '',
  },
  {
    icon: Navigation,
    title: 'Real-Time Tracking',
    description: 'Start your journey and let AI monitor location, traffic, weather, and reroute if needed.',
    color: 'text-sunset-500',
    bg: 'bg-sunset-500/8',
    size: '',
  },
  {
    icon: MessageCircle,
    title: 'AI Travel Chat',
    description: 'Ask anything mid-trip. Your AI agent is always available.',
    color: 'text-accent',
    bg: 'bg-accent/8',
    size: '',
  },
  {
    icon: Shield,
    title: 'Safety Intelligence',
    description: 'Safety scores, scam alerts, emergency contacts, hospitals and police stations nearby.',
    color: 'text-forest-600',
    bg: 'bg-forest-600/8',
    size: 'col-span-2',
  },
  {
    icon: Clock,
    title: 'Hour-by-Hour Plans',
    description: 'Not just day plans — exact schedules with timing, duration, and alternatives.',
    color: 'text-primary',
    bg: 'bg-primary/8',
    size: '',
  },
  {
    icon: UtensilsCrossed,
    title: 'Food-Aware Planning',
    description: 'Veg, Jain, Vegan, Halal, Non-Veg — every restaurant selected to match your diet.',
    color: 'text-sunset-500',
    bg: 'bg-sunset-500/8',
    size: '',
  },
  {
    icon: Hotel,
    title: 'Smart Hotel Picks',
    description: 'Budget to ultra-luxury. Hostels to heritage hotels. Perfectly matched to your preference.',
    color: 'text-ocean-500',
    bg: 'bg-ocean-500/8',
    size: '',
  },
  {
    icon: Luggage,
    title: 'Packing Lists',
    description: 'AI-generated packing lists based on destination, duration, weather, and trip purpose.',
    color: 'text-earth-500',
    bg: 'bg-earth-500/8',
    size: '',
  },
  {
    icon: Users,
    title: 'Group Travel',
    description: 'Plan for families, couples, or solo. Shared expenses, roles, and group coordination.',
    color: 'text-forest-500',
    bg: 'bg-forest-500/8',
    size: '',
  },
  {
    icon: Download,
    title: 'PDF Itineraries',
    description: 'Download beautiful PDF itineraries. Works offline. Share with your group.',
    color: 'text-accent',
    bg: 'bg-accent/8',
    size: '',
  },
  {
    icon: BarChart3,
    title: 'Travel Analytics',
    description: 'Track spending, destinations, and memories. Understand your travel patterns.',
    color: 'text-primary',
    bg: 'bg-primary/8',
    size: '',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Flight delays, weather changes, crowd predictions — Wandr alerts you before problems happen.',
    color: 'text-sunset-400',
    bg: 'bg-sunset-400/8',
    size: 'col-span-2',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-caption text-primary mb-4">What Wandr Does</div>
          <h2 className="text-display text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Everything a great travel<br />
            <span className="italic text-primary">agent</span> would do — and more.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From the first spark of inspiration to your final memory — Wandr handles it all.
            No generic recommendations. Every trip crafted for you.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[160px]"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                className={`glass-card-hover p-6 flex flex-col justify-between cursor-default ${feature.size}`}
              >
                <div className={`w-10 h-10 rounded-2xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
                {feature.accent && (
                  <div className="mt-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-primary font-medium">Powered by Claude AI</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
