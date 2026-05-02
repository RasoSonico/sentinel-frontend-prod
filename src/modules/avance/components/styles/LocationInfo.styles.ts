import { StyleSheet } from "react-native";

const locationInfoStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecf0f1",
    padding: 12,
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: "#7f8c8d",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4f8",
    padding: 12,
    borderRadius: 8,
  },
  icon: {
    marginRight: 8,
  },
  infoText: {
    color: "#2980b9",
    flex: 1,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef9e7",
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: "#d35400",
    flex: 1,
  },
});

export default locationInfoStyles;
