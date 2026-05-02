import { StyleSheet } from "react-native";

const programStatusBadgeStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
  },
  compactLabel: {
    fontSize: 12,
  },
});

export default programStatusBadgeStyles;
