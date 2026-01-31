import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { PhysicalAdvanceResponse } from "src/types/entities";
import { useFormattedDate } from "src/hooks/ui/useDateFormatting";
import ProgramStatusBadge from "./ProgramStatusBadge";
import { ColorUtils } from "src/styles/designTokens";
import styles from "../styles/AdvanceListScreen.styles";

interface AdvanceItemCardProps {
  item: PhysicalAdvanceResponse;
  onPress: (item: PhysicalAdvanceResponse) => void;
}

const AdvanceItemCard: React.FC<AdvanceItemCardProps> = ({ item, onPress }) => {
  const formattedDate = useFormattedDate(item.date, "medium");

  if (!item) {
    return null;
  }

  const conceptDescription =
    item.concept_description || `Concepto #${item.concept}`;
  const conceptUnit = item.concept_unit || "";
  const partidaName = item.work_item_name || "Partida no disponible";

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Aprobado";
      case "REJECTED":
        return "Rechazado";
      default:
        return "Pendiente";
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { chip: styles.approvedChip, text: styles.approvedText };
      case "REJECTED":
        return { chip: styles.rejectedChip, text: styles.rejectedText };
      default:
        return { chip: styles.pendingChip, text: styles.pendingText };
    }
  };

  const statusStyles = getStatusStyles(item.status);

  return (
    <TouchableOpacity
      style={[
        styles.advanceItem,
        { borderLeftColor: ColorUtils.getStatusBorderColor(item.status) },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.advanceHeader}>
        <View style={styles.conceptInfo}>
          <Text style={styles.partidaName}>{partidaName}</Text>
          <Text style={styles.conceptDescription} numberOfLines={2}>
            {conceptDescription}
          </Text>
        </View>

        <View style={[styles.statusChip, statusStyles.chip]}>
          <Text style={[styles.statusText, statusStyles.text]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.advanceDetails}>
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Volumen:</Text>
          <Text style={styles.quantityValue}>
            {item.volume || "0"} {conceptUnit}
          </Text>
        </View>
      </View>

      {item.comments && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Comentarios:</Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {item.comments}
          </Text>
        </View>
      )}

      <View style={styles.bottomSection}>
        <View style={styles.programStatusContainer}>
          <ProgramStatusBadge
            status={item.status === "APPROVED" ? "completed" : "onSchedule"}
            compact={true}
          />
        </View>

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default memo(AdvanceItemCard);
