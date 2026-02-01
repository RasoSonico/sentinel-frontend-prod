import React, { createContext, useContext } from "react";
import { useAdvanceSyncWorker } from "src/hooks/avance/useAdvanceSyncWorker";
import { useSyncQueueToRedux } from "src/hooks/avance/useSyncQueueToRedux";

interface SyncWorkerContextValue {
  isSyncing: boolean;
  currentItemId: string | null;
  syncNow: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
}

const SyncWorkerContext = createContext<SyncWorkerContextValue | undefined>(
  undefined
);

export function SyncWorkerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const syncWorker = useAdvanceSyncWorker();

  // Bridge Realm queue counts to Redux state
  useSyncQueueToRedux();

  return (
    <SyncWorkerContext.Provider value={syncWorker}>
      {children}
    </SyncWorkerContext.Provider>
  );
}

export function useSyncWorker(): SyncWorkerContextValue {
  const context = useContext(SyncWorkerContext);
  if (!context) {
    throw new Error("useSyncWorker must be used within a SyncWorkerProvider");
  }
  return context;
}
