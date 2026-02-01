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

  // Counts
  const pendingCount = pendingItems.length;
  const failedCount = failedItems.length;
  const syncingCount = syncingItems.length;
  const totalCount = allItems.length;

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
    pendingItems,
    syncingItems,
    failedItems,

    // Counts
    pendingCount,
    failedCount,
    syncingCount,
    totalCount,

    // Write operations
    addToQueue,
    removeFromQueue,
    removeFromQueueWithPhotos,
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
