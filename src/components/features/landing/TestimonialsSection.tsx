'use client';
// src/components/features/landing/TestimonialsSection.tsx.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Star, X, Loader2, MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisplayTestimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  text: string;
  destination: string;
}

const seedTestimonials: DisplayTestimonial[] = [
  {
    id: 'seed-1',
    name: 'Priya Sharma',
    role: 'Travel Blogger, Delhi',
    avatar: 'PS',
    rating: 5,
    text: 'Wandr planned a 10-day Rajasthan trip for Rs 45,000 for two people. Every hotel, every meal, every hidden temple — all within budget. I have been travel blogging for 8 years and this is the most accurate AI planner I have used.',
    destination: 'Rajasthan, India',
  },
  {
    id: 'seed-2',
    name: 'Arjun Mehta',
    role: 'Software Engineer, Bangalore',
    avatar: 'AM',
    rating: 5,
    text: 'Solo trip to Leh-Ladakh. Wandr found routes and homestays I never would have discovered. The real-time weather alerts literally saved me from a road closure. Absolute game changer.',
    destination: 'Leh-Ladakh, India',
  },
  {
    id: 'seed-3',
    name: 'Sarah Chen',
    role: 'Food Photographer, Mumbai',
    avatar: 'SC',
    rating: 5,
    text: 'Vegan traveler in Japan — usually a nightmare to plan. Wandr found authentic vegan ramen shops, plant-based sushi, and temple shojin ryori stays. Zero compromise on my diet or experience.',
    destination: 'Tokyo, Japan',
  },
  {
    id: 'seed-4',
    name: 'Ravi and Meera',
    role: 'Couple, Hyderabad',
    avatar: 'RM',
    rating: 5,
    text: 'Honeymoon to Santorini. We said Rs 2.5L for two. Wandr fit flights, a cave hotel, sunset cruises, and private dining in that budget. We thought it was impossible. It was not.',
    destination: 'Santorini, Greece',
  },
  {
    id: 'seed-5',
    name: 'Dr. Fatima Al-Hassan',
    role: 'Pediatrician, UAE',
    avatar: 'FA',
    rating: 5,
    text: 'Halal-friendly family trip to Korea for 5 people. The AI found halal restaurants in Seoul I had never seen on any blog. Safety scores for each neighbourhood gave us real peace of mind.',
    destination: 'Seoul, South Korea',
  },
  {
    id: 'seed-6',
    name: 'Vikram Nair',
    role: 'Photographer, Kerala',
    avatar: 'VN',
    rating: 5,
    text: 'Photography trip to Iceland — golden hour timings, aurora probability forecasts, hidden waterfall locations. Wandr understood what a photography trip actually means. Beyond impressed.',
    destination: 'Iceland',
  },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface RawFeedback {
  id: string;
  name: string;
  role: string | null;
  destination: string | null;
  rating: number;
  message: string;
}

function mapFeedback(f: RawFeedback): DisplayTestimonial {
  return {
    id: f.id,
    name: f.name,
    role: f.role || 'Wandr Traveler',
    avatar: getInitials(f.name),
    rating: f.rating,
    text: f.message,
    destination: f.destination || '',
  };
}

export function TestimonialsSection() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [liveFeedback, setLiveFeedback] = useState<DisplayTestimonial[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [destination, setDestination] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/feedback')
      .then(res => (res.ok ? res.json() : { feedbacks: [] }))
      .then(data => setLiveFeedback((data.feedbacks ?? []).map(mapFeedback)))
      .catch(() => setLiveFeedback([]));
  }, []);

  function openModal() {
    if (!session?.user) {
      toast.error('Sign in to share your experience');
      router.push('/auth/login');
      return;
    }
    setShowModal(true);
  }

  function resetForm() {
    setRating(5);
    setHoverRating(0);
    setDestination('');
    setRole('');
    setMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error('Tell us a bit more — at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, destination, role, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit feedback');
        return;
      }
      setLiveFeedback(prev => [mapFeedback(data.feedback), ...prev]);
      toast.success('Thanks for sharing your experience!');
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const combined = [...liveFeedback, ...seedTestimonials].slice(0, 9);

  // Guard: don't render session-dependent UI while NextAuth is loading
  // This prevents React #310 on the homepage
  if (sessionStatus === 'loading') {
    return (
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="h-4 w-40 bg-muted rounded animate-pulse mx-auto mb-4" />
            <div className="h-10 w-80 bg-muted rounded animate-pulse mx-auto mb-6" />
            <div className="h-10 w-52 bg-muted rounded-2xl animate-pulse mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-7 flex flex-col gap-4">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-4/6 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

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
          <h2 className="text-display text-4xl sm:text-5xl font-bold mb-6">
            Real trips. Real people.<br />
            <span className="italic text-primary">Real experiences.</span>
          </h2>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-sm font-medium text-primary transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Share Your Experience
          </button>
        </motion.div>

         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {combined.map((t, i) => (
            <motion.div
              key={t.id}
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
                {t.destination && (
                  <div className="ml-auto">
                    <div className="tag-pill text-xs">{t.destination}</div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="glass-card w-full max-w-md p-6 relative"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-semibold text-foreground mb-1">Share Your Experience</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Your feedback shows up live on this page.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        type="button"
                        key={n}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(n)}
                      >
                        <Star
                          className={cn(
                            'w-6 h-6 transition-colors',
                            n <= (hoverRating || rating)
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Destination <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="e.g. Rajasthan, India"
                    maxLength={80}
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Your role/title <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="e.g. Solo Traveler, Mumbai"
                    maxLength={80}
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Your feedback
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value.slice(0, 500))}
                    placeholder="Tell other travelers about your trip..."
                    required
                    minLength={10}
                    rows={4}
                    className="glass-input resize-none"
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {message.length}/500
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-medium transition-colors',
                    submitting && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Post Feedback
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
