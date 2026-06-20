'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Compass, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { 
      toast.error('Password must be at least 6 characters'); 
      return; 
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.toLowerCase().trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { 
        toast.error(data.error || 'Registration failed'); 
        return; 
      }
      toast.success('Account created! Signing you in…');
      await signIn('credentials', { 
        email: form.email.toLowerCase().trim(), 
        password: form.password, 
        redirect: false 
      });
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <span className="text-display text-2xl font-bold">Wandr</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">Start your journey</h1>
        <p className="text-muted-foreground text-sm mb-8">Create a free account. No credit card needed.</p>

        {/* Google button REMOVED — no billing required */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="Priya Sharma" 
              required 
              className="glass-input" 
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <input 
              type="email" 
              value={form.email} 
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
              placeholder="you@example.com" 
              required 
              className="glass-input" 
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input 
                type={showPw ? 'text' : 'password'} 
                value={form.password} 
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                placeholder="Min. 6 characters" 
                required 
                className="glass-input pr-10" 
              />
              <button 
                type="button" 
                onClick={() => setShowPw(!showPw)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className={cn('btn-premium w-full py-3 justify-center', loading && 'opacity-70 cursor-not-allowed')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Free Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-4">
          By creating an account, you agree to our{' '}
          <Link href="#" className="hover:underline">Terms</Link> and{' '}
          <Link href="#" className="hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
