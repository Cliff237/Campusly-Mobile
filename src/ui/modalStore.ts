import { useEffect, useSyncExternalStore } from 'react';

/**
 * Global "is a modal on screen?" counter.
 *
 * Tab layouts subscribe to it and hide the bottom navigation while any modal,
 * bottom sheet or full-screen dialog is open, so the nav never peeks out from
 * behind a transparent modal or under a sheet's dimmed backdrop.
 *
 * UI-only: it never blocks navigation or changes modal behaviour — it only
 * tracks how many modals are currently mounted-and-visible.
 */
let openCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => openCount > 0;
const serverSnapshot = () => false;

function retain() {
  openCount += 1;
  emit();
}

function release() {
  openCount = Math.max(0, openCount - 1);
  emit();
}

/** True while at least one modal registered through `useModalPresence` is visible. */
export function useModalsOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/**
 * Keeps `useModalsOpen()` true while `visible` is true.
 * Call inside every component that renders a `<Modal>` / `<Sheet>`.
 */
export function useModalPresence(visible: boolean) {
  useEffect(() => {
    if (!visible) return;
    retain();
    return () => release();
  }, [visible]);
}
