import { StyleSheet } from "react-native";

const photoCaptureStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  photosContainer: {
    padding: 4,
  },
  photoContainer: {
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  syncedIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#27ae60",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3498db",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ecf0f1",
  },
  emptyContainer: {
    borderWidth: 2,
    borderColor: "#bdc3c7",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
    height: 150,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7f8c8d",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#95a5a6",
    textAlign: "center",
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
});

export default photoCaptureStyles;
