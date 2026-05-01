import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ConstructionRealm } from "src/realm/assignedConstruction/Construction";
import { DesignTokens } from "src/styles/designTokens";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_HEIGHT = SCREEN_HEIGHT * 0.5;

interface ConstructionDropdownProps {
  isVisible: boolean;
  constructions: ConstructionRealm[];
  selectedConstructionId: string | null;
  onSelect: (constructionId: string) => void;
  onClose: () => void;
}

interface ConstructionItemProps {
  construction: ConstructionRealm;
  isSelected: boolean;
  onPress: () => void;
}

const ConstructionItem: React.FC<ConstructionItemProps> = ({
  construction,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.itemIconContainer}>
      <Ionicons
        name="business"
        size={20}
        color={
          isSelected
            ? DesignTokens.colors.primary[500]
            : DesignTokens.colors.neutral[400]
        }
      />
    </View>

    <View style={styles.itemTextContainer}>
      <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
        {construction.name}
      </Text>
      {construction.location && (
        <Text style={styles.itemLocation} numberOfLines={1}>
          {construction.location}
          {construction.state ? `, ${construction.state}` : ""}
        </Text>
      )}
    </View>

    {isSelected && (
      <View style={styles.checkContainer}>
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={DesignTokens.colors.primary[500]}
        />
      </View>
    )}
  </TouchableOpacity>
);

const ConstructionDropdown: React.FC<ConstructionDropdownProps> = ({
  isVisible,
  constructions,
  selectedConstructionId,
  onSelect,
  onClose,
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(0);

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      const newHeight = Math.min(height, MAX_HEIGHT);
      if (newHeight !== contentHeight && newHeight > 0) {
        setContentHeight(newHeight);
      }
    },
    [contentHeight],
  );

  useEffect(() => {
    const targetHeight = isVisible ? contentHeight : 0;
    animatedHeight.value = withTiming(targetHeight, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [isVisible, contentHeight, animatedHeight]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: "hidden",
  }));

  const handleSelectConstruction = useCallback(
    (constructionId: string) => {
      onSelect(constructionId);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderContent = (isInteractive: boolean) => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={isInteractive}
      nestedScrollEnabled
      scrollEnabled={isInteractive}
    >
      {constructions.map((construction, index) => (
        <View key={construction.id}>
          {index > 0 && <View style={styles.separator} />}
          <ConstructionItem
            construction={construction}
            isSelected={construction.id === selectedConstructionId}
            onPress={() => handleSelectConstruction(construction.id)}
          />
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View>
      {/* Hidden measurement layer - always rendered for accurate height measurement */}
      <View
        style={styles.measurementContainer}
        onLayout={handleContentLayout}
        pointerEvents="none"
      >
        {renderContent(false)}
      </View>

      {/* Visible animated layer */}
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <View style={styles.innerContainer}>{renderContent(true)}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  measurementContainer: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
    left: 0,
    right: 0,
  },
  container: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderBottomLeftRadius: DesignTokens.borderRadius.md,
    borderBottomRightRadius: DesignTokens.borderRadius.md,
    ...DesignTokens.shadows.md,
  },
  innerContainer: {
    maxHeight: MAX_HEIGHT,
  },
  scrollView: {
    maxHeight: MAX_HEIGHT,
  },
  listContent: {
    paddingVertical: DesignTokens.spacing.sm,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.md,
    minHeight: 64,
  },
  itemContainerSelected: {
    backgroundColor: DesignTokens.colors.primary[50],
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
    marginRight: DesignTokens.spacing.md,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.neutral[800],
    lineHeight:
      DesignTokens.typography.fontSize.base *
      DesignTokens.typography.lineHeight.tight,
  },
  itemNameSelected: {
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[700],
  },
  itemLocation: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  checkContainer: {
    marginLeft: DesignTokens.spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: DesignTokens.colors.neutral[100],
    marginHorizontal: DesignTokens.spacing.lg,
  },
});

export default ConstructionDropdown;
