import { useEffect } from "react";
import { useAppDispatch } from "src/redux/hooks";
import {
  updatePendingCount,
  updateFailedCount,
  setSyncingStatus,
  setOnlineStatus,
} from "src/redux/slices/avance/advanceSlice";
import { usePendingAdvanceQueue } from "./usePendingAdvanceQueue";
import { useNetworkStatus } from "../utils/useNetworkStatus";

/**
 * Hook that bridges Realm queue counts to Redux state.
 * This allows components using Redux to access the sync queue status
 * without directly depending on Realm.
 */
export function useSyncQueueToRedux() {
  const dispatch = useAppDispatch();
  const { pendingCount, failedCount, syncingCount } = usePendingAdvanceQueue();
  const isOnline = useNetworkStatus();

  // Sync pending count to Redux
  useEffect(() => {
    dispatch(updatePendingCount(pendingCount));
  }, [dispatch, pendingCount]);

  // Sync failed count to Redux
  useEffect(() => {
    dispatch(updateFailedCount(failedCount));
  }, [dispatch, failedCount]);

  // Sync syncing status to Redux
  useEffect(() => {
    dispatch(setSyncingStatus(syncingCount > 0));
  }, [dispatch, syncingCount]);

  // Sync online status to Redux
  useEffect(() => {
    if (isOnline !== null) {
      dispatch(setOnlineStatus(isOnline));
    }
  }, [dispatch, isOnline]);
}
