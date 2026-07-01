'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { Moon, Sun, Compass, Menu, X, Sparkles, ArrowLeft, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/plan', label: 'Plan a Trip' },
  { href: '/dashboard', label: 'My Trips' },
  { href: '/explore', label: 'Explore' },
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
];

const HIDE_NAV_LINKS = ['/plan', '/trip', '/auth', '/dashboard', '/admin'];
const SHOW_BACK = ['/plan', '/trip', '/auth/login', '/auth/register', '/dashboard', '/admin'];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoggedIn = !!session?.user;
  const showBack = SHOW_BACK.some((p) => pathname.startsWith(p));
  const hideLinks = HIDE_NAV_LINKS.some((p) => pathname.startsWith(p));

  // Guard: return a neutral skeleton while NextAuth session is loading
  // This prevents React #310 ("Cannot update a component while rendering a different component")
  if (sessionStatus === 'loading') {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 py-5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between rounded-2xl px-6 py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-muted animate-pulse" />
              <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut({ redirect: false });
    router.push('/auth/login');
  }

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-500', scrolled ? 'py-3' : 'py-5')}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={cn(
          'flex items-center justify-between rounded-2xl px-6 transition-all duration-500',
          scrolled ? 'glass-card py-3 shadow-glass' : 'py-2'
        )}>
          {/* Left: Back button OR Logo */}
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 border border-border"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Compass className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="text-display text-xl font-bold text-foreground">Wandr</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          {!hideLinks && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* Logged in: Show Sign Out */}
            {isLoggedIn ? (
              <button
                onClick={handleSignOut}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              /* Logged out: Show Sign In + Plan a Trip */
              !hideLinks && (
                <>
                  <Link
                    href="/auth/login"
                    className="hidden md:block px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link href="/plan" className="hidden md:flex btn-premium items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Plan a Trip
                  </Link>
                </>
              )
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors md:hidden"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="mt-2 glass-card p-4 md:hidden"
            >
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-2 pt-2 border-t border-border flex flex-col gap-2">
                  {isLoggedIn ? (
                    <button
                      onClick={handleSignOut}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  ) : (
                    <>
                      <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-center text-muted-foreground hover:bg-muted/60 transition-colors">
                        Sign in
                      </Link>
                      <Link href="/plan" onClick={() => setMenuOpen(false)} className="btn-premium justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                        Plan a Trip
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
