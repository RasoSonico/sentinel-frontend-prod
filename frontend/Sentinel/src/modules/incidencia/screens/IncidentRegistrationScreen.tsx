import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import {
  selectIncidentCatalogs,
  selectNewIncident,
  fetchIncidentTypes,
  fetchIncidentClassifications,
  createNewIncident,
  clearNewIncident,
  clearNewIncidentError,
} from "../../../redux/slices/incidencia/incidenciaSlice";
import {
  setTypesById,
  setClassificationsById,
} from "../../../redux/slices/incidencia/incidenciaFormDataSlice";
import { useCreateIncidentMutation } from "../../../hooks/data/query/useIncidenciaQueries";
import { useAssignedConstruction } from "../../../hooks/data/query/useAvanceQueries";
import { IncidentRegistrationScreenNavigationProp } from "../../../navigation/types";
import IncidentForm from "../forms/IncidentForm";
import { CreateIncident } from "../../../types/incidencia";
import { incidentFormDefaultValues } from "../forms/util/incidentFormValidation";
import styles from "../styles/IncidentRegistrationScreen.styles";

const IncidentRegistrationScreen: React.FC = () => {
  const navigation = useNavigation<IncidentRegistrationScreenNavigationProp>();
  const dispatch = useAppDispatch();

  // Estados de Redux
  const catalogs = useAppSelector(selectIncidentCatalogs);
  const newIncident = useAppSelector(selectNewIncident);

  // Query para obtener la construcción asignada
  const {
    data: assignedConstruction,
    isLoading: loadingConstruction,
    error: constructionError,
  } = useAssignedConstruction();

  // Mutation de React Query como alternativa
  const createIncidentMutation = useCreateIncidentMutation();

  // Estado local del formulario
  const [formData, setFormData] = useState<CreateIncident>({
    type: incidentFormDefaultValues.type,
    clasification: incidentFormDefaultValues.clasification,
    description: incidentFormDefaultValues.description,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar catálogos al montar el componente
  useEffect(() => {
    const loadCatalogs = async () => {
      if (catalogs.types.items.length === 0) {
        const typesResult = await dispatch(fetchIncidentTypes());
        if (fetchIncidentTypes.fulfilled.match(typesResult)) {
          dispatch(setTypesById(typesResult.payload));
        }
      }

      if (catalogs.classifications.items.length === 0) {
        const classificationsResult = await dispatch(
          fetchIncidentClassifications()
        );
        if (
          fetchIncidentClassifications.fulfilled.match(classificationsResult)
        ) {
          dispatch(setClassificationsById(classificationsResult.payload));
        }
      }
    };

    loadCatalogs();
  }, [
    dispatch,
    catalogs.types.items.length,
    catalogs.classifications.items.length,
  ]);

  // Los éxitos y errores ahora se manejan con el sistema de modales en IncidentForm

  // Función para manejar el envío del formulario usando React Query
  const handleSubmit = async (data: CreateIncident) => {
    // Ahora el formulario maneja toda la lógica de modales
    // Solo necesitamos hacer la llamada a la API
    setIsSubmitting(true);
    try {
      await createIncidentMutation.mutateAsync(data);
      // El éxito se maneja en IncidentForm con modales
    } catch (error) {
      // El error se maneja en IncidentForm con modales
      throw error; // Re-throw para que IncidentForm maneje el error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading de catálogos o construcción
  if (
    catalogs.types.loading ||
    catalogs.classifications.loading ||
    loadingConstruction
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando formulario...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error de catálogos o construcción
  if (
    catalogs.types.error ||
    catalogs.classifications.error ||
    constructionError
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error al cargar el formulario</Text>
          <Text style={styles.errorMessage}>
            {catalogs.types.error ||
              catalogs.classifications.error ||
              constructionError?.message ||
              "Error desconocido"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.constructionName}>
              {assignedConstruction?.name || "Obra sin nombre"}
            </Text>
            {/* Información adicional */}
            <View style={styles.infoContainer}>
              <Text style={styles.headerDescription}>
                Registra incidencias para mantener el control y seguimiento de
                eventos importantes en la obra.
              </Text>
              <Text />
              <Text style={styles.infoText}>
                * Los campos marcados son obligatorios
              </Text>
              <Text style={styles.infoText}>
                La incidencia se registrará con la fecha y hora actual
              </Text>
            </View>
          </View>

          {/* Form */}
          <IncidentForm
            initialData={formData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting || newIncident.loading}
            onGoHome={() => navigation.goBack()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default IncidentRegistrationScreen;
