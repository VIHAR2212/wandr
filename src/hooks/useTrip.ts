'use client';
import { useState, useEffect, useCallback } from 'react';

interface TripSummary {
  id: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  status: string;
  purpose: string;
  createdAt: string;
}

interface UseTripsReturn {
  trips: TripSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrips(status?: string): UseTripsReturn {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = status ? `?status=${status}` : '';
      const res = await fetch(`/api/trips${params}`);
      if (!res.ok) throw new Error('Failed to fetch trips');
      const data = await res.json();
      setTrips(data.trips ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  return { trips, loading, error, refetch: fetchTrips };
}

export function useDeleteTrip() {
  const [loading, setLoading] = useState(false);

  const deleteTrip = async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteTrip, loading };
}
