import React from "react";
import { View, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  // Función para validar y formatear el input en tiempo real
  const handleQuantityChange = (value: string) => {
    // Permitir solo números y un punto decimal
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Evitar múltiples puntos decimales
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return; // No hacer nada si hay más de un punto
    }
    
    // Limitar a 2 decimales
    if (parts.length === 2 && parts[1].length > 2) {
      const limitedValue = parts[0] + '.' + parts[1].substring(0, 2);
      onChange(limitedValue);
      return;
    }
    
    onChange(numericValue);
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
