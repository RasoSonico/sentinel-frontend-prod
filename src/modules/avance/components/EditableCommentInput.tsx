import React from "react";
import { View, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/EditableCommentInput.styles";

interface EditableCommentInputProps {
  comments: string;
  onChange: (value: string) => void;
  error: string | null;
}

const EditableCommentInput: React.FC<EditableCommentInputProps> = ({
  comments,
  onChange,
  error,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            error && styles.inputError
          ]}
          placeholder="Agregar comentarios (opcional)"
          value={comments}
          onChangeText={onChange}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <Ionicons 
          name="pencil" 
          size={16} 
          color="#3498db" 
          style={styles.editIcon}
        />
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

export default EditableCommentInput;