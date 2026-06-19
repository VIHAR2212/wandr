// src/app/trip/[id]/page.tsx
import type { Metadata } from 'next';
import { TripResultView } from '@/components/features/itinerary/TripResultView';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = { title: 'Your Trip — Wandr' };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-20">
        <TripResultView tripId={id} />
      </div>
    </main>
  );
}
