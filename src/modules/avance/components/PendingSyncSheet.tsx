import React, { useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { usePendingPhotoQueue } from "src/hooks/avance/usePendingPhotoQueue";
import { useSyncWorker } from "src/providers/SyncWorkerProvider";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";
import { PendingPhotoSubmission } from "src/realm/pendingAdvance/PendingPhotoSubmission";

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
    removeFromQueueWithPhotos,
    markAsPending,
    getPhotoCountForAdvance,
  } = usePendingAdvanceQueue();

  const {
    allPhotos,
    failedPhotos,
    uploadedPhotos,
    getPhotosByAdvanceId,
    removePhoto,
    getPhotoCounts,
  } = usePendingPhotoQueue();

  const {
    syncNow,
    isSyncing,
    retryPhoto: retryPhotoFromWorker,
  } = useSyncWorker();

  const photoCounts = getPhotoCounts();

  // Group failed photos that don't belong to a pending advance (orphaned failed photos)
  const orphanedFailedPhotos = useMemo(() => {
    const advanceIds = new Set([...allItems].map((item) => item._id));
    return [...failedPhotos].filter(
      (photo) => !advanceIds.has(photo.advanceLocalId),
    );
  }, [failedPhotos, allItems]);

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

  const handleRetryAdvance = useCallback(
    (id: string) => {
      markAsPending(id);
      syncNow();
    },
    [markAsPending, syncNow],
  );

  const handleDeleteAdvance = useCallback(
    async (id: string) => {
      await removeFromQueueWithPhotos(id, true);
    },
    [removeFromQueueWithPhotos],
  );

  const handleRetryPhoto = useCallback(
    async (photoId: string) => {
      await retryPhotoFromWorker(photoId);
    },
    [retryPhotoFromWorker],
  );

  const handleDeletePhoto = useCallback(
    async (photoId: string) => {
      await removePhoto(photoId, true);
    },
    [removePhoto],
  );

  const getAdvanceStatusIcon = (status: string) => {
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

  const getPhotoStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return { name: "time-outline" as const, color: "#95a5a6" };
      case "waiting":
        return { name: "cloud-upload-outline" as const, color: "#f39c12" };
      case "syncing":
        return { name: "cloud-upload" as const, color: "#3498db" };
      case "uploaded":
        return { name: "cloud-done-outline" as const, color: "#27ae60" };
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
      case "waiting":
        return "En cola";
      case "syncing":
        return "Sincronizando";
      case "uploaded":
        return "Subida (confirmando)";
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

  const renderPhotoItem = (
    photo: PendingPhotoSubmission,
    isOrphaned: boolean = false,
  ) => {
    const statusIcon = getPhotoStatusIcon(photo.status);
    const isFailed = photo.status === "failed";
    const isUploaded = photo.status === "uploaded";
    const isPhotoSyncing = photo.status === "syncing";
    const canRetry = isFailed || isUploaded;

    return (
      <View key={photo._id} style={styles.photoItem}>
        <Image source={{ uri: photo.localUri }} style={styles.photoThumbnail} />
        <View style={styles.photoInfo}>
          <Text style={styles.photoFilename} numberOfLines={1}>
            {photo.filename}
          </Text>
          <View style={styles.photoStatusRow}>
            <Ionicons
              name={statusIcon.name}
              size={12}
              color={statusIcon.color}
            />
            <Text style={[styles.photoStatusText, { color: statusIcon.color }]}>
              {getStatusLabel(photo.status)}
            </Text>
            {isPhotoSyncing && (
              <ActivityIndicator
                size="small"
                color="#3498db"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          {isFailed && photo.errorMessage && (
            <Text style={styles.photoErrorText} numberOfLines={1}>
              {photo.errorMessage}
            </Text>
          )}
        </View>
        {(canRetry || isOrphaned) && (
          <View style={styles.photoActions}>
            {canRetry && (
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={() => handleRetryPhoto(photo._id)}
              >
                <Ionicons name="refresh" size={16} color="#3498db" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.photoActionButton}
              onPress={() => handleDeletePhoto(photo._id)}
            >
              <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderAdvanceItem = ({ item }: { item: PendingAdvanceSubmission }) => {
    const statusIcon = getAdvanceStatusIcon(item.status);
    const isFailed = item.status === "failed";
    const isItemSyncing = item.status === "syncing";

    // Get photos for this advance
    const advancePhotos = [...getPhotosByAdvanceId(item._id)];
    const hasPhotos = advancePhotos.length > 0;
    const pendingPhotosForAdvance = advancePhotos.filter(
      (p) => p.status === "pending" || p.status === "waiting",
    );
    const failedPhotosForAdvance = advancePhotos.filter(
      (p) => p.status === "failed",
    );
    const syncingPhotosForAdvance = advancePhotos.filter(
      (p) => p.status === "syncing",
    );
    const uploadedPhotosForAdvance = advancePhotos.filter(
      (p) => p.status === "uploaded",
    );

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

        {/* Photo summary for this advance */}
        {hasPhotos && (
          <View style={styles.photoSummary}>
            <Ionicons name="camera-outline" size={14} color="#7f8c8d" />
            <Text style={styles.photoSummaryText}>
              {advancePhotos.length} foto{advancePhotos.length > 1 ? "s" : ""}
              {pendingPhotosForAdvance.length > 0 &&
                ` (${pendingPhotosForAdvance.length} pendiente${pendingPhotosForAdvance.length > 1 ? "s" : ""})`}
              {syncingPhotosForAdvance.length > 0 &&
                ` (${syncingPhotosForAdvance.length} sincronizando)`}
              {uploadedPhotosForAdvance.length > 0 &&
                ` (${uploadedPhotosForAdvance.length} confirmando)`}
              {failedPhotosForAdvance.length > 0 &&
                ` (${failedPhotosForAdvance.length} fallida${failedPhotosForAdvance.length > 1 ? "s" : ""})`}
            </Text>
          </View>
        )}

        {/* Show failed and uploaded (pending confirmation) photos for this advance */}
        {(failedPhotosForAdvance.length > 0 ||
          uploadedPhotosForAdvance.length > 0) && (
          <View style={styles.photosContainer}>
            {uploadedPhotosForAdvance.map((photo) => renderPhotoItem(photo))}
            {failedPhotosForAdvance.map((photo) => renderPhotoItem(photo))}
          </View>
        )}

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
              onPress={() => handleRetryAdvance(item._id)}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteAdvance(item._id)}
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

  // Check if there's any content to show
  const hasContent =
    allItems.length > 0 ||
    orphanedFailedPhotos.length > 0 ||
    photoCounts.waiting > 0 ||
    photoCounts.syncing > 0 ||
    photoCounts.uploaded > 0;

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
      <BottomSheetScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Estatus</Text>
          <View style={styles.countsContainer}>
            {pendingCount > 0 && (
              <View style={[styles.countBadge, styles.pendingBadge]}>
                <Text style={styles.countBadgeText}>
                  {pendingCount} avance{pendingCount > 1 ? "s" : ""} pendiente
                  {pendingCount > 1 ? "s" : ""}
                </Text>
              </View>
            )}
            {failedCount > 0 && (
              <View style={[styles.countBadge, styles.failedBadge]}>
                <Text style={styles.countBadgeText}>
                  {failedCount} avance{failedCount > 1 ? "s" : ""} fallido
                  {failedCount > 1 ? "s" : ""}
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
            {(photoCounts.waiting > 0 ||
              photoCounts.syncing > 0 ||
              photoCounts.uploaded > 0) && (
              <View style={[styles.countBadge, styles.photoBadge]}>
                <Ionicons name="camera-outline" size={12} color="#8e44ad" />
                <Text style={[styles.countBadgeText, { color: "#8e44ad" }]}>
                  {photoCounts.waiting +
                    photoCounts.syncing +
                    photoCounts.uploaded}{" "}
                  foto
                  {photoCounts.waiting +
                    photoCounts.syncing +
                    photoCounts.uploaded >
                  1
                    ? "s"
                    : ""}{" "}
                  en cola
                </Text>
              </View>
            )}
            {photoCounts.failed > 0 && (
              <View style={[styles.countBadge, styles.failedBadge]}>
                <Ionicons name="camera-outline" size={12} color="#e74c3c" />
                <Text style={[styles.countBadgeText, { color: "#e74c3c" }]}>
                  {photoCounts.failed} foto{photoCounts.failed > 1 ? "s" : ""}{" "}
                  fallida{photoCounts.failed > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {!hasContent ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color="#27ae60"
            />
            <Text style={styles.emptyText}>No hay elementos en la cola</Text>
          </View>
        ) : (
          <View style={styles.listContent}>
            {/* Advances Section */}
            {allItems.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Avances Pendientes</Text>
                {[...allItems]
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                  .map((item) => (
                    <View key={item._id}>{renderAdvanceItem({ item })}</View>
                  ))}
              </View>
            )}

            {/* Orphaned Failed Photos Section */}
            {orphanedFailedPhotos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fotos Fallidas</Text>
                <View style={styles.orphanedPhotosContainer}>
                  {orphanedFailedPhotos.map((photo) =>
                    renderPhotoItem(photo, true),
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Add padding for the sync button */}
        <View style={{ height: 80 }} />
      </BottomSheetScrollView>

      {hasContent && !isSyncing && (
        <TouchableOpacity style={styles.syncAllButton} onPress={syncNow}>
          <Ionicons name="sync" size={20} color="#fff" />
          <Text style={styles.syncAllButtonText}>Sincronizar todo</Text>
        </TouchableOpacity>
      )}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  photoBadge: {
    backgroundColor: "#f3e5f5",
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
    marginBottom: 8,
    marginTop: 16,
  },
  listContent: {
    paddingVertical: 8,
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
  photoSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  photoSummaryText: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  photosContainer: {
    marginTop: 8,
    gap: 8,
  },
  orphanedPhotosContainer: {
    gap: 8,
  },
  photoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    gap: 8,
  },
  photoThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#ecf0f1",
  },
  photoInfo: {
    flex: 1,
    gap: 2,
  },
  photoFilename: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2c3e50",
  },
  photoStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoStatusText: {
    fontSize: 11,
  },
  photoErrorText: {
    fontSize: 10,
    color: "#e74c3c",
  },
  photoActions: {
    flexDirection: "row",
    gap: 8,
  },
  photoActionButton: {
    padding: 6,
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
    paddingVertical: 60,
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
