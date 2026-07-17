import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { PhysicalAdvanceResponse } from "src/types/entities";
import { useCustomFormattedDate } from "src/hooks/ui/useDateFormatting";
import { ColorUtils } from "src/styles/designTokens";
import styles from "../styles/AdvanceListScreen.styles";

interface AdvanceItemCardProps {
  item: PhysicalAdvanceResponse;
  onPress: (item: PhysicalAdvanceResponse) => void;
}

/**
 * Card del historial rejerarquizada (ADR-003 D6, lámina L-01b): el volumen
 * con unidad es el único protagonista tipográfico; el importe va etiquetado
 * en línea propia; la partida baja a cejilla con WBS; el estado se conserva
 * (borde izquierdo + chip, D10). "sin foto" en ámbar como señal suave; si el
 * backend aún no expone photo_count, el indicador 📷 se omite (deuda #10).
 */
const AdvanceItemCard: React.FC<AdvanceItemCardProps> = ({ item, onPress }) => {
  const hora = useCustomFormattedDate(item.date, "HH:mm");

  if (!item) {
    return null;
  }

  const conceptDescription =
    item.concept_description || `Concepto #${item.concept}`;
  const conceptUnit = item.concept_unit || "";
  const partidaName = item.work_item_name || "Partida no disponible";
  const cejilla = item.concept_wbs_code
    ? `${partidaName} · ${item.concept_wbs_code}`
    : partidaName;

  const importe =
    item.total_amount != null
      ? Number(item.total_amount).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

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
          <Text style={styles.cardCejilla} numberOfLines={1}>
            {cejilla}
          </Text>
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

      <Text style={styles.cardVolume}>
        {item.volume || "0"} {conceptUnit}
      </Text>

      <View style={styles.cardMetaRow}>
        {importe !== null ? (
          <Text style={styles.cardImporte}>Importe ${importe}</Text>
        ) : (
          <View />
        )}
        {item.photo_count == null ? (
          <Text style={styles.cardMetaRight}>{hora}</Text>
        ) : item.photo_count > 0 ? (
          <Text style={styles.cardMetaRight}>
            📷 {item.photo_count} · {hora}
          </Text>
        ) : (
          <Text style={[styles.cardMetaRight, styles.cardMetaAmber]}>
            sin foto · {hora}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default memo(AdvanceItemCard);
