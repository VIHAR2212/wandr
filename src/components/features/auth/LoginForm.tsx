'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Compass, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn('credentials', { 
        email: email.toLowerCase().trim(), 
        password, 
        redirect: false 
      });
      if (res?.error) {
        // Specific error messages
        const msg = res.error.toLowerCase();
        if (msg.includes('incorrect password') || msg.includes('invalid')) {
          toast.error('Wrong password. Please try again.');
        } else if (msg.includes('no account') || msg.includes('not found')) {
          toast.error('No account found with this email.');
        } else if (msg.includes('required')) {
          toast.error('Please fill in all fields.');
        } else {
          toast.error(res.error || 'Invalid email or password');
        }
      } else {
        toast.success('Welcome back!');
        window.location.href = '/dashboard';
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setDemoLoading(true);
    try {
      const res = await signIn('credentials', {
        email: 'demo@wandr.com',
        password: 'demo1234',
        redirect: false,
      });
      if (res?.error) {
        toast.error(res.error || 'Demo login failed');
      } else {
        toast.success('Welcome to Demo!');
        window.location.href = '/dashboard';
      }
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <span className="text-display text-2xl font-bold">Wandr</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
        <p className="text-muted-foreground text-sm mb-6">Sign in to continue planning your next adventure.</p>

        {/* Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          disabled={demoLoading}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-sm font-medium text-primary transition-colors mb-6',
            demoLoading && 'opacity-70 cursor-not-allowed'
          )}
        >
          {demoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          Try Demo Account
        </button>

        <div className="divider-label mb-6"><span>or sign in with email</span></div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="glass-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn('btn-premium w-full py-3 justify-center', loading && 'opacity-70 cursor-not-allowed')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
