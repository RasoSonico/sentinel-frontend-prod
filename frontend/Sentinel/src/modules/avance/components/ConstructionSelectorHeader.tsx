import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ConstructionRealm } from "src/realm/assignedConstruction/Construction";
import { DesignTokens } from "src/styles/designTokens";

interface ConstructionSelectorHeaderProps {
  selectedConstruction: ConstructionRealm | null;
  constructionCount: number;
  isExpanded?: boolean;
  onPress: () => void;
}

const ConstructionSelectorHeader: React.FC<ConstructionSelectorHeaderProps> = ({
  selectedConstruction,
  constructionCount,
  isExpanded = false,
  onPress,
}) => {
  const isMultiple = constructionCount > 1;

  if (!selectedConstruction) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!isMultiple}
      activeOpacity={isMultiple ? 0.7 : 1}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="business"
            size={20}
            color={DesignTokens.colors.primary[500]}
          />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={styles.constructionName}
            numberOfLines={!isMultiple ? 3 : 2}
          >
            {selectedConstruction.name}
          </Text>
          {selectedConstruction.location && (
            <Text style={styles.locationText} numberOfLines={1}>
              {selectedConstruction.location}
              {selectedConstruction.state
                ? `, ${selectedConstruction.state}`
                : ""}
            </Text>
          )}
        </View>

        {isMultiple && (
          <View style={styles.chevronContainer}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={DesignTokens.colors.neutral[500]}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.background.primary,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.md,
    minHeight: 56,
    ...DesignTokens.shadows.sm,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
    marginRight: DesignTokens.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  constructionName: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
    lineHeight:
      DesignTokens.typography.fontSize.base *
      DesignTokens.typography.lineHeight.tight,
  },
  locationText: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  chevronContainer: {
    marginLeft: DesignTokens.spacing.sm,
    padding: DesignTokens.spacing.xs,
  },
});

export default ConstructionSelectorHeader;
