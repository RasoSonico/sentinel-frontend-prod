import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface QueueHeaderButtonProps {
  pendingCount: number;
  failedCount: number;
  syncingCount: number;
  onPress: () => void;
}

/**
 * Ícono de nube con badge para el header de navegación: estado de la cola
 * offline de avances. Navega a PendingSyncScreen (lo decide el llamador).
 */
const QueueHeaderButton: React.FC<QueueHeaderButtonProps> = ({
  pendingCount,
  failedCount,
  syncingCount,
  onPress,
}) => {
  const totalCount = pendingCount + failedCount + syncingCount;
  const hasErrors = failedCount > 0;
  const isSyncing = syncingCount > 0;

  const iconName = isSyncing
    ? "sync"
    : hasErrors
      ? "alert-circle"
      : "cloud-upload-outline";

  const badgeColor = hasErrors
    ? "#e74c3c"
    : isSyncing || pendingCount > 0
      ? "#f39c12"
      : undefined;

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Ionicons name={iconName} size={22} color="#fff" />
      {totalCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>
            {totalCount > 99 ? "99+" : String(totalCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default QueueHeaderButton;
