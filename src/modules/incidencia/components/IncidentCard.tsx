import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Incident } from "src/types/incidencia";
import IncidentClassificationBadge from "./IncidentClassificationBadge";
import IncidentTypeDisplay from "./IncidentTypeDisplay";
import { useOptimizedIncidentTypeNameById } from "../../../redux/selectors/incidencia/optimizedSelectors";
import { useFormattedDate } from "../../../hooks/ui/useDateFormatting";
import { DesignTokens } from "../../../styles/designTokens";
import styles from "./styles/IncidentCard.styles";

interface IncidentCardProps {
  incident: Incident;
  onPress: (incident: Incident) => void;
}

const IncidentCard: React.FC<IncidentCardProps> = memo(({
  incident,
  onPress,
}) => {
  // ✅ Use consistent date formatting with AdvanceListScreen
  const formattedDate = useFormattedDate(incident.date, "medium");

  // Memoizar truncado de descripción
  const truncatedDescription = useMemo(() => {
    const maxLength = 120;
    if (incident.description.length <= maxLength) return incident.description;
    return incident.description.substring(0, maxLength) + "...";
  }, [incident.description]);

  // Hook para obtener el nombre del tipo
  const typeName = useOptimizedIncidentTypeNameById(incident.type);
  
  // Función para obtener color del borde lateral según tipo de incidencia
  const getIncidentBorderColor = useMemo(() => {
    const lowerTypeName = typeName.toLowerCase();
    
    // Colores según el tipo de incidencia (similar a IncidentTypeDisplay)
    if (lowerTypeName.includes('accidente') || lowerTypeName.includes('lesión')) {
      return DesignTokens.colors.error[500]; // Rojo para accidentes
    } else if (lowerTypeName.includes('seguridad')) {
      return DesignTokens.colors.warning[500]; // Amarillo para seguridad
    } else if (lowerTypeName.includes('material') || lowerTypeName.includes('equipo')) {
      return DesignTokens.colors.primary[500]; // Azul para material/equipo
    } else if (lowerTypeName.includes('ambiental')) {
      return DesignTokens.colors.success[500]; // Verde para ambiental
    } else if (lowerTypeName.includes('calidad')) {
      return DesignTokens.colors.primary[600]; // Azul oscuro para calidad
    } else {
      return DesignTokens.colors.neutral[400]; // Gris por defecto
    }
  }, [typeName]);

  // Memoizar handler para evitar recreación
  const handlePress = useMemo(() => () => onPress(incident), [onPress, incident]);

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        { borderLeftColor: getIncidentBorderColor } // ✅ BORDE LATERAL DINÁMICO
      ]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header similar a AdvanceListScreen */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <IncidentTypeDisplay 
            typeId={incident.type} 
            size="medium"
          />
        </View>
        
        {/* Chip de clasificación con colores como IncidentRegistrationScreen */}
        <IncidentClassificationBadge 
          classificationId={incident.clasification} 
          size="small"
        />
      </View>

      {/* Sección eliminada para reducir altura de card */}

      {/* Sección de comentarios como AdvanceListScreen */}
      {incident.description && (
        <View style={styles.commentsContainer}>
          <Text style={styles.commentsLabel}>Descripción:</Text>
          <Text style={styles.commentsText} numberOfLines={2}>
            {truncatedDescription}
          </Text>
        </View>
      )}

      {/* Sección inferior como AdvanceListScreen */}
      <View style={styles.bottomSection}>
        <View style={styles.statusContainer}>
          <Text style={styles.incidentIdText}>
            Incidencia #{incident.id}
          </Text>
        </View>
        
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {formattedDate}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default IncidentCard;