'use client';
import { useEffect, useState } from 'react';
import { Users, Globe, TrendingUp, Wallet, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  totalTrips: number;
  activeTrips: number;
  totalRevenue: number;
  tripsThisMonth: number;
  usersThisMonth: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), change: `+${stats.usersThisMonth} this month`, icon: Users, color: 'text-primary' },
    { label: 'Total Trips', value: stats.totalTrips.toLocaleString(), change: `+${stats.tripsThisMonth} this month`, icon: Globe, color: 'text-ocean-500' },
    { label: 'Active Trips', value: stats.activeTrips.toLocaleString(), change: 'Right now', icon: TrendingUp, color: 'text-forest-500' },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), change: 'All time', icon: Wallet, color: 'text-earth-500' },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center gap-3 mb-10">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h1 className="text-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {cards.map(({ label, value, change, icon: Icon, color }) => (
            <div key={label} className="glass-card p-6">
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
              <div className="text-sm text-foreground mb-1">{label}</div>
              <div className="text-xs text-muted-foreground">{change}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">Connect to your database to see real user and trip data here.</p>
      </div>
    </div>
  );
}
