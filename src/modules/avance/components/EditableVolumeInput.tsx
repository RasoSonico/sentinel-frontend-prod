import React from "react";
import { View, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/EditableVolumeInput.styles";

interface EditableVolumeInputProps {
  volume: string;
  onChange: (value: string) => void;
  unit: string;
  error: string | null;
}

const EditableVolumeInput: React.FC<EditableVolumeInputProps> = ({
  volume,
  onChange,
  unit,
  error,
}) => {
  // Función para validar y formatear el input en tiempo real
  const handleVolumeChange = (value: string) => {
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
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              error && styles.inputError
            ]}
            placeholder="Volumen"
            value={volume}
            onChangeText={handleVolumeChange}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Ionicons 
            name="pencil" 
            size={16} 
            color="#3498db" 
            style={styles.editIcon}
          />
        </View>
        
        <View style={styles.unitContainer}>
          <Text style={styles.unitText}>{unit}</Text>
        </View>
      </View>
      
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export default EditableVolumeInput;