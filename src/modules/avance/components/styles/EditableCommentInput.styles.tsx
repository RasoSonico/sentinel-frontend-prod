import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    paddingLeft: 28, // Align with label text
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D1D6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1C1C1E",
    backgroundColor: "#F2F2F7",
    minHeight: 80,
    textAlignVertical: "top",
    paddingRight: 40, // Space for edit icon
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFEBEE",
  },
  editIcon: {
    position: "absolute",
    right: 12,
    top: 12,
    opacity: 0.6,
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