// src/app/plan/page.tsx
import type { Metadata } from 'next';
import { TripPlannerWizard } from '@/components/features/planner/TripPlannerWizard';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Plan Your Trip',
  description: 'Tell Wandr where you want to go. AI builds the perfect trip within your budget.',
};

export default function PlanPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-display text-4xl sm:text-5xl font-bold mb-4">
              Where to next?
            </h1>
            <p className="text-muted-foreground text-lg">
              Tell us your dream trip. AI handles the rest — within your exact budget.
            </p>
          </div>
          <TripPlannerWizard />
        </div>
      </div>
    </main>
  );
}
