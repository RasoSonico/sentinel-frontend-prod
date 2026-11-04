import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BottomSheetMenu } from "src/components/common/BottomSheetMenu";
import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";
import { telemetry } from "src/services/telemetry";
import { useProveedores } from "src/hooks/reportes/useProveedores";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { DateUtils } from "src/utils/dateUtils";
import type { Proveedor } from "src/types/reporte";

import { BotonWizard } from "../components/BotonWizard";
import { WizardShell } from "../components/WizardShell";
import { useBorradorReporte } from "../state/BorradorReporteContext";
import { AREAS, etiquetaDeArea, type AreaReporte } from "../constantes";

/**
 * P-00 · "Define el encuadre" (ADR-006, Decisión 1).
 *
 * Pantalla PREVIA al wizard, no un paso suyo. Los participantes y el área son
 * el **encuadre** del reporte, no su contenido: cambian por tramo, por área y
 * por día, así que no pueden derivarse de la obra ni fijarse en configuración,
 * pero meterlos como quinto paso habría alargado un flujo ya cerrado.
 *
 * **Nada viene preseleccionado.** Marcar a quienes sí participaron es una tarea
 * de recuerdo —el usuario ya sabe la respuesta y solo la registra—; auditar una
 * lista llena buscando ausentes es una tarea de verificación que obliga a leer
 * cada renglón, incluidos los que no cambian. Con rosters de cuatro o cinco
 * proveedores, la segunda es más lenta y deja pasar ausentes.
 *
 * **Filas de texto y no cards.** Una card comunica "esto es un objeto con vida
 * propia, tócalo para ir a algún lado"; un proveedor aquí no lleva a ninguna
 * parte, es un valor de una lista de opciones. Con tres grupos apilados, además,
 * las cards convertían la pantalla en un muro de tarjetas.
 *
 * **Checkbox cuadrado y no círculo.** La convención dice que el círculo es
 * selección exclusiva y el cuadrado múltiple. Con dos grupos de selección
 * múltiple y una elección única en la misma pantalla, esa distinción carga
 * significado real. Va **a la derecha** para que el nombre —lo que el usuario
 * escanea— arranque en la misma vertical en todas las filas.
 *
 * **El área va al final**, después de los dos grupos de proveedores, para que
 * el orden de captura coincida con el orden del documento impreso.
 */

interface Props {
  constructionId: number;
  constructionName: string;
  onCerrar: () => void;
  onContinuar: () => void;
}

export function ProviderSelectionScreen({
  constructionId,
  constructionName,
  onCerrar,
  onContinuar,
}: Props) {
  const { borrador, setProveedores, setArea, retomado } =
    useBorradorReporte();
  const { data, isPending, isError, dataUpdatedAt, refetch } =
    useProveedores(constructionId);
  const isOnline = useNetworkStatus();

  /**
   * **La copia manda sobre el error.** React Query deja `isError` en `true`
   * cuando falla un refetch de fondo, pero `data` conserva lo último que se
   * trajo. Antes esta pantalla miraba el error primero y tiraba el roster
   * guardado: en obra, sin señal, el usuario veía "No se pudo cargar" con la
   * lista intacta en el caché a un `if` de distancia.
   *
   * P-00 es la única puerta al wizard, así que un roster inalcanzable no
   * degrada la captura: la impide por completo.
   */
  const hayCopia = data !== undefined;
  const sirviendoCopia = hayCopia && isError;

  /**
   * Una sola lista de ids para los dos grupos: es exactamente lo que viaja en
   * `proveedor_ids`, y el servidor clasifica por el `tipo` del catálogo. Dos
   * estados separados obligarían a reunirlos al continuar y a repartirlos al
   * volver desde Revisión.
   */
  const [seleccion, setSeleccion] = useState<number[]>(borrador.proveedorIds);
  const [hojaAbierta, setHojaAbierta] = useState(false);

  const contratistas = useMemo(
    () => (data ?? []).filter((p) => p.tipo === "CONTRATISTA"),
    [data],
  );
  const supervisores = useMemo(
    () => (data ?? []).filter((p) => p.tipo === "SUPERVISION"),
    [data],
  );

  const contratistasMarcados = useMemo(
    () => contratistas.filter((p) => seleccion.includes(p.id)),
    [contratistas, seleccion],
  );
  const supervisoresMarcados = useMemo(
    () => supervisores.filter((p) => seleccion.includes(p.id)),
    [supervisores, seleccion],
  );

  const alternar = useCallback((id: number) => {
    setSeleccion((actual) =>
      actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id],
    );
  }, []);

  const elegirArea = useCallback(
    (clave: string) => setArea(clave as AreaReporte),
    [setArea],
  );

  const area = borrador.area;

  const continuar = useCallback(() => {
    setProveedores(contratistasMarcados, supervisoresMarcados);
    telemetry.trackEvent("reporte_actividades_started", {
      obra_id: constructionId,
      contratistas_count: contratistasMarcados.length,
      supervision_count: supervisoresMarcados.length,
      area: area ?? "sin_area",
    });
    onContinuar();
  }, [
    contratistasMarcados,
    supervisoresMarcados,
    area,
    setProveedores,
    constructionId,
    onContinuar,
  ]);

  const cerrar = useCallback(() => {
    Alert.alert(
      "Descartar el reporte",
      "Se perderá lo que hayas seleccionado.",
      [
        { text: "Seguir aquí", style: "cancel" },
        { text: "Descartar", style: "destructive", onPress: onCerrar },
      ],
    );
  }, [onCerrar]);

  /**
   * El botón exige las tres cosas porque el servidor exige las tres: sin área,
   * sin contratista o sin supervisión el POST responde 400, y descubrirlo tras
   * llenar cuatro pasos dejaría el reporte atorado en la cola por un dato que
   * el usuario ya no puede corregir desde ahí.
   */
  const rosterListo = hayCopia;
  const faltaSupervisionEnRoster = rosterListo && supervisores.length === 0;
  const puedeContinuar =
    contratistasMarcados.length > 0 &&
    supervisoresMarcados.length > 0 &&
    area !== null;

  let pista = "Podrás corregir esto desde la Revisión";
  if (faltaSupervisionEnRoster) {
    pista = "Falta registrar la supervisión de esta obra";
  } else if (contratistasMarcados.length === 0) {
    pista = "Selecciona al menos un contratista";
  } else if (supervisoresMarcados.length === 0) {
    pista = "Selecciona al menos una supervisión";
  } else if (area === null) {
    pista = "Selecciona el área";
  }

  const renderFila = (item: Proveedor) => {
    const marcado = seleccion.includes(item.id);
    return (
      <Pressable
        key={item.id}
        onPress={() => alternar(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcado }}
        accessibilityLabel={item.nombre}
        style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
      >
        <Text
          style={[estilos.nombre, marcado && estilos.nombreMarcado]}
          numberOfLines={2}
        >
          {item.nombre}
        </Text>
        <View style={[estilos.check, marcado && estilos.checkMarcado]}>
          {marcado ? (
            <Ionicons
              name="checkmark"
              size={fs(15)}
              color={DesignTokens.colors.background.primary}
            />
          ) : null}
        </View>
      </Pressable>
    );
  };

  const renderGrupo = (
    etiqueta: string,
    lista: Proveedor[],
    cuantos: number,
    avisoVacio: string,
  ) => (
    <View style={estilos.grupo}>
      <View style={estilos.encabezadoGrupo}>
        <Text style={estilos.etiquetaGrupo}>{etiqueta}</Text>
        {lista.length > 0 ? (
          <Text style={estilos.contador}>
            {cuantos} de {lista.length}
          </Text>
        ) : null}
      </View>
      {lista.length > 0 ? (
        lista.map(renderFila)
      ) : (
        <View style={estilos.aviso}>
          <Text style={estilos.textoAviso}>{avisoVacio}</Text>
        </View>
      )}
    </View>
  );

  return (
    <WizardShell
      titulo="Reporte de actividades"
      obra={constructionName}
      fechaReporte={borrador.fechaReporte}
      onCerrar={cerrar}
      pie={
        <View style={estilos.pieColumna}>
          {/* El verbo dice en cuál de las dos situaciones está parado. Esta
              pantalla se ve idéntica al empezar y al retomar —el encuadre ya
              viene marcado en el segundo caso, pero quien no recuerde haberlo
              marcado no puede distinguirlo—, y un "Comenzar" sobre un reporte
              a medio llenar se lee como si fuera a tirar lo anterior (F45). */}
          <BotonWizard
            etiqueta={
              retomado ? "Continuar el llenado" : "Comenzar a llenar el reporte"
            }
            onPress={continuar}
            deshabilitado={!puedeContinuar}
            ancho
          />
          <Text style={estilos.pista}>{pista}</Text>
        </View>
      }
    >
      {!hayCopia && isPending ? (
        <View style={estilos.vacio}>
          <ActivityIndicator color={DesignTokens.colors.primary[500]} />
        </View>
      ) : !hayCopia ? (
        <View style={estilos.vacio}>
          <Text style={estilos.vacioTitulo}>
            {isOnline === false
              ? "Sin conexión y sin copia del roster"
              : "No se pudo cargar el roster"}
          </Text>
          <Text style={estilos.vacioTexto}>
            {isOnline === false
              ? "Esta obra necesita abrirse una vez con señal para poder capturar después sin ella."
              : "Revisa tu conexión e inténtalo de nuevo."}
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <Text style={estilos.reintentar}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={estilos.lista}>
          {sirviendoCopia ? (
            // Decir CUÁNDO se guardó no es adorno: si el administrador dio de
            // alta un contratista esta mañana, el usuario necesita saber que
            // su lista es de antes para no buscar en vano al que falta.
            <View style={estilos.avisoCopia}>
              <Text style={estilos.avisoCopiaTexto}>
                Sin conexión · roster guardado del{" "}
                {DateUtils.formatUTCForDisplay(
                  new Date(dataUpdatedAt).toISOString(),
                  "d MMM",
                )}
              </Text>
            </View>
          ) : null}
          <Text style={estilos.instruccion}>
            Define el encuadre de este reporte antes de capturarlo.
          </Text>

          {renderGrupo(
            "Contratistas",
            contratistas,
            contratistasMarcados.length,
            "Esta obra no tiene contratistas dados de alta. Pide al administrador que los registre antes de capturar el reporte.",
          )}

          {renderGrupo(
            "Supervisión",
            supervisores,
            supervisoresMarcados.length,
            "Esta obra no tiene supervisión dada de alta. Pide al administrador que la registre: sin ella el reporte no puede guardarse.",
          )}

          {/* Elección única, así que campo con hoja inferior y no checkboxes:
              la hoja muestra las siete opciones completas sin desplazar las
              listas de proveedores fuera de la ventana. */}
          <View style={estilos.grupo}>
            <View style={estilos.encabezadoGrupo}>
              <Text style={estilos.etiquetaGrupo}>Área</Text>
            </View>
            <Pressable
              onPress={() => setHojaAbierta(true)}
              accessibilityRole="button"
              accessibilityLabel={
                area ? `Área: ${etiquetaDeArea(area)}` : "Selecciona un área"
              }
              style={({ pressed }) => [
                estilos.campo,
                pressed && estilos.presionada,
              ]}
            >
              <Text
                style={[estilos.valorCampo, area === null && estilos.marcador]}
              >
                {area ? etiquetaDeArea(area) : "Selecciona un área"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={fs(16)}
                color={DesignTokens.colors.neutral[500]}
              />
            </Pressable>
          </View>
        </ScrollView>
      )}

      <BottomSheetMenu
        visible={hojaAbierta}
        titulo="Área"
        opciones={AREAS.map((a) => ({ clave: a.valor, etiqueta: a.etiqueta }))}
        seleccionada={area}
        onSeleccionar={elegirArea}
        onCerrar={() => setHojaAbierta(false)}
      />
    </WizardShell>
  );
}

const sinPaddingAndroid =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" as const }
    : {};

const estilos = StyleSheet.create({
  lista: { padding: sp(16), paddingBottom: sp(24) },
  instruccion: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.neutral[500],
    marginBottom: sp(16),
    ...sinPaddingAndroid,
  },
  avisoCopia: {
    paddingVertical: sp(6),
    paddingHorizontal: sp(10),
    borderRadius: DesignTokens.borderRadius.sm,
    backgroundColor: DesignTokens.colors.neutral[100],
    marginBottom: sp(12),
    alignSelf: "flex-start",
  },
  avisoCopiaTexto: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[600],
    ...sinPaddingAndroid,
  },
  grupo: { marginBottom: sp(20) },
  encabezadoGrupo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: sp(4),
  },
  etiquetaGrupo: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    fontWeight: DesignTokens.typography.fontWeight.bold,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: DesignTokens.colors.executive.primary,
    ...sinPaddingAndroid,
  },
  contador: {
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[400],
    ...sinPaddingAndroid,
  },

  // Fila de texto con separador fino: sin sombra ni fondo propio, porque un
  // proveedor aquí es un valor de una lista, no un objeto navegable.
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(12),
    minHeight: sp(48),
    paddingVertical: sp(10),
    paddingHorizontal: sp(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  presionada: { opacity: 0.6 },
  nombre: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base)),
    color: DesignTokens.colors.neutral[700],
    ...sinPaddingAndroid,
  },
  nombreMarcado: {
    color: DesignTokens.colors.neutral[900],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  check: {
    width: sp(22),
    height: sp(22),
    borderRadius: DesignTokens.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.neutral[300],
    backgroundColor: DesignTokens.colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMarcado: {
    backgroundColor: DesignTokens.colors.primary[500],
    borderColor: DesignTokens.colors.primary[500],
  },

  // Campo de opción única: subrayado más grueso en vez de recuadro, para que
  // no se lea como una fila más de las listas de arriba.
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(10),
    minHeight: sp(48),
    paddingVertical: sp(10),
    paddingHorizontal: sp(2),
    borderBottomWidth: 1.5,
    borderBottomColor: DesignTokens.colors.neutral[300],
  },
  valorCampo: {
    flex: 1,
    fontSize: fs(DesignTokens.typography.fontSize.base),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.base)),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
    ...sinPaddingAndroid,
  },
  marcador: {
    fontWeight: DesignTokens.typography.fontWeight.normal,
    color: DesignTokens.colors.neutral[400],
  },

  // Ámbar y no rojo: no es un error del usuario, es un dato que falta en la
  // configuración de la obra y que otra persona tiene que capturar.
  aviso: {
    marginTop: sp(4),
    padding: sp(12),
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.warning[50],
    borderWidth: 1,
    borderColor: DesignTokens.colors.warning[200],
  },
  textoAviso: {
    fontSize: fs(DesignTokens.typography.fontSize.sm),
    lineHeight: lh(fs(DesignTokens.typography.fontSize.sm)),
    color: DesignTokens.colors.warning[800],
    ...sinPaddingAndroid,
  },

  pieColumna: { flex: 1, gap: sp(6) },
  pista: {
    textAlign: "center",
    fontSize: fs(DesignTokens.typography.fontSize.xs),
    color: DesignTokens.colors.neutral[500],
    ...sinPaddingAndroid,
  },

  vacio: { padding: sp(32), alignItems: "center", gap: sp(8) },
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
    ...sinPaddingAndroid,
  },
  reintentar: {
    marginTop: sp(4),
    fontSize: fs(DesignTokens.typography.fontSize.base),
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[500],
    ...sinPaddingAndroid,
  },
});
