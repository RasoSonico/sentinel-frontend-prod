import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { DesignTokens } from "../../styles/designTokens";

interface ExtendedBottomSheetBackdropProps extends BottomSheetBackdropProps {
  onPress?: () => void;
}

const BottomSheetBackdrop: React.FC<ExtendedBottomSheetBackdropProps> = ({
  animatedIndex,
  style,
  onPress,
}) => {
  const [active, setActive] = useState(false);

  // Sync animated index to JS state so pointerEvents can be toggled.
  // active=false → pointerEvents="none" → touches pass through to content below.
  useAnimatedReaction(
    () => animatedIndex.value > -1,
    (isActive) => {
      runOnJS(setActive)(isActive);
    },
  );

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 0.5],
      Extrapolate.CLAMP,
    ),
  }));

  const containerStyle = useMemo(
    () => [
      style,
      { backgroundColor: DesignTokens.colors.neutral[900] },
      containerAnimatedStyle,
    ],
    [style, containerAnimatedStyle],
  );

  return (
    <Animated.View
      style={containerStyle}
      pointerEvents={active ? "box-none" : "none"}
    >
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

export default BottomSheetBackdrop;
