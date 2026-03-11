import React, { createContext, useContext, useCallback } from "react";
import { useAdvanceSyncWorker } from "src/hooks/avance/useAdvanceSyncWorker";
import { usePhotoSyncWorker } from "src/hooks/avance/usePhotoSyncWorker";
import { useSyncQueueToRedux } from "src/hooks/avance/useSyncQueueToRedux";

interface SyncWorkerContextValue {
  // Advance sync
  isSyncing: boolean;
  currentItemId: string | null;
  syncNow: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  // Photo sync
  isPhotoSyncing: boolean;
  currentPhotoId: string | null;
  retryPhoto: (photoId: string) => Promise<void>;
}

const SyncWorkerContext = createContext<SyncWorkerContextValue | undefined>(
  undefined
);

export function SyncWorkerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const advanceSyncWorker = useAdvanceSyncWorker();
  const photoSyncWorker = usePhotoSyncWorker();

  // Bridge Realm queue counts to Redux state
  useSyncQueueToRedux();

  // Combined sync function that triggers both workers
  const syncNow = useCallback(async () => {
    await advanceSyncWorker.syncNow();
    // Photo sync will be triggered automatically when advances complete
    // But we can also trigger it manually
    await photoSyncWorker.syncNow();
  }, [advanceSyncWorker, photoSyncWorker]);

  const contextValue: SyncWorkerContextValue = {
    // Advance sync
    isSyncing: advanceSyncWorker.isSyncing || photoSyncWorker.isSyncing,
    currentItemId: advanceSyncWorker.currentItemId,
    syncNow,
    retryItem: advanceSyncWorker.retryItem,
    // Photo sync
    isPhotoSyncing: photoSyncWorker.isSyncing,
    currentPhotoId: photoSyncWorker.currentPhotoId,
    retryPhoto: photoSyncWorker.retryPhoto,
  };

  return (
    <SyncWorkerContext.Provider value={contextValue}>
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
