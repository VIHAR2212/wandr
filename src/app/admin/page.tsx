// src/app/admin/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AdminDashboard } from '@/components/features/dashboard/AdminDashboard';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = { title: 'Admin — Wandr' };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16">
        <AdminDashboard />
      </div>
    </main>
  );
}
