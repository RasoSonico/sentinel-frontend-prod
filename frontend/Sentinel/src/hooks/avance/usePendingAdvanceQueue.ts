import { useCallback, useMemo } from "react";
import { useRealm, useQuery } from "@realm/react";
import {
  PendingAdvanceSubmission,
  PendingAdvanceStatus,
} from "src/realm/pendingAdvance/PendingAdvanceSubmission";
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

  // Filtered queries
  const pendingItems = useMemo(
    () => allItems.filtered('status == "pending"'),
    [allItems],
  );

  const syncingItems = useMemo(
    () => allItems.filtered('status == "syncing"'),
    [allItems],
  );

  const failedItems = useMemo(
    () => allItems.filtered('status == "failed"'),
    [allItems],
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
    [realm],
  );

  /**
   * Remove an item from the queue
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
    [realm],
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
    [realm],
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
    [realm],
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
    [realm],
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
    [realm],
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
   * Clear all failed items from the queue
   */
  const clearAllFailed = useCallback((): number => {
    const failed = allItems.filtered('status == "failed"');
    const count = failed.length;

    if (count > 0) {
      realm.write(() => {
        realm.delete(failed);
      });
    }

    return count;
  }, [realm, allItems]);

  /**
   * Get a single item by ID
   */
  const getItemById = useCallback(
    (id: string): PendingAdvanceSubmission | null => {
      return realm.objectForPrimaryKey(PendingAdvanceSubmission, id);
    },
    [realm],
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
    markAsSyncing,
    markAsFailed,
    markAsPending,
    incrementRetryCount,
    resetStuckSyncingItems,
    clearAllFailed,

    // Read operations
    getItemById,
  };
}
