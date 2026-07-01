'use client';
import { useSession } from 'next-auth/react';

/**
 * Single-point session guard.
 * Wraps the entire app so that useSession() is resolved BEFORE any
 * child component (Navbar, TestimonialsSection, DashboardView, etc.)
 * calls useSession().  This prevents React #310 across ALL pages.
 */
export function SessionWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
