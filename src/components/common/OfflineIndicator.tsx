import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/OfflineIndicator.styles";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";

/**
 * Franja de estado de sincronización, compartida por todos los módulos.
 *
 * Vivía en `modules/avance/components` porque ahí nació. Se mudó a la casa
 * común cuando Reportes la necesitó: es un componente puro —solo depende de
 * `useNetworkStatus` y de lo que reciba por props— y dejarlo en un módulo
 * habría obligado a que Reportes importara de Avances.
 *
 * **`isOnline === false` es lo ÚNICO que significa "sin red".** `useNetworkStatus`
 * devuelve tres valores y `null` es *todavía no se sabe*, pero esta franja lo
 * leía con `!isOnline`, y `!null` es `true`: durante el instante que va del
 * montaje a la respuesta de NetInfo afirmaba "Modo sin conexión" en rojo —aun
 * con la cola vacía, porque ese mismo `null` también le impedía salirse por el
 * retorno temprano—.
 *
 * La asimetría manda, igual que en los workers: decir "sin conexión" cuando no
 * se sabe asusta al usuario y contradice a la cola, que mientras tanto sí está
 * intentando. El precio es el caso patológico —si NetInfo nunca resuelve, la
 * franja no declara el modo sin conexión—, y es el que el proyecto ya eligió
 * pagar en todas partes.
 */
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
  const sinRed = isOnline === false;

  // Sin nada que reportar y sin un "no hay red" confirmado, la franja no se
  // dibuja. Mientras el estado de red es incógnita se calla: todavía no tiene
  // nada que decir.
  if (!sinRed && pendingCount === 0 && failedCount === 0 && !isSyncing) {
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
        sinRed
          ? styles.offlineContainer
          : hasErrors
            ? styles.errorContainer
            : styles.onlineContainer,
      ]}
    >
      <View style={styles.infoContainer}>
        <Ionicons
          name={sinRed ? "cloud-offline" : hasErrors ? "alert-circle" : "cloud-upload"}
          size={18}
          color={sinRed ? "#e74c3c" : hasErrors ? "#e74c3c" : "#3498db"}
          style={styles.icon}
        />

        <View>
          <Text style={styles.statusText}>
            {sinRed
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

      {!sinRed && pendingCount > 0 && !isSyncing && onSyncPress && (
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
