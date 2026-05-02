import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/LocationInfo.styles";

interface LocationInfoProps {
  loading: boolean;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null;
  error: boolean;
}

const LocationInfo: React.FC<LocationInfoProps> = ({
  loading,
  location,
  error,
}) => (
  <View style={styles.container}>
    <Text style={styles.label}>Ubicación</Text>
    {loading ? (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#3498db" />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
      </View>
    ) : location ? (
      <View style={styles.infoRow}>
        <Ionicons
          name="location"
          size={20}
          color="#3498db"
          style={styles.icon}
        />
        <Text style={styles.infoText}>
          Lat: {location.latitude.toFixed(6)}, Lon:{" "}
          {location.longitude.toFixed(6)}
          {location.accuracy
            ? ` • Precisión: ${location.accuracy.toFixed(1)}m`
            : ""}
        </Text>
      </View>
    ) : error ? (
      <View style={styles.errorRow}>
        <Ionicons
          name="warning"
          size={20}
          color="#e67e22"
          style={styles.icon}
        />
        <Text style={styles.errorText}>
          No se pudo obtener la ubicación. El avance se registrará sin
          coordenadas geográficas.
        </Text>
      </View>
    ) : null}
  </View>
);

export default LocationInfo;
