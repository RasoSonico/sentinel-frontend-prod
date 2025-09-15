import React, { useMemo } from "react";
import { TouchableWithoutFeedback } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
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
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 0.5],
      Extrapolate.CLAMP
    ),
  }));

  const containerStyle = useMemo(
    () => [
      style,
      {
        backgroundColor: DesignTokens.colors.neutral[900],
      },
      containerAnimatedStyle,
    ],
    [style, containerAnimatedStyle]
  );

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View style={containerStyle} />
    </TouchableWithoutFeedback>
  );
};

export default BottomSheetBackdrop;