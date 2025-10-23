import React, { memo, useMemo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IncidentType } from "src/types/incidencia";
import styles, { iconSizes } from "./styles/IncidentTypeDisplay.styles";

interface IncidentTypeDisplayProps {
  typeId: number;
  showIcon?: boolean;
  size?: "small" | "medium" | "large";
  incidentTypes?: IncidentType[];
}

// Cache global para iconos de tipo
const iconCache = new Map<string, string>();

const getTypeIcon = (name: string): string => {
  if (!iconCache.has(name)) {
    const lowerName = name.toLowerCase();
    let icon;
    if (lowerName.includes("accidente") || lowerName.includes("lesión")) {
      icon = "medical-outline";
    } else if (lowerName.includes("seguridad")) {
      icon = "shield-outline";
    } else if (lowerName.includes("material") || lowerName.includes("equipo")) {
      icon = "construct-outline";
    } else if (lowerName.includes("ambiental")) {
      icon = "leaf-outline";
    } else if (lowerName.includes("calidad")) {
      icon = "checkmark-circle-outline";
    } else {
      // Default icon
      icon = "alert-circle-outline";
    }
    iconCache.set(name, icon);
  }
  return iconCache.get(name)!;
};

const IncidentTypeDisplay: React.FC<IncidentTypeDisplayProps> = memo(({
  typeId,
  showIcon = true,
  size = "medium",
  incidentTypes = [],
}) => {
  // ✅ Obtener nombre del tipo directamente de los props (TanStack Query data)
  const typeName = useMemo(() => {
    const type = incidentTypes.find(t => t.id === typeId);
    return type?.name || "";
  }, [incidentTypes, typeId]);

  // Memoizar cálculos costosos
  const iconName = useMemo(() => getTypeIcon(typeName), [typeName]);
  const sizeStyle = useMemo(() => styles[size], [size]);
  const iconSize = useMemo(() => iconSizes[size], [size]);

  return (
    <View style={styles.container}>
      {showIcon && (
        <Ionicons 
          name={iconName as any} 
          size={iconSize} 
          color="#666" 
          style={styles.icon} 
        />
      )}
      <Text style={[styles.text, sizeStyle]}>
        {typeName}
      </Text>
    </View>
  );
});

export default IncidentTypeDisplay;