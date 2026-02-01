import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/OfflineIndicator.styles";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";

interface OfflineIndicatorProps {
  pendingCount?: number;
  failedCount?: number;
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
  onSyncPress?: () => void;
  onViewQueuePress?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  pendingCount = 0,
  failedCount = 0,
  isSyncing = false,
  lastSyncTime = null,
  onSyncPress,
  onViewQueuePress,
}) => {
  const isOnline = useNetworkStatus();
  // Si está online y no hay elementos pendientes ni fallidos, no mostrar
  if (isOnline && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  // Formatear fecha de última sincronización
  const formatLastSync = () => {
    if (!lastSyncTime) return "Nunca";

    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();

    // Si es menos de un minuto
    if (diff < 60000) {
      return "Hace unos segundos";
    }

    // Si es menos de una hora
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
    }

    // Si es menos de un día
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
    }

    // Si es más de un día
    const days = Math.floor(diff / 86400000);
    return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  };

  const hasErrors = failedCount > 0;

  return (
    <View
      style={[
        styles.container,
        !isOnline
          ? styles.offlineContainer
          : hasErrors
            ? styles.errorContainer
            : styles.onlineContainer,
      ]}
    >
      <View style={styles.infoContainer}>
        <Ionicons
          name={!isOnline ? "cloud-offline" : hasErrors ? "alert-circle" : "cloud-upload"}
          size={18}
          color={!isOnline ? "#e74c3c" : hasErrors ? "#e74c3c" : "#3498db"}
          style={styles.icon}
        />

        <View>
          <Text style={styles.statusText}>
            {!isOnline
              ? "Modo sin conexión"
              : isSyncing
                ? "Sincronizando..."
                : failedCount > 0
                  ? `${failedCount} fallido${failedCount > 1 ? "s" : ""}${pendingCount > 0 ? `, ${pendingCount} pendiente${pendingCount > 1 ? "s" : ""}` : ""}`
                  : pendingCount > 0
                    ? `${pendingCount} pendiente${pendingCount > 1 ? "s" : ""} de sincronizar`
                    : "Sincronizado"}
          </Text>

          {lastSyncTime && (
            <Text style={styles.lastSyncText}>
              Última sincronización: {formatLastSync()}
            </Text>
          )}
        </View>
      </View>

      {isOnline && pendingCount > 0 && !isSyncing && onSyncPress && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={onSyncPress}
          disabled={isSyncing}
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.syncButtonText}>Sincronizar</Text>
        </TouchableOpacity>
      )}

      {hasErrors && onViewQueuePress && (
        <TouchableOpacity
          style={[styles.syncButton, styles.viewQueueButton]}
          onPress={onViewQueuePress}
        >
          <Ionicons name="list" size={16} color="#fff" />
          <Text style={styles.syncButtonText}>Ver cola</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default OfflineIndicator;
