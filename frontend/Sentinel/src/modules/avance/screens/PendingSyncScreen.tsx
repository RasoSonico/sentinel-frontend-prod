import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { useSyncWorker } from "src/providers/SyncWorkerProvider";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";
import { DesignTokens } from "src/styles/designTokens";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";

const PendingSyncScreen: React.FC = () => {
  const {
    allItems,
    pendingCount,
    failedCount,
    syncingCount,
    removeFromQueue,
    markAsPending,
  } = usePendingAdvanceQueue();

  const { syncNow, isSyncing } = useSyncWorker();
  const isOnline = useNetworkStatus();

  const handleRetry = useCallback(
    (id: string) => {
      markAsPending(id);
      syncNow();
    },
    [markAsPending, syncNow]
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeFromQueue(id);
    },
    [removeFromQueue]
  );

  const handleRetryAll = useCallback(() => {
    allItems.forEach((item) => {
      if (item.status === "failed") {
        markAsPending(item._id);
      }
    });
    syncNow();
  }, [allItems, markAsPending, syncNow]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return { name: "time-outline" as const, color: DesignTokens.colors.warning[500] };
      case "syncing":
        return { name: "sync" as const, color: DesignTokens.colors.primary[500] };
      case "failed":
        return { name: "alert-circle" as const, color: DesignTokens.colors.error[500] };
      default:
        return { name: "help-circle-outline" as const, color: DesignTokens.colors.neutral[400] };
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
            <Ionicons name={statusIcon.name} size={14} color={statusIcon.color} />
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
            <Ionicons name="warning-outline" size={14} color={DesignTokens.colors.error[500]} />
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
            <ActivityIndicator size="small" color={DesignTokens.colors.primary[500]} />
            <Text style={styles.syncingText}>Enviando...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.networkStatus}>
        <Ionicons
          name={isOnline ? "cloud-done-outline" : "cloud-offline-outline"}
          size={18}
          color={isOnline ? DesignTokens.colors.success[500] : DesignTokens.colors.error[500]}
        />
        <Text
          style={[
            styles.networkStatusText,
            { color: isOnline ? DesignTokens.colors.success[600] : DesignTokens.colors.error[600] },
          ]}
        >
          {isOnline ? "Conectado" : "Sin conexión"}
        </Text>
      </View>

      <View style={styles.countsContainer}>
        {pendingCount > 0 && (
          <View style={[styles.countBadge, styles.pendingBadge]}>
            <Ionicons name="time-outline" size={12} color={DesignTokens.colors.warning[600]} />
            <Text style={[styles.countBadgeText, { color: DesignTokens.colors.warning[700] }]}>
              {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {failedCount > 0 && (
          <View style={[styles.countBadge, styles.failedBadge]}>
            <Ionicons name="alert-circle" size={12} color={DesignTokens.colors.error[600]} />
            <Text style={[styles.countBadgeText, { color: DesignTokens.colors.error[700] }]}>
              {failedCount} fallido{failedCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {syncingCount > 0 && (
          <View style={[styles.countBadge, styles.syncingBadge]}>
            <ActivityIndicator size={10} color={DesignTokens.colors.primary[600]} />
            <Text style={[styles.countBadgeText, { color: DesignTokens.colors.primary[700] }]}>
              {syncingCount} sincronizando
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="checkmark-circle-outline"
        size={64}
        color={DesignTokens.colors.success[400]}
      />
      <Text style={styles.emptyTitle}>Todo sincronizado</Text>
      <Text style={styles.emptySubtitle}>
        No hay avances pendientes de enviar
      </Text>
    </View>
  );

  const sortedItems = [...allItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Cola de sincronización</Text>
      </View>

      {renderHeader()}

      {allItems.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {allItems.length > 0 && !isSyncing && isOnline && (
        <View style={styles.bottomActions}>
          {failedCount > 0 && (
            <TouchableOpacity
              style={[styles.bottomButton, styles.retryAllButton]}
              onPress={handleRetryAll}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.bottomButtonText}>
                Reintentar fallidos ({failedCount})
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.bottomButton, styles.syncAllButton]}
            onPress={syncNow}
          >
            <Ionicons name="sync" size={20} color="#fff" />
            <Text style={styles.bottomButtonText}>Sincronizar ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSyncing && (
        <View style={styles.syncingOverlay}>
          <ActivityIndicator size="small" color={DesignTokens.colors.primary[500]} />
          <Text style={styles.syncingOverlayText}>Sincronizando...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[800],
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DesignTokens.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  networkStatusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  countsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingBadge: {
    backgroundColor: DesignTokens.colors.warning[100],
  },
  failedBadge: {
    backgroundColor: DesignTokens.colors.error[100],
  },
  syncingBadge: {
    backgroundColor: DesignTokens.colors.primary[100],
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemContainer: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    ...DesignTokens.shadows.sm,
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
    color: DesignTokens.colors.neutral[500],
  },
  itemContent: {
    gap: 4,
  },
  catalogText: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[800],
  },
  conceptText: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[600],
  },
  volumeText: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: DesignTokens.colors.error[50],
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: DesignTokens.colors.error[700],
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
    backgroundColor: DesignTokens.colors.primary[500],
  },
  deleteButton: {
    backgroundColor: DesignTokens.colors.error[500],
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
    color: DesignTokens.colors.primary[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
  },
  emptySubtitle: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[500],
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 8,
    padding: 16,
    backgroundColor: DesignTokens.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  bottomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryAllButton: {
    backgroundColor: DesignTokens.colors.warning[500],
  },
  syncAllButton: {
    backgroundColor: DesignTokens.colors.success[500],
  },
  bottomButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  syncingOverlay: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DesignTokens.colors.primary[50],
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.primary[200],
  },
  syncingOverlayText: {
    color: DesignTokens.colors.primary[700],
    fontWeight: "600",
    fontSize: 14,
  },
});

export default PendingSyncScreen;
