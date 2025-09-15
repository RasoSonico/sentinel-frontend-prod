import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens } from "../../styles/designTokens";
import { getResponsiveSpacing, getResponsiveFontSize } from "../../utils/responsive";
import { IncidentType, IncidentClassification } from "../../types/incidencia";

interface ActiveFiltersBadgeProps {
  typeFilter: "all" | number;
  classificationFilter: "all" | number;
  incidentTypes?: IncidentType[];
  incidentClassifications?: IncidentClassification[];
  style?: object;
}

const ActiveFiltersBadge: React.FC<ActiveFiltersBadgeProps> = memo(({
  typeFilter,
  classificationFilter,
  incidentTypes,
  incidentClassifications,
  style,
}) => {
  // Optimized label generation using catalogs
  const activeFilterLabels = useMemo(() => {
    // If no filters applied, show single "Todas" badge
    if (typeFilter === 'all' && classificationFilter === 'all') {
      return ['Todas'];
    }
    
    const labels: string[] = [];
    
    // Add classification label if filtered
    if (classificationFilter !== 'all' && incidentClassifications) {
      const classification = incidentClassifications.find(
        (c) => c.id === classificationFilter
      );
      if (classification) {
        labels.push(classification.name);
      }
    }
    
    // Add type label if filtered
    if (typeFilter !== 'all' && incidentTypes) {
      const type = incidentTypes.find((t) => t.id === typeFilter);
      if (type) {
        labels.push(type.name);
      }
    }
    
    // Fallback to "Todas" if no labels were found
    return labels.length > 0 ? labels : ['Todas'];
  }, [typeFilter, classificationFilter, incidentTypes, incidentClassifications]);

  // Don't render if no labels
  if (!activeFilterLabels.length) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {activeFilterLabels.map((label, index) => (
        <View key={`${label}-${index}`} style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
});

ActiveFiltersBadge.displayName = 'ActiveFiltersBadge';

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: getResponsiveSpacing(DesignTokens.spacing.xs),
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.lg),
    paddingVertical: getResponsiveSpacing(DesignTokens.spacing.sm),
    alignItems: "center",
  },
  badge: {
    backgroundColor: DesignTokens.colors.primary[50],
    borderColor: DesignTokens.colors.primary[200],
    borderWidth: 1,
    borderRadius: getResponsiveSpacing(12),
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.sm),
    paddingVertical: getResponsiveSpacing(2),
    maxWidth: getResponsiveSpacing(140),
  },
  badgeText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.primary[700],
    textAlign: "center",
    includeFontPadding: false,
    textTransform: "capitalize" as const,
  },
});

export default ActiveFiltersBadge;