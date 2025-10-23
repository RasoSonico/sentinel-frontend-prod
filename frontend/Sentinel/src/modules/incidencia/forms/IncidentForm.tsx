import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SegmentedButtons } from "react-native-paper";
import {
  useIncidentTypesQuery,
  useIncidentClassificationsQuery,
} from "../../../hooks/data/query/useIncidenciaQueries";
import { useModal } from "../../../modules/modals/ModalContext";
import { ModalEnum } from "../../../modules/modals/modalTypes";
import { CreateIncident } from "../../../types/incidencia";
import {
  validateIncidentForm,
  validateField,
  IncidentFormData,
  incidentFormDefaultValues,
} from "./util/incidentFormValidation";
import styles from "./styles/IncidentForm.styles";
import { DesignTokens } from "../../../styles/designTokens";

interface IncidentFormProps {
  initialData?: Partial<CreateIncident>;
  onSubmit: (data: CreateIncident) => void;
  isSubmitting?: boolean;
  onGoHome?: () => void; // Función opcional para manejar navegación
}

const IncidentForm: React.FC<IncidentFormProps> = ({
  initialData = {},
  onSubmit,
  isSubmitting = false,
  onGoHome,
}) => {
  // TanStack Query hooks
  const { data: incidentTypes = [] } = useIncidentTypesQuery();
  const { data: incidentClassifications = [] } = useIncidentClassificationsQuery();

  // Modal system
  const { openModal, closeModal } = useModal();

  // Estados del formulario
  const [formData, setFormData] = useState<IncidentFormData>({
    type: initialData?.type || incidentFormDefaultValues.type,
    clasification:
      initialData?.clasification || incidentFormDefaultValues.clasification,
    description:
      initialData?.description || incidentFormDefaultValues.description,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [menuVisible, setMenuVisible] = useState(false);

  // MAPEO DE CLASIFICACIONES → COLORES SEGÚN ESPECIFICACIONES
  const getClassificationColor = (classificationName: string): string => {
    const normalizedName = classificationName.toLowerCase().trim();

    // ORDEN IMPORTANTE: Evaluar casos más específicos primero

    // Muy Crítica → Rojo (error[600])
    if (
      normalizedName.includes("muy crítica") ||
      normalizedName.includes("muy critica")
    ) {
      return DesignTokens.colors.error[600];
    }

    // No Crítica → Verde (success[600]) - EVALUAR ANTES QUE "crítica" sola
    if (
      normalizedName.includes("no crítica") ||
      normalizedName.includes("no critica")
    ) {
      return DesignTokens.colors.success[600];
    }

    // Crítica → Amarillo/Naranja (warning[600]) - EVALUAR AL FINAL
    if (
      normalizedName.includes("crítica") ||
      normalizedName.includes("critica")
    ) {
      return DesignTokens.colors.warning[600];
    }

    // Color por defecto si no coincide con ninguna clasificación
    return DesignTokens.colors.primary[500];
  };

  // Preparar datos para dropdown de tipos (simple)
  const typeItems = incidentTypes.map((type) => ({
    value: type.id,
    label: type.name,
  }));

  // Preparar datos para SegmentedButtons de clasificaciones con colores
  const classificationButtons = incidentClassifications.map(
    (classification) => ({
      value: classification.id.toString(),
      label: classification.name,
    })
  );

  // Función para actualizar un campo
  const updateField = (field: keyof IncidentFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validar campo en tiempo real si ya fue tocado
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error || "",
      }));
    }
  };

  // Función para marcar un campo como tocado
  const touchField = (field: keyof IncidentFormData) => {
    if (!touched[field]) {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validar el campo al tocarlo
      const error = validateField(field, formData[field]);
      setErrors((prev) => ({
        ...prev,
        [field]: error || "",
      }));
    }
  };

  // Validar formulario completo
  const validateForm = () => {
    const validation = validateIncidentForm(formData);
    setErrors(validation.errors);

    // Marcar todos los campos como tocados
    setTouched({
      type: true,
      clasification: true,
      description: true,
    });

    return validation.isValid;
  };

  // Generar resumen para el modal de confirmación
  const generateSummary = () => {
    const typeData = incidentTypes.find(t => t.id === formData.type);
    const classificationData = incidentClassifications.find(c => c.id === formData.clasification);
    
    return [
      { label: "Tipo de Incidencia", value: typeData?.name || "" },
      { label: "Clasificación", value: classificationData?.name || "" },
      { label: "Descripción", value: formData.description.trim() },
    ];
  };

  // Función para manejar confirmación del modal
  const handleConfirmSendModal = async () => {
    closeModal();
    
    // Mostrar modal de loading
    openModal(ModalEnum.Pending, {
      message: "Registrando incidencia..."
    });

    try {
      await onSubmit({
        type: formData.type,
        clasification: formData.clasification,
        description: formData.description.trim(),
      });
      
      // Éxito - mostrar modal de éxito
      closeModal();
      openModal(ModalEnum.Success, {
        title: "¡Incidencia registrada!",
        subtitle: "La incidencia ha sido registrada exitosamente.",
        primaryButtonText: "Registrar otra incidencia",
        secondaryButtonText: "Ir al inicio",
        onPrimaryAction: handleRegisterAnother,
        onSecondaryAction: handleGoHomeAction,
      });
    } catch (error) {
      // Error - mostrar modal de error
      closeModal();
      openModal(ModalEnum.Failure, {
        title: "Hubo un error",
        message: "La incidencia no pudo registrarse correctamente, intente más tarde.",
        buttonText: "Cerrar",
      });
    }
  };

  // Función para registrar otra incidencia
  const handleRegisterAnother = () => {
    closeModal();
    // Limpiar formulario
    setFormData({
      type: incidentFormDefaultValues.type,
      clasification: incidentFormDefaultValues.clasification,
      description: incidentFormDefaultValues.description,
    });
    setErrors({});
    setTouched({});
  };

  // Función para ir al inicio
  const handleGoHomeAction = () => {
    closeModal();
    if (onGoHome) {
      onGoHome();
    }
  };

  // Función principal de envío del formulario (con modal de confirmación)
  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert(
        "Formulario Incompleto",
        "Por favor, corrija los errores en el formulario antes de continuar.",
        [{ text: "OK" }]
      );
      return;
    }

    // Mostrar modal de confirmación
    openModal(ModalEnum.Confirm, {
      title: "Confirmar Envío",
      subtitle: "Revisa los datos antes de enviar la incidencia",
      sectionTitle: "Resumen de envío:",
      checkboxText: "Confirmo que los datos son correctos y decido enviar la incidencia registrada",
      editButtonText: "Editar",
      confirmButtonText: "Confirmar",
      fields: generateSummary(),
      onEdit: () => closeModal(),
      onConfirm: handleConfirmSendModal,
    });
  };

  // Verificar si el formulario es válido
  const isFormValid =
    Object.values(errors).every((error) => !error) &&
    formData.type > 0 &&
    formData.clasification > 0 &&
    formData.description.trim().length >= 10;

  return (
    <ScrollView>
      <View style={styles.container}>
        {/* SECCIÓN DE FORMULARIO - SEPARADA COMO ADVANCEFORM */}
        <View style={styles.formSection}>
          {/* Clasificación de Incidencia */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Clasificación *</Text>
            {/* Clasificación personalizada con colores condicionales */}
            <View style={styles.classificationsContainer}>
              {classificationButtons.map((button) => {
                const isSelected =
                  formData.clasification === parseInt(button.value);
                const classificationColor = getClassificationColor(
                  incidentClassifications.find(
                    (c) => c.id === parseInt(button.value)
                  )?.name || ""
                );

                return (
                  <TouchableOpacity
                    key={button.value}
                    style={[
                      styles.classificationButton,
                      isSelected && {
                        backgroundColor: classificationColor,
                        borderColor: classificationColor,
                      },
                    ]}
                    onPress={() =>
                      updateField("clasification", parseInt(button.value))
                    }
                  >
                    <Text
                      style={[
                        styles.classificationButtonText,
                        isSelected && styles.classificationButtonTextSelected,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {button.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {touched.clasification && errors.clasification && (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={DesignTokens.colors.error[500]}
                />
                <Text style={styles.errorText}>{errors.clasification}</Text>
              </View>
            )}
          </View>
          {/* Tipo de Incidencia - Dropdown Simple */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Tipo de Incidencia *</Text>
            <TouchableOpacity
              style={[
                styles.dropdownContainer,
                touched.type && errors.type && styles.dropdownContainerError,
              ]}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !formData.type && styles.placeholderText,
                ]}
                numberOfLines={2} //Máximo 2 líneas para textos largos
                adjustsFontSizeToFit={true} //Reducir tamaño de fuente si es necesario
                minimumFontScale={0.8} //No reducir más del 80% del tamaño original
              >
                {formData.type > 0
                  ? typeItems.find((item) => item.value === formData.type)
                      ?.label || "Seleccionar tipo"
                  : "Seleccionar tipo"}
              </Text>
              <Ionicons
                name={menuVisible ? "chevron-up" : "chevron-down"}
                size={20}
                color={DesignTokens.colors.neutral[500]}
              />
            </TouchableOpacity>

            {/* Opciones del dropdown */}
            {menuVisible && (
              <View style={styles.dropdownOptions}>
                {typeItems.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={styles.dropdownOption}
                    onPress={() => {
                      updateField("type", item.value);
                      setMenuVisible(false);
                    }}
                  >
                    <Text
                      style={styles.dropdownOptionText}
                      numberOfLines={2}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.85}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {touched.type && errors.type && (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={DesignTokens.colors.error[500]}
                />
                <Text style={styles.errorText}>{errors.type}</Text>
              </View>
            )}
          </View>

          {/* Descripción */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Descripción *</Text>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                placeholder="Describe la incidencia detalladamente..."
                value={formData.description}
                onChangeText={(value) => updateField("description", value)}
                onBlur={() => touchField("description")}
                multiline
                numberOfLines={6}
                maxLength={1000}
                editable={!isSubmitting}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.descriptionFooter}>
              <Text style={styles.characterCount}>
                {formData.description.length}/1000
              </Text>
            </View>
            {touched.description && errors.description && (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={DesignTokens.colors.error[500]}
                />
                <Text style={styles.errorText}>{errors.description}</Text>
              </View>
            )}
          </View>
        </View>

        {/* BOTÓN DE SUBMIT - SEPARADO COMO ADVANCEFORM */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting && (
            <Ionicons
              name="refresh"
              size={20}
              color={DesignTokens.colors.background.primary}
              style={styles.submitButtonIcon}
            />
          )}
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? "Registrando incidencia..."
              : "Registrar incidencia"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default IncidentForm;
