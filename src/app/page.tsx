// src/app/page.tsx
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeaturesSection } from '@/components/features/landing/FeaturesSection';
import { HowItWorks } from '@/components/features/landing/HowItWorks';
import { PricingSection } from '@/components/features/landing/PricingSection';
import { TestimonialsSection } from '@/components/features/landing/TestimonialsSection';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <TestimonialsSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
