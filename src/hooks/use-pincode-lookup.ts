'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PincodeLocation } from '@/lib/pincode';
import { isValidPincode } from '@/lib/pincode';

export interface UsePincodeLookupOptions {
  /** Debounce delay in ms before calling the API (default 400). */
  debounceMs?: number;
  /** Called when a successful lookup returns. */
  onResolved?: (location: PincodeLocation) => void;
}

export interface UsePincodeLookupResult {
  loading: boolean;
  error: string;
  location: PincodeLocation | null;
  /** Manually trigger lookup for the current pincode value. */
  lookup: (pincode: string) => Promise<PincodeLocation | null>;
  clear: () => void;
}

/**
 * Debounced pincode lookup via /api/pincode (offline dataset + API fallbacks).
 * Fires automatically when `pincode` becomes a valid 6-digit value.
 */
export function usePincodeLookup(
  pincode: string,
  options: UsePincodeLookupOptions = {}
): UsePincodeLookupResult {
  const { debounceMs = 400, onResolved } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<PincodeLocation | null>(null);
  const lastFetched = useRef('');
  const locationRef = useRef<PincodeLocation | null>(null);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  /** Fetches location for a pincode; skips if same pin already loaded. */
  const lookup = useCallback(async (raw: string): Promise<PincodeLocation | null> => {
    const pin = raw.trim();
    if (!isValidPincode(pin)) {
      setError(pin.length > 0 && pin.length !== 6 ? 'Pincode must be 6 digits' : '');
      setLocation(null);
      locationRef.current = null;
      return null;
    }
    if (pin === lastFetched.current && locationRef.current) {
      return locationRef.current;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pincode?pincode=${encodeURIComponent(pin)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error || 'Pincode lookup failed';
        setError(msg);
        setLocation(null);
        locationRef.current = null;
        return null;
      }
      const loc = (data as { location: PincodeLocation }).location;
      lastFetched.current = pin;
      locationRef.current = loc;
      setLocation(loc);
      onResolvedRef.current?.(loc);
      return loc;
    } catch {
      setError('Pincode lookup failed');
      setLocation(null);
      locationRef.current = null;
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  // End lookup

  /** Clears cached lookup state. */
  const clear = useCallback(() => {
    lastFetched.current = '';
    locationRef.current = null;
    setLocation(null);
    setError('');
    setLoading(false);
  }, []);
  // End clear

  useEffect(() => {
    const pin = pincode.trim();
    if (!isValidPincode(pin)) {
      if (pin.length === 0) {
        clear();
      } else if (pin.length < 6) {
        setError('');
        setLocation(null);
        locationRef.current = null;
        lastFetched.current = '';
      }
      return;
    }
    if (pin === lastFetched.current) return;

    const timer = window.setTimeout(() => {
      void lookup(pin);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [pincode, debounceMs, lookup, clear]);

  return { loading, error, location, lookup, clear };
}
// End usePincodeLookup
