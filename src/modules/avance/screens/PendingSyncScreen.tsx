import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  ScrollView,
  SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { usePendingPhotoQueue } from "src/hooks/avance/usePendingPhotoQueue";
import { usePhotoSyncWorker } from "src/hooks/avance/usePhotoSyncWorker";
import { useSyncWorker } from "src/providers/SyncWorkerProvider";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";
import { PendingPhotoSubmission } from "src/realm/pendingAdvance/PendingPhotoSubmission";
import { DesignTokens } from "src/styles/designTokens";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { telemetry } from "src/services/telemetry";

// Types for section list
interface PendingAdvanceItem {
  type: "advance";
  data: PendingAdvanceSubmission;
}

interface SyncedAdvancePhotosItem {
  type: "synced-photos";
  physicalAdvanceId: number;
  photos: PendingPhotoSubmission[];
  createdAt: Date;
}

type SyncItem = PendingAdvanceItem | SyncedAdvancePhotosItem;

interface Section {
  title: string;
  data: SyncItem[];
}

const PendingSyncScreen: React.FC = () => {
  const {
    allItems,
    pendingCount,
    failedCount,
    syncingCount,
    removeFromQueue,
    markAsPending,
  } = usePendingAdvanceQueue();

  const {
    getPhotosByAdvanceId,
    allPhotos,
    waitingPhotos,
    syncingPhotos,
    uploadedPhotos,
    failedPhotos,
    markPhotoAsWaiting,
    removePhoto,
  } = usePendingPhotoQueue();

  const { syncNow: syncPhotosNow, retryPhoto } = usePhotoSyncWorker();
  const { syncNow, isSyncing } = useSyncWorker();
  const isOnline = useNetworkStatus();

  // Get photos whose advance has synced (physicalAdvanceId is set)
  // These are "orphaned" photos that need to be shown separately
  const syncedAdvancePhotos = useMemo(() => {
    const photosWithSyncedAdvance = [...allPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    );

    // Group by physicalAdvanceId
    const grouped = new Map<number, PendingPhotoSubmission[]>();
    photosWithSyncedAdvance.forEach((photo) => {
      const id = photo.physicalAdvanceId!;
      if (!grouped.has(id)) {
        grouped.set(id, []);
      }
      grouped.get(id)!.push(photo);
    });

    // Convert to array and sort by most recent
    return Array.from(grouped.entries())
      .map(([physicalAdvanceId, photos]) => ({
        physicalAdvanceId,
        photos,
        createdAt: photos.reduce(
          (latest, p) => (p.createdAt > latest ? p.createdAt : latest),
          photos[0]?.createdAt || new Date(),
        ),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [allPhotos]);

  // Photo counts for synced advances
  const syncedPhotosCounts = useMemo(() => {
    const waiting = [...waitingPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    ).length;
    const syncing = [...syncingPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    ).length;
    const uploaded = [...uploadedPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    ).length;
    const failed = [...failedPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    ).length;
    return {
      waiting,
      syncing,
      uploaded,
      failed,
      total: waiting + syncing + uploaded + failed,
    };
  }, [waitingPhotos, syncingPhotos, uploadedPhotos, failedPhotos]);

  // Build sections for SectionList
  const sections: Section[] = useMemo(() => {
    const result: Section[] = [];

    // Section 1: Pending advances
    if (allItems.length > 0) {
      const sortedItems = [...allItems].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      result.push({
        title: "Avances pendientes de envío",
        data: sortedItems.map((item) => ({
          type: "advance" as const,
          data: item,
        })),
      });
    }

    // Section 2: Synced advances with pending photos
    if (syncedAdvancePhotos.length > 0) {
      result.push({
        title: "Fotos pendientes de envío",
        data: syncedAdvancePhotos.map((group) => ({
          type: "synced-photos" as const,
          physicalAdvanceId: group.physicalAdvanceId,
          photos: group.photos,
          createdAt: group.createdAt,
        })),
      });
    }

    return result;
  }, [allItems, syncedAdvancePhotos]);

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

  const handleRetryPhoto = useCallback(
    (photoId: string) => {
      retryPhoto(photoId);
    },
    [retryPhoto],
  );

  const handleDeletePhoto = useCallback(
    async (photoId: string) => {
      await removePhoto(photoId, true);
    },
    [removePhoto],
  );

  const handleRetryAllPhotos = useCallback(() => {
    [...failedPhotos]
      .filter((p) => p.physicalAdvanceId !== null)
      .forEach((photo) => {
        markPhotoAsWaiting(photo._id);
      });
    syncPhotosNow();
  }, [failedPhotos, markPhotoAsWaiting, syncPhotosNow]);

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
        return {
          name: "time-outline" as const,
          color: DesignTokens.colors.warning[500],
        };
      case "syncing":
        return {
          name: "sync" as const,
          color: DesignTokens.colors.primary[500],
        };
      case "failed":
        return {
          name: "alert-circle" as const,
          color: DesignTokens.colors.error[500],
        };
      default:
        return {
          name: "help-circle-outline" as const,
          color: DesignTokens.colors.neutral[400],
        };
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

  const getPhotoStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Esperando avance";
      case "waiting":
        return "En cola";
      case "syncing":
        return "Subiendo";
      case "uploaded":
        return "Confirmando";
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

  const renderAdvanceItem = (item: PendingAdvanceSubmission) => {
    const statusIcon = getStatusIcon(item.status);
    const isFailed = item.status === "failed";
    const isItemSyncing = item.status === "syncing";

    // Get photos for this advance (photos with matching advanceLocalId)
    const advancePhotos = getPhotosByAdvanceId(item._id);
    const photoCount = advancePhotos.length;

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

        {/* Photo thumbnails */}
        {photoCount > 0 && (
          <View style={styles.photosSection}>
            <View style={styles.photosSectionHeader}>
              <Ionicons
                name="camera-outline"
                size={14}
                color={DesignTokens.colors.neutral[600]}
              />
              <Text style={styles.photosLabel}>
                {photoCount} foto{photoCount !== 1 ? "s" : ""} (esperando envío
                del avance)
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoThumbnailsContainer}
            >
              {[...advancePhotos].map((photo) => (
                <View key={photo._id} style={styles.photoThumbnailWrapper}>
                  <Image
                    source={{ uri: photo.localUri }}
                    style={styles.photoThumbnail}
                    resizeMode="cover"
                  />
                  <View
                    style={[styles.photoStatusDot, styles.photoStatusPending]}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {isFailed && item.errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="warning-outline"
              size={14}
              color={DesignTokens.colors.error[500]}
            />
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
            <ActivityIndicator
              size="small"
              color={DesignTokens.colors.primary[500]}
            />
            <Text style={styles.syncingText}>Enviando avance...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSyncedPhotosItem = (
    physicalAdvanceId: number,
    photos: PendingPhotoSubmission[],
    createdAt: Date,
  ) => {
    const waitingCount = photos.filter((p) => p.status === "waiting").length;
    const syncingCount = photos.filter((p) => p.status === "syncing").length;
    const uploadedCount = photos.filter((p) => p.status === "uploaded").length;
    const failedCount = photos.filter((p) => p.status === "failed").length;

    const hasFailedPhotos = failedCount > 0;
    const allUploaded = uploadedCount === photos.length;
    const isSyncingPhotos = syncingCount > 0;

    return (
      <View style={[styles.itemContainer, styles.syncedAdvanceContainer]}>
        {/* Header with success indicator */}
        <View style={styles.itemHeader}>
          <View style={styles.statusBadge}>
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={DesignTokens.colors.success[500]}
            />
            <Text
              style={[
                styles.statusText,
                { color: DesignTokens.colors.success[600] },
              ]}
            >
              Avance enviado
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(createdAt)}</Text>
        </View>

        {/* Advance ID reference */}
        <View style={styles.syncedAdvanceInfo}>
          <Text style={styles.syncedAdvanceId}>
            Avance #{physicalAdvanceId}
          </Text>
          <Text style={styles.syncedAdvanceSubtitle}>
            {photos.length} foto{photos.length !== 1 ? "s" : ""} pendiente
            {photos.length !== 1 ? "s" : ""} de subir
          </Text>
        </View>

        {/* Photo status summary */}
        <View style={styles.photoStatusSummary}>
          {waitingCount > 0 && (
            <View
              style={[styles.photoStatusBadge, styles.photoStatusWaitingBadge]}
            >
              <Ionicons
                name="time-outline"
                size={12}
                color={DesignTokens.colors.warning[600]}
              />
              <Text style={styles.photoStatusBadgeText}>
                {waitingCount} en cola
              </Text>
            </View>
          )}
          {syncingCount > 0 && (
            <View
              style={[styles.photoStatusBadge, styles.photoStatusSyncingBadge]}
            >
              <ActivityIndicator
                size={10}
                color={DesignTokens.colors.primary[600]}
              />
              <Text style={styles.photoStatusBadgeText}>
                {syncingCount} subiendo
              </Text>
            </View>
          )}
          {uploadedCount > 0 && (
            <View
              style={[styles.photoStatusBadge, styles.photoStatusUploadedBadge]}
            >
              <Ionicons
                name="cloud-done-outline"
                size={12}
                color={DesignTokens.colors.success[600]}
              />
              <Text style={styles.photoStatusBadgeText}>
                {uploadedCount} confirmando
              </Text>
            </View>
          )}
          {failedCount > 0 && (
            <View
              style={[styles.photoStatusBadge, styles.photoStatusFailedBadge]}
            >
              <Ionicons
                name="alert-circle"
                size={12}
                color={DesignTokens.colors.error[600]}
              />
              <Text style={styles.photoStatusBadgeText}>
                {failedCount} fallido{failedCount !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Photo thumbnails with individual status */}
        <View style={styles.photosSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoThumbnailsContainer}
          >
            {photos.map((photo) => (
              <View key={photo._id} style={styles.photoThumbnailWrapper}>
                <Image
                  source={{ uri: photo.localUri }}
                  style={[
                    styles.photoThumbnail,
                    photo.status === "failed" && styles.photoThumbnailFailed,
                  ]}
                  resizeMode="cover"
                />
                <View
                  style={[
                    styles.photoStatusDot,
                    photo.status === "failed"
                      ? styles.photoStatusFailed
                      : photo.status === "uploaded"
                        ? styles.photoStatusUploaded
                        : photo.status === "syncing"
                          ? styles.photoStatusSyncing
                          : styles.photoStatusWaiting,
                  ]}
                />
                {photo.status === "syncing" && (
                  <View style={styles.photoSyncingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Failed photo errors */}
        {hasFailedPhotos && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="warning-outline"
              size={14}
              color={DesignTokens.colors.error[500]}
            />
            <Text style={styles.errorText} numberOfLines={2}>
              {photos.find((p) => p.status === "failed")?.errorMessage ||
                "Error al subir fotos"}
            </Text>
          </View>
        )}

        {/* Actions for failed photos */}
        {hasFailedPhotos && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={() => {
                photos
                  .filter((p) => p.status === "failed")
                  .forEach((p) => handleRetryPhoto(p._id));
              }}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reintentar fotos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Syncing indicator */}
        {isSyncingPhotos && (
          <View style={styles.syncingIndicator}>
            <ActivityIndicator
              size="small"
              color={DesignTokens.colors.primary[500]}
            />
            <Text style={styles.syncingText}>Subiendo fotos...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: SyncItem }) => {
    if (item.type === "advance") {
      return renderAdvanceItem(item.data);
    } else {
      return renderSyncedPhotosItem(
        item.physicalAdvanceId,
        item.photos,
        item.createdAt,
      );
    }
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.networkStatus}>
        <Ionicons
          name={isOnline ? "cloud-done-outline" : "cloud-offline-outline"}
          size={18}
          color={
            isOnline
              ? DesignTokens.colors.success[500]
              : DesignTokens.colors.error[500]
          }
        />
        <Text
          style={[
            styles.networkStatusText,
            {
              color: isOnline
                ? DesignTokens.colors.success[600]
                : DesignTokens.colors.error[600],
            },
          ]}
        >
          {isOnline ? "Conectado" : "Sin conexión"}
        </Text>
      </View>

      <View style={styles.countsContainer}>
        {/* Advance counts */}
        {pendingCount > 0 && (
          <View style={[styles.countBadge, styles.pendingBadge]}>
            <Ionicons
              name="document-text-outline"
              size={12}
              color={DesignTokens.colors.warning[600]}
            />
            <Text
              style={[
                styles.countBadgeText,
                { color: DesignTokens.colors.warning[700] },
              ]}
            >
              {pendingCount} avance{pendingCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {failedCount > 0 && (
          <View style={[styles.countBadge, styles.failedBadge]}>
            <Ionicons
              name="alert-circle"
              size={12}
              color={DesignTokens.colors.error[600]}
            />
            <Text
              style={[
                styles.countBadgeText,
                { color: DesignTokens.colors.error[700] },
              ]}
            >
              {failedCount} fallido{failedCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {syncingCount > 0 && (
          <View style={[styles.countBadge, styles.syncingBadge]}>
            <ActivityIndicator
              size={10}
              color={DesignTokens.colors.primary[600]}
            />
            <Text
              style={[
                styles.countBadgeText,
                { color: DesignTokens.colors.primary[700] },
              ]}
            >
              {syncingCount} sincronizando
            </Text>
          </View>
        )}

        {/* Photo counts */}
        {syncedPhotosCounts.total > 0 && (
          <View style={[styles.countBadge, styles.photoBadge]}>
            <Ionicons
              name="camera-outline"
              size={12}
              color={DesignTokens.colors.primary[600]}
            />
            <Text
              style={[
                styles.countBadgeText,
                { color: DesignTokens.colors.primary[700] },
              ]}
            >
              {syncedPhotosCounts.total} foto
              {syncedPhotosCounts.total !== 1 ? "s" : ""}
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
        No hay avances ni fotos pendientes de enviar
      </Text>
    </View>
  );

  const hasContent = allItems.length > 0 || syncedAdvancePhotos.length > 0;
  const hasFailedItems = failedCount > 0 || syncedPhotosCounts.failed > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Estatus</Text>
      </View>

      {renderHeader()}

      {!hasContent ? (
        renderEmpty()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) =>
            item.type === "advance"
              ? item.data._id
              : `photos-${item.physicalAdvanceId}`
          }
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {hasContent && !isSyncing && isOnline && (
        <View style={styles.bottomActions}>
          {hasFailedItems && (
            <TouchableOpacity
              style={[styles.bottomButton, styles.retryAllButton]}
              onPress={() => {
                handleRetryAll();
                handleRetryAllPhotos();
              }}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.bottomButtonText}>Reintentar todo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.bottomButton, styles.syncAllButton]}
            onPress={() => {
              telemetry.trackEvent("sync_triggered", {
                pending_advances: pendingCount,
                pending_photos: waitingPhotos.length + syncingPhotos.length,
                trigger: "manual",
              });
              syncNow();
              syncPhotosNow();
            }}
          >
            <Ionicons name="sync" size={20} color="#fff" />
            <Text style={styles.bottomButtonText}>Sincronizar ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSyncing && (
        <View style={styles.syncingOverlay}>
          <ActivityIndicator
            size="small"
            color={DesignTokens.colors.primary[500]}
          />
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
  photoBadge: {
    backgroundColor: DesignTokens.colors.primary[50],
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  syncedAdvanceContainer: {
    borderColor: DesignTokens.colors.success[200],
    borderLeftWidth: 3,
    borderLeftColor: DesignTokens.colors.success[500],
  },
  syncedAdvanceInfo: {
    marginBottom: 12,
  },
  syncedAdvanceId: {
    fontSize: 16,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[800],
  },
  syncedAdvanceSubtitle: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  photoStatusSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  photoStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoStatusWaitingBadge: {
    backgroundColor: DesignTokens.colors.warning[100],
  },
  photoStatusSyncingBadge: {
    backgroundColor: DesignTokens.colors.primary[100],
  },
  photoStatusUploadedBadge: {
    backgroundColor: DesignTokens.colors.success[100],
  },
  photoStatusFailedBadge: {
    backgroundColor: DesignTokens.colors.error[100],
  },
  photoStatusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
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
  photosSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
  },
  photosSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  photosLabel: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[600],
    fontWeight: "500",
  },
  photoThumbnailsContainer: {
    gap: 8,
  },
  photoThumbnailWrapper: {
    position: "relative",
  },
  photoThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  photoThumbnailFailed: {
    opacity: 0.6,
  },
  photoSyncingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  photoStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.background.primary,
  },
  photoStatusPending: {
    backgroundColor: DesignTokens.colors.neutral[400],
  },
  photoStatusWaiting: {
    backgroundColor: DesignTokens.colors.warning[500],
  },
  photoStatusSyncing: {
    backgroundColor: DesignTokens.colors.primary[500],
  },
  photoStatusUploaded: {
    backgroundColor: DesignTokens.colors.success[500],
  },
  photoStatusFailed: {
    backgroundColor: DesignTokens.colors.error[500],
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
