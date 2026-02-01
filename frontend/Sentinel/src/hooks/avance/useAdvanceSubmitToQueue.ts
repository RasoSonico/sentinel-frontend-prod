import { useCallback, useState } from "react";
import {
  usePendingAdvanceQueue,
  PendingAdvanceInput,
} from "./usePendingAdvanceQueue";
import { useSnackbar } from "../useSnackbar";
import { useNetworkStatus } from "../utils/useNetworkStatus";

export interface AdvanceFormContext {
  catalogId: number;
  catalogName: string;
  workItemId: number;
  workItemName: string;
  conceptDescription: string;
  constructionId: number;
}

export interface AdvanceFormData {
  concept: number;
  quantity: string;
  notes: string;
}

export function useAdvanceSubmitToQueue() {
  const { addToQueue, pendingCount, failedCount } = usePendingAdvanceQueue();
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();
  const [isAdding, setIsAdding] = useState(false);

  /**
   * Submit form data to the offline queue
   * Returns the queue item ID
   */
  const submitToQueue = useCallback(
    (formData: AdvanceFormData, context: AdvanceFormContext): string => {
      setIsAdding(true);

      try {
        const queueInput: PendingAdvanceInput = {
          conceptId: formData.concept,
          volume: formData.quantity,
          comments: formData.notes || "",
          catalogId: context.catalogId,
          catalogName: context.catalogName,
          workItemId: context.workItemId,
          workItemName: context.workItemName,
          conceptDescription: context.conceptDescription,
          constructionId: context.constructionId,
        };

        const itemId = addToQueue(queueInput);

        // Show appropriate message based on network status
        if (isOnline) {
          showSnackbar("Avance guardado. Sincronizando...", "info");
        } else {
          showSnackbar(
            "Avance guardado. Se enviará cuando haya conexión.",
            "info"
          );
        }

        return itemId;
      } finally {
        setIsAdding(false);
      }
    },
    [addToQueue, isOnline, showSnackbar]
  );

  return {
    submitToQueue,
    isAdding,
    pendingCount,
    failedCount,
    isOnline,
  };
}
