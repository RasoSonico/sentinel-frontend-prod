import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import styles from "./styles/MaquinariaCard.styles";

interface Props {
  item: MaquinariaHubItemRealm;
  onReportar: (item: MaquinariaHubItemRealm) => void;
  onSinOperar: (item: MaquinariaHubItemRealm) => void;
  onSalida: (item: MaquinariaHubItemRealm) => void;
  onReconciliar: (item: MaquinariaHubItemRealm) => void;
}

const PROPIETARIO_LABELS: Record<string, string> = {
  PROPIA: "Propia",
  RENTADA: "Rentada",
  SUBCONTRATISTA: "Subcontrato",
};

const MOTIVO_LABELS: Record<string, string> = {
  FALLA_MECANICA: "Falla mecánica",
  SIN_OPERADOR: "Sin operador",
  SIN_FRENTE: "Sin frente",
  CLIMA: "Clima",
  OTRO: "Otro",
};

const getBorderColor = (item: MaquinariaHubItemRealm): string => {
  if (item.requiere_reconciliacion) return DesignTokens.colors.error[500];
  if (!item.jornada_id) return DesignTokens.colors.warning[400];
  if (item.jornada_estado === "TRABAJANDO")
    return DesignTokens.colors.success[500];
  if (item.jornada_estado === "SIN_OPERAR")
    return DesignTokens.colors.warning[500];
  return DesignTokens.colors.neutral[200];
};

const getStatusDot = (item: MaquinariaHubItemRealm) => {
  if (!item.jornada_id) return DesignTokens.colors.warning[400];
  if (item.jornada_estado === "TRABAJANDO")
    return DesignTokens.colors.success[500];
  return DesignTokens.colors.warning[500];
};

const getStatusLabel = (item: MaquinariaHubItemRealm): string => {
  if (!item.jornada_id) return "Sin reportar hoy";
  if (item.jornada_estado === "TRABAJANDO") return "Trabajando";
  if (item.jornada_estado === "SIN_OPERAR") {
    const motivo = item.jornada_motivo_inactividad
      ? (MOTIVO_LABELS[item.jornada_motivo_inactividad] ??
        item.jornada_motivo_inactividad)
      : "";
    return `Sin operar${motivo ? ` · ${motivo}` : ""}`;
  }
  return "";
};

const MaquinariaCard: React.FC<Props> = ({
  item,
  onReportar,
  onSinOperar,
  onSalida,
  onReconciliar,
}) => {
  const hasJornada = !!item.jornada_id;

  return (
    <View style={[styles.card, { borderLeftColor: getBorderColor(item) }]}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.tipoMarca} numberOfLines={1}>
              {item.tipo} · {item.marca}
            </Text>
            {!!item.modelo && <Text style={styles.modelo}>{item.modelo}</Text>}
          </View>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: DesignTokens.colors.neutral[100] },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: DesignTokens.colors.neutral[600] },
                ]}
              >
                {PROPIETARIO_LABELS[item.propietario_tipo] ??
                  item.propietario_tipo}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onSalida(item)}>
              <Ionicons
                name="exit-outline"
                size={18}
                color={DesignTokens.colors.neutral[400]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, { backgroundColor: getStatusDot(item) }]}
          />
          <Text style={styles.statusText}>{getStatusLabel(item)}</Text>
          {item.dias_sin_reporte > 0 && !hasJornada && (
            <Text
              style={{ fontSize: 11, color: DesignTokens.colors.warning[600] }}
            >
              {item.dias_sin_reporte}d sin reporte
            </Text>
          )}
        </View>

        {item.requiere_reconciliacion && (
          <TouchableOpacity
            style={styles.reconciliacionBanner}
            onPress={() => onReconciliar(item)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="alert-circle"
              size={16}
              color={DesignTokens.colors.error[500]}
            />
            <Text style={styles.reconciliacionText}>
              {item.dias_sin_reporte} días sin reporte · Confirmar estado
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={DesignTokens.colors.error[500]}
            />
          </TouchableOpacity>
        )}
      </View>

      {!hasJornada && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onReportar(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={DesignTokens.colors.success[600]}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: DesignTokens.colors.success[600] },
              ]}
            >
              Reportar jornada
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDivider]}
            onPress={() => onSinOperar(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="pause-circle-outline"
              size={16}
              color={DesignTokens.colors.warning[600]}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: DesignTokens.colors.warning[600] },
              ]}
            >
              Sin operar
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default memo(MaquinariaCard);
