import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    paddingLeft: 28, // Align with label text
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    fontWeight: "600",
    color: "#007AFF",
    backgroundColor: "#F2F2F7",
    paddingRight: 40, // Space for edit icon
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFEBEE",
  },
  editIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -8,
  },
  unitContainer: {
    backgroundColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 50,
    alignItems: "center",
  },
  unitText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingLeft: 4,
  },
  errorText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#FF3B30",
    fontWeight: "500",
  },
});

export default styles;