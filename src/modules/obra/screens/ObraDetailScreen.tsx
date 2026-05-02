// src/modules/obra/screens/ObraDetailScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  ObraStackParamList,
  ObraNavigationProp,
} from "../../../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { Construction } from "../../../types/entities";
import { getConstruction } from "src/services/api/constructionService";

type ObraDetailRouteProp = RouteProp<ObraStackParamList, "ObraDetail">;

const ObraDetailScreen = () => {
  const route = useRoute<ObraDetailRouteProp>();
  const navigation = useNavigation<ObraNavigationProp>();
  const { obraId } = route.params;

  const [obra, setObra] = useState<Construction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchObraDetails = async () => {
      try {
        setLoading(true);
        const data = await getConstruction(parseInt(obraId));
        setObra(data);
      } catch (err) {
        console.error("Error fetching obra details:", err);
        setError("No se pudo cargar la información de la obra");
      } finally {
        setLoading(false);
      }
    };

    fetchObraDetails();
  }, [obraId]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "PLANNING":
        return "#FFB74D";
      case "IN_PROGRESS":
        return "#4CAF50";
      case "COMPLETED":
        return "#2196F3";
      case "SUSPENDED":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "PLANNING":
        return "Planificación";
      case "IN_PROGRESS":
        return "En Progreso";
      case "COMPLETED":
        return "Completada";
      case "SUSPENDED":
        return "Suspendida";
      default:
        return "Desconocido";
    }
  };

  const renderActionButton = (
    icon: string,
    title: string,
    onPress: () => void,
    color: string = "#0366d6"
  ) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="#FFF" />
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0366d6" />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (error || !obra) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>
          {error || "No se encontró la obra"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{obra.name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(obra.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(obra.status)}</Text>
          </View>
        </View>

        <Text style={styles.description}>{obra.description}</Text>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{obra.location}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <Text style={styles.infoText}>
              {new Date(obra.start_date).toLocaleDateString()} -
              {new Date(obra.end_date).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={18} color="#666" />
            <Text style={styles.infoText}>
              Presupuesto: ${obra.budget.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Acciones</Text>

      <View style={styles.actionsContainer}>
        {renderActionButton(
          "recording-outline",
          "Registrar Avance",
          () =>
            Alert.alert(
              "Función en desarrollo",
              "Registro de avance próximamente"
            ),
          "#4CAF50"
        )}

        {renderActionButton(
          "document-text-outline",
          "Crear Estimación",
          () =>
            Alert.alert(
              "Función en desarrollo",
              "Creación de estimaciones próximamente"
            ),
          "#2196F3"
        )}

        {renderActionButton(
          "images-outline",
          "Registrar Evidencia",
          () =>
            Alert.alert(
              "Función en desarrollo",
              "Registro de evidencia próximamente"
            ),
          "#FF9800"
        )}

        {renderActionButton(
          "help-circle-outline",
          "Reportar Problema",
          () =>
            Alert.alert(
              "Función en desarrollo",
              "Reporte de problemas próximamente"
            ),
          "#F44336"
        )}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Información de Progreso</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Avance Físico</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: "35%", backgroundColor: "#4CAF50" },
              ]}
            />
          </View>
          <Text style={styles.progressValue}>35%</Text>
        </View>

        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Avance Financiero</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: "40%", backgroundColor: "#2196F3" },
              ]}
            />
          </View>
          <Text style={styles.progressValue}>40%</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFF",
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: "#666",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0366d6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  progressContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 6,
    marginBottom: 4,
  },
  progressBar: {
    height: "100%",
    borderRadius: 6,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    textAlign: "right",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0366d6",
    borderRadius: 8,
  },
  retryText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ObraDetailScreen;
