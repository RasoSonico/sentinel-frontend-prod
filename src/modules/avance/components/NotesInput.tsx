import React from "react";
import { View, Text, TextInput } from "react-native";
import styles from "./styles/NotesInput.styles";

interface NotesInputProps {
  value: string;
  onChange: (val: string) => void;
}

const NotesInput: React.FC<NotesInputProps> = ({ value, onChange }) => (
  <View style={styles.container}>
    <Text style={styles.label}>Notas (opcional)</Text>
    <View style={styles.textareaContainer}>
      <TextInput
        style={styles.textarea}
        placeholder="Escribe cualquier observación relevante..."
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  </View>
);

export default NotesInput;
