import { useCallback, useState } from "react";
import { telemetry } from "src/services/telemetry";
import {
  usePendingAdvanceQueue,
  PendingAdvanceInput,
} from "./usePendingAdvanceQueue";
import { usePendingPhotoQueue } from "./usePendingPhotoQueue";
import { useSnackbar } from "../useSnackbar";
import { useNetworkStatus } from "../utils/useNetworkStatus";
import { Photo } from "./usePhotoCapture";

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
  const { addPhotosToQueue, getPhotoCounts } = usePendingPhotoQueue();
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();
  const [isAdding, setIsAdding] = useState(false);

  /**
   * Submit form data to the offline queue
   * Returns the queue item ID
   */
  const submitToQueue = useCallback(
    async (
      formData: AdvanceFormData,
      context: AdvanceFormContext,
      photos: Photo[] = [],
      formSessionId?: string
    ): Promise<string> => {
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

        // Add advance to queue first
        const advanceLocalId = addToQueue(queueInput);

        // If there are photos, add them to the photo queue
        if (photos.length > 0) {
          await addPhotosToQueue(advanceLocalId, photos, context.constructionId);
          console.log(
            `[SubmitToQueue] Queued ${photos.length} photos for advance ${advanceLocalId}`
          );
        }

        telemetry.trackEvent("advance_submission_queued", {
          obra_id: context.constructionId,
          queue_size: pendingCount + 1,
          form_session_id: formSessionId ?? "",
        });

        // Show appropriate message based on network status and photos
        const photoText = photos.length > 0 ? ` con ${photos.length} foto${photos.length > 1 ? "s" : ""}` : "";
        if (isOnline) {
          showSnackbar(`Avance${photoText} guardado. Sincronizando...`, "info");
        } else {
          showSnackbar(
            `Avance${photoText} guardado. Se enviará cuando haya conexión.`,
            "info"
          );
        }

        return advanceLocalId;
      } finally {
        setIsAdding(false);
      }
    },
    [addToQueue, addPhotosToQueue, isOnline, pendingCount, showSnackbar]
  );

  // Get photo counts
  const photoCounts = getPhotoCounts();

  return {
    submitToQueue,
    isAdding,
    pendingCount,
    failedCount,
    isOnline,
    pendingPhotosCount: photoCounts.pending + photoCounts.waiting,
    failedPhotosCount: photoCounts.failed,
  };
}
