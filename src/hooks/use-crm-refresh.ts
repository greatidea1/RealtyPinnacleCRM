'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';

type FetchFn = () => void | Promise<void>;

/** Runs `fetchFn` on mount, when `dataVersion` bumps (after mutations),
 * and when CRM forms/delete dialogs close — so lists update without a full page refresh.
 */
export function useCrmRefresh(fetchFn: FetchFn, extraDeps: unknown[] = []) {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const showPropertyForm = useAppStore((s) => s.showPropertyForm);
  const showClientForm = useAppStore((s) => s.showClientForm);
  const showDealForm = useAppStore((s) => s.showDealForm);
  const showTaskForm = useAppStore((s) => s.showTaskForm);
  const showDeleteDialog = useAppStore((s) => s.showDeleteDialog);

  const formOpen =
    showPropertyForm || showClientForm || showDealForm || showTaskForm || showDeleteDialog;
  const wasFormOpen = useRef(formOpen);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const depsKey = JSON.stringify(extraDeps);

  const run = useCallback(() => {
    void fetchRef.current();
  }, []);

  useEffect(() => {
    run();
  }, [run, dataVersion, depsKey]);

  useEffect(() => {
    if (wasFormOpen.current && !formOpen) {
      // Form just closed — always refetch so saves are visible without a page reload.
      run();
    }
    wasFormOpen.current = formOpen;
  }, [formOpen, run]);
}
// End useCrmRefresh

/**
 * Tracks initial load vs background refresh so lists stay visible while syncing.
 */
export function useLoadingGate() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialDone = useRef(false);

  /** Marks the start of a fetch; full-page loading only on the first load. */
  const begin = useCallback(() => {
    if (initialDone.current) setRefreshing(true);
    else setLoading(true);
  }, []);
  // End begin

  /** Marks the end of a fetch. */
  const end = useCallback(() => {
    initialDone.current = true;
    setLoading(false);
    setRefreshing(false);
  }, []);
  // End end

  return { loading, refreshing, begin, end };
}
// End useLoadingGate
