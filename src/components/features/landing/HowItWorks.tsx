'use client';
import { motion } from 'framer-motion';
import {
  ClipboardList, Cpu, Map, Plane, Play, ChevronDown,
  ArrowRight, Clock, Wallet, Users, Sparkles, MessageCircle, Download
} from 'lucide-react';

const flowSteps = [
  {
    step: 1,
    icon: ClipboardList,
    title: 'Tell Us Your Trip',
    description: 'Share your destination, dates, budget, travelers, and preferences — food, hotel type, trip purpose.',
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/15 text-blue-500',
    tag: '30 seconds',
    tagIcon: Clock,
  },
  {
    step: 2,
    icon: Cpu,
    title: 'AI Builds Your Itinerary',
    description: 'Claude AI generates a complete hour-by-hour plan — hotels, transport, food, hidden gems — all within budget.',
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/15 text-purple-500',
    tag: '~23 seconds',
    tagIcon: Sparkles,
  },
  {
    step: 3,
    icon: Map,
    title: 'Review & Customize',
    description: 'Explore on interactive maps, swap activities, change hotels, adjust budget. Your trip, your rules.',
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/15 text-emerald-500',
    tag: 'Full control',
    tagIcon: Users,
  },
  {
    step: 4,
    icon: Download,
    title: 'Download & Travel',
    description: 'Export a beautiful PDF, track in real-time, get live AI support on the go. Wandr stays with you.',
    color: 'from-orange-500/20 to-orange-600/10',
    borderColor: 'border-orange-500/30',
    iconBg: 'bg-orange-500/15 text-orange-500',
    tag: 'Go explore!',
    tagIcon: Plane,
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" id="how-it-works">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 -z-10 bg-muted/30 dark:bg-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Play className="w-3.5 h-3.5" />
            How It Works
          </div>
          <h2 className="text-display text-4xl sm:text-5xl font-bold mb-4">
            From idea to itinerary
            <br />
            <span className="italic text-primary">in minutes.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Watch the demo or follow the flowchart — either way, you&apos;ll see how Wandr turns your travel dream into a complete plan.
          </p>
        </motion.div>

        {/* ==================== VIDEO SECTION ==================== */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="relative w-full max-w-4xl mx-auto">
            {/* 16:9 Aspect Ratio Container */}
            <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/5">
              {/* YouTube Embed */}
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/J8JMPB6tUOs?rel=0&modestbranding=1&color=white"
                title="Wandr AI Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Glow effect behind video */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10 rounded-3xl blur-2xl" />
          </div>
        </motion.div>

        {/* ==================== FLOWCHART SECTION ==================== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Flowchart Label */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="h-px flex-1 max-w-[120px] bg-border" />
            <span className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <ChevronDown className="w-4 h-4" />
              Or follow the steps
              <ChevronDown className="w-4 h-4" />
            </span>
            <div className="h-px flex-1 max-w-[120px] bg-border" />
          </div>

          {/* Flowchart - Desktop: Horizontal with connectors */}
          <div className="hidden lg:block">
            <div className="relative flex items-stretch gap-0">
              {flowSteps.map((step, i) => {
                const Icon = step.icon;
                const TagIcon = step.tagIcon;
                const isLast = i === flowSteps.length - 1;

                return (
                  <div key={step.step} className="flex items-stretch flex-1">
                    {/* Step Card */}
                    <motion.div
                      className={`relative flex-1 rounded-2xl border ${step.borderColor} bg-gradient-to-b ${step.color} backdrop-blur-sm p-6 flex flex-col`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.15 }}
                    >
                      {/* Step number badge */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="w-10 h-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center">
                          <span className="text-lg font-bold text-foreground">{step.step}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TagIcon className="w-3 h-3" />
                          {step.tag}
                        </div>
                      </div>

                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl ${step.iconBg} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <h3 className="font-semibold text-foreground text-base mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{step.description}</p>

                      {/* Bottom decorative bar */}
                      <div className="mt-5 h-1 rounded-full bg-gradient-to-r from-primary/30 to-primary/5" />
                    </motion.div>

                    {/* Connector Arrow */}
                    {!isLast && (
                      <div className="flex items-center px-2 flex-shrink-0">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-px h-4 bg-border/60" />
                          <ArrowRight className="w-5 h-5 text-primary/60" />
                          <div className="w-px h-4 bg-border/60" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flowchart - Tablet: 2x2 Grid with vertical connectors */}
          <div className="hidden sm:grid lg:hidden grid-cols-2 gap-x-8 gap-y-0">
            {flowSteps.map((step, i) => {
              const Icon = step.icon;
              const TagIcon = step.tagIcon;
              const isRight = i % 2 === 1;
              const needsBottomConnector = i < 2;

              return (
                <div key={step.step} className="relative">
                  {/* Horizontal connector for right column items */}
                  {isRight && (
                    <div className="absolute top-10 -left-5 w-5 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-primary/60 rotate-180" />
                    </div>
                  )}

                  <motion.div
                    className={`relative rounded-2xl border ${step.borderColor} bg-gradient-to-b ${step.color} backdrop-blur-sm p-6`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center">
                        <span className="text-base font-bold text-foreground">{step.step}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TagIcon className="w-3 h-3" />
                        {step.tag}
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${step.iconBg} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1.5">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </motion.div>

                  {/* Vertical connector down to next row */}
                  {needsBottomConnector && (
                    <div className="flex justify-center py-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-px h-3 bg-border/60" />
                        <ChevronDown className="w-4 h-4 text-primary/60" />
                        <div className="w-px h-3 bg-border/60" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Flowchart - Mobile: Vertical stack with connectors */}
          <div className="sm:hidden flex flex-col items-center gap-0">
            {flowSteps.map((step, i) => {
              const Icon = step.icon;
              const TagIcon = step.tagIcon;
              const isLast = i === flowSteps.length - 1;

              return (
                <div key={step.step} className="w-full flex flex-col items-center">
                  <motion.div
                    className={`w-full rounded-2xl border ${step.borderColor} bg-gradient-to-b ${step.color} backdrop-blur-sm p-5`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-foreground">{step.step}</span>
                      </div>
                      <div className={`w-9 h-9 rounded-lg ${step.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                        <TagIcon className="w-3 h-3" />
                        {step.tag}
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1.5">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </motion.div>

                  {/* Vertical connector */}
                  {!isLast && (
                    <div className="flex flex-col items-center py-2">
                      <div className="w-px h-3 bg-border/60" />
                      <ChevronDown className="w-4 h-4 text-primary/60" />
                      <div className="w-px h-3 bg-border/60" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA after flowchart */}
          <motion.div
            className="text-center mt-14"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="text-muted-foreground text-sm mb-4">
              Ready to plan your first trip?
            </p>
            <a
              href="/plan"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Start Planning Free
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
