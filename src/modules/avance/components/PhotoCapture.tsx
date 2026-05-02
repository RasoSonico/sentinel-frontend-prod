import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Photo } from "../../../hooks/avance/usePhotoCapture";
import PhotoNameEditor from "./PhotoNameEditor";
import styles from "./styles/PhotoCapture.styles";

interface PhotoCaptureProps {
  photos: Photo[];
  loading: boolean;
  maxPhotos?: number;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onRemovePhoto: (photoId: string) => void;
  onUpdatePhotoFilename?: (photoId: string, newFilename: string) => void;
  partidaName?: string;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  photos,
  loading,
  maxPhotos = 5,
  onTakePhoto,
  onPickImage,
  onRemovePhoto,
  onUpdatePhotoFilename,
  partidaName = "",
}) => {
  // Verificar si se alcanzó el límite de fotos
  const hasReachedLimit = photos.length >= maxPhotos;

  // Mostrar diálogo de opciones para añadir foto
  const handleAddPhoto = () => {
    if (hasReachedLimit) {
      Alert.alert(
        "Límite alcanzado",
        `Solo puedes añadir hasta ${maxPhotos} fotos.`,
        [{ text: "Entendido", style: "default" }]
      );
      return;
    }

    Alert.alert("Añadir foto", "¿Cómo quieres añadir la foto?", [
      {
        text: "Tomar foto",
        onPress: onTakePhoto,
      },
      {
        text: "Seleccionar de galería",
        onPress: onPickImage,
      },
      {
        text: "Cancelar",
        style: "cancel",
      },
    ]);
  };

  // Confirmar eliminación de foto
  const handleRemovePhoto = (photoId: string) => {
    Alert.alert(
      "Eliminar foto",
      "¿Estás seguro de que quieres eliminar esta foto?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onRemovePhoto(photoId),
        },
      ]
    );
  };

  return (
    <View>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Evidencia fotográfica</Text>
        <Text style={styles.subtitle}>
          {photos.length} de {maxPhotos} fotos
        </Text>
      </View>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosContainer}
        >
          {/* Lista de fotos */}
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoContainer}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />

              {/* Indicador de sincronización */}
              {photo.synced ? (
                <View style={styles.syncedIndicator}>
                  <Ionicons name="cloud-done" size={10} color="#fff" />
                </View>
              ) : null}

              {/* Botón para eliminar foto */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(photo.id)}
              >
                <Ionicons name="close-circle" size={18} color="#e74c3c" />
              </TouchableOpacity>

              {/* Editor de nombre de foto */}
              {onUpdatePhotoFilename && (
                <PhotoNameEditor
                  filename={photo.filename}
                  onUpdate={(newFilename) =>
                    onUpdatePhotoFilename(photo.id, newFilename)
                  }
                  disabled={photo.synced}
                  partidaName={partidaName}
                />
              )}
            </View>
          ))}

          {/* Botón para añadir más fotos si no se alcanzó el límite */}
          {!hasReachedLimit && (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              disabled={loading}
            >
              <Ionicons name="add" size={28} color="#3498db" />
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        // Vista cuando no hay fotos
        <TouchableOpacity
          style={styles.emptyContainer}
          onPress={handleAddPhoto}
          disabled={loading}
        >
          <Ionicons name="camera-outline" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>Toca para añadir fotos</Text>
          <Text style={styles.emptySubtext}>
            Añade evidencia fotográfica del avance realizado
          </Text>
        </TouchableOpacity>
      )}

      {/* Indicador de carga */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      )}
    </View>
  );
};

export default PhotoCapture;
