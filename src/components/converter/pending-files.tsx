"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type PendingFilesContextValue = {
  queueFiles: (files: File[]) => void;
  takeFiles: () => File[];
};

const PendingFilesContext = createContext<PendingFilesContextValue | null>(null);

/**
 * One-navigation, memory-only file handoff.
 *
 * The marketing page can open the native file picker and route into the no-index
 * converter without asking for the same files twice. File objects live only in this
 * ref, are consumed once by /app, and are never serialized, persisted, or placed in
 * a URL.
 */
export function PendingFilesProvider({ children }: { children: ReactNode }) {
  const pendingRef = useRef<File[]>([]);

  const queueFiles = useCallback((files: File[]) => {
    pendingRef.current = [...files];
  }, []);

  const takeFiles = useCallback(() => {
    const files = pendingRef.current;
    pendingRef.current = [];
    return files;
  }, []);

  const value = useMemo(() => ({ queueFiles, takeFiles }), [queueFiles, takeFiles]);

  return <PendingFilesContext.Provider value={value}>{children}</PendingFilesContext.Provider>;
}

export function usePendingFiles(): PendingFilesContextValue {
  const context = useContext(PendingFilesContext);
  if (!context) {
    throw new Error("usePendingFiles must be used inside PendingFilesProvider");
  }
  return context;
}
