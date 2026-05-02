import React, { memo, useMemo } from "react";
import { View, Text } from "react-native";
import { useOptimizedIncidentClassificationNameById } from "src/redux/selectors/incidencia/optimizedSelectors";
import { DesignTokens } from "../../../styles/designTokens";
import styles from "./styles/IncidentClassificationBadge.styles";

interface IncidentClassificationBadgeProps {
  classificationId: number;
  size?: "small" | "medium" | "large";
}

// Cache global para colores de clasificación
const colorCache = new Map<string, {backgroundColor: string, color: string}>();

// MISMO SISTEMA DE COLORES QUE INCIDENTREGISTRATIONSCREEN
const getClassificationColor = (name: string) => {
  if (!colorCache.has(name)) {
    const normalizedName = name.toLowerCase().trim();
    let color;
    
    // Muy Crítica → Rojo (error[600])
    if (normalizedName.includes('muy crítica') || normalizedName.includes('muy critica')) {
      color = { 
        backgroundColor: DesignTokens.colors.error[600], 
        color: DesignTokens.colors.background.primary 
      };
    }
    // No Crítica → Verde (success[600])
    else if (normalizedName.includes('no crítica') || normalizedName.includes('no critica')) {
      color = { 
        backgroundColor: DesignTokens.colors.success[600], 
        color: DesignTokens.colors.background.primary 
      };
    }
    // Crítica → Amarillo/Naranja (warning[600])
    else if (normalizedName.includes('crítica') || normalizedName.includes('critica')) {
      color = { 
        backgroundColor: DesignTokens.colors.warning[600], 
        color: DesignTokens.colors.background.primary 
      };
    }
    else {
      // Color por defecto
      color = { 
        backgroundColor: DesignTokens.colors.primary[500], 
        color: DesignTokens.colors.background.primary 
      };
    }
    colorCache.set(name, color);
  }
  return colorCache.get(name)!;
};

const IncidentClassificationBadge: React.FC<IncidentClassificationBadgeProps> = memo(({
  classificationId,
  size = "medium",
}) => {
  const classificationName = useOptimizedIncidentClassificationNameById(classificationId);

  // Memoizar cálculo de colores
  const colors = useMemo(() => getClassificationColor(classificationName), [classificationName]);
  const sizeStyle = useMemo(() => styles[size], [size]);

  return (
    <View style={[styles.badge, sizeStyle, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.text, sizeStyle, { color: colors.color }]}>
        {classificationName}
      </Text>
    </View>
  );
});

export default IncidentClassificationBadge;