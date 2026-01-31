import { useState, useCallback } from "react";
import { PhysicalAdvanceResponse } from "src/types/entities";

export const useBottomSheet = () => {
  const [selectedAdvance, setSelectedAdvance] =
    useState<PhysicalAdvanceResponse | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const openBottomSheet = useCallback((advance: PhysicalAdvanceResponse) => {
    setSelectedAdvance(advance);
    setIsVisible(true);
  }, []);

  const closeBottomSheet = useCallback(() => {
    setIsVisible(false);
    setSelectedAdvance(null);
  }, []);

  return {
    selectedAdvance,
    isVisible,
    openBottomSheet,
    closeBottomSheet,
    setSelectedAdvance,
  };
};
