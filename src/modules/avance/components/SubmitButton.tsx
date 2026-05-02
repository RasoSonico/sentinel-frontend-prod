import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/SubmitButton.styles";

interface SubmitButtonProps {
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  loading,
  disabled,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.button, disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#fff" />
    ) : (
      <>
        <Ionicons name="save" size={20} color="#fff" style={styles.icon} />
        <Text style={styles.text}>Registrar avance</Text>
      </>
    )}
  </TouchableOpacity>
);

export default SubmitButton;
