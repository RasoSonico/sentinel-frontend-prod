import React, { createContext, useContext, useCallback } from "react";
import { useAdvanceSyncWorker } from "src/hooks/avance/useAdvanceSyncWorker";
import { usePhotoSyncWorker } from "src/hooks/avance/usePhotoSyncWorker";
import { useSyncQueueToRedux } from "src/hooks/avance/useSyncQueueToRedux";
import { useReporteSyncWorker } from "src/hooks/reportes/useReporteSyncWorker";
import { useMaquinariaSyncWorker } from "src/hooks/maquinaria/useMaquinariaSyncWorker";

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
  // El worker del reporte vive aquí por la misma razón que los otros dos: la
  // cola tiene que drenarse aunque el usuario nunca abra la tab de Reportes.
  // Un reporte capturado sin señal debe salir solo en cuanto haya red, esté
  // donde esté el usuario.
  const reporteSyncWorker = useReporteSyncWorker();
  // Y el de maquinaria por lo mismo: un alta o una jornada capturadas en el
  // frente deben salir solas en cuanto haya red, aunque el usuario ya se haya
  // ido a otra tab. Este drena las DOS colas, y en orden: el alta antes que su
  // jornada, porque de ella sale la estancia a la que la jornada se cuelga.
  const jornadaSyncWorker = useMaquinariaSyncWorker();

  // Bridge Realm queue counts to Redux state
  useSyncQueueToRedux();

  // Combined sync function that triggers both workers
  const syncNow = useCallback(async () => {
    await advanceSyncWorker.syncNow();
    // Photo sync will be triggered automatically when advances complete
    // But we can also trigger it manually
    await photoSyncWorker.syncNow();
    await reporteSyncWorker.syncNow();
    await jornadaSyncWorker.syncNow();
  }, [
    advanceSyncWorker,
    photoSyncWorker,
    reporteSyncWorker,
    jornadaSyncWorker,
  ]);

  const contextValue: SyncWorkerContextValue = {
    // Advance sync
    isSyncing:
      advanceSyncWorker.isSyncing ||
      photoSyncWorker.isSyncing ||
      reporteSyncWorker.isSyncing ||
      jornadaSyncWorker.isSyncing,
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
