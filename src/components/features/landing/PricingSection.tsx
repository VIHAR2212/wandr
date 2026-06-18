'use client';
// src/components/features/landing/PricingSection.tsx
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, Sparkles, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Wanderer',
    price: 'Free',
    period: '',
    description: 'Start exploring AI trip planning',
    features: [
      '2 AI trip plans/month',
      'Basic itinerary (day-by-day)',
      'Budget breakdown',
      'Map view',
      'PDF download',
      'AI chat (10 messages/trip)',
    ],
    cta: 'Start Free',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Explorer',
    price: '₹599',
    period: '/month',
    description: 'For frequent travelers',
    features: [
      'Unlimited AI trip plans',
      'Hour-by-hour itineraries',
      'Real-time trip tracking',
      'Weather-aware replanning',
      'Hidden gems discovery',
      'Group trip planning',
      'Packing list generator',
      'Safety scores & alerts',
      'Expense tracking',
      'Unlimited AI chat',
      'Priority support',
    ],
    cta: 'Start Explorer',
    href: '/auth/register?plan=explorer',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Nomad',
    price: '₹1,499',
    period: '/month',
    description: 'For travel professionals & power users',
    features: [
      'Everything in Explorer',
      'Admin dashboard',
      'Multi-trip management',
      'White-label PDF reports',
      'API access',
      'Team collaboration',
      'Custom AI prompts',
      'Analytics dashboard',
      'Dedicated support',
      'Early feature access',
    ],
    cta: 'Start Nomad',
    href: '/auth/register?plan=nomad',
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-32 relative">
      <div className="absolute inset-0 -z-10 bg-muted/30 dark:bg-transparent" />
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-caption text-primary mb-4">Pricing</div>
          <h2 className="text-display text-4xl sm:text-5xl font-bold mb-4">
            Simple, transparent pricing.
          </h2>
          <p className="text-muted-foreground text-lg">No hidden costs. No surprises. Just travel.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`relative rounded-3xl p-8 flex flex-col ${
                plan.highlighted
                  ? 'bg-primary text-primary-foreground shadow-premium'
                  : 'glass-card'
              }`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <div className={`text-sm font-medium mb-2 ${plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {plan.name}
                </div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-display text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlighted ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm ${plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{plan.description}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className={plan.highlighted ? 'text-primary-foreground/90' : 'text-foreground'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full py-3.5 rounded-2xl font-medium text-sm text-center transition-all duration-200 flex items-center justify-center gap-2 ${
                  plan.highlighted
                    ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                    : 'btn-premium'
                }`}
              >
                {plan.highlighted && <Sparkles className="w-3.5 h-3.5" />}
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
