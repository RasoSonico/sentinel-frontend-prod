import React from "react";
import { Modal, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/AdvanceSentModal.styles";
import { BaseModalProps } from "../modalTypes";
import { DesignTokens } from "../../../styles/designTokens";

// Generic interface for reusability
export interface SentModalProps extends BaseModalProps {
  title?: string;
  subtitle?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

// Backward compatibility interface
export interface AdvanceSentModalProps extends BaseModalProps {
  onRegisterAnother: () => void;
  onGoHome: () => void;
  onClose: () => void;
}

// Generic SentModal component
const SentModal: React.FC<SentModalProps> = ({
  title = "Avance enviado",
  subtitle = "El avance ha sido enviado.",
  primaryButtonText = "Registrar otro avance",
  secondaryButtonText = "Ir al inicio",
  onPrimaryAction,
  onSecondaryAction,
  onClose,
}) => {
  const width = Dimensions.get("window").width * 0.8;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width }]}>
          <Ionicons
            name="information-circle"
            size={64}
            color={DesignTokens.colors.success[500]}
            style={styles.icon}
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={onPrimaryAction}
          >
            <Text style={styles.registerButtonText}>{primaryButtonText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={onSecondaryAction}
          >
            <Text style={styles.homeButtonText}>{secondaryButtonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Backward compatibility wrapper for existing advance functionality
const AdvanceSentModal: React.FC<AdvanceSentModalProps> = ({
  onRegisterAnother,
  onGoHome,
  onClose,
}) => {
  return (
    <SentModal
      onPrimaryAction={onRegisterAnother}
      onSecondaryAction={onGoHome}
      onClose={onClose}
    />
  );
};

export default AdvanceSentModal;
