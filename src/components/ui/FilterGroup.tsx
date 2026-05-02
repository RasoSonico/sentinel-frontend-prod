import React, { memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "../../styles/designTokens";
import { getResponsiveSpacing, getResponsiveFontSize } from "../../utils/responsive";

interface FilterGroupProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  showClearButton?: boolean;
  onClear?: () => void;
  clearButtonText?: string;
  contentContainerStyle?: object;
  style?: object;
}

const FilterGroup: React.FC<FilterGroupProps> = memo(({
  title,
  icon,
  children,
  showClearButton = false,
  onClear,
  clearButtonText = "Limpiar",
  contentContainerStyle,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Filter Label with Icon */}
      <View style={styles.labelContainer}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={getResponsiveSpacing(16)} 
            color={DesignTokens.colors.neutral[600]}
            style={styles.labelIcon}
          />
        )}
        <Text style={styles.labelText}>{title}</Text>
      </View>

      {/* Horizontal ScrollView for Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContentContainer, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        
        {/* Clear Button integrated at the end */}
        {showClearButton && onClear && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>
              {clearButtonText}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
});

FilterGroup.displayName = 'FilterGroup';

const styles = StyleSheet.create({
  container: {
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveSpacing(DesignTokens.spacing.sm),
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.lg),
  },
  labelIcon: {
    marginRight: getResponsiveSpacing(DesignTokens.spacing.xs),
  },
  labelText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.neutral[600],
    includeFontPadding: false,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  scrollContainer: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.lg),
    alignItems: "center",
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  clearButton: {
    height: getResponsiveSpacing(36),
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: getResponsiveSpacing(18),
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: DesignTokens.colors.neutral[300],
    borderStyle: "dashed" as const,
    justifyContent: "center",
    alignItems: "center",
    minWidth: getResponsiveSpacing(80),
  },
  clearButtonText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.medium,
    textAlign: "center",
    includeFontPadding: false,
  },
});

export default FilterGroup;