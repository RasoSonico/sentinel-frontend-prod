import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Checkbox } from "react-native-paper";

import { DateRangeFilter, type DateFilter } from "src/components/ui/filters";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import { useSnackbar } from "src/hooks/useSnackbar";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { telemetry } from "src/services/telemetry";
import { DesignTokens } from "src/styles/designTokens";
import { DateUtils } from "src/utils/dateUtils";

import { descargarDatos, type TablaDescargable } from "./descargaDatosService";
import { diasDe, MAX_DIAS, periodoDe } from "./periodo";

interface Props {
  visible: boolean;
  onCerrar: () => void;
}

const TABLAS: { id: TablaDescargable; titulo: string; detalle: string }[] = [
  {
    id: "actividades",
    titulo: "Actividades de reportes",
    detalle:
      "Cada actividad de los reportes diarios, con folio, área y contratistas.",
  },
  {
    id: "maquinaria",
    titulo: "Maquinaria",
    detalle: "Horómetro por turno y actividades de cada máquina.",
  },
];

/** "Este mes" del selector de la app, para abrir con algo útil ya elegido. */
const esteMes = (): DateFilter => DateUtils.getPresetDateRanges().thisMonth;

/**
 * Perfil → "Descargar datos".
 *
 * Un Excel SIN formato con lo capturado en la obra —toda la obra, no solo lo
 * propio— para que el contratista lo lleve a su propio formato. Se arma en el
 * servidor, así que sin señal no hay descarga: el botón lo dice en vez de
 * fallar al tocarlo.
 *
 * Pantalla completa en `Modal`, igual que "Mi firma": Perfil no tiene pila de
 * navegación propia y una sola pantalla no la justifica.
 */
const PantallaDescargarDatos: React.FC<Props> = ({ visible, onCerrar }) => {
  const { data: obra } = useAssignedConstruction("CONTRATISTA");
  const enLinea = useNetworkStatus();
  const { showSnackbar } = useSnackbar();

  const [filtro, setFiltro] = useState<DateFilter | null>(esteMes);
  const [elegidas, setElegidas] = useState<TablaDescargable[]>([
    "actividades",
    "maquinaria",
  ]);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (visible) telemetry.trackScreen("DescargarDatos");
  }, [visible]);

  const periodo = periodoDe(filtro);
  const dias = periodo ? diasDe(periodo) : 0;
  // `null` es "todavía no se sabe", no "sin señal": no se bloquea por eso.
  const sinSenal = enLinea === false;

  const aviso = !obra
    ? "No tienes una obra asignada."
    : sinSenal
      ? "Necesitas conexión para descargar."
      : !periodo
        ? "Elige el periodo."
        : dias > MAX_DIAS
          ? "El periodo no puede pasar de un año."
          : elegidas.length === 0
            ? "Elige al menos una tabla."
            : null;
  const puede = !aviso && !descargando;

  const alternar = (id: TablaDescargable) =>
    setElegidas((xs) =>
      xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id],
    );

  const descargar = useCallback(async () => {
    if (!obra || !periodo || !puede) return;
    setDescargando(true);
    try {
      await descargarDatos({
        obraId: Number(obra.id),
        obraNombre: obra.name,
        desde: periodo.desde,
        hasta: periodo.hasta,
        tablas: elegidas,
      });
      telemetry.trackEvent("datos_descargados", {
        obra_id: String(obra.id),
        tablas: elegidas.join(","),
        dias,
      });
    } catch (error) {
      showSnackbar(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el archivo.",
        "error",
      );
    } finally {
      setDescargando(false);
    }
  }, [obra, periodo, puede, elegidas, dias, showSnackbar]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCerrar}
    >
      {/* Raíz de gestos y proveedor de hojas PROPIOS, dentro del Modal.

          El selector de fechas es una hoja de @gorhom/bottom-sheet, que se
          dibuja en el proveedor más cercano. El de la app vive en `App.tsx`,
          y un `Modal` nativo se pinta en una capa por encima de toda la app:
          la hoja se abría DETRÁS de esta pantalla y el toque parecía no hacer
          nada. Con su proveedor aquí, se dibuja encima. La raíz de gestos es
          por lo mismo: el `Modal` es otra raíz nativa, y en Android sin ella
          la hoja no se puede arrastrar. */}
      <GestureHandlerRootView style={estilos.raiz}>
        <BottomSheetModalProvider>
          <SafeAreaView style={estilos.raiz}>
            <View style={estilos.barra}>
              <TouchableOpacity onPress={onCerrar} hitSlop={12}>
                <Ionicons
                  name="chevron-back"
                  size={26}
                  color={DesignTokens.colors.neutral[600]}
                />
              </TouchableOpacity>
              <Text style={estilos.titulo}>Descargar datos</Text>
              {/* Hueco del ancho del botón, para que el título quede centrado. */}
              <View style={estilos.hueco} />
            </View>

            <ScrollView contentContainerStyle={estilos.cuerpo}>
              <Text style={estilos.explicacion}>
                Un Excel sin formato con lo capturado en la obra, una hoja por
                tabla, para llevarlo a tu propio formato.
              </Text>

              <Text style={estilos.seccion}>Obra</Text>
              <Text style={estilos.obra}>{obra?.name ?? "—"}</Text>

              <Text style={estilos.seccion}>Periodo</Text>
              <DateRangeFilter value={filtro} onChange={setFiltro} />

              <Text style={estilos.seccion}>Qué incluir</Text>
              {TABLAS.map((tabla) => {
                const marcada = elegidas.includes(tabla.id);
                return (
                  <TouchableOpacity
                    key={tabla.id}
                    style={estilos.casilla}
                    onPress={() => alternar(tabla.id)}
                    activeOpacity={0.7}
                  >
                    <Checkbox
                      status={marcada ? "checked" : "unchecked"}
                      onPress={() => alternar(tabla.id)}
                      color={DesignTokens.colors.primary[600]}
                    />
                    <View style={estilos.casillaTextos}>
                      <Text style={estilos.casillaTitulo}>{tabla.titulo}</Text>
                      <Text style={estilos.casillaDetalle}>
                        {tabla.detalle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={estilos.pie}>
              {!!aviso && <Text style={estilos.aviso}>{aviso}</Text>}
              <TouchableOpacity
                style={[estilos.boton, !puede && estilos.botonInactivo]}
                onPress={descargar}
                disabled={!puede}
                activeOpacity={0.85}
              >
                {descargando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color={puede ? "#fff" : DesignTokens.colors.neutral[500]}
                    />
                    <Text
                      style={[
                        estilos.botonTexto,
                        !puede && estilos.botonTextoInactivo,
                      ]}
                    >
                      Descargar Excel
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </Modal>
  );
};

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: DesignTokens.colors.background.primary },
  barra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  titulo: {
    fontSize: DesignTokens.typography.fontSize.lg,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.executive.primary,
  },
  hueco: { width: 26 },
  cuerpo: { padding: DesignTokens.spacing.xl },
  explicacion: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[600],
    lineHeight: 20,
  },
  seccion: {
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[500],
    marginTop: DesignTokens.spacing.xl,
    marginBottom: DesignTokens.spacing.sm,
  },
  obra: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
  },
  casilla: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: DesignTokens.spacing.xs,
  },
  casillaTextos: { flex: 1, paddingTop: 7 },
  casillaTitulo: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[900],
  },
  casillaDetalle: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  pie: {
    padding: DesignTokens.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  aviso: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[600],
    textAlign: "center",
    marginBottom: DesignTokens.spacing.sm,
  },
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: 14,
  },
  botonInactivo: { backgroundColor: DesignTokens.colors.neutral[300] },
  botonTexto: {
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#fff",
  },
  botonTextoInactivo: { color: DesignTokens.colors.neutral[500] },
});

export default PantallaDescargarDatos;
