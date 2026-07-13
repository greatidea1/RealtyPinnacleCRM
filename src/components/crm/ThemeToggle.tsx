'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Toggles between light and dark themes from the navbar. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'relative w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors',
        className
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="w-4.5 h-4.5 text-muted-foreground" />
        ) : (
          <Moon className="w-4.5 h-4.5 text-muted-foreground" />
        )
      ) : (
        <span className="w-4.5 h-4.5" />
      )}
    </button>
  );
} // end ThemeToggle
