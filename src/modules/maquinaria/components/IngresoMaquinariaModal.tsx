import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onNueva: () => void;
  onReactivar: () => void;
}

const IngresoMaquinariaModal: React.FC<Props> = ({
  isVisible,
  onClose,
  onNueva,
  onReactivar,
}) => {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.card}
        >
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="construct-outline"
                size={24}
                color={DesignTokens.colors.executive.primary}
              />
            </View>
            <Text style={styles.title}>Agregar maquinaria</Text>
          </View>

          <Text style={styles.subtitle}>
            ¿La máquina ya había estado en esta obra antes?
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onNueva}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Es nueva</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onReactivar}
              activeOpacity={0.85}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={18}
                color={DesignTokens.colors.executive.primary}
              />
              <Text style={styles.secondaryBtnText}>Sí, reactivarla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderTopLeftRadius: DesignTokens.borderRadius.xl,
    borderTopRightRadius: DesignTokens.borderRadius.xl,
    paddingHorizontal: 24,
    paddingBottom: 36,
    ...DesignTokens.shadows.lg,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.full,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: DesignTokens.borderRadius.full,
    backgroundColor: DesignTokens.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 25,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    flex: 1,
  },
  subtitle: {
    fontSize: 17,
    color: DesignTokens.colors.neutral[700],
    lineHeight: 23,
    marginBottom: 28,
  },
  buttons: {
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 15,
    ...DesignTokens.shadows.md,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 15,
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.executive.primary,
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    color: DesignTokens.colors.executive.primary,
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[400],
  },
});

export default IngresoMaquinariaModal;
