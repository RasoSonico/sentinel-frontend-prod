import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: "#333",
    flex: 1,
  },
  small: {
    fontSize: 12,
  },
  medium: {
    fontSize: 14,
  },
  large: {
    fontSize: 16,
  },
});

// Separate object for icon sizes since StyleSheet.create doesn't accept custom properties
export const iconSizes = {
  small: 14,
  medium: 16,
  large: 18,
};

export default styles;