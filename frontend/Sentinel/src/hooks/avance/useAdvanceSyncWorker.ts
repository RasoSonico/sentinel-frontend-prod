import { useEffect, useRef, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePendingAdvanceQueue } from "./usePendingAdvanceQueue";
import { useNetworkStatus } from "../utils/useNetworkStatus";
import { useSnackbar } from "../useSnackbar";
import { submitAdvance } from "../data/api/avanceApi";
import { AVANCE_QUERY_KEYS } from "../data/query/avanceQueries.const";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";

const RETRY_DELAY_BASE_MS = 1000;
const DEBOUNCE_MS = 500;

export function useAdvanceSyncWorker() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();

  const {
    pendingItems,
    pendingCount,
    markAsSyncing,
    markAsFailed,
    markAsPending,
    removeFromQueue,
    resetStuckSyncingItems,
    getItemById,
  } = usePendingAdvanceQueue();

  const [isSyncing, setIsSyncing] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // Mutation for submitting advance
  const submitMutation = useMutation({
    mutationFn: async (item: PendingAdvanceSubmission) => {
      return await submitAdvance({
        concept: item.conceptId,
        volume: Number(item.volume),
        comments: item.comments,
      });
    },
  });

  // Reset stuck items on mount
  useEffect(() => {
    const resetCount = resetStuckSyncingItems();
    if (resetCount > 0) {
      console.log(`[SyncWorker] Reset ${resetCount} stuck syncing items`);
    }
  }, [resetStuckSyncingItems]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Process the sync queue
   */
  const processQueue = useCallback(async () => {
    // Guard against concurrent processing
    if (syncInProgressRef.current || !isOnline || pendingCount === 0) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    let successCount = 0;
    let failCount = 0;

    try {
      // Get a snapshot of pending items to process
      const itemsToProcess = [...pendingItems];

      for (const item of itemsToProcess) {
        // Stop if we go offline or component unmounts
        if (!mountedRef.current || !isOnline) {
          break;
        }

        setCurrentItemId(item._id);

        // Mark as syncing
        markAsSyncing(item._id);

        try {
          // Attempt to submit
          await submitMutation.mutateAsync(item);

          // Success - remove from queue
          removeFromQueue(item._id);
          successCount++;

          // Show individual success notification
          showSnackbar(
            `Avance enviado: ${item.conceptDescription.substring(0, 30)}${item.conceptDescription.length > 30 ? "..." : ""}`,
            "success",
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Error desconocido al sincronizar";

          // Check if max retries exceeded
          if (item.retryCount + 1 >= item.maxRetries) {
            // Mark as permanently failed
            markAsFailed(item._id, errorMessage);
            failCount++;

            showSnackbar(
              `Error al enviar avance: ${item.conceptDescription.substring(0, 20)}...`,
              "error",
              {
                label: "Ver detalles",
                onPress: () => {
                  // This will be handled by the UI to open the sync sheet
                  console.log("[SyncWorker] User wants to see error details");
                },
              },
            );
          } else {
            // Increment retry and keep as pending for next attempt
            markAsFailed(item._id, errorMessage);
            // Immediately reset to pending for retry
            // Wait with exponential backoff before continuing
            const delay = RETRY_DELAY_BASE_MS * Math.pow(2, item.retryCount);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // Invalidate queries to refresh list after successful syncs
      if (successCount > 0) {
        await queryClient.invalidateQueries({
          queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG],
        });
      }

      // Show batch completion message if multiple items processed
      if (successCount + failCount > 1) {
        if (failCount === 0) {
          showSnackbar(
            `${successCount} avances sincronizados correctamente`,
            "success",
          );
        } else if (successCount === 0) {
          showSnackbar(`${failCount} avances fallaron al sincronizar`, "error");
        } else {
          showSnackbar(
            `${successCount} sincronizados, ${failCount} fallidos`,
            "info",
          );
        }
      }
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      setCurrentItemId(null);
    }
  }, [
    isOnline,
    pendingCount,
    pendingItems,
    markAsSyncing,
    markAsFailed,
    removeFromQueue,
    submitMutation,
    queryClient,
    showSnackbar,
  ]);

  // Debounced effect to trigger sync when conditions are met
  useEffect(() => {
    if (!isOnline || pendingCount === 0 || syncInProgressRef.current) {
      return;
    }

    // Debounce to avoid rapid re-triggers
    const timeoutId = setTimeout(() => {
      processQueue();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [isOnline, pendingCount, processQueue]);

  // Show notification when connection is restored
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current && pendingCount > 0) {
      showSnackbar(
        `Conexión restaurada. Sincronizando ${pendingCount} avance${pendingCount > 1 ? "s" : ""}...`,
        "info",
      );
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, pendingCount, showSnackbar]);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      showSnackbar("Sin conexión a internet", "error");
      return;
    }
    await processQueue();
  }, [isOnline, processQueue, showSnackbar]);

  /**
   * Retry a specific failed item
   */
  const retryItem = useCallback(
    async (id: string) => {
      const item = getItemById(id);

      if (!item || item.status !== "failed") {
        return;
      }

      markAsPending(id);

      // Process queue will pick it up
      if (isOnline) {
        await processQueue();
      }
    },
    [isOnline, processQueue, getItemById, markAsPending],
  );

  return {
    isSyncing,
    currentItemId,
    syncNow,
    retryItem,
  };
}
