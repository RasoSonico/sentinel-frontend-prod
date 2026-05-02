import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  small: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 10,
  },
  medium: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  large: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});

export default styles;