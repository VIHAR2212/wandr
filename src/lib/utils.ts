import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', JPY: '¥', SGD: 'S$',
  };
  const sym = symbols[currency] ?? currency + ' ';
  if (amount >= 100000) return `${sym}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`;
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getDaysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.round((e - s) / 86400000));
}

export function activityTypeColor(type: string): string {
  const map: Record<string, string> = {
    TRANSPORT: 'bg-ocean-500/10 text-ocean-600 dark:text-ocean-400',
    ACCOMMODATION: 'bg-earth-500/10 text-earth-600 dark:text-earth-400',
    SIGHTSEEING: 'bg-primary/10 text-primary',
    RESTAURANT: 'bg-sunset-500/10 text-sunset-600 dark:text-sunset-400',
    ADVENTURE: 'bg-forest-500/10 text-forest-600 dark:text-forest-400',
    SHOPPING: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    REST: 'bg-muted text-muted-foreground',
    CEREMONY: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    MEETING: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };
  return map[type] ?? 'bg-muted text-muted-foreground';
}

export function activityTypeIcon(type: string): string {
  const map: Record<string, string> = {
    TRANSPORT: '🚌', ACCOMMODATION: '🏨', SIGHTSEEING: '📸',
    RESTAURANT: '🍽️', ADVENTURE: '🧗', SHOPPING: '🛍️',
    REST: '😴', CEREMONY: '🛕', MEETING: '💼',
  };
  return map[type] ?? '📍';
}

export function safetyScoreColor(score: number): string {
  if (score >= 8) return 'text-forest-500';
  if (score >= 6) return 'text-yellow-500';
  return 'text-red-500';
}

export function safetyScoreLabel(score: number): string {
  if (score >= 8) return 'Very Safe';
  if (score >= 6) return 'Generally Safe';
  if (score >= 4) return 'Exercise Caution';
  return 'High Risk — Take Precautions';
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
