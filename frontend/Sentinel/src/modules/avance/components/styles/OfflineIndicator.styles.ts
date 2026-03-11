import { StyleSheet } from "react-native";

const offlineIndicatorStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineContainer: {
    backgroundColor: "#ffecec",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  onlineContainer: {
    backgroundColor: "#ecf8ff",
    borderWidth: 1,
    borderColor: "#3498db",
  },
  errorContainer: {
    backgroundColor: "#fff3f3",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  statusText: {
    fontWeight: "600",
    fontSize: 14,
  },
  lastSyncText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: "#3498db",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  viewQueueButton: {
    backgroundColor: "#e74c3c",
    marginLeft: 8,
  },
});

export default offlineIndicatorStyles;
