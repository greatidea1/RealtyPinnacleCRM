'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { City, Locality } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface LocationComboboxProps {
  mode: 'city' | 'locality';
  valueId?: string;
  valueName?: string;
  cityId?: string;
  cityName?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  onSelect: (selection: { id: string; name: string; cityId?: string; cityName?: string } | null) => void;
  onCreated?: (selection: { id: string; name: string; cityId?: string; cityName?: string }) => void;
}

/** Searchable city/locality combobox with inline "Add New" against Location Master. */
export function LocationCombobox({
  mode,
  valueId,
  valueName,
  cityId,
  cityName,
  placeholder,
  disabled,
  allowClear = true,
  className,
  onSelect,
  onCreated,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);

  const localityDisabled = mode === 'locality' && !cityId;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (mode === 'city') {
          const res = await fetch('/api/locations?action=cities');
          const data = await res.json();
          if (!cancelled) setCities(data.cities || []);
        } else if (cityId) {
          const res = await fetch(`/api/locations?action=localities&cityId=${encodeURIComponent(cityId)}`);
          const data = await res.json();
          if (!cancelled) setLocalities(data.localities || []);
        }
      } catch {
        if (!cancelled) {
          setCities([]);
          setLocalities([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, mode, cityId]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (mode === 'city') {
      return [...cities]
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter((c) => !q || c.name.toLowerCase().includes(q));
    }
    return [...localities]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((l) => !q || l.name.toLowerCase().includes(q));
  }, [mode, cities, localities, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return options.some((o) => o.name.toLowerCase() === q);
  }, [options, query]);

  const displayLabel = valueName || placeholder || (mode === 'city' ? 'Select city' : 'Select locality');

  /** Creates a new city or locality from the search query and selects it. */
  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    if (mode === 'locality' && !cityId) return;

    setCreating(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'city'
            ? { action: 'create-city', name }
            : { action: 'create-locality', name, cityId, cityName }
        ),
      });
      const data = await res.json();
      if (!res.ok) return;

      if (mode === 'city' && data.city) {
        const selection = { id: data.city.id, name: data.city.name };
        setCities((prev) => {
          if (prev.some((c) => c.id === selection.id)) return prev;
          return [...prev, data.city].sort((a, b) => a.name.localeCompare(b.name));
        });
        onSelect(selection);
        onCreated?.(selection);
      } else if (data.locality) {
        const selection = {
          id: data.locality.id,
          name: data.locality.name,
          cityId: data.locality.cityId,
          cityName: data.locality.city?.name,
        };
        setLocalities((prev) => {
          if (prev.some((l) => l.id === selection.id)) return prev;
          return [...prev, data.locality].sort((a, b) => a.name.localeCompare(b.name));
        });
        onSelect(selection);
        onCreated?.(selection);
      }
      setOpen(false);
      setQuery('');
    } finally {
      setCreating(false);
    }
  };
  // End handleCreate

  return (
    <Popover open={open} onOpenChange={(next) => { if (!disabled && !localityDisabled) setOpen(next); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || localityDisabled}
          className={cn(
            'h-10 w-full justify-between rounded-xl bg-muted border-border text-foreground font-normal hover:bg-muted',
            !valueName && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {localityDisabled ? 'Select a city first' : displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={mode === 'city' ? 'Search cities...' : 'Search localities...'}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {query.trim()
                    ? `No ${mode === 'city' ? 'city' : 'locality'} found.`
                    : `No ${mode === 'city' ? 'cities' : 'localities'} yet.`}
                </CommandEmpty>
                <CommandGroup>
                  {allowClear && valueId && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onSelect(null);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="text-muted-foreground"
                    >
                      Clear selection
                    </CommandItem>
                  )}
                  {options.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        onSelect({
                          id: item.id,
                          name: item.name,
                          cityId: mode === 'locality' ? (item as Locality).cityId : undefined,
                          cityName: mode === 'locality' ? (item as Locality).city?.name : undefined,
                        });
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', valueId === item.id ? 'opacity-100' : 'opacity-0')} />
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {query.trim() && !exactMatch && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        value={`__add__${query}`}
                        onSelect={handleCreate}
                        disabled={creating}
                      >
                        {creating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4 text-cyan-400" />
                        )}
                        Add New {mode === 'city' ? 'City' : 'Locality'}: &ldquo;{query.trim()}&rdquo;
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
// End LocationCombobox
