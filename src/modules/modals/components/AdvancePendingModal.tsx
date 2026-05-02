import React from "react";
import { Modal, View, Text, ActivityIndicator, Dimensions } from "react-native";
import styles from "./styles/AdvancePendingModal.styles";
import { BaseModalProps } from "../modalTypes";

export interface AdvancePendingModalProps extends BaseModalProps {
  message?: string;
}

const AdvancePendingModal: React.FC<AdvancePendingModalProps> = ({
  message = "Registrando avance...",
  onClose
}) => {
  const width = Dimensions.get("window").width * 0.8;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width }]}>
          <ActivityIndicator
            size="large"
            color="#3498db"
            style={styles.loader}
          />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

export default AdvancePendingModal;
