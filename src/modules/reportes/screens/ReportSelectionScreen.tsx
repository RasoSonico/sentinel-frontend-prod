import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import {
  useReportesDeObra,
  type FilaReporte,
} from "src/hooks/reportes/useReportesDeObra";
import { usePendingReporteQueue } from "src/hooks/reportes/usePendingReporteQueue";
import { useProveedores } from "src/hooks/reportes/useProveedores";
import { useResaltadoDeLlegada } from "src/hooks/ui/useResaltadoDeLlegada";
import { useSnackbar } from "src/hooks/useSnackbar";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { fechaConDia } from "src/modules/avance/utils/fechaPrograma";
import type { ReportesStackParamList } from "src/navigation/types";

import { IndicadorSincronizacion } from "../components/IndicadorSincronizacion";

type Navegacion = StackNavigationProp<
  ReportesStackParamList,
  "ReportSelection"
>;
type Ruta = RouteProp<ReportesStackParamList, "ReportSelection">;

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
  const { params } = useRoute<Ruta>();
  const { showSnackbar } = useSnackbar();
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

  // â”€â”€ Llegada desde el wizard (F32, F33) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const recienGuardado = params?.recienGuardado ?? null;
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [anotado, setAnotado] = useState<string | null>(null);
  const consumidoRef = useRef<string | null>(null);
  const { resolverReporteId } = usePendingReporteQueue();

  /**
   * Ajuste de estado EN RENDER, no en un efecto: es el patrón de React para
   * derivar estado de algo que cambió desde fuera. En un efecto costaría un
   * render en cascada y, sobre todo, un parpadeo —la fila se pintaría un
   * cuadro sin resaltar antes de resaltarse—.
   */
  if (recienGuardado !== null && recienGuardado !== anotado) {
    setAnotado(recienGuardado);
    setResaltado(recienGuardado);
  }

  useEffect(() => {
    if (!recienGuardado || consumidoRef.current === recienGuardado) return;
    consumidoRef.current = recienGuardado;

    /**
     * **La marca se consume al leerla.** Los parámetros de una ruta persisten
     * mientras la pantalla siga en la pila: sin limpiarla, la fila volvería a
     * resaltarse y el aviso a salir cada vez que el usuario regresa a la tab.
     */
    navigation.setParams({ recienGuardado: undefined });

    if (sinSenal) {
      /**
       * Sin señal el aviso **no se va solo**. Es la información más
       * importante de todo el flujo —que el reporte sigue en el teléfono— y
       * perderla produce la peor falla posible del módulo: creer que se
       * entregó algo que no salió. Un aviso de cuatro segundos se puede no
       * ver; éste espera a que el usuario lo descarte, y el chip "Por enviar"
       * se queda en la fila hasta que de verdad se envíe.
       */
      showSnackbar(
        "Guardado en el teléfono. Se enviará solo al recuperar la señal.",
        "info",
        { label: "OK", onPress: () => {} },
        Number.POSITIVE_INFINITY,
      );
    } else {
      // "Guardado" es lo único cierto en este instante. "Enviado" solo cuando
      // el servidor lo confirme —y ese aviso lo da el worker, con ABRIR—.
      showSnackbar("Reporte guardado · enviando", "info");
    }
  }, [recienGuardado, sinSenal, navigation, showSnackbar]);

  /**
   * El reporte recién guardado cambia de identidad a media animación: en
   * cuanto el servidor lo devuelve, la lista descarta la copia local y la fila
   * pasa a ser la del servidor. Sin esto el resaltado se cortaría justo ahí.
   */
  const idServidorResaltado = resaltado ? resolverReporteId(resaltado) : null;

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
        esAutor: fila.esAutor,
      });
    },
    [navigation, obraNombre],
  );

  const renderFila = useCallback(
    ({ item }: { item: FilaReporte }) => (
      <Fila
        fila={item}
        sinSenal={sinSenal}
        recienLlegada={
          (item.localId !== null && item.localId === resaltado) ||
          (idServidorResaltado !== null &&
            item.reporteId === idServidorResaltado)
        }
        onPress={() => abrirDetalle(item)}
      />
    ),
    [abrirDetalle, sinSenal, resaltado, idServidorResaltado],
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

/**
 * Una fila de REPORTES DE LA OBRA.
 *
 * Es un componente y no un bloque dentro de `renderItem` porque el resaltado
 * de llegada necesita hooks propios por fila.
 *
 * El tinte va en un `Animated.View` que envuelve al `Pressable` y no en el
 * `Pressable` mismo: su `style` es una función de `pressed`, y una función no
 * se puede animar.
 */
function Fila({
  fila,
  sinSenal,
  recienLlegada,
  onPress,
}: {
  fila: FilaReporte;
  sinSenal: boolean;
  recienLlegada: boolean;
  onPress: () => void;
}) {
  const intensidad = useResaltadoDeLlegada(recienLlegada);
  const fondo = intensidad.interpolate({
    inputRange: [0, 1],
    outputRange: [
      DesignTokens.colors.background.primary,
      DesignTokens.colors.llegada,
    ],
  });

  return (
    <Animated.View style={[estilos.fila, { backgroundColor: fondo }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Reporte de actividades del ${fila.fechaReporte}, por ${fila.autor}`}
        style={({ pressed }) => [
          estilos.filaToque,
          pressed && estilos.presionado,
        ]}
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
            Actividades · {fechaConDia(fila.fechaReporte)}
          </Text>
          <Text style={estilos.filaMeta} numberOfLines={1}>
            {fila.autor} · {fila.actividadesCount}{" "}
            {fila.actividadesCount === 1 ? "actividad" : "actividades"} ·{" "}
            {fila.fotosCount} {fila.fotosCount === 1 ? "foto" : "fotos"}
          </Text>
        </View>
        <Chip fila={fila} sinSenal={sinSenal} />
        <Ionicons
          name="chevron-forward"
          size={fs(18)}
          color={DesignTokens.colors.neutral[300]}
        />
      </Pressable>
    </Animated.View>
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
  // El contenedor lleva el fondo —es lo que se tie al llegar— y el hijo lleva
  // la caja táctil con su relleno.
  fila: {
    marginBottom: sp(8),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.background.primary,
    ...DesignTokens.shadows.sm,
  },
  filaToque: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(10),
    padding: sp(12),
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
