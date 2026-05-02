import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { TextInput, Modal, Portal, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

interface PhotoNameEditorProps {
  filename: string;
  onUpdate: (newFilename: string) => void;
  disabled?: boolean;
  partidaName?: string;
}

const PhotoNameEditor: React.FC<PhotoNameEditorProps> = ({
  filename,
  onUpdate,
  disabled = false,
  partidaName = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(filename);

  // Extraer la parte base (partida + número) y descripción adicional
  const getBaseName = () => {
    const cleanPartida = partidaName.replace(/[^a-zA-Z0-9]/g, "") || "Partida";
    // Buscar el patrón Partida_XX
    const match = filename.match(new RegExp(`^${cleanPartida}_(\\d{2})`));
    return match ? `${cleanPartida}_${match[1]}` : filename.replace(".jpg", "");
  };

  const getDescription = () => {
    const baseName = getBaseName();
    const description = filename
      .replace(`${baseName}_`, "")
      .replace(".jpg", "");
    return description === baseName ? "" : description;
  };

  const [description, setDescription] = useState(getDescription());

  const handleSave = () => {
    const baseName = getBaseName();
    let finalName = baseName;

    // Agregar descripción si existe
    if (description.trim()) {
      const cleanDescription = description.trim().replace(/[^a-zA-Z0-9]/g, "");
      finalName += `_${cleanDescription}`;
    }

    finalName += ".jpg";
    onUpdate(finalName);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDescription(getDescription());
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.nameContainer}>
        <Text style={styles.filename} numberOfLines={1}>
          {filename}
        </Text>
        {!disabled && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="pencil" size={12} color="#3498db" />
          </TouchableOpacity>
        )}
      </View>

      <Portal>
        <Modal
          visible={isEditing}
          onDismiss={handleCancel}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Agregar descripción a la foto</Text>

          <View style={styles.baseNameContainer}>
            <Text style={styles.baseNameLabel}>Nombre base:</Text>
            <Text style={styles.baseNameText}>{getBaseName()}</Text>
          </View>

          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción opcional (ej: Norte, Principal, Detalle)"
            mode="outlined"
            theme={{ colors: { primary: "#3498db" } }}
            autoFocus
            selectTextOnFocus
          />

          <Text style={styles.hint}>
            La descripción se agregará al nombre base. Déjalo vacío para solo
            usar el nombre base.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.button}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              buttonColor="#3498db"
            >
              Guardar
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  filename: {
    flex: 1,
    fontSize: 10,
    color: "#495057",
    fontFamily: "monospace",
  },
  editButton: {
    marginLeft: 4,
    padding: 2,
  },
  modal: {
    margin: 20,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  textInput: {
    marginBottom: 8,
    backgroundColor: "white",
  },
  hint: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  baseNameContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
  },
  baseNameLabel: {
    fontSize: 12,
    color: "#6c757d",
    fontWeight: "600",
    marginBottom: 4,
  },
  baseNameText: {
    fontSize: 14,
    color: "#495057",
    fontFamily: "monospace",
    fontWeight: "600",
  },
});

export default PhotoNameEditor;
