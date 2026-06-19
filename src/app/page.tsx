// src/app/dashboard/page.tsx
import type { Metadata } from 'next';
import { DashboardView } from '@/components/features/dashboard/DashboardView';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = { title: 'My Trips — Wandr Dashboard' };

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16">
        <DashboardView />
      </div>
    </main>
  );
}
