import { useEffect, useRef, useCallback, useState } from "react";
import * as FileSystem from "expo-file-system";
import { useQueryClient } from "@tanstack/react-query";
import { usePendingPhotoQueue } from "./usePendingPhotoQueue";
import { useNetworkStatus } from "../utils/useNetworkStatus";
import { useAppSelector } from "src/redux/hooks";
import { useSnackbar } from "../useSnackbar";
import { AVANCE_QUERY_KEYS } from "../data/query/avanceQueries.const";
import {
  requestSingleUpload,
  uploadToAzureBlob,
  confirmUpload,
  uriToBlob,
  getFileSize,
  getImageDimensions,
  getCameraInfo,
  getAzureUploadErrorMessage,
  PhotoUploadRequest,
  AzureUploadResult,
} from "../../services/api/photoService";
import { PendingPhotoSubmission } from "src/realm/pendingAdvance/PendingPhotoSubmission";
import * as Device from "expo-device";

const RETRY_DELAY_BASE_MS = 1000;
const DEBOUNCE_MS = 500;

export function usePhotoSyncWorker() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const {
    waitingPhotos,
    uploadedPhotos,
    markPhotoAsSyncing,
    markPhotoAsUploaded,
    markPhotoAsFailed,
    markPhotoAsWaiting,
    removePhoto,
    resetStuckSyncingPhotos,
    detectAndHandleOrphanedPhotos,
    getPhotoById,
    checkPhotoFileExists,
  } = usePendingPhotoQueue();

  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // Reset stuck photos and detect orphaned photos on mount
  useEffect(() => {
    // Reset photos stuck in syncing state (e.g., from app crash during upload)
    const resetCount = resetStuckSyncingPhotos();
    if (resetCount > 0) {
      console.log(`[PhotoSyncWorker] Reset ${resetCount} stuck syncing photos`);
    }

    // Detect and handle orphaned photos
    // (photos whose parent advance was deleted but photos weren't updated)
    const orphanResult = detectAndHandleOrphanedPhotos();
    if (orphanResult.orphanedCount > 0) {
      console.log(
        `[PhotoSyncWorker] Detected ${orphanResult.orphanedCount} orphaned photos, ` +
          `handled ${orphanResult.handledCount}`,
      );
    }
  }, [resetStuckSyncingPhotos, detectAndHandleOrphanedPhotos]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Confirm a photo upload with the backend
   * Used for both new uploads and retrying failed confirmations
   */
  const confirmPhotoUpload = useCallback(
    async (remotePhotoId: string, uploadSuccess: boolean): Promise<boolean> => {
      try {
        const cameraInfo = getCameraInfo();
        await confirmUpload({
          photo_id: remotePhotoId,
          upload_successful: uploadSuccess,
          error_message: uploadSuccess
            ? undefined
            : "Failed to upload to Azure Blob",
          camera_info: cameraInfo,
        });
        return true;
      } catch (error) {
        console.error("[PhotoSyncWorker] Confirm upload error:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Upload a single photo to Azure (full flow: request SAS → upload → confirm)
   */
  const uploadPhoto = useCallback(
    async (
      photo: PendingPhotoSubmission,
    ): Promise<{
      success: boolean;
      remotePhotoId?: string;
      error?: string;
    }> => {
      if (!photo.physicalAdvanceId) {
        console.error(
          "[PhotoSyncWorker] Photo missing physicalAdvanceId:",
          photo._id,
        );
        return { success: false, error: "Falta ID de avance físico" };
      }

      // Check if local file exists
      console.log("[PhotoSyncWorker] Attempting upload from:", photo.localUri);
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.localUri);
        if (!fileInfo.exists) {
          console.error(
            "[PhotoSyncWorker] Local file not found:",
            photo.localUri,
          );
          // Return a special error indicating the file is permanently missing
          return {
            success: false,
            error: "Archivo local no encontrado - el archivo fue eliminado",
          };
        }
        console.log(
          "[PhotoSyncWorker] File verified, size:",
          "size" in fileInfo ? fileInfo.size : "unknown",
        );
      } catch (error) {
        console.error("[PhotoSyncWorker] Error checking file:", error);
        return { success: false, error: "Error al verificar archivo local" };
      }

      try {
        // Prepare photo data for API
        const fileSize = await getFileSize(photo.localUri);
        const dimensions = await getImageDimensions(photo.localUri);

        const photoData: PhotoUploadRequest = {
          physical_advance_id: photo.physicalAdvanceId,
          construction_id: photo.constructionId,
          filename: photo.filename,
          file_size: fileSize,
          content_type: "image/jpeg",
          device_model: Device.modelName ?? "Unknown Device",
          latitude: photo.latitude ?? undefined,
          longitude: photo.longitude ?? undefined,
          gps_accuracy: photo.gpsAccuracy ?? undefined,
          taken_at: photo.takenAt.toISOString(),
          image_width: dimensions.width,
          image_height: dimensions.height,
        };

        console.log(
          "[PhotoSyncWorker] Requesting SAS token for:",
          photo.filename,
        );

        // Step 1: Request SAS token
        const uploadResponse = await requestSingleUpload(photoData);
        const remotePhotoId = uploadResponse.photo_id;

        // Step 2: Convert URI to Blob
        const fileBlob = await uriToBlob(photo.localUri);

        // Step 3: Upload to Azure Blob
        console.log("[PhotoSyncWorker] Uploading to Azure:", photo.filename);
        const azureResult: AzureUploadResult = await uploadToAzureBlob(
          uploadResponse.upload_url,
          fileBlob,
          "image/jpeg",
        );

        if (!azureResult.success) {
          const errorMessage = getAzureUploadErrorMessage(azureResult);
          console.error(
            "[PhotoSyncWorker] Azure upload failed:",
            photo.filename,
            azureResult,
          );

          // If it's a SAS token issue, we need to request a new one
          if (azureResult.errorType === "expired_sas") {
            return {
              success: false,
              error: errorMessage,
              // Don't return remotePhotoId since we need a fresh SAS token
            };
          }

          return { success: false, error: errorMessage };
        }

        // Step 4: Confirm upload - this might fail due to auth
        console.log("[PhotoSyncWorker] Confirming upload:", photo.filename);
        try {
          await confirmPhotoUpload(remotePhotoId, true);
          console.log("[PhotoSyncWorker] Upload confirmed:", photo.filename);
          return { success: true, remotePhotoId };
        } catch (confirmError) {
          // Photo is on Azure but confirmation failed
          // Return partial success so we can retry just the confirmation
          console.error(
            "[PhotoSyncWorker] Confirm failed after successful upload:",
            confirmError,
          );
          return {
            success: false,
            remotePhotoId, // Keep this so we can retry confirmation
            error: "Foto subida pero fallo la confirmación",
          };
        }
      } catch (error) {
        console.error("[PhotoSyncWorker] Upload error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        return { success: false, error: errorMessage };
      }
    },
    [confirmPhotoUpload],
  );

  /**
   * Retry confirmation for a photo that was uploaded but not confirmed
   */
  const retryConfirmation = useCallback(
    async (
      photo: PendingPhotoSubmission,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!photo.remotePhotoId) {
        console.error(
          "[PhotoSyncWorker] Cannot retry confirmation - no remotePhotoId:",
          photo._id,
        );
        return { success: false, error: "Falta ID de foto remota" };
      }

      try {
        console.log(
          "[PhotoSyncWorker] Retrying confirmation for:",
          photo.filename,
        );
        await confirmPhotoUpload(photo.remotePhotoId, true);
        console.log(
          "[PhotoSyncWorker] Confirmation retry successful:",
          photo.filename,
        );
        return { success: true };
      } catch (error) {
        console.error("[PhotoSyncWorker] Confirmation retry failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Error al confirmar";
        return { success: false, error: errorMessage };
      }
    },
    [confirmPhotoUpload],
  );

  /**
   * Process the photo sync queue
   */
  const processQueue = useCallback(async () => {
    // Get photos ready for upload (waiting with physicalAdvanceId)
    const photosReadyForUpload = [...waitingPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    );

    // Get photos that need confirmation retry (uploaded with remotePhotoId)
    const photosNeedingConfirmation = [...uploadedPhotos].filter(
      (p) => p.remotePhotoId !== null,
    );

    const totalToProcess =
      photosReadyForUpload.length + photosNeedingConfirmation.length;

    // Guard against concurrent processing or unauthenticated state
    if (
      syncInProgressRef.current ||
      !isOnline ||
      !isAuthenticated ||
      totalToProcess === 0
    ) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    let successCount = 0;
    let failCount = 0;

    try {
      // First, process photos needing confirmation retry (quick operations)
      for (const photo of photosNeedingConfirmation) {
        if (!mountedRef.current || !isOnline) break;

        setCurrentPhotoId(photo._id);
        markPhotoAsSyncing(photo._id);

        const result = await retryConfirmation(photo);

        if (result.success) {
          await removePhoto(photo._id, true);
          successCount++;
        } else {
          if (photo.retryCount + 1 >= photo.maxRetries) {
            markPhotoAsFailed(
              photo._id,
              result.error || "Error al confirmar subida",
            );
            failCount++;
            showSnackbar(
              `Error al confirmar foto: ${photo.filename.substring(0, 15)}...`,
              "error",
            );
          } else {
            markPhotoAsFailed(
              photo._id,
              result.error || "Error al confirmar subida",
            );
            // Keep as uploaded so we retry confirmation, not full upload
            markPhotoAsUploaded(photo._id, photo.remotePhotoId!);

            const delay = RETRY_DELAY_BASE_MS * Math.pow(2, photo.retryCount);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // Then, process photos needing full upload
      for (const photo of photosReadyForUpload) {
        if (!mountedRef.current || !isOnline) break;

        setCurrentPhotoId(photo._id);
        markPhotoAsSyncing(photo._id);

        const result = await uploadPhoto(photo);

        if (result.success) {
          await removePhoto(photo._id, true);
          successCount++;
        } else {
          // Check if photo was uploaded but confirmation failed
          if (result.remotePhotoId) {
            // Mark as uploaded so next retry only confirms
            markPhotoAsUploaded(photo._id, result.remotePhotoId);
            console.log(
              "[PhotoSyncWorker] Photo uploaded, pending confirmation:",
              photo.filename,
            );

            // Try confirmation again after a delay
            const delay = RETRY_DELAY_BASE_MS * Math.pow(2, photo.retryCount);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            // Full upload failed
            // Check if this is a permanent failure (file missing)
            const isFileMissing =
              result.error?.includes("Archivo local no encontrado") ||
              result.error?.includes("el archivo fue eliminado");

            if (isFileMissing) {
              // File is permanently missing - mark as failed and don't retry
              markPhotoAsFailed(
                photo._id,
                result.error || "Archivo local no encontrado",
              );
              failCount++;
              console.warn(
                "[PhotoSyncWorker] Photo file permanently missing, marking as failed:",
                photo.filename,
              );
              showSnackbar(
                `Archivo de foto no encontrado: ${photo.filename.substring(0, 15)}...`,
                "error",
              );
            } else if (photo.retryCount + 1 >= photo.maxRetries) {
              markPhotoAsFailed(
                photo._id,
                result.error || "Error al subir foto",
              );
              failCount++;
              showSnackbar(
                `Error al subir foto: ${photo.filename.substring(0, 15)}...`,
                "error",
              );
            } else {
              markPhotoAsFailed(
                photo._id,
                result.error || "Error al subir foto",
              );
              markPhotoAsWaiting(photo._id);

              const delay = RETRY_DELAY_BASE_MS * Math.pow(2, photo.retryCount);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }
      }

      // Show batch completion message
      if (successCount > 0) {
        showSnackbar(
          `${successCount} foto${successCount > 1 ? "s" : ""} sincronizada${successCount > 1 ? "s" : ""}`,
          "success",
        );

        // El photo_count de los avances cambió en el servidor: refrescar la
        // lista para que el contador Fotos del Hoy, el indicador 📷 de las
        // cards y la franja de evidencia se actualicen solos. Sin esto, el
        // dato queda viejo indefinidamente (refetchOnMount está en false y
        // solo el worker de avances invalidaba).
        await queryClient.invalidateQueries({
          queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG],
        });
      }
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      setCurrentPhotoId(null);
    }
  }, [
    isOnline,
    waitingPhotos,
    uploadedPhotos,
    markPhotoAsSyncing,
    markPhotoAsUploaded,
    markPhotoAsFailed,
    markPhotoAsWaiting,
    removePhoto,
    uploadPhoto,
    retryConfirmation,
    isAuthenticated,
    showSnackbar,
    queryClient,
  ]);

  // Debounced effect to trigger sync when conditions are met
  useEffect(() => {
    const photosReadyForUpload = [...waitingPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    );
    const photosNeedingConfirmation = [...uploadedPhotos].filter(
      (p) => p.remotePhotoId !== null,
    );

    const totalToProcess =
      photosReadyForUpload.length + photosNeedingConfirmation.length;

    if (
      !isOnline ||
      !isAuthenticated ||
      totalToProcess === 0 ||
      syncInProgressRef.current
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      processQueue();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [isOnline, isAuthenticated, waitingPhotos, uploadedPhotos, processQueue]);

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
   * Retry a specific failed photo
   */
  const retryPhoto = useCallback(
    async (photoId: string) => {
      const photo = getPhotoById(photoId);

      if (
        !photo ||
        (photo.status !== "failed" && photo.status !== "uploaded")
      ) {
        return;
      }

      // Check if file still exists (only needed for full upload)
      if (photo.status === "failed" && !photo.remotePhotoId) {
        const fileExists = await checkPhotoFileExists(photoId);
        if (!fileExists) {
          showSnackbar("El archivo de la foto ya no existe", "error");
          await removePhoto(photoId, false);
          return;
        }
      }

      // If photo was uploaded but confirmation failed, retry confirmation only
      if (photo.remotePhotoId) {
        markPhotoAsUploaded(photoId, photo.remotePhotoId);
      } else {
        markPhotoAsWaiting(photoId);
      }

      if (isOnline) {
        await processQueue();
      }
    },
    [
      isOnline,
      processQueue,
      getPhotoById,
      markPhotoAsUploaded,
      markPhotoAsWaiting,
      checkPhotoFileExists,
      removePhoto,
      showSnackbar,
    ],
  );

  return {
    isSyncing,
    currentPhotoId,
    syncNow,
    retryPhoto,
  };
}
