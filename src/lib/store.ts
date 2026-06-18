import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TripFormData } from '@/types';

interface TripStore {
  currentTripId: string | null;
  currentForm: Partial<TripFormData> | null;
  isTracking: boolean;
  userLocation: { lat: number; lng: number } | null;
  setCurrentTripId: (id: string) => void;
  setForm: (form: Partial<TripFormData>) => void;
  setTracking: (v: boolean) => void;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set) => ({
      currentTripId: null,
      currentForm: null,
      isTracking: false,
      userLocation: null,
      setCurrentTripId: (id) => set({ currentTripId: id }),
      setForm: (form) => set({ currentForm: form }),
      setTracking: (v) => set({ isTracking: v }),
      setUserLocation: (loc) => set({ userLocation: loc }),
      reset: () => set({ currentTripId: null, currentForm: null, isTracking: false }),
    }),
    {
      name: 'wandr-trip-store',
      partialize: (s) => ({ currentTripId: s.currentTripId, currentForm: s.currentForm }),
    }
  )
);
