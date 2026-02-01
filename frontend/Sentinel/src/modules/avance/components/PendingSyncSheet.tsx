import React, { useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { useSyncWorker } from "src/providers/SyncWorkerProvider";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";

interface PendingSyncSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const PendingSyncSheet: React.FC<PendingSyncSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "80%"], []);

  const {
    allItems,
    pendingCount,
    failedCount,
    syncingCount,
    removeFromQueue,
    markAsPending,
  } = usePendingAdvanceQueue();

  const { syncNow, isSyncing } = useSyncWorker();

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleRetry = useCallback(
    (id: string) => {
      markAsPending(id);
      syncNow();
    },
    [markAsPending, syncNow],
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeFromQueue(id);
    },
    [removeFromQueue],
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return { name: "time-outline" as const, color: "#f39c12" };
      case "syncing":
        return { name: "sync" as const, color: "#3498db" };
      case "failed":
        return { name: "alert-circle" as const, color: "#e74c3c" };
      default:
        return { name: "help-circle-outline" as const, color: "#95a5a6" };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "syncing":
        return "Sincronizando";
      case "failed":
        return "Fallido";
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: PendingAdvanceSubmission }) => {
    const statusIcon = getStatusIcon(item.status);
    const isFailed = item.status === "failed";
    const isItemSyncing = item.status === "syncing";

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemHeader}>
          <View style={styles.statusBadge}>
            <Ionicons
              name={statusIcon.name}
              size={14}
              color={statusIcon.color}
            />
            <Text style={[styles.statusText, { color: statusIcon.color }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.itemContent}>
          <Text style={styles.catalogText} numberOfLines={1}>
            {item.catalogName}
          </Text>
          <Text style={styles.conceptText} numberOfLines={2}>
            {item.conceptDescription}
          </Text>
          <Text style={styles.volumeText}>
            Volumen: {item.volume} | {item.workItemName}
          </Text>
        </View>

        {isFailed && item.errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={14} color="#e74c3c" />
            <Text style={styles.errorText} numberOfLines={2}>
              {item.errorMessage}
            </Text>
          </View>
        )}

        {isFailed && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={() => handleRetry(item._id)}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item._id)}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isItemSyncing && (
          <View style={styles.syncingIndicator}>
            <ActivityIndicator size="small" color="#3498db" />
            <Text style={styles.syncingText}>Enviando...</Text>
          </View>
        )}
      </View>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cola de sincronización</Text>
          <View style={styles.countsContainer}>
            {pendingCount > 0 && (
              <View style={[styles.countBadge, styles.pendingBadge]}>
                <Text style={styles.countBadgeText}>
                  {pendingCount} pendientes
                </Text>
              </View>
            )}
            {failedCount > 0 && (
              <View style={[styles.countBadge, styles.failedBadge]}>
                <Text style={styles.countBadgeText}>
                  {failedCount} fallidos
                </Text>
              </View>
            )}
            {syncingCount > 0 && (
              <View style={[styles.countBadge, styles.syncingBadge]}>
                <Text style={styles.countBadgeText}>
                  {syncingCount} sincronizando
                </Text>
              </View>
            )}
          </View>
        </View>

        {allItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color="#27ae60"
            />
            <Text style={styles.emptyText}>No hay elementos en la cola</Text>
          </View>
        ) : (
          <FlatList
            data={[...allItems].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            )}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {allItems.length > 0 && !isSyncing && (
          <TouchableOpacity style={styles.syncAllButton} onPress={syncNow}>
            <Ionicons name="sync" size={20} color="#fff" />
            <Text style={styles.syncAllButtonText}>Sincronizar todo</Text>
          </TouchableOpacity>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8,
  },
  countsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: "#fff3e0",
  },
  failedBadge: {
    backgroundColor: "#ffebee",
  },
  syncingBadge: {
    backgroundColor: "#e3f2fd",
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingVertical: 16,
    paddingBottom: 80,
  },
  itemContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  itemContent: {
    gap: 4,
  },
  catalogText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  conceptText: {
    fontSize: 13,
    color: "#34495e",
  },
  volumeText: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#c0392b",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButton: {
    backgroundColor: "#3498db",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  syncingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  syncingText: {
    fontSize: 12,
    color: "#3498db",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#7f8c8d",
  },
  syncAllButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    borderRadius: 12,
  },
  syncAllButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default PendingSyncSheet;
