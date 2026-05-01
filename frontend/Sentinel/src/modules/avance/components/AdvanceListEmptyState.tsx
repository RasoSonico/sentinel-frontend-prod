import React, { memo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles/AdvanceListScreen.styles";

interface AdvanceListEmptyStateProps {
  loadingConstruction: boolean;
  constructionError: unknown;
  construction: { id: number; name: string } | null;
  loadingCatalogs: boolean;
  catalogsError: unknown;
  hasCatalogs: boolean;
  loadingAdvances: boolean;
  advancesError: unknown;
  onRetryConstruction: () => void;
  onRetry: () => void;
  onAddAdvance: () => void;
}

const AdvanceListEmptyState: React.FC<AdvanceListEmptyStateProps> = ({
  loadingConstruction,
  constructionError,
  construction,
  loadingCatalogs,
  catalogsError,
  hasCatalogs,
  loadingAdvances,
  advancesError,
  onRetryConstruction,
  onRetry,
  onAddAdvance,
}) => {
  if (loadingConstruction) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando construcción...</Text>
      </View>
    );
  }

  if (constructionError) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorTitle}>Error al cargar construcción</Text>
        <Text style={styles.errorSubtitle}>
          No se puede obtener la obra asignada
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetryConstruction}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No construction assigned
  if (!construction) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="business-outline" size={64} color="#7f8c8d" />
        <Text style={styles.emptyTitle}>No tienes obras asignadas</Text>
        <Text style={styles.emptyDescription}>
          Contacta con tu administrador para que te asigne una obra
        </Text>
      </View>
    );
  }

  if (loadingCatalogs) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando catálogos...</Text>
      </View>
    );
  }

  if (catalogsError) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorTitle}>Error al cargar catálogos</Text>
        <Text style={styles.errorSubtitle}>
          No se pueden obtener los catálogos de la obra
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasCatalogs) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-outline" size={64} color="#7f8c8d" />
        <Text style={styles.emptyTitle}>No hay catálogos disponibles</Text>
        <Text style={styles.emptyDescription}>
          Esta obra no tiene catálogos configurados
        </Text>
      </View>
    );
  }

  if (loadingAdvances) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando avances...</Text>
      </View>
    );
  }

  if (advancesError) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorTitle}>Error al cargar avances</Text>
        <Text style={styles.errorSubtitle}>
          No se pueden obtener los avances del catálogo
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No advances
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#bdc3c7" />
      <Text style={styles.emptyTitle}>No hay avances registrados</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAddAdvance}>
        <Text style={styles.emptyButtonText}>Registrar avance</Text>
      </TouchableOpacity>
    </View>
  );
};

export default memo(AdvanceListEmptyState);
