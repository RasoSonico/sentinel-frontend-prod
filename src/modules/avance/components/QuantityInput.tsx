import React from "react";
import { View, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sanitizarVolumen } from "../utils/sanitizarVolumen";
import styles from "./styles/QuantityInput.styles";

interface QuantityInputProps {
  quantity: string;
  onChange: (value: string) => void;
  unit: string;
  error: string | null;
}

const QuantityInput: React.FC<QuantityInputProps> = ({
  quantity,
  onChange,
  unit,
  error,
}) => {
  // Se conservan los 2 decimales históricos de esta pantalla. La precisión real
  // del sistema es 4 —`Decimal(14,4)` en backend, y la captura rápida ya usa 4—;
  // igualarlas es un cambio de comportamiento de esta pantalla que queda a
  // decisión aparte, no un efecto colateral de extraer la función.
  const handleQuantityChange = (value: string) => {
    onChange(sanitizarVolumen(value, 2));
  };

  return (
  <View style={styles.container}>
    <Text style={styles.label}>Volumen ejecutado</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        placeholder="Volumen"
        value={quantity}
        onChangeText={handleQuantityChange}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.unitInput}
        placeholder="Unidad"
        value={unit}
        editable={false}
      />
    </View>
    {error && (
      <View style={styles.errorRow}>
        <Ionicons name="alert-circle" size={18} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
  );
};

export default QuantityInput;
