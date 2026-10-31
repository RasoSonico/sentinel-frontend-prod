import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import type { StackNavigationProp } from "@react-navigation/stack";

import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import { telemetry } from "src/services/telemetry";
import { useSnackbar } from "src/hooks/useSnackbar";
import { useReporteDetalle } from "src/hooks/reportes/useReportesDeObra";
import { usePendingReporteQueue } from "src/hooks/reportes/usePendingReporteQueue";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
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
import { useMaquinariaDelDia } from "../hooks/useMaquinariaDelDia";
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
type Navegacion = StackNavigationProp<
  ReportesStackParamList,
  "ReporteDetalle"
>;

export default function ReporteDetailScreen() {
  const { params } = useRoute<Ruta>();
  const navigation = useNavigation<Navegacion>();
  const { showSnackbar } = useSnackbar();
  const sinSenal = useNetworkStatus() === false;

  const {
    reportesEnCola,
    resolverReporteId,
    getPhotosByReporteId,
    reintentarReporte,
    removeFromQueueWithPhotos,
  } = usePendingReporteQueue();

  /**
   * **La identidad se fija y ya no se vuelve a perder.**
   *
   * Un reporte al que se llegó por su id local sincroniza mientras se mira —
   * es el caso normal con señal—. Antes la pantalla volvía a preguntarle a la
   * cola en cada render, así que cuando el worker purgaba la copia local el id
   * dejaba de resolver y la pantalla se quedaba MUERTA: sin vista previa, con
   * "0 actividades · 0 fotos" y los botones apagados para siempre. La única
   * salida era salir y volver a entrar desde la lista.
   *
   * En cuanto se conoce el id de servidor se escribe en los parámetros de la
   * ruta, que no dependen de la cola. Ninguna purga puede quitárselo.
   */
  const idDeLaCola = params.localId ? resolverReporteId(params.localId) : null;
  const idResuelto = params.reporteId ?? idDeLaCola;

  useEffect(() => {
    if (params.reporteId === undefined && idDeLaCola !== null) {
      navigation.setParams({ reporteId: idDeLaCola });
    }
  }, [params.reporteId, idDeLaCola, navigation]);

  const { data, isPending } = useReporteDetalle(idResuelto);

  const enCola = useMemo(
    () => reportesEnCola.find((r) => r.localId === params.localId),
    [reportesEnCola, params.localId],
  );

  // Solo para el reporte que sigue en cola: el emitido trae su maquinaria
  // congelada y no hay nada que reconstruir. Se lee del día DE ESE reporte,
  // no de hoy, porque sin señal la cola puede guardar varios días.
  const maquinariaEnCola = useMaquinariaDelDia(enCola?.fechaReporte ?? "");

  const [generando, setGenerando] = useState<FormatoReporte | null>(null);
  /**
   * Fotos que el servidor dijo que faltaban al intentar generar.
   *
   * Solo entra en juego cuando la copia en caché del detalle estaba vieja y la
   * pantalla creyó que ya se podía generar. Se limpia en cuanto el servidor
   * confirma que sí.
   */
  const [faltanPorError, setFaltanPorError] = useState<number | null>(null);

  useEffect(() => {
    if (data?.puede_generar) setFaltanPorError(null);
  }, [data?.puede_generar]);

  const generar = useCallback(
    async (formato: FormatoReporte) => {
      if (!data) return;
      setGenerando(formato);
      setFaltanPorError(null);
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
          // No es un fallo: es un "todavía no". Va a la línea de estado, no a
          // un snackbar rojo — el reporte está bien, solo le falta llegar
          // entero.
          setFaltanPorError(error.declaradas - error.subidas);
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

  // ── Qué se pinta ────────────────────────────────────────────────────────

  /**
   * El archivo que este teléfono todavía tiene de cada foto, por su id de
   * servidor.
   *
   * Es lo que impide que una foto RETROCEDA. El detalle del servidor declara
   * todas las fotos desde el 201, pero su miniatura vale `null` hasta que los
   * bytes llegan: sin esto, la foto que el usuario acababa de ver se convertía
   * en un recuadro gris con una nube, y eso se lee como "se borró".
   */
  const localPorRemota = useMemo(() => {
    const mapa = new Map<number, string>();
    if (!params.localId) return mapa;
    for (const foto of getPhotosByReporteId(params.localId)) {
      if (foto.fotoRemotaId !== null) {
        mapa.set(foto.fotoRemotaId, foto.localUri);
      }
    }
    return mapa;
  }, [params.localId, getPhotosByReporteId]);

  const datosDelServidor = useMemo<DatosMiniatura | null>(() => {
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
      // Ya emitido: la maquinaria viene CONGELADA en el reporte, no se
      // reconstruye del hub. Es la misma copia que imprime el documento, así
      // que aquí sí consta —`conocida`— aunque venga vacía.
      maquinaria: {
        conocida: true,
        // `?? []` y no por paranoia: React Query persiste en AsyncStorage sin
        // `buster`, así que un detalle cacheado por la versión ANTERIOR de la
        // app se rehidrata sin este campo. Sin la guarda, abrir ese reporte
        // revienta la pantalla hasta que caduque el caché.
        maquinas: (data.maquinaria ?? []).map((m) => ({
          equipo: m.equipo,
          estado: m.estado,
          motivoInactividad: m.motivo_inactividad,
          horometroInicial: m.horometro_inicial,
          horometroFinal: m.horometro_final,
        })),
      },
      fotos: data.fotos.map((f) => ({
        id: String(f.id),
        // La del servidor manda cuando existe; mientras no, el archivo local.
        uri: f.thumbnail_url ?? localPorRemota.get(f.id) ?? null,
        pie: f.pie,
        subiendo: f.thumbnail_url === null,
      })),
    };
  }, [data, localPorRemota]);

  const datosDeLaCola = useMemo<DatosMiniatura | null>(() => {
    if (!enCola) return null;
    return {
      codigo: FORMATO_CODIGO,
      fecha: enCola.fechaReporte,
      contratistas: enCola.contratistas,
      supervision: enCola.supervision,
      area: enCola.area ? etiquetaDeArea(enCola.area) : null,
      // Todo esto vive en la cola y antes se pintaba vacío: la miniatura decía
      // "Sin actividades capturadas" mientras el resumen de abajo contaba
      // cuatro, y el usuario concluía —con razón— que la app le había borrado
      // el trabajo. Las fotos salen de la cola de fotos, que es la que guarda
      // el `localUri`.
      actividades: enCola.actividades,
      conclusion: enCola.conclusion,
      maquinaria: maquinariaEnCola,
      fotos: getPhotosByReporteId(enCola.localId)
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((f) => ({
          id: f._id,
          uri: f.localUri,
          pie: f.pie,
          subiendo: f.status !== "done",
        })),
    };
  }, [enCola, maquinariaEnCola, getPhotosByReporteId]);

  /**
   * Copia congelada de lo que la cola mostró.
   *
   * La vista previa local se lee VIVA de Realm, y la cola se purga sola: fijar
   * el id de servidor evita que la pantalla pierda su identidad, pero no que
   * pierda su contenido. Sin esta copia, entre la purga y la respuesta del
   * servidor la pantalla se quedaba en blanco con un indicador — y el usuario
   * veía desaparecer su reporte justo cuando acababa de llegar.
   */
  const [copiaDeLaCola, setCopiaDeLaCola] = useState<DatosMiniatura | null>(
    null,
  );
  useEffect(() => {
    if (datosDeLaCola) setCopiaDeLaCola(datosDeLaCola);
  }, [datosDeLaCola]);

  const vista = datosDelServidor ?? datosDeLaCola ?? copiaDeLaCola;

  // ── Estado del envío ────────────────────────────────────────────────────

  const fallo = enCola?.status === "failed";
  const faltaElReporte = idResuelto === null;
  /**
   * Si el reporte vive en la cola de ESTE teléfono.
   *
   * Distingue "no ha salido de aquí" de "aún no termina de llegar de otro
   * lado": sin señal, un reporte ajeno no está esperando mi red para salir, y
   * decirle al usuario "se enviará solo al recuperarla" sobre el reporte de
   * otra persona es simplemente falso.
   */
  const esNuestro = params.localId !== undefined;
  const fotosFaltantes =
    faltanPorError ?? enCola?.fotosPendientes ?? data?.fotos_pendientes ?? 0;
  const disponible =
    !faltaElReporte && data?.puede_generar === true && fotosFaltantes === 0;

  /**
   * UNA línea de estado, calculada del estado real.
   *
   * Sustituye a las dos franjas ámbar que se titulaban igual —"Enviando"— y
   * decían cosas distintas: una afirmaba que el reporte seguía en el teléfono
   * aunque hubiera señal, la otra que faltaban fotos. Se veían idénticas, así
   * que parecía una sola que nunca se iba.
   *
   * `isOnline === null` es "todavía no se sabe" (F25) y cuenta como
   * **Enviando**: es la misma regla del chip de la lista, y aplicarla distinto
   * haría que la lista y el detalle dijeran cosas diferentes del mismo
   * reporte.
   */
  const linea = useMemo(() => {
    if (disponible) return null;
    if (sinSenal && esNuestro) {
      return {
        titulo: "Por enviar",
        texto: "Sin señal. Se enviará solo al recuperarla.",
        alerta: true,
      };
    }
    if (faltaElReporte) {
      return {
        titulo: "Enviando",
        texto: "Enviando el reporte.",
        alerta: false,
      };
    }
    if (fotosFaltantes > 0) {
      return {
        titulo: "Enviando",
        texto:
          fotosFaltantes === 1
            ? "Falta 1 foto por subir."
            : `Faltan ${fotosFaltantes} fotos por subir.`,
        alerta: false,
      };
    }
    // Si no está disponible, SIEMPRE hay una línea que lo explique. Se llega
    // aquí en la ventana entre que la última foto cierra y el detalle del
    // servidor se refresca: sin esto quedaría una pantalla sin línea y sin
    // botones, que es exactamente el callejón sin salida que esto corrige.
    return { titulo: "Enviando", texto: "Enviando el reporte.", alerta: false };
  }, [disponible, sinSenal, esNuestro, faltaElReporte, fotosFaltantes]);

  /**
   * Qué falta, en lugar de dos botones apagados.
   *
   * Dos botones deshabilitados sin explicación son un callejón sin salida: el
   * usuario no sabe si está roto, si le falta un permiso o si solo tiene que
   * esperar.
   */
  const fraseDeEspera = faltaElReporte
    ? "El Excel y el PDF se podrán generar cuando el reporte llegue al servidor."
    : "El Excel y el PDF se podrán generar en cuanto terminen de subir las fotos.";

  // ── Rescate de un envío fallido ─────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────

  // Solo se llega aquí sin NADA que pintar abriendo un reporte ajeno: el
  // propio siempre trae su copia local. Por eso el indicador ya no aparece a
  // media sincronización, que era cuando asustaba.
  if (!vista) {
    return (
      <View style={[estilos.raiz, estilos.centrado]}>
        {isPending && idResuelto !== null ? (
          <ActivityIndicator color={DesignTokens.colors.primary[500]} />
        ) : (
          <Text style={estilos.error}>No se pudo cargar el reporte.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={estilos.raiz}>
      <Subheader
        autor={data?.reportado_por_nombre ?? "Tú"}
        fecha={data?.fecha_reporte ?? enCola?.fechaReporte ?? params.fechaReporte}
        instante={data ? new Date(data.created_at) : enCola?.createdAt}
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
        ) : linea ? (
          <LineaDeEstado
            titulo={linea.titulo}
            texto={linea.texto}
            alerta={linea.alerta}
          />
        ) : null}

        <DocumentoMiniatura datos={vista} modo="read" />

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
        ) : disponible ? (
          <>
            <View style={estilos.acciones}>
              <BotonWizard
                etiqueta="Generar Excel"
                onPress={() => generar("xlsx")}
                cargando={generando === "xlsx"}
                deshabilitado={generando !== null}
              />
              <BotonWizard
                etiqueta="Generar PDF"
                variante="contorno"
                onPress={() => generar("pdf")}
                cargando={generando === "pdf"}
                deshabilitado={generando !== null}
              />
            </View>

            <View style={estilos.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={fs(20)}
                color={DesignTokens.colors.primary[500]}
              />
              <Text style={estilos.infoTexto}>
                El archivo se genera en el momento y se abre en la hoja de
                compartir del sistema. Puedes generarlo las veces que
                necesites.
              </Text>
            </View>
          </>
        ) : (
          <Text style={estilos.espera}>{fraseDeEspera}</Text>
        )}
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
 * Hermana de `LineaDeEstado`, no una variante suya: el ámbar dice "espera" y el
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

/**
 * La única línea de estado del detalle.
 *
 * **Ámbar solo para "Por enviar".** El ámbar pide atención y aquí sí la
 * merece: el reporte no ha salido del teléfono y nadie lo está intentando.
 * "Enviando" es neutro y lleva indicador de actividad, porque algo está
 * ocurriendo ahora mismo y no hay nada que el usuario deba hacer. Pintarlos
 * iguales —como estaban— borraba justo esa diferencia.
 */
function LineaDeEstado({
  titulo,
  texto,
  alerta,
}: {
  titulo: string;
  texto: string;
  alerta: boolean;
}) {
  return (
    <View style={[estilos.franja, !alerta && estilos.franjaNeutra]}>
      {alerta ? (
        <Ionicons
          name="cloud-upload-outline"
          size={fs(18)}
          color={DesignTokens.colors.warning[800]}
        />
      ) : (
        <ActivityIndicator
          size="small"
          color={DesignTokens.colors.primary[600]}
        />
      )}
      <View style={estilos.franjaTexto}>
        <Text style={[estilos.franjaTitulo, !alerta && estilos.franjaTituloNeutro]}>
          {titulo}
        </Text>
        <Text style={[estilos.franjaCuerpo, !alerta && estilos.franjaCuerpoNeutro]}>
          {texto}
        </Text>
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
  franjaNeutra: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.primary[100],
  },
  franjaTituloNeutro: { color: DesignTokens.colors.neutral[800] },
  franjaCuerpoNeutro: { color: DesignTokens.colors.neutral[600] },
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
  // En lugar de dos botones apagados: la frase que dice qué falta.
  espera: {
    textAlign: "center",
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[600],
    paddingVertical: sp(12),
    paddingHorizontal: sp(16),
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: DesignTokens.colors.neutral[300],
    backgroundColor: DesignTokens.colors.background.primary,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
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
