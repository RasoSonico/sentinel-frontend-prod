import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFF",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  cardFooter: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
    marginTop: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0366d6",
    borderRadius: 8,
  },
  retryText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
});
