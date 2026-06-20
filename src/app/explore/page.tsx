import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import ExplorationDashboard from '@/components/features/ExplorationDashboard';

export const metadata: Metadata = { title: 'Explore Destinations – Wandr' };

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <div className="pt-24 pb-16">
        <ExplorationDashboard />
      </div>
    </main>
  );
}

