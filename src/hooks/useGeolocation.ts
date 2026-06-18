'use client';
import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(watch = false): GeolocationState & { refresh: () => void } {
  const [state, setState] = useState<GeolocationState>({
    lat: null, lng: null, accuracy: null, error: null, loading: false,
  });

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setState({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      error: null,
      loading: false,
    });
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    setState(prev => ({ ...prev, error: err.message, loading: false }));
  }, []);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', loading: false }));
      return;
    }
    setState(prev => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true, timeout: 10000,
    });
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (!watch) { refresh(); return; }

    setState(prev => ({ ...prev, loading: true }));
    const id = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true, maximumAge: 30000,
    });
    return () => navigator.geolocation.clearWatch(id);
  }, [watch, refresh, onSuccess, onError]);

  return { ...state, refresh };
}
