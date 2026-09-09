'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Loader2, LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PincodeLocation } from '@/lib/pincode';
import { usePincodeLookup } from '@/hooks/use-pincode-lookup';

export interface PincodeLookupFieldProps {
  value: string;
  onChange: (pincode: string) => void;
  /** Called after a successful India Post lookup (and when user picks another locality). */
  onResolved: (location: PincodeLocation) => void;
  /** Called when Locate succeeds with device coordinates (for map / lat-lng fields). */
  onCoordinates?: (lat: number, lng: number) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** When true, digits-only and maxLength 6 are enforced. */
  digitsOnly?: boolean;
}

/**
 * Reads the device GPS position via the browser Geolocation API.
 */
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60_000,
    });
  });
}
// End getCurrentPosition

/** Maps GeolocationPositionError codes to a short user-facing message. */
function geolocationErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as GeolocationPositionError).code;
    if (code === 1) return 'Location permission denied. Allow location access and try again.';
    if (code === 2) return 'Unable to determine your location. Try again outdoors or check GPS.';
    if (code === 3) return 'Location request timed out. Please try again.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not get your current location';
}
// End geolocationErrorMessage

/**
 * Pincode input that autofills city, locality/area, and state via India Post API.
 * Includes a Locate button that uses GPS + reverse geocode to fill the pincode.
 * Lookup runs only after the user types or locates (not on edit hydrate).
 */
export function PincodeLookupField({
  value,
  onChange,
  onResolved,
  onCoordinates,
  label = 'Pincode',
  placeholder = '411045',
  className,
  inputClassName,
  digitsOnly = true,
}: PincodeLookupFieldProps) {
  const [pickedLocality, setPickedLocality] = useState('');
  /** True once the user has typed or used Locate during the current mount. */
  const [userEdited, setUserEdited] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  const lookupValue = userEdited ? value : '';

  const { loading, error, location } = usePincodeLookup(lookupValue, {
    onResolved: (loc) => {
      setPickedLocality(loc.locality);
      onResolved(loc);
    },
  });

  /** Handles pincode text changes (optionally digits-only). */
  const handleChange = (raw: string) => {
    const next = digitsOnly ? raw.replace(/\D/g, '').slice(0, 6) : raw;
    if (!userEdited) setUserEdited(true);
    setLocateError('');
    onChange(next);
    if (next.length < 6) setPickedLocality('');
  };
  // End handleChange

  /** Applies a different post-office name as locality while keeping city/state. */
  const handleLocalityPick = (name: string) => {
    if (!location) return;
    setPickedLocality(name);
    onResolved({ ...location, locality: name, area: name });
  };
  // End handleLocalityPick

  /**
   * Uses device GPS, reverse-geocodes to an Indian pincode, then triggers India Post autofill.
   */
  const handleLocate = async () => {
    setLocating(true);
    setLocateError('');
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      onCoordinates?.(lat, lng);

      const res = await fetch(
        `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Could not resolve pincode from location');
      }

      const pin = (data as { location?: { pincode?: string } }).location?.pincode || '';
      if (!pin) throw new Error('No pincode found for your current location');

      setUserEdited(true);
      onChange(pin);
    } catch (err) {
      setLocateError(geolocationErrorMessage(err));
    } finally {
      setLocating(false);
    }
  };
  // End handleLocate

  const showLocalityPicker = !!location && location.localities.length > 1;
  const busy = loading || locating;
  const displayError = locateError || error;

  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            className={cn(inputClassName, busy && 'pr-9')}
            placeholder={placeholder}
          />
          {busy && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
          )}
        </div>
        <button
          type="button"
          onClick={() => { void handleLocate(); }}
          disabled={busy}
          title="Use my current location"
          className={cn(
            'inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-medium',
            'bg-muted border border-border text-foreground/90 hover:border-cyan-500/40 hover:text-cyan-400',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0'
          )}
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LocateFixed className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Locate</span>
        </button>
      </div>
      {displayError && <p className="text-[10px] text-rose-400 mt-1">{displayError}</p>}
      {!displayError && location && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {location.city}, {location.state}
          {pickedLocality ? ` · ${pickedLocality}` : ''}
        </p>
      )}
      {showLocalityPicker && (
        <div className="mt-2">
          <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Area / Locality (from India Post)
          </Label>
          <select
            value={pickedLocality || location.locality}
            onChange={(e) => handleLocalityPick(e.target.value)}
            className={cn(inputClassName, 'cursor-pointer')}
          >
            {location.localities.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
// End PincodeLookupField
