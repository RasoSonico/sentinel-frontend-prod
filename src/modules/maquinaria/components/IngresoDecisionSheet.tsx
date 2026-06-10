import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onAgregarNueva: () => void;
  onReactivar: () => void;
}

const IngresoDecisionSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  onAgregarNueva,
  onReactivar,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["35%"], []);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} onPress={onClose} />
    ),
    [onClose],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>Agregar maquinaria a obra</Text>
        <Text style={styles.subtitle}>
          ¿La máquina ya había estado en esta obra antes?
        </Text>

        <TouchableOpacity
          style={styles.optionBtn}
          onPress={onReactivar}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: DesignTokens.colors.primary[50] },
            ]}
          >
            <Ionicons
              name="refresh-circle"
              size={24}
              color={DesignTokens.colors.primary[600]}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Sí, reactivarla</Text>
            <Text style={styles.optionDesc}>
              Buscar en el historial de esta obra
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={DesignTokens.colors.neutral[400]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionBtn}
          onPress={onAgregarNueva}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: DesignTokens.colors.success[50] },
            ]}
          >
            <Ionicons
              name="add-circle"
              size={24}
              color={DesignTokens.colors.success[600]}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>No, es nueva</Text>
            <Text style={styles.optionDesc}>
              Registrar maquinaria por primera vez
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={DesignTokens.colors.neutral[400]}
          />
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  handle: {
    backgroundColor: DesignTokens.colors.neutral[300],
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[500],
    marginBottom: 20,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.background.secondary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
  },
  optionDesc: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
});

export default IngresoDecisionSheet;
