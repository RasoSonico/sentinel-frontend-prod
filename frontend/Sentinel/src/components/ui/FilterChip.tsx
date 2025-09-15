import React, { memo } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { DesignTokens } from "../../styles/designTokens";
import { getResponsiveSpacing, getResponsiveFontSize } from "../../utils/responsive";

interface FilterChipProps<T> {
  id: T;
  name: string;
  isActive: boolean;
  onPress: (id: T) => void;
  variant?: "default" | "type" | "classification" | "status";
  disabled?: boolean;
}

const FilterChip = <T,>({
  id,
  name,
  isActive,
  onPress,
  variant = "default",
  disabled = false,
}: FilterChipProps<T>) => {
  const handlePress = () => {
    if (!disabled) {
      onPress(id);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        isActive && styles.activeFilterChip,
        disabled && styles.disabledFilterChip,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterChipText,
          isActive && styles.activeFilterChipText,
          disabled && styles.disabledFilterChipText,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  filterChip: {
    height: getResponsiveSpacing(36),
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.md),
    borderRadius: getResponsiveSpacing(18),
    backgroundColor: DesignTokens.colors.neutral[100],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    justifyContent: "center",
    alignItems: "center",
    minWidth: getResponsiveSpacing(60),
    maxWidth: getResponsiveSpacing(120),
  },
  activeFilterChip: {
    backgroundColor: DesignTokens.colors.primary[500],
    borderColor: DesignTokens.colors.primary[500],
    ...DesignTokens.shadows.sm,
  },
  disabledFilterChip: {
    opacity: 0.5,
    backgroundColor: DesignTokens.colors.neutral[50],
  },
  filterChipText: {
    fontSize: getResponsiveFontSize(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  activeFilterChipText: {
    color: DesignTokens.colors.background.primary,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  disabledFilterChipText: {
    color: DesignTokens.colors.neutral[400],
  },
});

export default memo(FilterChip) as typeof FilterChip;