import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  variant = "primary",
  style,
  textStyle,
  icon,
  ...rest
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondary;
      case "outline":
        return styles.outline;
      default:
        return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "outline":
        return styles.outlineText;
      default:
        return styles.buttonText;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      disabled={loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#0366d6" : "#FFFFFF"}
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={variant === "outline" ? "#0366d6" : "#FFFFFF"}
              style={styles.buttonIcon}
            />
          )}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  primary: {
    backgroundColor: "#0366d6",
  },
  secondary: {
    backgroundColor: "#4CAF50",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0366d6",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  outlineText: {
    color: "#0366d6",
    fontSize: 16,
    fontWeight: "600",
  },
});
