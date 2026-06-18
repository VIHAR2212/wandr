// src/app/auth/login/page.tsx
import type { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign In — Wandr' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-earth-50 via-background to-ocean-50/40 dark:hidden" />
        <div
          className="absolute inset-0 hidden dark:block bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 hidden dark:block bg-background/75" />
      </div>
      <LoginForm />
    </main>
  );
}
