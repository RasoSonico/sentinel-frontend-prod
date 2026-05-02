import React from "react";
import OfflineIndicator from "../../components/OfflineIndicator";
import { useAdvanceSubmit } from "../hooks/useAdvanceSubmit";
import { useAppSelector } from "src/redux/hooks";
import { selectOfflineSync } from "src/redux/slices/avance/advanceSlice";

export function OfflineIndicatorConnected() {
  const offlineSyncState = useAppSelector(selectOfflineSync);
  const { pendingCount, failedCount } = useAdvanceSubmit();

  return (
    <OfflineIndicator
      pendingCount={pendingCount}
      failedCount={failedCount}
      isSyncing={offlineSyncState.isSyncing}
      lastSyncTime={
        offlineSyncState.lastSyncTime
          ? new Date(offlineSyncState.lastSyncTime)
          : null
      }
    />
  );
}
