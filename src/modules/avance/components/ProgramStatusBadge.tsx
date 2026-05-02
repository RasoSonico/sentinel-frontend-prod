import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/ProgramStatusBadge.styles";

type StatusType =
  | "onSchedule"
  | "delayed"
  | "ahead"
  | "completed"
  | "notStarted";
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface ProgramStatusBadgeProps {
  status: StatusType;
  compact?: boolean;
  showIcon?: boolean;
}

// Definiendo tipo para la configuración
interface StatusConfigItem {
  label: string;
  color: string;
  icon: IoniconsName;
}

// Usando el tipo correcto para los nombres de iconos
const statusConfig: Record<StatusType, StatusConfigItem> = {
  onSchedule: {
    label: "En programa",
    color: "#27ae60", // Verde
    icon: "checkmark-circle" as IoniconsName,
  },
  delayed: {
    label: "Atrasado",
    color: "#e74c3c", // Rojo
    icon: "alert-circle" as IoniconsName,
  },
  ahead: {
    label: "Adelantado",
    color: "#3498db", // Azul
    icon: "trending-up" as IoniconsName,
  },
  completed: {
    label: "Completado",
    color: "#9b59b6", // Morado
    icon: "trophy" as IoniconsName,
  },
  notStarted: {
    label: "No iniciado",
    color: "#7f8c8d", // Gris
    icon: "time" as IoniconsName,
  },
};

const ProgramStatusBadge: React.FC<ProgramStatusBadgeProps> = ({
  status,
  compact = false,
  showIcon = true,
}) => {
  const { label, color, icon } = statusConfig[status];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: `${color}20` }, // 20% de opacidad del color
        compact ? styles.compactContainer : null,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={icon}
          size={compact ? 12 : 16}
          color={color}
          style={styles.icon}
        />
      )}

      <Text
        style={[styles.label, { color }, compact ? styles.compactLabel : null]}
      >
        {label}
      </Text>
    </View>
  );
};

export default ProgramStatusBadge;
