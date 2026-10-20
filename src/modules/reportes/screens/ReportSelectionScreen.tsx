import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import {
  useReportesDeObra,
  type FilaReporte,
} from "src/hooks/reportes/useReportesDeObra";
import { useProveedores } from "src/hooks/reportes/useProveedores";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { fechaConDia } from "src/modules/avance/utils/fechaPrograma";
import type { ReportesStackParamList } from "src/navigation/types";

import { IndicadorSincronizacion } from "../components/IndicadorSincronizacion";

type Navegacion = StackNavigationProp<
  ReportesStackParamList,
  "ReportSelection"
>;

/**
 * Zona de Reportes (ADR-006, Decisión 8).
 *
 * Dos secciones nombradas: **CREAR** y **REPORTES DE LA OBRA**.
 *
 * La lista no es un extra: si el producto promete que toda la obra puede
 * consultar el reporte, tiene que existir el lugar donde consultarlo — es la
 * contraparte obligatoria de esa promesa.
 *
 * "Reporte de actividades" **sustituye** a la card "Reporte Fotográfico" que
 * nunca se construyó: cumple mejor esa promesa, porque no es un álbum de fotos
 * sino un entregable con su evidencia dentro. Mantener ambas ofrecería dos
 * caminos para lo mismo.
 *
 * La info card de compartir se mudó al detalle, que es donde se comparte.
 */
export default function ReportSelectionScreen() {
  const navigation = useNavigation<Navegacion>();
  const { data: obra } = useAssignedConstruction();

  const obraId = obra?.id !== undefined ? Number(obra.id) : null;
  const obraNombre = obra?.name ?? "";
  // La tabla de avances recibe el id como string (contrato de su pantalla).
  const obraIdTexto = obra?.id != null ? String(obra.id) : "";

  const { filas, isPending, isFetching, refetch } = useReportesDeObra(obraId);

  // Se lee aquí y baja por prop a cada chip: `useNetworkStatus` dentro de la
  // fila serían N suscripciones a NetInfo para leer el mismo valor.
  const sinSenal = useNetworkStatus() === false;

  /**
   * Calienta el roster de la obra desde AQUÍ, no desde P-00.
   *
   * Es la pantalla por la que se pasa obligatoriamente para llegar al wizard, y
   * normalmente se visita con señal —la lista de reportes viene del servidor—.
   * Montar la misma consulta un paso antes deja la copia guardada lista para
   * cuando el usuario llegue a P-00 en obra y sin red. No se usa su resultado
   * aquí: el único efecto buscado es poblar el caché.
   */
  useProveedores(obraId);

  const abrirWizard = useCallback(() => {
    if (obraId === null) return;
    navigation.navigate("ReporteWizard", {
      constructionId: obraId,
      constructionName: obraNombre,
    });
  }, [navigation, obraId, obraNombre]);

  const abrirTablaDeAvances = useCallback(() => {
    navigation.navigate("AdvanceReport", {
      constructionId: obraIdTexto,
      constructionName: obraNombre,
    });
  }, [navigation, obraIdTexto, obraNombre]);

  const abrirDetalle = useCallback(
    (fila: FilaReporte) => {
      navigation.navigate("ReporteDetalle", {
        reporteId: fila.reporteId ?? undefined,
        localId: fila.localId ?? undefined,
        constructionName: obraNombre,
        fechaReporte: fila.fechaReporte,
        esAutor: fila.porEnviar,
      });
    },
    [navigation, obraNombre],
  );

  const renderFila = useCallback(
    ({ item }: { item: FilaReporte }) => (
      <Pressable
        onPress={() => abrirDetalle(item)}
        accessibilityRole="button"
        accessibilityLabel={`Reporte de actividades del ${item.fechaReporte}, por ${item.autor}`}
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionado]}
      >
        <View style={estilos.filaIcono}>
          <Ionicons
            name="document-text-outline"
            size={fs(20)}
            color={DesignTokens.colors.executive.primary}
          />
        </View>
        <View style={estilos.filaTexto}>
          <Text style={estilos.filaTitulo}>
            Actividades · {fechaConDia(item.fechaReporte)}
          </Text>
          <Text style={estilos.filaMeta} numberOfLines={1}>
            {item.autor} · {item.actividadesCount}{" "}
            {item.actividadesCount === 1 ? "actividad" : "actividades"} ·{" "}
            {item.fotosCount} {item.fotosCount === 1 ? "foto" : "fotos"}
          </Text>
        </View>
        <Chip fila={item} sinSenal={sinSenal} />
        <Ionicons
          name="chevron-forward"
          size={fs(18)}
          color={DesignTokens.colors.neutral[300]}
        />
      </Pressable>
    ),
    [abrirDetalle, sinSenal],
  );

  return (
    <FlatList
      style={estilos.contenedor}
      data={filas}
      keyExtractor={(item) => item.clave}
      renderItem={renderFila}
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isPending} onRefresh={refetch} />
      }
      ListHeaderComponent={
        <>
          {/* Misma franja que Avances y que el formulario de captura. En
              Reportes no había ninguna: el usuario capturaba sin señal sin que
              nada en pantalla se lo confirmara, y la única pista de que su
              trabajo estaba a salvo era el chip de cada fila. */}
          <IndicadorSincronizacion />
          <Text style={estilos.etiquetaSeccion}>Crear</Text>
          <View style={estilos.cards}>
            <CardCrear
              icono="document-text-outline"
              titulo="Reporte de actividades"
              descripcion="Actividades del día, observaciones y evidencia fotográfica."
              onPress={abrirWizard}
              deshabilitada={obraId === null}
              tinteNavy
            />
            <CardCrear
              icono="grid-outline"
              titulo="Tabla de avances"
              descripcion="Seguimiento cuantitativo de conceptos y avance físico."
              onPress={abrirTablaDeAvances}
            />
          </View>

          <View style={estilos.encabezadoLista}>
            <Text style={estilos.etiquetaSeccion}>Reportes de la obra</Text>
            {filas.length > 0 ? (
              <Text style={estilos.contadorLista}>{filas.length}</Text>
            ) : null}
          </View>
        </>
      }
      ListEmptyComponent={
        isPending ? (
          <View style={estilos.vacio}>
            <ActivityIndicator color={DesignTokens.colors.primary[500]} />
          </View>
        ) : (
          <View style={estilos.vacio}>
            <Ionicons
              name="document-outline"
              size={fs(32)}
              color={DesignTokens.colors.neutral[300]}
            />
            <Text style={estilos.vacioTitulo}>
              Todavía no hay reportes en esta obra
            </Text>
            <Text style={estilos.vacioTexto}>
              El primero que captures aparecerá aquí, y cualquier miembro de la
              obra podrá consultarlo.
            </Text>
          </View>
        )
      }
    />
  );
}

function Chip({ fila, sinSenal }: { fila: FilaReporte; sinSenal: boolean }) {
  if (fila.fallo) {
    // "Reintentando" solo mientras de verdad queden intentos. Decirlo cuando
    // ya se agotaron dejaba al usuario esperando algo que nunca iba a pasar —
    // y el reporte sin salida, porque el ciclo solo recorre los `pending`.
    return (
      <View style={[estilos.chip, estilos.chipError]}>
        <Text style={[estilos.chipTexto, estilos.chipTextoError]}>
          {fila.intentosAgotados ? "No se envió" : "Reintentando"}
        </Text>
      </View>
    );
  }
  /**
   * La pregunta que contesta el chip es una: **¿ya lo puedo generar?** Por eso
   * no se desglosa el motivo —si faltan fotos o falta llegar al servidor, la
   * respuesta es la misma y desglosarlo solo obliga a traducir.
   *
   * La única distinción que SÍ se conserva es sin señal: "Por enviar" dice que
   * el reporte está a salvo en el teléfono y que no se está intentando nada,
   * que es distinto de "Enviando" —donde algo está ocurriendo ahora—. Al
   * usuario en obra eso le cambia la expectativa de cuándo mirar otra vez.
   */
  if (!fila.disponible) {
    return (
      <View style={[estilos.chip, estilos.chipEspera]}>
        <Text style={[estilos.chipTexto, estilos.chipTextoEspera]}>
          {sinSenal ? "Por enviar" : "Enviando"}
        </Text>
      </View>
    );
  }
  return (
    <View style={[estilos.chip, estilos.chipListo]}>
      <Text style={[estilos.chipTexto, estilos.chipTextoListo]}>
        Disponible
      </Text>
    </View>
  );
}

function CardCrear({
  icono,
  titulo,
  descripcion,
  onPress,
  deshabilitada = false,
  tinteNavy = false,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  titulo: string;
  descripcion: string;
  onPress: () => void;
  deshabilitada?: boolean;
  tinteNavy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: deshabilitada }}
      style={({ pressed }) => [
        estilos.card,
        deshabilitada && estilos.cardInactiva,
        pressed && !deshabilitada && estilos.presionado,
      ]}
    >
      {/* El tinte navy distingue el reporte CON REGISTRO del reporte bajo
          demanda: uno queda en el historial de la obra, el otro se pide y se
          va. */}
      <View style={[estilos.tile, tinteNavy && estilos.tileNavy]}>
        <Ionicons
          name={icono}
          size={fs(26)}
          color={
            tinteNavy
              ? DesignTokens.colors.background.primary
              : DesignTokens.colors.primary[500]
          }
        />
      </View>
      <View style={estilos.cardTexto}>
        <Text style={estilos.cardTitulo}>{titulo}</Text>
        <Text style={estilos.cardDescripcion}>{descripcion}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={fs(20)}
        color={DesignTokens.colors.neutral[300]}
      />
    </Pressable>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  contenido: { padding: sp(16), paddingBottom: sp(28) },
  etiquetaSeccion: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: DesignTokens.colors.neutral[500],
    marginBottom: sp(10),
    ...sinPaddingAndroid,
  },
  cards: { gap: sp(12), marginBottom: sp(24) },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(12),
    padding: sp(14),
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: DesignTokens.colors.background.primary,
    ...DesignTokens.shadows.base,
  },
  cardInactiva: { opacity: 0.6 },
  tile: {
    width: sp(52),
    height: sp(52),
    borderRadius: DesignTokens.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.primary[50],
  },
  tileNavy: { backgroundColor: DesignTokens.colors.executive.primary },
  cardTexto: { flex: 1, gap: sp(2) },
  cardTitulo: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    ...sinPaddingAndroid,
  },
  cardDescripcion: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[500],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  encabezadoLista: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  contadorLista: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(10),
    padding: sp(12),
    marginBottom: sp(8),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    ...DesignTokens.shadows.sm,
  },
  presionado: { opacity: 0.85 },
  filaIcono: {
    width: sp(36),
    height: sp(36),
    borderRadius: DesignTokens.borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  filaTexto: { flex: 1, gap: sp(2) },
  filaTitulo: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
    ...sinPaddingAndroid,
  },
  filaMeta: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },
  chip: {
    paddingHorizontal: sp(8),
    paddingVertical: sp(3),
    borderRadius: DesignTokens.borderRadius.full,
  },
  chipTexto: {
    fontSize: fs(10),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    ...sinPaddingAndroid,
  },
  chipEspera: { backgroundColor: DesignTokens.colors.warning[100] },
  chipTextoEspera: { color: DesignTokens.colors.warning[800] },
  chipListo: { backgroundColor: DesignTokens.colors.success[50] },
  chipTextoListo: { color: DesignTokens.colors.success[700] },
  chipError: { backgroundColor: DesignTokens.colors.error[50] },
  chipTextoError: { color: DesignTokens.colors.error[700] },
  vacio: { alignItems: "center", paddingVertical: sp(36), gap: sp(8) },
  vacioTitulo: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    textAlign: "center",
    ...sinPaddingAndroid,
  },
  vacioTexto: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    maxWidth: sp(280),
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
