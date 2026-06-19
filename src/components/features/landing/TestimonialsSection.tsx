'use client';
// src/components/features/landing/TestimonialsSection.tsx
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Travel Blogger, Delhi',
    avatar: 'PS',
    rating: 5,
    text: 'Wandr planned a 10-day Rajasthan trip for Rs 45,000 for two people. Every hotel, every meal, every hidden temple — all within budget. I have been travel blogging for 8 years and this is the most accurate AI planner I have used.',
    destination: 'Rajasthan, India',
  },
  {
    name: 'Arjun Mehta',
    role: 'Software Engineer, Bangalore',
    avatar: 'AM',
    rating: 5,
    text: 'Solo trip to Leh-Ladakh. Wandr found routes and homestays I never would have discovered. The real-time weather alerts literally saved me from a road closure. Absolute game changer.',
    destination: 'Leh-Ladakh, India',
  },
  {
    name: 'Sarah Chen',
    role: 'Food Photographer, Mumbai',
    avatar: 'SC',
    rating: 5,
    text: 'Vegan traveler in Japan — usually a nightmare to plan. Wandr found authentic vegan ramen shops, plant-based sushi, and temple shojin ryori stays. Zero compromise on my diet or experience.',
    destination: 'Tokyo, Japan',
  },
  {
    name: 'Ravi and Meera',
    role: 'Couple, Hyderabad',
    avatar: 'RM',
    rating: 5,
    text: 'Honeymoon to Santorini. We said Rs 2.5L for two. Wandr fit flights, a cave hotel, sunset cruises, and private dining in that budget. We thought it was impossible. It was not.',
    destination: 'Santorini, Greece',
  },
  {
    name: 'Dr. Fatima Al-Hassan',
    role: 'Pediatrician, UAE',
    avatar: 'FA',
    rating: 5,
    text: 'Halal-friendly family trip to Korea for 5 people. The AI found halal restaurants in Seoul I had never seen on any blog. Safety scores for each neighbourhood gave us real peace of mind.',
    destination: 'Seoul, South Korea',
  },
  {
    name: 'Vikram Nair',
    role: 'Photographer, Kerala',
    avatar: 'VN',
    rating: 5,
    text: 'Photography trip to Iceland — golden hour timings, aurora probability forecasts, hidden waterfall locations. Wandr understood what a photography trip actually means. Beyond impressed.',
    destination: 'Iceland',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-32">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-caption text-primary mb-4">What Travelers Say</div>
          <h2 className="text-display text-4xl sm:text-5xl font-bold">
            Real trips. Real people.<br />
            <span className="italic text-primary">Real experiences.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className="glass-card p-7 flex flex-col gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="flex items-center gap-1">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <div className="ml-auto">
                  <div className="tag-pill text-xs">{t.destination}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
