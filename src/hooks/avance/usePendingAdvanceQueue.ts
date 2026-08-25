import { useCallback, useMemo } from "react";
import { useRealm, useQuery } from "@realm/react";
import * as FileSystem from "expo-file-system";
import {
  PendingAdvanceSubmission,
  PendingAdvanceStatus,
} from "src/realm/pendingAdvance/PendingAdvanceSubmission";
import { PendingPhotoSubmission } from "src/realm/pendingAdvance/PendingPhotoSubmission";
import { uuid } from "expo-modules-core";

export interface PendingAdvanceInput {
  // API payload data
  conceptId: number;
  volume: string;
  comments: string;

  // Display context
  catalogId: number;
  catalogName: string;
  workItemId: number;
  workItemName: string;
  conceptDescription: string;
  constructionId: number;
}

export function usePendingAdvanceQueue() {
  const realm = useRealm();

  // Reactive queries for all items
  const allItems = useQuery(PendingAdvanceSubmission);
  const allPhotos = useQuery(PendingPhotoSubmission);

  // Filtered queries
  const pendingItems = useMemo(
    () => allItems.filtered('status == "pending"'),
    [allItems]
  );

  const syncingItems = useMemo(
    () => allItems.filtered('status == "syncing"'),
    [allItems]
  );

  const failedItems = useMemo(
    () => allItems.filtered('status == "failed"'),
    [allItems]
  );

  // Ya sincronizados pero todavía NO reflejados en el cache del servidor (E8).
  // No cuentan como pendientes en ningún indicador de cola —el avance ya
  // llegó— pero siguen aportando su volumen al ejecutado hasta que el snapshot
  // los incluya.
  const doneItems = useMemo(
    () => allItems.filtered('status == "done"'),
    [allItems]
  );

  /**
   * Lo que de verdad sigue pendiente de llegar al servidor.
   *
   * Es lo que deben mostrar y reintentar las pantallas de sincronización.
   * `allItems` incluye además los `done` —que se conservan por la marca de
   * agua— y usarlo para listar mostraría avances ya sincronizados como
   * pendientes, o peor, los reenviaría en un "reintentar todos".
   *
   * `allItems` conserva su significado para lo que sí necesita ver la cola
   * completa, como detectar fotos huérfanas: las fotos de un avance `done`
   * NO son huérfanas.
   */
  const itemsEnCola = useMemo(
    () => allItems.filtered('status != "done"'),
    [allItems]
  );

  // Counts — `done` queda fuera a propósito: la cola pendiente es lo que
  // todavía no llega al servidor, y estos ya llegaron.
  const pendingCount = pendingItems.length;
  const failedCount = failedItems.length;
  const syncingCount = syncingItems.length;
  const totalCount = pendingCount + failedCount + syncingCount;

  /**
   * Volumen en cola por concepto que el snapshot del servidor TODAVÍA no
   * incluye — la marca de agua de E8.
   *
   * `cacheActualizadoEn` es el `updatedAt` de AvanceBaseResponse. La regla:
   *
   *   aporta si nunca sincronizó (syncedAt null), o si sincronizó DESPUÉS de
   *   la última escritura del cache
   *
   * Así el número mostrado es el mismo antes y después del refetch: el
   * refresco se vuelve visualmente invisible, que es el objetivo — no solo
   * evitar el doble conteo.
   */
  const volumenEnColaPorConcepto = useCallback(
    (cacheActualizadoEn: Date | null | undefined): Map<number, number> => {
      const porConcepto = new Map<number, number>();
      for (const item of allItems) {
        const yaReflejado =
          item.syncedAt != null &&
          cacheActualizadoEn != null &&
          item.syncedAt <= cacheActualizadoEn;
        if (yaReflejado) continue;

        const volumen = parseFloat(item.volume) || 0;
        if (volumen === 0) continue;
        porConcepto.set(
          item.conceptId,
          (porConcepto.get(item.conceptId) ?? 0) + volumen
        );
      }
      return porConcepto;
    },
    [allItems]
  );

  /**
   * Borra los `done` que el cache ya alcanzó. Se llama justo después de
   * escribir AvanceBaseResponse: en ese instante el servidor ya los incluye y
   * dejarlos los duplicaría.
   */
  const purgarSincronizados = useCallback(
    (cacheActualizadoEn: Date): number => {
      const alcanzados = allItems.filtered(
        'status == "done" AND syncedAt != null AND syncedAt <= $0',
        cacheActualizadoEn
      );
      const cuantos = alcanzados.length;
      if (cuantos === 0) return 0;
      realm.write(() => {
        realm.delete(alcanzados);
      });
      console.log(`[AdvanceQueue] Purgados ${cuantos} avances ya reflejados`);
      return cuantos;
    },
    [realm, allItems]
  );

  /**
   * Add a new submission to the queue
   */
  const addToQueue = useCallback(
    (data: PendingAdvanceInput): string => {
      const _id = uuid.v4();

      realm.write(() => {
        realm.create(PendingAdvanceSubmission, {
          _id,
          ...data,
          status: "pending" as PendingAdvanceStatus,
          createdAt: new Date(),
          lastAttemptAt: null,
          failedAt: null,
          retryCount: 0,
          maxRetries: 3,
          errorMessage: null,
        });
      });

      return _id;
    },
    [realm]
  );

  /**
   * Remove an item from the queue (does NOT cascade delete photos)
   * Use removeFromQueueWithPhotos for cascade delete
   */
  const removeFromQueue = useCallback(
    (id: string): boolean => {
      const item = realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
      if (!item) return false;

      realm.write(() => {
        realm.delete(item);
      });

      return true;
    },
    [realm]
  );

  /**
   * Atomically complete an advance sync:
   * 1. Update all photos with physicalAdvanceId
   * 2. Transition photos from "pending" to "waiting"
   * 3. Remove advance from queue
   *
   * This ensures crash safety - if the app crashes during sync,
   * either all operations complete or none do.
   */
  const completeAdvanceSyncAtomic = useCallback(
    (advanceLocalId: string, physicalAdvanceId: number): boolean => {
      const advance = realm.objectForPrimaryKey(
        PendingAdvanceSubmission,
        advanceLocalId
      );
      if (!advance) {
        console.warn(
          "[AdvanceQueue] completeAdvanceSyncAtomic: Advance not found:",
          advanceLocalId
        );
        return false;
      }

      // Find all photos for this advance
      const photosToUpdate = allPhotos.filtered(
        "advanceLocalId == $0",
        advanceLocalId
      );

      const photoCount = photosToUpdate.length;

      // Perform ALL operations in a single atomic Realm write
      realm.write(() => {
        // Step 1 & 2: Update photos with physicalAdvanceId and mark as waiting
        photosToUpdate.forEach((photo) => {
          photo.physicalAdvanceId = physicalAdvanceId;
          if (photo.status === "pending") {
            photo.status = "waiting";
          }
        });

        // Step 3: sellar el avance como sincronizado — NO borrarlo (E8).
        //
        // Borrarlo aquí es lo que producía el bajón: el servidor ya lo tiene,
        // pero `avance/base/` todavía trae el cumulative_volume viejo, así que
        // el total mostrado caía y el usuario veía DESAPARECER su captura hasta
        // el siguiente refetch. Conservándolo con su marca de agua, sigue
        // aportando su volumen justo hasta que el snapshot lo incluya.
        //
        // Lo purga `purgarSincronizados` cuando el cache del servidor alcanza
        // esta marca. Las fotos no se tocan: ya llevan su physicalAdvanceId y
        // suben por su propia cola, independientes de este renglón.
        advance.status = "done";
        advance.syncedAt = new Date();
      });

      console.log(
        `[AdvanceQueue] Atomically completed sync for advance ${advanceLocalId}, ` +
          `physicalAdvanceId: ${physicalAdvanceId}, photos updated: ${photoCount}`
      );

      return true;
    },
    [realm, allPhotos]
  );

  /**
   * Remove an item from the queue AND cascade delete associated photos
   * Also deletes local photo files
   */
  const removeFromQueueWithPhotos = useCallback(
    async (id: string, deleteFiles: boolean = true): Promise<boolean> => {
      const item = realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
      if (!item) return false;

      // Find associated photos
      const photosToDelete = allPhotos.filtered("advanceLocalId == $0", id);

      // Collect URIs before deleting from Realm
      const localUris = deleteFiles
        ? [...photosToDelete].map((p) => p.localUri)
        : [];

      realm.write(() => {
        // Delete photos first
        if (photosToDelete.length > 0) {
          realm.delete(photosToDelete);
        }
        // Delete advance
        realm.delete(item);
      });

      // Delete local files if requested
      if (deleteFiles) {
        for (const uri of localUris) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(uri, { idempotent: true });
            }
          } catch (error) {
            console.warn("[AdvanceQueue] Error deleting photo file:", error);
          }
        }
      }

      console.log(
        `[AdvanceQueue] Removed advance ${id} with ${localUris.length} photos`
      );

      return true;
    },
    [realm, allPhotos]
  );

  /**
   * Mark an item as syncing
   */
  const markAsSyncing = useCallback(
    (id: string): boolean => {
      const item = realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
      if (!item) return false;

      realm.write(() => {
        item.status = "syncing";
        item.lastAttemptAt = new Date();
      });

      return true;
    },
    [realm]
  );

  /**
   * Mark an item as failed with error message
   */
  const markAsFailed = useCallback(
    (id: string, errorMessage: string): boolean => {
      const item = realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
      if (!item) return false;

      realm.write(() => {
        item.status = "failed";
        item.failedAt = new Date();
        item.errorMessage = errorMessage;
        item.retryCount += 1;
      });

      return true;
    },
    [realm]
  );

  /**
   * Reset an item to pending status for retry
   */
  const markAsPending = useCallback(
    (id: string): boolean => {
      const item = realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
      if (!item) return false;

      realm.write(() => {
        item.status = "pending";
        item.errorMessage = null;
        item.failedAt = null;
      });

      return true;
    },
    [realm]
  );

  /**
   * Increment retry count without changing status
   */
  const incrementRetryCount = useCallback(
    (id: string): number => {
      const item = realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
      if (!item) return -1;

      let newCount = 0;
      realm.write(() => {
        item.retryCount += 1;
        newCount = item.retryCount;
      });

      return newCount;
    },
    [realm]
  );

  /**
   * Reset items stuck in 'syncing' status back to 'pending'
   * Should be called on app start to recover from crashes during sync
   */
  const resetStuckSyncingItems = useCallback((): number => {
    const stuckItems = allItems.filtered('status == "syncing"');
    const count = stuckItems.length;

    if (count > 0) {
      realm.write(() => {
        stuckItems.forEach((item) => {
          item.status = "pending";
        });
      });
    }

    return count;
  }, [realm, allItems]);

  /**
   * Clear all failed items from the queue (with cascade photo delete)
   */
  const clearAllFailed = useCallback(async (): Promise<number> => {
    const failed = allItems.filtered('status == "failed"');
    const count = failed.length;

    if (count === 0) return 0;

    // Collect all advance IDs
    const advanceIds = [...failed].map((item) => item._id);

    // Find all photos for these advances
    const photosToDelete = allPhotos.filtered(
      advanceIds.map((_, i) => `advanceLocalId == $${i}`).join(" OR "),
      ...advanceIds
    );

    // Collect URIs before deleting
    const localUris = [...photosToDelete].map((p) => p.localUri);

    realm.write(() => {
      if (photosToDelete.length > 0) {
        realm.delete(photosToDelete);
      }
      realm.delete(failed);
    });

    // Delete local files
    for (const uri of localUris) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch (error) {
        console.warn("[AdvanceQueue] Error deleting photo file:", error);
      }
    }

    return count;
  }, [realm, allItems, allPhotos]);

  /**
   * Get a single item by ID
   */
  const getItemById = useCallback(
    (id: string): PendingAdvanceSubmission | null => {
      return realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
    },
    [realm]
  );

  /**
   * Get photo count for an advance
   */
  const getPhotoCountForAdvance = useCallback(
    (advanceId: string): number => {
      return allPhotos.filtered("advanceLocalId == $0", advanceId).length;
    },
    [allPhotos]
  );

  return {
    // Reactive queries
    allItems,
    itemsEnCola,
    pendingItems,
    syncingItems,
    failedItems,
    doneItems,

    // Counts
    pendingCount,
    failedCount,
    syncingCount,
    totalCount,

    // Marca de agua (E8)
    volumenEnColaPorConcepto,
    purgarSincronizados,

    // Write operations
    addToQueue,
    removeFromQueue,
    removeFromQueueWithPhotos,
    completeAdvanceSyncAtomic,
    markAsSyncing,
    markAsFailed,
    markAsPending,
    incrementRetryCount,
    resetStuckSyncingItems,
    clearAllFailed,

    // Read operations
    getItemById,
    getPhotoCountForAdvance,
  };
}
