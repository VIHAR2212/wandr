import type { Metadata } from 'next';
import { DashboardView } from '@/components/features/dashboard/DashboardView';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = { title: 'My Trips – Wandr Dashboard' };

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <div className="pt-24 pb-16 px-4 md:px-8">
        {/* Only your active/saved user trips show up here now */}
        <DashboardView />
      </div>
    </main>
  );
}
