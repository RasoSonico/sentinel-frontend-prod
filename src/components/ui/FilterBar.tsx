import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { DesignTokens } from "../../styles/designTokens";
import { getResponsiveSpacing } from "../../utils/responsive";

interface FilterBarProps {
  children: React.ReactNode;
  horizontal?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  contentContainerStyle?: object;
  style?: object;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  horizontal = true,
  showsHorizontalScrollIndicator = false,
  contentContainerStyle,
  style,
}) => {
  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        style={[styles.scrollContainer, style]}
        contentContainerStyle={[styles.horizontalContainer, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.verticalContainer, style]}>
      {children}
    </View>
  );
};

interface FilterSectionProps {
  children: React.ReactNode;
  spacing?: "sm" | "md" | "lg";
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  children,
  spacing = "md",
}) => {
  const getSpacing = () => {
    switch (spacing) {
      case "sm":
        return DesignTokens.spacing.sm;
      case "lg":
        return DesignTokens.spacing.lg;
      default:
        return DesignTokens.spacing.md;
    }
  };

  return (
    <View style={[styles.section, { marginBottom: getResponsiveSpacing(getSpacing()) }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 0,
  },
  horizontalContainer: {
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.lg),
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
    alignItems: "center",
  },
  verticalContainer: {
    paddingHorizontal: getResponsiveSpacing(DesignTokens.spacing.lg),
    gap: getResponsiveSpacing(DesignTokens.spacing.sm),
  },
  section: {
    // Spacing is handled dynamically in the component
  },
});

export default FilterBar;