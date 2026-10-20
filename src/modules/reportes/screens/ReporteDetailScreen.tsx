import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import { telemetry } from "src/services/telemetry";
import { useSnackbar } from "src/hooks/useSnackbar";
import { useReporteDetalle } from "src/hooks/reportes/useReportesDeObra";
import { usePendingReporteQueue } from "src/hooks/reportes/usePendingReporteQueue";
import { fechaLargaConDia } from "src/modules/avance/utils/fechaPrograma";
import { DateUtils } from "src/utils/dateUtils";
import type { ReportesStackParamList } from "src/navigation/types";

import { BotonWizard } from "../components/BotonWizard";
import {
  DocumentoMiniatura,
  type DatosMiniatura,
} from "../components/DocumentoMiniatura";
import { etiquetaDeArea } from "../constantes";
import { FORMATO_CODIGO } from "../constantesDocumento";
import {
  descargarReporte,
  FotosPendientesError,
  type FormatoReporte,
} from "../services/reporteArchivoService";

/**
 * Detalle de un reporte (ADR-006, Decisión 8).
 *
 * Es el `DocumentoMiniatura` **en modo lectura** — literalmente la misma pieza
 * que revisó su autor antes de guardar. Que sea el mismo componente es lo que
 * garantiza que lo revisado y lo consultado no puedan divergir.
 *
 * **La pantalla jamás carga archivos**: el JSON dibuja la miniatura al instante
 * y las fotos llegan como miniaturas por SAS. El archivo solo se pide cuando el
 * usuario toca Generar, y es un acto posterior y voluntario.
 */

type Ruta = RouteProp<ReportesStackParamList, "ReporteDetalle">;

export default function ReporteDetailScreen() {
  const { params } = useRoute<Ruta>();
  const { showSnackbar } = useSnackbar();

  const {
    reportesEnCola,
    resolverReporteId,
    getPhotosByReporteId,
    reintentarReporte,
    removeFromQueueWithPhotos,
  } = usePendingReporteQueue();
  const navigation = useNavigation();

  // Un reporte al que se llegó por su id local puede haber sincronizado
  // mientras tanto — es el caso normal cuando se guarda con señal. En cuanto la
  // cola conoce su id de servidor, la pantalla deja de ser "por enviar" y pasa
  // a ser el detalle completo, con sus botones de generar encendidos.
  const idResuelto =
    params.reporteId ?? (params.localId ? resolverReporteId(params.localId) : null);
  const esLocal = idResuelto === null;

  const { data, isPending, isError } = useReporteDetalle(idResuelto);

  const enCola = useMemo(
    () => reportesEnCola.find((r) => r.localId === params.localId),
    [reportesEnCola, params.localId],
  );

  const [generando, setGenerando] = useState<FormatoReporte | null>(null);
  const [pendientes, setPendientes] = useState<string | null>(null);

  const generar = useCallback(
    async (formato: FormatoReporte) => {
      if (!data) return;
      setGenerando(formato);
      setPendientes(null);
      try {
        await descargarReporte(
          data.id,
          formato,
          `Reporte_Actividades_${data.fecha_reporte}_${data.id}`,
        );
        telemetry.trackEvent("reporte_archivo_generated", {
          obra_id: data.construction,
          reporte_id: data.id,
          formato,
          es_autor: params.esAutor ?? false,
        });
      } catch (error) {
        if (error instanceof FotosPendientesError) {
          // No es un fallo: es un "todavía no". Va a la franja ámbar, no a un
          // snackbar rojo — el reporte está bien, solo le falta llegar entero.
          setPendientes(
            `${error.declaradas - error.subidas} de ${error.declaradas} fotografías siguen subiendo.`,
          );
        } else {
          showSnackbar(
            error instanceof Error
              ? error.message
              : "No se pudo generar el archivo.",
            "error",
          );
        }
      } finally {
        setGenerando(null);
      }
    },
    [data, params.esAutor, showSnackbar],
  );

  const datos = useMemo<DatosMiniatura | null>(() => {
    if (!data) return null;
    return {
      codigo: FORMATO_CODIGO,
      fecha: data.fecha_reporte,
      contratistas: data.participantes
        .filter((p) => p.tipo === "CONTRATISTA")
        .map((p) => p.nombre),
      supervision: data.participantes
        .filter((p) => p.tipo === "SUPERVISION")
        .map((p) => p.nombre),
      // La etiqueta la resuelve el servidor: derivarla aquí obligaría a
      // mantener las traducciones en dos lados.
      area: data.area_display,
      actividades: data.actividades.map((a) => a.texto),
      conclusion: data.conclusion,
      fotos: data.fotos.map((f) => ({
        id: String(f.id),
        uri: f.thumbnail_url,
        pie: f.pie,
      })),
    };
  }, [data]);

  // ── Por enviar: solo el autor puede estar aquí ──────────────────────────

  const fallo = enCola?.status === "failed";

  const reintentar = useCallback(() => {
    if (!enCola) return;
    reintentarReporte(enCola.localId);
    // No se llama al worker desde aquí: montarlo otra vez crearía un SEGUNDO
    // worker procesando la misma cola. Basta con devolver el reporte a
    // `pending` — el worker que ya vive en `SyncWorkerProvider` reacciona al
    // cambio de `pendingCount`.
    showSnackbar("Reintentando el envío…", "info");
  }, [enCola, reintentarReporte, showSnackbar]);

  const confirmarDescarte = useCallback(() => {
    if (!enCola) return;
    Alert.alert(
      "¿Descartar este reporte?",
      "Se borrará de este teléfono con sus fotografías. No se puede deshacer y no hay copia en el servidor.",
      [
        { text: "Conservar", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            removeFromQueueWithPhotos(enCola.localId);
            telemetry.trackEvent("reporte_actividades_descartado", {
              obra_id: enCola.constructionId,
              motivo: enCola.errorMessage ?? "sin_motivo",
            });
            navigation.goBack();
          },
        },
      ],
    );
  }, [enCola, removeFromQueueWithPhotos, navigation]);

  if (esLocal) {
    return (
      <View style={estilos.raiz}>
        <Subheader
          autor="Tú"
          fecha={enCola?.fechaReporte ?? params.fechaReporte}
          instante={enCola?.createdAt}
          obra={params.constructionName}
        />
        <ScrollView contentContainerStyle={estilos.cuerpo}>
          {fallo ? (
            <FranjaError
              titulo={
                enCola?.intentosAgotados
                  ? "No se pudo enviar"
                  : "Falló el envío, reintentando"
              }
              texto={
                enCola?.errorMessage ??
                "El servidor no aceptó el reporte y no se dijo por qué."
              }
            />
          ) : (
            // Mismo vocabulario que el chip de la lista: "Enviando" allá y
            // "Enviando" aquí. El texto carga el matiz —que sigue en el
            // teléfono— para quien lo quiera, pero el titular contesta lo
            // mismo que el chip: todavía no se puede generar.
            <FranjaAmbar
              titulo="Enviando"
              texto="Sigue en este teléfono; se enviará al recuperar la señal. Los archivos se generan cuando llegue al servidor."
            />
          )}
          {enCola ? (
            <DocumentoMiniatura
              modo="read"
              datos={{
                codigo: FORMATO_CODIGO,
                fecha: enCola.fechaReporte,
                contratistas: enCola.contratistas,
                supervision: enCola.supervision,
                area: enCola.area ? etiquetaDeArea(enCola.area) : null,
                // Todo esto vive en la cola y antes se pintaba vacío: la
                // miniatura decía "Sin actividades capturadas" mientras el
                // resumen de abajo contaba cuatro, y el usuario concluía —con
                // razón— que la app le había borrado el trabajo. Las fotos
                // salen de la cola de fotos, que es la que guarda el `localUri`.
                actividades: enCola.actividades,
                conclusion: enCola.conclusion,
                fotos: getPhotosByReporteId(enCola.localId)
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .map((f) => ({
                    id: f._id,
                    uri: f.localUri,
                    pie: f.pie,
                  })),
              }}
            />
          ) : null}
          <Text style={estilos.recuento}>
            {enCola?.actividadesCount ?? 0} actividades ·{" "}
            {enCola?.fotosCount ?? 0} fotos
          </Text>
          {/* Un reporte que falló no necesita botones de generar apagados:
              necesita una salida. Sin ellos se quedaba atorado para siempre,
              porque el ciclo de la cola solo recorre los `pending`. */}
          {fallo ? (
            <View style={estilos.acciones}>
              <BotonWizard etiqueta="Reintentar" onPress={reintentar} />
              <BotonWizard
                etiqueta="Descartar"
                variante="peligro"
                onPress={confirmarDescarte}
              />
            </View>
          ) : (
            <View style={estilos.acciones}>
              <BotonWizard
                etiqueta="Generar Excel"
                onPress={() => {}}
                deshabilitado
              />
              <BotonWizard
                etiqueta="Generar PDF"
                variante="contorno"
                onPress={() => {}}
                deshabilitado
              />
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Enviado ─────────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <View style={[estilos.raiz, estilos.centrado]}>
        <ActivityIndicator color={DesignTokens.colors.primary[500]} />
      </View>
    );
  }

  if (isError || !data || !datos) {
    return (
      <View style={[estilos.raiz, estilos.centrado]}>
        <Text style={estilos.error}>No se pudo cargar el reporte.</Text>
      </View>
    );
  }

  const bloqueado = !data.puede_generar;

  return (
    <View style={estilos.raiz}>
      <Subheader
        autor={data.reportado_por_nombre}
        fecha={data.fecha_reporte}
        instante={new Date(data.created_at)}
        obra={params.constructionName}
      />
      <ScrollView contentContainerStyle={estilos.cuerpo}>
        {bloqueado || pendientes ? (
          <FranjaAmbar
            titulo="Enviando"
            texto={
              pendientes ??
              "Algunas fotografías siguen subiendo. El archivo se puede generar cuando todas lleguen."
            }
          />
        ) : null}

        <DocumentoMiniatura datos={datos} modo="read" />

        <View style={estilos.acciones}>
          <BotonWizard
            etiqueta="Generar Excel"
            onPress={() => generar("xlsx")}
            cargando={generando === "xlsx"}
            deshabilitado={bloqueado || generando !== null}
          />
          <BotonWizard
            etiqueta="Generar PDF"
            variante="contorno"
            onPress={() => generar("pdf")}
            cargando={generando === "pdf"}
            deshabilitado={bloqueado || generando !== null}
          />
        </View>

        <View style={estilos.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={fs(20)}
            color={DesignTokens.colors.primary[500]}
          />
          <Text style={estilos.infoTexto}>
            El archivo se genera en el momento y se abre en la hoja de compartir
            del sistema. Puedes generarlo las veces que necesites.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Subheader({
  autor,
  fecha,
  instante,
  obra,
}: {
  autor: string;
  fecha: string;
  instante?: Date;
  obra: string;
}) {
  return (
    <View style={estilos.subheader}>
      <Text style={estilos.subEtiqueta}>Reportado por</Text>
      <Text style={estilos.subAutor}>
        {autor} · {fechaLargaConDia(fecha)}
        {instante
          ? // El segundo argumento es un patrón de date-fns, no un modo. Con
            // "time" cada letra se leía como token —`t` marca de tiempo en
            // segundos, `i` día ISO, `m` minuto, `e` día local— y se imprimía
            // el número pegado: "17898862233373".
            `, ${DateUtils.formatUTCForDisplay(instante.toISOString(), "HH:mm")}`
          : ""}
      </Text>
      <Text style={estilos.subObra} numberOfLines={2}>
        {obra}
      </Text>
    </View>
  );
}

/**
 * Hermana de `FranjaAmbar`, no una variante suya: el ámbar dice "espera" y el
 * rojo dice "esto necesita que decidas algo". Dos mensajes distintos merecen
 * dos componentes legibles, no un `prop` que haya que interpretar.
 */
function FranjaError({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={[estilos.franja, estilos.franjaError]}>
      <Ionicons
        name="alert-circle-outline"
        size={fs(18)}
        color={DesignTokens.colors.error[700]}
      />
      <View style={estilos.franjaTexto}>
        <Text style={[estilos.franjaTitulo, estilos.franjaTituloError]}>
          {titulo}
        </Text>
        <Text style={[estilos.franjaCuerpo, estilos.franjaCuerpoError]}>
          {texto}
        </Text>
      </View>
    </View>
  );
}

function FranjaAmbar({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={estilos.franja}>
      <Ionicons
        name="cloud-upload-outline"
        size={fs(18)}
        color={DesignTokens.colors.warning[800]}
      />
      <View style={estilos.franjaTexto}>
        <Text style={estilos.franjaTitulo}>{titulo}</Text>
        <Text style={estilos.franjaCuerpo}>{texto}</Text>
      </View>
    </View>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: DesignTokens.colors.background.secondary },
  centrado: { alignItems: "center", justifyContent: "center" },
  error: {
    fontSize: fs(DesignTokens.typography.fontSize.base),
    color: DesignTokens.colors.neutral[600],
    ...sinPaddingAndroid,
  },
  subheader: {
    paddingHorizontal: sp(16),
    paddingVertical: sp(12),
    backgroundColor: DesignTokens.colors.executive.secondary,
  },
  subEtiqueta: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: DesignTokens.colors.neutral[400],
    ...sinPaddingAndroid,
  },
  subAutor: {
    marginTop: sp(2),
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.background.primary,
    ...sinPaddingAndroid,
  },
  subObra: {
    marginTop: sp(2),
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[300],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  cuerpo: { padding: sp(16), gap: sp(14), paddingBottom: sp(28) },
  franja: {
    flexDirection: "row",
    gap: sp(10),
    padding: sp(12),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.warning[100],
  },
  franjaError: { backgroundColor: DesignTokens.colors.error[50] },
  franjaTituloError: { color: DesignTokens.colors.error[800] },
  franjaCuerpoError: { color: DesignTokens.colors.error[700] },
  franjaTexto: { flex: 1, gap: sp(2) },
  franjaTitulo: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.warning[800],
    ...sinPaddingAndroid,
  },
  franjaCuerpo: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.warning[800],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  recuento: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    color: DesignTokens.colors.neutral[600],
    ...sinPaddingAndroid,
  },
  acciones: { flexDirection: "row", gap: sp(12) },
  infoCard: {
    flexDirection: "row",
    gap: sp(10),
    padding: sp(14),
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: DesignTokens.colors.neutral[200],
    backgroundColor: DesignTokens.colors.background.primary,
  },
  infoTexto: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm), 1.5),
    color: DesignTokens.colors.neutral[600],
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
