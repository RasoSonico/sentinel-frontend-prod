import { useEffect } from "react";
import { useAppDispatch } from "src/redux/hooks";
import {
  updatePendingCount,
  updateFailedCount,
  setSyncingStatus,
  setOnlineStatus,
  updatePendingPhotosCount,
  updateWaitingPhotosCount,
  updateSyncingPhotosCount,
  updateUploadedPhotosCount,
  updateFailedPhotosCount,
} from "src/redux/slices/avance/advanceSlice";
import { usePendingAdvanceQueue } from "./usePendingAdvanceQueue";
import { usePendingPhotoQueue } from "./usePendingPhotoQueue";
import { useNetworkStatus } from "../utils/useNetworkStatus";

/**
 * Hook that bridges Realm queue counts to Redux state.
 * This allows components using Redux to access the sync queue status
 * without directly depending on Realm.
 */
export function useSyncQueueToRedux() {
  const dispatch = useAppDispatch();
  const { pendingCount, failedCount, syncingCount } = usePendingAdvanceQueue();
  const {
    pendingPhotos,
    waitingPhotos,
    syncingPhotos,
    uploadedPhotos,
    failedPhotos,
  } = usePendingPhotoQueue();
  const isOnline = useNetworkStatus();

  // Sync advance pending count to Redux
  useEffect(() => {
    dispatch(updatePendingCount(pendingCount));
  }, [dispatch, pendingCount]);

  // Sync advance failed count to Redux
  useEffect(() => {
    dispatch(updateFailedCount(failedCount));
  }, [dispatch, failedCount]);

  // Sync advance syncing status to Redux
  useEffect(() => {
    dispatch(setSyncingStatus(syncingCount > 0));
  }, [dispatch, syncingCount]);

  // Sync online status to Redux
  useEffect(() => {
    if (isOnline !== null) {
      dispatch(setOnlineStatus(isOnline));
    }
  }, [dispatch, isOnline]);

  // Sync photo pending count to Redux
  useEffect(() => {
    dispatch(updatePendingPhotosCount(pendingPhotos.length));
  }, [dispatch, pendingPhotos.length]);

  // Sync photo waiting count to Redux
  useEffect(() => {
    dispatch(updateWaitingPhotosCount(waitingPhotos.length));
  }, [dispatch, waitingPhotos.length]);

  // Sync photo syncing count to Redux
  useEffect(() => {
    dispatch(updateSyncingPhotosCount(syncingPhotos.length));
  }, [dispatch, syncingPhotos.length]);

  // Sync photo uploaded count to Redux
  useEffect(() => {
    dispatch(updateUploadedPhotosCount(uploadedPhotos.length));
  }, [dispatch, uploadedPhotos.length]);

  // Sync photo failed count to Redux
  useEffect(() => {
    dispatch(updateFailedPhotosCount(failedPhotos.length));
  }, [dispatch, failedPhotos.length]);
}
