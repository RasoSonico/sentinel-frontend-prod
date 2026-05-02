import { useCallback, useMemo } from "react";
import { useRealm, useQuery } from "@realm/react";
import * as FileSystem from "expo-file-system";
import { uuid } from "expo-modules-core";
import {
  PendingPhotoSubmission,
  PendingPhotoStatus,
} from "src/realm/pendingAdvance/PendingPhotoSubmission";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";
import { Photo } from "./usePhotoCapture";

export interface PendingPhotoInput {
  advanceLocalId: string;
  localUri: string;
  filename: string;
  fileSize: number;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  takenAt: Date;
}

export interface PhotoCounts {
  pending: number;
  waiting: number;
  syncing: number;
  uploaded: number;
  failed: number;
  total: number;
}

export function usePendingPhotoQueue() {
  const realm = useRealm();

  // Reactive queries for all photos
  const allPhotos = useQuery(PendingPhotoSubmission);

  // Query for pending advances (used for orphan detection)
  const allAdvances = useQuery(PendingAdvanceSubmission);

  // Filtered queries by status
  const pendingPhotos = useMemo(
    () => allPhotos.filtered('status == "pending"'),
    [allPhotos]
  );

  const waitingPhotos = useMemo(
    () => allPhotos.filtered('status == "waiting"'),
    [allPhotos]
  );

  const syncingPhotos = useMemo(
    () => allPhotos.filtered('status == "syncing"'),
    [allPhotos]
  );

  const uploadedPhotos = useMemo(
    () => allPhotos.filtered('status == "uploaded"'),
    [allPhotos]
  );

  const failedPhotos = useMemo(
    () => allPhotos.filtered('status == "failed"'),
    [allPhotos]
  );

  // Counts
  const getPhotoCounts = useCallback((): PhotoCounts => {
    return {
      pending: pendingPhotos.length,
      waiting: waitingPhotos.length,
      syncing: syncingPhotos.length,
      uploaded: uploadedPhotos.length,
      failed: failedPhotos.length,
      total: allPhotos.length,
    };
  }, [
    allPhotos,
    pendingPhotos,
    waitingPhotos,
    syncingPhotos,
    uploadedPhotos,
    failedPhotos,
  ]);

  /**
   * Add multiple photos to the queue linked to an advance
   * Only queues photos whose local files exist
   */
  const addPhotosToQueue = useCallback(
    async (
      advanceLocalId: string,
      photos: Photo[],
      constructionId: number
    ): Promise<string[]> => {
      const photoIds: string[] = [];
      const skippedPhotos: string[] = [];

      for (const photo of photos) {
        console.log("[PhotoQueue] Adding photo with localUri:", photo.localUri);

        // Validate file exists BEFORE adding to queue
        let fileSize = 0;
        try {
          const fileInfo = await FileSystem.getInfoAsync(photo.localUri);
          console.log("[PhotoQueue] File exists:", fileInfo.exists);

          if (!fileInfo.exists) {
            console.error(
              "[PhotoQueue] File does not exist, skipping:",
              photo.localUri
            );
            skippedPhotos.push(photo.filename);
            continue;
          }

          if ("size" in fileInfo) {
            fileSize = fileInfo.size;
          }
        } catch (error) {
          console.error(
            "[PhotoQueue] Error checking file, skipping:",
            photo.localUri,
            error
          );
          skippedPhotos.push(photo.filename);
          continue;
        }

        const _id = uuid.v4();

        realm.write(() => {
          realm.create(PendingPhotoSubmission, {
            _id,
            advanceLocalId,
            physicalAdvanceId: null,
            constructionId,
            localUri: photo.localUri,
            filename: photo.filename,
            fileSize,
            latitude: photo.location?.latitude ?? null,
            longitude: photo.location?.longitude ?? null,
            gpsAccuracy: null,
            takenAt: new Date(photo.timestamp),
            status: "pending" as PendingPhotoStatus,
            createdAt: new Date(),
            lastAttemptAt: null,
            retryCount: 0,
            maxRetries: 3,
            errorMessage: null,
            remotePhotoId: null,
          });
        });

        photoIds.push(_id);
      }

      if (skippedPhotos.length > 0) {
        console.warn(
          `[PhotoQueue] Skipped ${skippedPhotos.length} photos due to missing files:`,
          skippedPhotos
        );
      }

      return photoIds;
    },
    [realm]
  );

  /**
   * Get all photos for a specific advance
   */
  const getPhotosByAdvanceId = useCallback(
    (advanceLocalId: string): Realm.Results<PendingPhotoSubmission> => {
      return allPhotos.filtered("advanceLocalId == $0", advanceLocalId);
    },
    [allPhotos]
  );

  /**
   * Update physicalAdvanceId for all photos linked to an advance
   * Called after the parent advance syncs successfully
   */
  const updatePhysicalAdvanceId = useCallback(
    (advanceLocalId: string, physicalAdvanceId: number): number => {
      const photosToUpdate = allPhotos.filtered(
        "advanceLocalId == $0",
        advanceLocalId
      );
      const count = photosToUpdate.length;

      if (count > 0) {
        realm.write(() => {
          photosToUpdate.forEach((photo) => {
            photo.physicalAdvanceId = physicalAdvanceId;
          });
        });
      }

      return count;
    },
    [realm, allPhotos]
  );

  /**
   * Transition photos from "pending" to "waiting" after advance syncs
   */
  const markPhotosAsWaiting = useCallback(
    (advanceLocalId: string): number => {
      const photosToUpdate = allPhotos.filtered(
        'advanceLocalId == $0 AND status == "pending"',
        advanceLocalId
      );
      const count = photosToUpdate.length;

      if (count > 0) {
        realm.write(() => {
          photosToUpdate.forEach((photo) => {
            photo.status = "waiting";
          });
        });
      }

      return count;
    },
    [realm, allPhotos]
  );

  /**
   * Mark a single photo as syncing
   */
  const markPhotoAsSyncing = useCallback(
    (photoId: string): boolean => {
      const photo = realm.objectForPrimaryKey(PendingPhotoSubmission, photoId);
      if (!photo) return false;

      realm.write(() => {
        photo.status = "syncing";
        photo.lastAttemptAt = new Date();
      });

      return true;
    },
    [realm]
  );

  /**
   * Mark a photo as uploaded (to Azure) with the remote photo ID
   * Used when Azure upload succeeds but confirmation is pending
   */
  const markPhotoAsUploaded = useCallback(
    (photoId: string, remotePhotoId: string): boolean => {
      const photo = realm.objectForPrimaryKey(PendingPhotoSubmission, photoId);
      if (!photo) return false;

      realm.write(() => {
        photo.status = "uploaded";
        photo.remotePhotoId = remotePhotoId;
        photo.errorMessage = null;
      });

      return true;
    },
    [realm]
  );

  /**
   * Mark a photo as failed with error message
   */
  const markPhotoAsFailed = useCallback(
    (photoId: string, errorMessage: string): boolean => {
      const photo = realm.objectForPrimaryKey(PendingPhotoSubmission, photoId);
      if (!photo) return false;

      realm.write(() => {
        photo.status = "failed";
        photo.errorMessage = errorMessage;
        photo.retryCount += 1;
      });

      return true;
    },
    [realm]
  );

  /**
   * Mark a photo as waiting for retry
   */
  const markPhotoAsWaiting = useCallback(
    (photoId: string): boolean => {
      const photo = realm.objectForPrimaryKey(PendingPhotoSubmission, photoId);
      if (!photo) return false;

      realm.write(() => {
        photo.status = "waiting";
        photo.errorMessage = null;
      });

      return true;
    },
    [realm]
  );

  /**
   * Remove a single photo from the queue and delete the local file
   */
  const removePhoto = useCallback(
    async (photoId: string, deleteFile: boolean = true): Promise<boolean> => {
      const photo = realm.objectForPrimaryKey(PendingPhotoSubmission, photoId);
      if (!photo) return false;

      const localUri = photo.localUri;

      realm.write(() => {
        realm.delete(photo);
      });

      // Delete the local file if requested
      if (deleteFile && localUri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(localUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(localUri, { idempotent: true });
          }
        } catch (error) {
          console.warn("[PhotoQueue] Error deleting local file:", error);
        }
      }

      return true;
    },
    [realm]
  );

  /**
   * Remove all photos for an advance (cascade delete)
   * Called when an advance is deleted
   */
  const removePhotosByAdvanceId = useCallback(
    async (
      advanceLocalId: string,
      deleteFiles: boolean = true
    ): Promise<number> => {
      const photosToDelete = allPhotos.filtered(
        "advanceLocalId == $0",
        advanceLocalId
      );
      const count = photosToDelete.length;

      if (count === 0) return 0;

      // Collect URIs before deleting from Realm
      const localUris = deleteFiles
        ? [...photosToDelete].map((p) => p.localUri)
        : [];

      realm.write(() => {
        realm.delete(photosToDelete);
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
            console.warn("[PhotoQueue] Error deleting local file:", error);
          }
        }
      }

      return count;
    },
    [realm, allPhotos]
  );

  /**
   * Reset photos stuck in "syncing" or "uploaded" status back to appropriate state
   * Should be called on app start to recover from crashes during sync
   * - "syncing" → "waiting" (needs full upload)
   * - "uploaded" with remotePhotoId → stays "uploaded" (only needs confirmation)
   * - "uploaded" without remotePhotoId → "waiting" (needs full upload)
   */
  const resetStuckSyncingPhotos = useCallback((): number => {
    const stuckSyncing = allPhotos.filtered('status == "syncing"');
    const stuckUploaded = allPhotos.filtered(
      'status == "uploaded" AND remotePhotoId == null'
    );

    const count = stuckSyncing.length + stuckUploaded.length;

    if (count > 0) {
      realm.write(() => {
        stuckSyncing.forEach((photo) => {
          photo.status = "waiting";
        });
        stuckUploaded.forEach((photo) => {
          photo.status = "waiting";
        });
      });
    }

    return count;
  }, [realm, allPhotos]);

  /**
   * Clear all failed photos from the queue
   */
  const clearAllFailedPhotos = useCallback(async (): Promise<number> => {
    const failed = allPhotos.filtered('status == "failed"');
    const count = failed.length;

    if (count === 0) return 0;

    // Collect URIs before deleting
    const localUris = [...failed].map((p) => p.localUri);

    realm.write(() => {
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
        console.warn("[PhotoQueue] Error deleting local file:", error);
      }
    }

    return count;
  }, [realm, allPhotos]);

  /**
   * Detect and handle orphaned photos.
   *
   * Orphaned photos are photos where:
   * - physicalAdvanceId is null (advance never synced to server)
   * - advanceLocalId doesn't match any existing PendingAdvanceSubmission
   *
   * This can happen if the app crashes after the advance is deleted from the
   * local queue but before the photos are updated with the physicalAdvanceId.
   *
   * @returns Object with counts of orphaned photos found and handled
   */
  const detectAndHandleOrphanedPhotos = useCallback((): {
    orphanedCount: number;
    handledCount: number;
  } => {
    // Get photos that are waiting for their advance to sync
    // (physicalAdvanceId is null means advance hasn't synced yet)
    const photosWaitingForAdvance = allPhotos.filtered(
      "physicalAdvanceId == null"
    );

    if (photosWaitingForAdvance.length === 0) {
      return { orphanedCount: 0, handledCount: 0 };
    }

    // Build a Set of existing advance IDs for fast lookup
    const existingAdvanceIds = new Set(
      [...allAdvances].map((advance) => advance._id)
    );

    // Find orphaned photos (linked to advances that no longer exist)
    const orphanedPhotos = [...photosWaitingForAdvance].filter(
      (photo) => !existingAdvanceIds.has(photo.advanceLocalId)
    );

    if (orphanedPhotos.length === 0) {
      return { orphanedCount: 0, handledCount: 0 };
    }

    console.warn(
      `[PhotoQueue] Found ${orphanedPhotos.length} orphaned photos (advance was deleted but photos remain)`
    );

    // Mark orphaned photos as failed with a descriptive error
    realm.write(() => {
      orphanedPhotos.forEach((photo) => {
        photo.status = "failed";
        photo.errorMessage =
          "El avance asociado fue eliminado. La foto no pudo sincronizarse debido a un error durante el envío.";
      });
    });

    console.log(
      `[PhotoQueue] Marked ${orphanedPhotos.length} orphaned photos as failed`
    );

    return {
      orphanedCount: orphanedPhotos.length,
      handledCount: orphanedPhotos.length,
    };
  }, [realm, allPhotos, allAdvances]);

  /**
   * Get a single photo by ID
   */
  const getPhotoById = useCallback(
    (photoId: string): PendingPhotoSubmission | null => {
      return realm.objectForPrimaryKey(PendingPhotoSubmission, photoId);
    },
    [realm]
  );

  /**
   * Check if local file exists for a photo
   */
  const checkPhotoFileExists = useCallback(
    async (photoId: string): Promise<boolean> => {
      const photo = realm.objectForPrimaryKey(PendingPhotoSubmission, photoId);
      if (!photo) return false;

      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.localUri);
        return fileInfo.exists;
      } catch {
        return false;
      }
    },
    [realm]
  );

  return {
    // Reactive queries
    allPhotos,
    pendingPhotos,
    waitingPhotos,
    syncingPhotos,
    uploadedPhotos,
    failedPhotos,

    // Counts
    getPhotoCounts,

    // Write operations
    addPhotosToQueue,
    updatePhysicalAdvanceId,
    markPhotosAsWaiting,
    markPhotoAsSyncing,
    markPhotoAsUploaded,
    markPhotoAsFailed,
    markPhotoAsWaiting,
    removePhoto,
    removePhotosByAdvanceId,
    resetStuckSyncingPhotos,
    clearAllFailedPhotos,
    detectAndHandleOrphanedPhotos,

    // Read operations
    getPhotosByAdvanceId,
    getPhotoById,
    checkPhotoFileExists,
  };
}
