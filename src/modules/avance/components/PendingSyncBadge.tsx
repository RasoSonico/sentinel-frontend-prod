import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";

interface PendingSyncBadgeProps {
  onPress?: () => void;
}

const PendingSyncBadge: React.FC<PendingSyncBadgeProps> = ({ onPress }) => {
  const { pendingCount, failedCount, syncingCount } = usePendingAdvanceQueue();

  const totalCount = pendingCount + failedCount + syncingCount;

  if (totalCount === 0) {
    return null;
  }

  const hasErrors = failedCount > 0;
  const isSyncing = syncingCount > 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        hasErrors ? styles.errorContainer : styles.normalContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={
          isSyncing
            ? "sync"
            : hasErrors
              ? "alert-circle"
              : "cloud-upload-outline"
        }
        size={16}
        color="#fff"
      />
      <Text style={styles.countText}>{totalCount}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  normalContainer: {
    backgroundColor: "#3498db",
  },
  errorContainer: {
    backgroundColor: "#e74c3c",
  },
  countText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
});

export default PendingSyncBadge;
