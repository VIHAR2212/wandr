// src/app/auth/register/page.tsx
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/features/auth/RegisterForm';

export const metadata: Metadata = { title: 'Create Account — Wandr' };

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-earth-50 via-background to-ocean-50/40 dark:hidden" />
        <div
          className="absolute inset-0 hidden dark:block bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 hidden dark:block bg-background/75" />
      </div>
      <RegisterForm />
    </main>
  );
}
