import { useState, useCallback } from "react";
import { PhysicalAdvanceResponse } from "src/types/entities";

/**
 * Copia plana y profunda de un avance que puede ser un objeto Realm vivo.
 * Guardar el objeto vivo en estado de React truena con "Accessing object
 * which has been invalidated or deleted" cuando un refetch reescribe el
 * cache (los embebidos viejos se invalidan). Realm expone toJSON() para
 * serializar en profundidad; los objetos planos pasan tal cual.
 */
const detachAdvance = (
  advance: PhysicalAdvanceResponse,
): PhysicalAdvanceResponse => {
  const maybeRealm = advance as unknown as {
    toJSON?: () => PhysicalAdvanceResponse;
  };
  if (typeof maybeRealm.toJSON === "function") {
    return maybeRealm.toJSON();
  }
  return {
    ...advance,
    photos: advance.photos ? advance.photos.map((p) => ({ ...p })) : undefined,
  };
};

export const useBottomSheet = () => {
  const [selectedAdvance, setSelectedAdvance] =
    useState<PhysicalAdvanceResponse | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const openBottomSheet = useCallback((advance: PhysicalAdvanceResponse) => {
    setSelectedAdvance(detachAdvance(advance));
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
