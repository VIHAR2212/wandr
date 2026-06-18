'use client';
// src/components/features/landing/HowItWorks.tsx
import { motion } from 'framer-motion';
import { ClipboardList, Cpu, Map, Plane } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: ClipboardList,
    title: 'Tell us your trip',
    description: 'Origin, destination, dates, budget, number of travelers, trip purpose, food preferences, and hotel type.',
  },
  {
    step: '02',
    icon: Cpu,
    title: 'AI builds your itinerary',
    description: 'Claude AI generates a complete hour-by-hour trip plan, within your exact budget, with hotels, transport, and hidden gems.',
  },
  {
    step: '03',
    icon: Map,
    title: 'Review & customize',
    description: 'See everything on interactive maps. Adjust, swap activities, change hotels. Your trip, your way.',
  },
  {
    step: '04',
    icon: Plane,
    title: 'Travel with AI support',
    description: 'Real-time tracking, smart notifications, route changes, weather updates — Wandr stays with you the whole journey.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-muted/30 dark:bg-transparent" />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-caption text-primary mb-4">How It Works</div>
          <h2 className="text-display text-4xl sm:text-5xl font-bold mb-6">
            From idea to itinerary<br />
            <span className="italic text-primary">in minutes.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                className="glass-card p-8 relative"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="text-6xl font-bold text-border dark:text-white/5 absolute top-6 right-6 leading-none select-none">
                  {step.step}
                </div>
                <Icon className="w-8 h-8 text-primary mb-6" />
                <h3 className="font-semibold text-lg text-foreground mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
