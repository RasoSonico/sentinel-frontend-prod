import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { Checkbox } from "react-native-paper";
import styles from "./styles/ConfirmSendModal.styles";
import { BaseModalProps } from "../modalTypes";
import { DesignTokens } from "../../../styles/designTokens";

// Generic interface for reusability
export interface ConfirmModalProps extends BaseModalProps {
  title?: string;
  subtitle?: string;
  sectionTitle?: string;
  checkboxText?: string;
  editButtonText?: string;
  confirmButtonText?: string;
  fields: Array<{ label: string; value: string }>;
  onEdit: () => void;
  onConfirm: () => void;
}

// Backward compatibility interface
export interface ConfirmSendModalProps extends BaseModalProps {
  onEdit: () => void;
  onConfirm: () => void;
  summary: {
    catalog: string;
    partida: string;
    concept: string;
    volume: string;
    unit: string;
    notes: string;
  };
}

// Generic ConfirmModal component
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title = "Confirmar Envío",
  subtitle = "Revisa los datos antes de enviar",
  sectionTitle = "Resumen de envío:",
  checkboxText = "Confirmo que los datos son correctos y decido enviar los datos ingresados",
  editButtonText = "Editar",
  confirmButtonText = "Confirmar",
  fields,
  onEdit,
  onConfirm,
  onClose,
}) => {
  const width = Dimensions.get("window").width * 0.9;
  const [checked, setChecked] = useState(false);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <View style={styles.summaryBox}>
            <ScrollView>
              {fields.map((field, index) =>
                field.value ? (
                  <React.Fragment key={index}>
                    <Text style={styles.summaryLabel}>{field.label}</Text>
                    <Text style={styles.summaryValue}>{field.value}</Text>
                  </React.Fragment>
                ) : null,
              )}
            </ScrollView>
          </View>
          <View
            style={styles.checkboxContainer}
            onTouchEnd={() => setChecked(!checked)}
          >
            <Checkbox
              status={checked ? "checked" : "unchecked"}
              color={DesignTokens.colors.executive.secondary}
            />
            <Text style={styles.checkboxLabel}>{checkboxText}</Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Text style={styles.editButtonText}>{editButtonText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !checked && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={!checked}
            >
              <Text style={styles.confirmButtonText}>{confirmButtonText}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text
              style={{ fontSize: 22, color: DesignTokens.colors.neutral[400] }}
            >
              ×
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Backward compatibility wrapper for existing advance functionality
const ConfirmSendModal: React.FC<ConfirmSendModalProps> = ({
  onEdit,
  onConfirm,
  onClose,
  summary,
}) => {
  const fields = [
    { label: "Catalogo", value: summary.catalog },
    { label: "Partida", value: summary.partida },
    { label: "Concepto", value: summary.concept },
    { label: "Volumen", value: `${summary.volume} ${summary.unit}` },
    { label: "Notas", value: summary.notes },
  ];

  return (
    <ConfirmModal
      title="Confirmar Envío"
      subtitle="Revisa los datos antes de enviar"
      sectionTitle="Resumen de envío:"
      checkboxText="Confirmo que los datos son correctos y decido enviar los avances ingresados"
      editButtonText="Editar"
      confirmButtonText="Confirmar"
      fields={fields}
      onEdit={onEdit}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};

export default ConfirmSendModal;
export { ConfirmModal };
