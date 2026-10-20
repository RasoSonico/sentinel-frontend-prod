import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import type { FilaMaquinaria } from "../filaMaquinaria";
import { PendingJornadaSubmission } from "src/realm/pendingJornada/PendingJornadaSubmission";
import styles from "./styles/MaquinariaCard.styles";

interface Props {
  item: FilaMaquinaria;
  /**
   * Jornada capturada que todavía no confirma el servidor.
   *
   * El hub viene del servidor, así que sin esto una jornada reportada sin
   * señal no aparecería y la tarjeta seguiría diciendo "Sin reportar hoy" —
   * invitando al usuario a capturarla otra vez.
   */
  enCola?: PendingJornadaSubmission;
  /** Leído UNA vez en la pantalla: N tarjetas no deben suscribirse a NetInfo. */
  sinSenal: boolean;
  onReportar: (item: FilaMaquinaria) => void;
  onSinOperar: (item: FilaMaquinaria) => void;
  onSalida: (item: FilaMaquinaria) => void;
  onReconciliar: (item: FilaMaquinaria) => void;
  /**
   * Rescate de una jornada que no pudo enviarse.
   *
   * Sin esto la tarjeta sería un callejón sin salida: una encolada cuenta como
   * reportada —así que los botones se esconden— y una fallida se quedaría ahí
   * para siempre, visible y sin manera de resolverla.
   */
  onResolverCola: (enCola: PendingJornadaSubmission) => void;
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

/**
 * La cola manda sobre el servidor mientras no haya confirmación.
 *
 * Mismo vocabulario que el chip de Reportes: "Por enviar" sin señal,
 * "Enviando" con ella, "No se envió" cuando se agotaron los intentos. Dos
 * módulos que dicen lo mismo con palabras distintas se aprenden dos veces.
 */
const estadoDeCola = (
  item: FilaMaquinaria,
  enCola: PendingJornadaSubmission | undefined,
) => {
  if (!enCola) return null;
  // **El servidor gana en cuanto tiene la jornada.** La copia en cola sigue en
  // Realm hasta que la purga corra, pero deja de mandar en el momento en que
  // el hub ya la trae: así no se pisan dos verdades sobre el mismo hecho.
  if (item.jornada_id) return null;
  if (enCola.status === "failed") {
    return enCola.retryCount >= enCola.maxRetries ? "fallida" : "reintentando";
  }
  // `done` sin jornada en el hub = ya salió, el hub todavía no se entera.
  if (enCola.status === "done") return "enviada";
  return "porEnviar";
};

const getBorderColor = (
  item: FilaMaquinaria,
  cola: ReturnType<typeof estadoDeCola>,
): string => {
  if (cola === "fallida") return DesignTokens.colors.error[500];
  if (item.requiere_reconciliacion) return DesignTokens.colors.error[500];
  if (cola) return DesignTokens.colors.primary[500];
  if (!item.jornada_id) return DesignTokens.colors.warning[400];
  if (item.jornada_estado === "TRABAJANDO")
    return DesignTokens.colors.success[500];
  if (item.jornada_estado === "SIN_OPERAR")
    return DesignTokens.colors.warning[500];
  return DesignTokens.colors.neutral[200];
};

const getStatusDot = (
  item: FilaMaquinaria,
  cola: ReturnType<typeof estadoDeCola>,
) => {
  if (cola === "fallida") return DesignTokens.colors.error[500];
  if (cola) return DesignTokens.colors.primary[500];
  if (!item.jornada_id) return DesignTokens.colors.warning[400];
  if (item.jornada_estado === "TRABAJANDO")
    return DesignTokens.colors.success[500];
  return DesignTokens.colors.warning[500];
};

const etiquetaDeEstado = (estado: string | null, motivo: string | null) => {
  if (estado === "TRABAJANDO") return "Trabajando";
  if (estado === "SIN_OPERAR") {
    const texto = motivo ? (MOTIVO_LABELS[motivo] ?? motivo) : "";
    return `Sin operar${texto ? ` · ${texto}` : ""}`;
  }
  return "";
};

const getStatusLabel = (
  item: FilaMaquinaria,
  enCola: PendingJornadaSubmission | undefined,
  cola: ReturnType<typeof estadoDeCola>,
  sinSenal: boolean,
): string => {
  if (cola && enCola) {
    const que = etiquetaDeEstado(enCola.estado, enCola.motivoInactividad);
    if (cola === "fallida") return `No se envió · ${que}`;
    if (cola === "reintentando") return `Reintentando · ${que}`;
    if (cola === "enviada") return `Enviando · ${que}`;
    return `${sinSenal ? "Por enviar" : "Enviando"} · ${que}`;
  }
  if (!item.jornada_id) return "Sin reportar hoy";
  return etiquetaDeEstado(item.jornada_estado, item.jornada_motivo_inactividad);
};

const MaquinariaCard: React.FC<Props> = ({
  item,
  enCola,
  sinSenal,
  onReportar,
  onSinOperar,
  onSalida,
  onReconciliar,
  onResolverCola,
}) => {
  const cola = estadoDeCola(item, enCola);
  // Una jornada encolada cuenta como reportada para efectos de la interfaz:
  // volver a capturarla chocaría contra `unique(estancia, fecha)` del servidor
  // y le diría al usuario "ya existe una jornada" sin que él vea ninguna.
  const hasJornada = !!item.jornada_id || !!cola;

  return (
    <View
      style={[styles.card, { borderLeftColor: getBorderColor(item, cola) }]}
    >
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
            style={[
              styles.statusDot,
              { backgroundColor: getStatusDot(item, cola) },
            ]}
          />
          <Text style={styles.statusText}>
            {getStatusLabel(item, enCola, cola, sinSenal)}
          </Text>
          {item.dias_sin_reporte > 0 && !hasJornada && (
            <Text
              style={{ fontSize: 11, color: DesignTokens.colors.warning[600] }}
            >
              {item.dias_sin_reporte}d sin reporte
            </Text>
          )}
        </View>

        {cola === "fallida" && enCola && (
          <TouchableOpacity
            style={styles.reconciliacionBanner}
            onPress={() => onResolverCola(enCola)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="cloud-offline"
              size={16}
              color={DesignTokens.colors.error[500]}
            />
            <Text style={styles.reconciliacionText} numberOfLines={2}>
              {enCola.errorMessage ?? "No se pudo enviar"} · Toca para resolver
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={DesignTokens.colors.error[500]}
            />
          </TouchableOpacity>
        )}

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
