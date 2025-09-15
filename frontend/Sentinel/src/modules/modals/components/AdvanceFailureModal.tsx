import React from "react";
import { Modal, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/AdvanceSuccessModal.styles";
import { DesignTokens } from "../../../styles/designTokens";

// Generic interface for reusability
export interface FailureModalProps {
  title?: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
}

// Backward compatibility interface
export interface AdvanceFailureModalProps {
  onClose: () => void;
}

// Generic FailureModal component
const FailureModal: React.FC<FailureModalProps> = ({
  title = "Hubo un error",
  message = "El avance no pudo guardarse correctamente, intente más tarde.",
  buttonText = "Cerrar",
  onClose,
}) => {
  const width = Dimensions.get("window").width * 0.8;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width }]}>
          <Ionicons
            name="close-circle"
            size={64}
            color={DesignTokens.colors.error[500]}
            style={styles.icon}
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{message}</Text>
          <TouchableOpacity style={styles.registerButton} onPress={onClose}>
            <Text style={styles.registerButtonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Backward compatibility wrapper for existing advance functionality
const AdvanceFailureModal: React.FC<AdvanceFailureModalProps> = ({
  onClose,
}) => {
  return (
    <FailureModal
      title="Hubo un error"
      message="El avance no pudo guardarse correctamente, intente más tarde."
      buttonText="Cerrar"
      onClose={onClose}
    />
  );
};

export default AdvanceFailureModal;
export { FailureModal };
