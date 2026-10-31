import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useObject } from "@realm/react";
import { uuid } from "expo-modules-core";

import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { DesignTokens } from "src/styles/designTokens";
import { control, bloque } from "src/styles/patrones/estiloCerrado";
import { useCierreDiferido } from "src/hooks/ui/useCierreDiferido";
import { useTecladoVisible } from "src/hooks/ui/useTecladoVisible";
import { usePendingJornadaQueue } from "src/hooks/maquinaria/usePendingJornadaQueue";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { useSnackbar } from "src/hooks/useSnackbar";
import { AvanceBaseResponse } from "src/realm/avanceBase/Response";
import { AVANCE_QUERY_KEYS } from "src/hooks/data/query/avanceQueries.const";
import { MotivoInactividad } from "src/types/maquinaria";
import { DateUtils } from "src/utils/dateUtils";

import type { FilaMaquinaria } from "../filaMaquinaria";
import { construirIndice, type ConceptoBuscable } from "../indiceConceptos";
import { fechaCortaLocal, formatoHoras, numeroDe } from "../horometro";
import BloqueHorometro from "./BloqueHorometro";
import TarjetaActividad, {
  actividadVacia,
  estaCompleta,
  type ActividadEnCaptura,
} from "./TarjetaActividad";

const MOTIVOS: { value: MotivoInactividad; label: string; icon: string }[] = [
  { value: "FALLA_MECANICA", label: "Falla mecánica", icon: "construct" },
  { value: "SIN_OPERADOR", label: "Sin operador", icon: "person-remove" },
  { value: "SIN_FRENTE", label: "Sin frente de trabajo", icon: "stop-circle" },
  { value: "CLIMA", label: "Clima adverso", icon: "rainy" },
  { value: "OTRO", label: "Otro motivo", icon: "ellipsis-horizontal-circle" },
];

const ID_HOROMETRO = "horometro";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  item: FilaMaquinaria | null;
  constructionId: number | undefined;
}

/**
 * Hoja de jornada — ADR-007 D1 a D10.
 *
 * **Una tarjeta, una hoja.** Reemplaza a `ReportarJornadaSheet` y
 * `SinOperarSheet`. La pregunta "¿trabajó?" vive dentro, formulada como
 * pregunta: antes eran dos botones de semáforo en la tarjeta y el usuario
 * tenía que traducir "Sin operar" a "esto también es un reporte válido".
 *
 * El caso común no paga el costo del caso raro: con una sola actividad la hoja
 * equivale a la anterior más el horómetro.
 */
const JornadaSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  item,
  constructionId,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["70%", "92%"], []);
  const hoy = DateUtils.localDateToUTC(new Date());

  const cierre = useCierreDiferido();
  const tecladoArriba = useTecladoVisible();

  /**
   * "Listo" cierra el bloque **y baja el teclado**.
   *
   * Sin lo segundo, el campo sigue enfocado: el bloque se compacta y queda un
   * teclado abierto sobre un renglón que ya no se edita. El movimiento de
   * layout lo dispara el teclado al cerrarse, no el dedo, así que no pisa el
   * tap que acaba de ocurrir.
   */
  const marcarListo = useCallback(() => {
    Keyboard.dismiss();
    cierre.cerrar();
  }, [cierre]);

  const { addToQueue } = usePendingJornadaQueue();
  const isOnline = useNetworkStatus();
  const { showSnackbar } = useSnackbar();

  // El catálogo entero de la obra, del caché local. La búsqueda de concepto
  // no toca la red: la jornada se captura en obra.
  const base = useObject(AvanceBaseResponse, AVANCE_QUERY_KEYS.BASE);
  const indice = useMemo<ConceptoBuscable[]>(
    () => (base?.catalogs ? construirIndice(base.catalogs) : []),
    [base],
  );

  const [trabajo, setTrabajo] = useState(true);
  const [motivo, setMotivo] = useState<MotivoInactividad | null>(null);
  const [nota, setNota] = useState("");
  const [inicial, setInicial] = useState("");
  const [final, setFinal] = useState("");
  const [actividades, setActividades] = useState<ActividadEnCaptura[]>([]);
  const [copiadas, setCopiadas] = useState<number | null>(null);

  // El vaciado va en el RENDER y no en un efecto: hacerlo en el efecto pinta
  // la hoja con los datos de la máquina anterior y recién después la limpia.
  /**
   * **Nada desplaza el scroll al enfocar un campo.**
   *
   * Se intentó dos veces y las dos empeoraron la hoja. El diagnóstico quedó en
   * `docs/pruebas-frontend.md`: hay que amortiguar los avisos de teclado de
   * Android —crudos, disparan un desplazamiento por tecla— y medir contra el
   * nodo del scroll, porque `onLayout` da la posición relativa al padre
   * inmediato y no al contenido.
   *
   * Del teclado se ocupan el propio sheet —`keyboardBehavior`,
   * `android_keyboardInputMode`— y el pie, que se repliega mientras se
   * escribe. Es lo que da la estabilidad actual.
   */

  const [visibleAntes, setVisibleAntes] = useState(false);
  if (isVisible !== visibleAntes) {
    setVisibleAntes(isVisible);
    if (isVisible) {
      // Si el día ya se reportó, la hoja ABRE CON LO CAPTURADO.
      //
      // El diagnóstico del módulo fue que "lo capturado no vuelve a verse"
      // (H4): el supervisor no podía comprobar qué había registrado. Abrir en
      // blanco sobre un día ya reportado sería peor que no abrir.
      const yaReportado = !!item?.jornada_id;
      const previas = item ? Array.from(item.jornada_detalles) : [];

      setTrabajo(!yaReportado || item?.jornada_estado === "TRABAJANDO");
      setMotivo(
        (item?.jornada_motivo_inactividad as MotivoInactividad | null) ?? null,
      );
      setNota("");
      // Los dos campos del horómetro arrancan VACÍOS. La última lectura se
      // muestra como sugerencia, no como valor: precargarla haría fácil no
      // mirar la máquina, y un horómetro que nadie leyó es una copia del día
      // pasado disfrazada de lectura.
      setInicial("");
      setFinal("");
      setActividades(
        previas.length
          ? previas.map((d) => {
              const vacia = actividadVacia(uuid.v4());
              const concepto = d.concept
                ? (indice.find((c) => c.id === d.concept) ?? null)
                : null;
              return concepto
                ? { ...vacia, modo: "concepto" as const, concepto }
                : { ...vacia, modo: "escrita" as const, texto: d.descripcion };
            })
          : [actividadVacia(uuid.v4())],
      );
      setCopiadas(null);
      cierre.cerrar();
    }
  }

  useEffect(() => {
    if (isVisible) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} onPress={onClose} />
    ),
    [onClose],
  );

  // ── Actividades ──────────────────────────────────────────────────────
  const cambiarActividad = useCallback(
    (id: string, parcial: Partial<ActividadEnCaptura>) =>
      setActividades((xs) =>
        xs.map((a) => (a.id === id ? { ...a, ...parcial } : a)),
      ),
    [],
  );

  const agregarActividad = useCallback(() => {
    const nueva = actividadVacia(uuid.v4());
    setActividades((xs) => [...xs, nueva]);
    // Abrir la nueva cancela el cierre que agendó este mismo toque (T2): sin
    // esto, la tarjeta recién creada se cerraría sola al instante.
    cierre.abrir(nueva.id);
  }, [cierre]);

  const quitarActividad = useCallback((id: string) => {
    setActividades((xs) => xs.filter((a) => a.id !== id));
  }, []);

  const reiniciarActividad = useCallback(
    (id: string) => {
      cambiarActividad(id, {
        modo: null,
        concepto: null,
        texto: "",
        busqueda: "",
      });
      cierre.abrir(id);
    },
    [cambiarActividad, cierre],
  );

  const listaVacia =
    actividades.length === 1 &&
    actividades[0].modo === null &&
    !estaCompleta(actividades[0]);

  /**
   * "Repetir lo del {fecha} · {N}" — D8.
   *
   * Copia la lista **sin horas**: el reparto depende del horómetro de hoy, y
   * arrastrar el de otro día sería inventar un dato. La fecha es la de la
   * última jornada trabajada real, que puede ser de hace varios días.
   */
  const ultimaFecha = item?.ultima_jornada_trabajada_fecha ?? null;
  const ultimosDetalles = useMemo(
    () =>
      item ? Array.from(item.ultima_jornada_trabajada_detalles) : [],
    [item],
  );

  const repetir = useCallback(() => {
    const copias = ultimosDetalles.map((d) => {
      const base = actividadVacia(uuid.v4());
      if (d.concept) {
        const concepto = indice.find((c) => c.id === d.concept) ?? null;
        return concepto
          ? { ...base, modo: "concepto" as const, concepto }
          : { ...base, modo: "escrita" as const, texto: d.descripcion };
      }
      return { ...base, modo: "escrita" as const, texto: d.descripcion };
    });
    if (!copias.length) return;
    setActividades(copias);
    setCopiadas(copias.length);
    cierre.cerrar();
  }, [ultimosDetalles, indice, cierre]);

  const deshacerRepetir = useCallback(() => {
    setActividades([actividadVacia(uuid.v4())]);
    setCopiadas(null);
  }, []);

  // ── Horómetro y reparto ──────────────────────────────────────────────
  const sugerencia = item?.ultimo_horometro ?? null;
  const usaSugerenciaInicial = inicial.trim() === "" && sugerencia !== null;
  const inicialEfectivo = usaSugerenciaInicial
    ? numeroDe(sugerencia)
    : numeroDe(inicial);
  const finalNum = numeroDe(final);
  const horasMaquina =
    inicialEfectivo !== null && finalNum !== null
      ? finalNum - inicialEfectivo
      : null;

  const completas = actividades.filter(estaCompleta);
  const variasActividades = actividades.length > 1;

  const repartidas = actividades.reduce(
    (suma, a) => suma + (numeroDe(a.horas) ?? 0),
    0,
  );
  const faltan =
    horasMaquina !== null && horasMaquina >= 0 ? horasMaquina - repartidas : null;

  // ── Resumen y botón (D9) ─────────────────────────────────────────────
  const etiquetaMaquina = item
    ? `${item.tipo} ${item.marca} ${item.modelo}`.trim()
    : "la máquina";

  const soloArranque = trabajo && finalNum === null;

  /**
   * Ya hay una jornada del servidor para hoy.
   *
   * El servidor sostiene **una por máquina y día** (`unique(estancia, fecha)`),
   * así que un segundo envío se rechazaría con 400 y el usuario vería fallar
   * algo que acababa de llenar. Editar lo ya enviado necesita un `PATCH` que
   * la cola todavía no sabe hacer (deuda #6 del ADR-007), así que por ahora la
   * hoja **muestra** y no deja volver a guardar.
   */
  const yaReportada = !!item?.jornada_id;

  const { textoBoton, puedeGuardar } = useMemo(() => {
    if (yaReportada) {
      return { textoBoton: "Ya reportada hoy", puedeGuardar: false };
    }
    if (!trabajo) {
      return motivo === null
        ? { textoBoton: "Elige un motivo", puedeGuardar: false }
        : { textoBoton: "Registrar jornada", puedeGuardar: true };
    }
    if (completas.length === 0) {
      return { textoBoton: "Agrega al menos una actividad", puedeGuardar: false };
    }
    return {
      textoBoton: soloArranque ? "Guardar arranque" : "Registrar jornada",
      puedeGuardar: true,
    };
  }, [yaReportada, trabajo, motivo, completas.length, soloArranque]);

  /**
   * Resumen — ADR-007 D9, acotado.
   *
   * **No enumera las actividades.** La lista compacta de arriba ya muestra
   * ruta, descripción y horas de cada una; repetirlas en prosa no agregaba
   * información y hacía que el resumen creciera con cada concepto hasta tapar
   * media pantalla. El resumen es un APOYO a la verificación, no el lugar
   * donde se verifica.
   *
   * Lo que sí dice, porque no se ve en ningún otro lado:
   *
   * 1. La **forma** del registro, en una línea, con el CONTEO de actividades.
   *    Ese número sirve de contraverificación: si capturó cuatro y aquí dice
   *    tres, hay algo mal, y eso la enumeración no se lo decía.
   * 2. **Lo que la app llenó sola** —el inicial tomado de la última lectura,
   *    las actividades copiadas por "Repetir"—, que es la razón por la que D9
   *    existe: ser el antídoto contra la automatización opaca.
   *
   * Queda acotado por construcción: dos líneas pase lo que pase. Sin "ver
   * más", sin contar renglones y sin un estado más que mantener.
   */
  const resumen = useMemo((): { linea: string; avisos: string[] } => {
    const avisos: string[] = [];
    // Precargado por la app, no tecleado por la persona: va siempre.
    if (trabajo && usaSugerenciaInicial && item?.ultimo_horometro_fecha) {
      avisos.push(
        `Inicial tomado de la última lectura · ${fechaCortaLocal(item.ultimo_horometro_fecha)}`,
      );
    }
    if (trabajo && copiadas !== null) {
      avisos.push(
        `${copiadas} actividades copiadas${ultimaFecha ? ` del ${fechaCortaLocal(ultimaFecha)}` : ""}`,
      );
    }

    if (yaReportada) {
      return {
        linea: "Esta jornada ya se registró. Editarla todavía no es posible desde aquí.",
        avisos: [],
      };
    }
    if (!trabajo) {
      if (motivo === null) {
        return { linea: "Indica por qué no operó la máquina.", avisos: [] };
      }
      const etiqueta = MOTIVOS.find((m) => m.value === motivo)?.label ?? "";
      return {
        linea: `Se registrará: ${etiquetaMaquina} no operó hoy · ${etiqueta.toLowerCase()}.`,
        avisos: [],
      };
    }
    if (completas.length === 0) {
      return { linea: "Falta indicar en qué trabajó.", avisos };
    }

    const horas = soloArranque
      ? inicialEfectivo !== null
        ? `, con arranque en ${inicialEfectivo} y el cierre pendiente`
        : ", con el cierre pendiente"
      : horasMaquina !== null
        ? `, ${formatoHoras(horasMaquina)} h de horómetro`
        : "";
    const cuantas =
      completas.length === 1
        ? "en 1 actividad"
        : `en ${completas.length} actividades`;

    return {
      linea: `Se registrará: ${etiquetaMaquina} trabajó hoy${horas}, ${cuantas}.`,
      avisos,
    };
  }, [
    yaReportada,
    trabajo,
    motivo,
    completas.length,
    soloArranque,
    inicialEfectivo,
    horasMaquina,
    etiquetaMaquina,
    usaSugerenciaInicial,
    copiadas,
    ultimaFecha,
    item,
  ]);

  // ── Registro ─────────────────────────────────────────────────────────
  const registrar = () => {
    if (!item || constructionId === undefined || !puedeGuardar) return;

    addToQueue({
      estanciaId: item.estancia_id,
      maquinariaId: item.id,
      maquinariaLocalId: item.maquinariaLocalId,
      fecha: hoy,
      estado: trabajo ? "TRABAJANDO" : "SIN_OPERAR",
      detalles: trabajo
        ? completas.map((a) => ({
            concept: a.modo === "concepto" ? (a.concepto?.id ?? null) : null,
            descripcion: a.modo === "escrita" ? a.texto.trim() : "",
            horasEstimadas: variasActividades ? a.horas || null : null,
          }))
        : [],
      motivoInactividad: trabajo ? null : motivo,
      observaciones: trabajo ? "" : nota.trim(),
      horometroInicial: trabajo
        ? inicial.trim() || sugerencia || null
        : null,
      horometroFinal: trabajo ? final || null : null,
      constructionId,
      maquinariaEtiqueta: `${item.tipo} · ${item.marca} ${item.modelo}`,
    });

    showSnackbar(
      isOnline === true
        ? soloArranque
          ? "Arranque guardado"
          : "Jornada registrada"
        : "Guardada en el teléfono · se enviará al haber señal",
      "success",
    );
    onClose();
  };

  const horometroCerrado = finalNum !== null && cierre.abierto !== ID_HOROMETRO;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={estilos.asa}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        contentContainerStyle={estilos.contenedor}
        // Sin esto, con el teclado abierto el primer tap se lo come el cierre
        // del teclado y el botón nunca lo recibe (D12, punto 3).
        keyboardShouldPersistTaps="handled"
      >
        <Text style={estilos.sobretitulo}>Jornada · {fechaCortaLocal(hoy)}</Text>
        <Text style={estilos.titulo}>
          {item ? `${item.tipo} · ${item.marca} ${item.modelo}` : ""}
        </Text>

        {/* ── D2 · ¿Trabajó hoy? ─────────────────────────────────────── */}
        <Text style={estilos.seccion}>¿Trabajó hoy?</Text>
        <View style={estilos.respuestaFila}>
          {[
            { si: true, texto: "Sí, trabajó", color: "#10B981" },
            { si: false, texto: "No operó", color: "#EF4444" },
          ].map((opcion) => {
            const activo = trabajo === opcion.si;
            return (
              <TouchableOpacity
                key={opcion.texto}
                style={[estilos.respuesta, control(activo)]}
                onPress={() => setTrabajo(opcion.si)}
                activeOpacity={0.8}
              >
                {/* El matiz semántico va en un punto, no en el relleno: el
                    relleno habla el idioma de "cerrado" y nada más (D11). */}
                <View
                  style={[
                    estilos.punto,
                    {
                      backgroundColor: activo
                        ? opcion.color
                        : DesignTokens.colors.neutral[300],
                    },
                  ]}
                />
                <Text
                  style={[
                    estilos.respuestaTexto,
                    activo && estilos.respuestaTextoActivo,
                  ]}
                >
                  {opcion.texto}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {trabajo ? (
          <View>
            <Text style={estilos.seccion}>Horómetro del día</Text>
            <BloqueHorometro
              inicial={inicial}
              final={final}
              sugerencia={sugerencia}
              fechaSugerencia={item?.ultimo_horometro_fecha ?? null}
              cerrado={horometroCerrado}
              onCambiar={({ inicial: i, final: f }) => {
                if (i !== undefined) setInicial(i);
                if (f !== undefined) setFinal(f);
              }}
              onAbrir={() => cierre.abrir(ID_HOROMETRO)}
            />

            <View style={estilos.seccionFila}>
              <Text style={estilos.seccion}>Actividades</Text>
              {listaVacia && ultimaFecha && ultimosDetalles.length > 0 && (
                <TouchableOpacity onPress={repetir} hitSlop={8}>
                  <Text style={estilos.repetir}>
                    ⧉ Repetir lo del {fechaCortaLocal(ultimaFecha)} ·{" "}
                    {ultimosDetalles.length}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {copiadas !== null && (
              <View style={estilos.copiadas}>
                <Text style={estilos.copiadasTexto}>
                  Se copiaron {copiadas} actividades
                  {ultimaFecha ? ` del ${fechaCortaLocal(ultimaFecha)}` : ""},
                  sin horas.
                </Text>
                <TouchableOpacity onPress={deshacerRepetir} hitSlop={8}>
                  <Text style={estilos.deshacer}>Deshacer</Text>
                </TouchableOpacity>
              </View>
            )}

            {variasActividades && faltan !== null && (
              <View style={estilos.reparto}>
                <Text style={estilos.repartoTexto}>
                  Repartidas {formatoHoras(repartidas)} de{" "}
                  {formatoHoras(horasMaquina ?? 0)} h
                </Text>
                <Text style={estilos.repartoSaldo}>
                  {Math.abs(faltan) < 0.05
                    ? "completo"
                    : faltan > 0
                      ? `faltan ${formatoHoras(faltan)}`
                      : `sobran ${formatoHoras(-faltan)}`}
                </Text>
              </View>
            )}

            {actividades.map((actividad, i) => {
              const compacta =
                estaCompleta(actividad) && cierre.abierto !== actividad.id;
              if (compacta) {
                return (
                  <TouchableOpacity
                    key={actividad.id}
                    style={[estilos.compacta, bloque(true)]}
                    onPress={() => cierre.abrir(actividad.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={estilos.compactaNumero}>{i + 1}</Text>
                    <View style={estilos.compactaTexto}>
                      <Text style={estilos.compactaRuta} numberOfLines={1}>
                        {actividad.modo === "concepto" && actividad.concepto
                          ? `⌕ ${actividad.concepto.ruta}${actividad.concepto.wbs ? ` · ${actividad.concepto.wbs}` : ""}`
                          : "✎ Escrita"}
                      </Text>
                      <Text style={estilos.compactaDesc} numberOfLines={1}>
                        {actividad.modo === "concepto" && actividad.concepto
                          ? actividad.concepto.descripcion
                          : actividad.texto}
                      </Text>
                    </View>
                    {variasActividades && (
                      <Text
                        style={[
                          estilos.compactaHoras,
                          !actividad.horas && estilos.compactaSinHoras,
                        ]}
                      >
                        {actividad.horas
                          ? `${formatoHoras(numeroDe(actividad.horas) ?? 0)} h`
                          : "— h"}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }
              return (
                <TarjetaActividad
                  key={actividad.id}
                  actividad={actividad}
                  numero={i + 1}
                  indice={indice}
                  mostrarHoras={variasActividades}
                  sePuedeQuitar={i > 0}
                  onCambiar={(parcial) => cambiarActividad(actividad.id, parcial)}
                  onReiniciar={() => reiniciarActividad(actividad.id)}
                  onQuitar={() => quitarActividad(actividad.id)}
                  onAbrir={() => cierre.abrir(actividad.id)}
                  onListo={marcarListo}
                />
              );
            })}

            {/* Enlace y no botón: agregar una segunda actividad es la
                excepción, y un botón la anunciaría como si fuera el camino. */}
            <TouchableOpacity onPress={agregarActividad} hitSlop={8}>
              <Text style={estilos.agregar}>+ Agregar actividad</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={estilos.seccion}>Motivo</Text>
            <View style={estilos.motivos}>
              {MOTIVOS.map((m) => {
                const activo = motivo === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[estilos.motivo, control(activo)]}
                    onPress={() => setMotivo(m.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={m.icon as React.ComponentProps<typeof Ionicons>["name"]}
                      size={18}
                      color={
                        activo
                          ? DesignTokens.colors.executive.secondary
                          : DesignTokens.colors.neutral[500]
                      }
                    />
                    <Text
                      style={[
                        estilos.motivoTexto,
                        activo && estilos.motivoTextoActivo,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={estilos.seccion}>
              Nota <Text style={estilos.opcional}>· opcional</Text>
            </Text>
            <BottomSheetTextInput
              style={estilos.nota}
              placeholder="Ej. esperando refacción"
              placeholderTextColor={DesignTokens.colors.neutral[400]}
              value={nota}
              onChangeText={setNota}
              multiline
            />
          </View>
        )}

      </BottomSheetScrollView>

      {/* Pie FIJO, fuera del scroll. Dentro, el teclado lo colapsa y el
          usuario pierde de vista justo lo que está a punto de registrar.
          Mismo patrón que `AdvanceDetailBottomSheet`. */}
      {/* El pie ENTERO desaparece mientras el teclado está arriba.
          
          Mientras se escribe compite con el área de escritura, y dejar el
          botón de registrar al alcance del pulgar con el teclado abierto es
          invitar a un envío que nadie quiso. Para salir del teclado basta
          tocar cualquier parte de la pantalla, así que esconderlo no deja a
          nadie atrapado.

          El resumen (D9) se verifica al terminar, que es justo cuando el
          teclado baja y el pie vuelve. */}
      {!tecladoArriba && (
      <View style={estilos.pie}>
        <View style={estilos.resumen}>
          <Text style={estilos.resumenTexto} numberOfLines={3}>
            {resumen.linea}
          </Text>
          {resumen.avisos.length > 0 && (
            <Text style={estilos.resumenAvisos} numberOfLines={2}>
              {resumen.avisos.join(" · ")}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[estilos.guardar, !puedeGuardar && estilos.guardarInactivo]}
          onPress={registrar}
          disabled={!puedeGuardar}
          activeOpacity={0.85}
        >
          <Text
            style={[
              estilos.guardarTexto,
              !puedeGuardar && estilos.guardarTextoInactivo,
            ]}
          >
            {textoBoton}
          </Text>
        </TouchableOpacity>
      </View>
      )}
    </BottomSheet>
  );
};

const estilos = StyleSheet.create({
  asa: { backgroundColor: DesignTokens.colors.neutral[300] },
  contenedor: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 20 },
  pie: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
    backgroundColor: DesignTokens.colors.background.primary,
  },

  sobretitulo: {
    fontSize: 9.5,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
  },
  titulo: {
    fontSize: 16.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    marginTop: 2,
  },

  seccion: {
    fontSize: 10.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[500],
    marginTop: 16,
    marginBottom: 7,
  },
  seccionFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  opcional: {
    textTransform: "none",
    letterSpacing: 0,
    fontWeight: DesignTokens.typography.fontWeight.normal,
    color: DesignTokens.colors.neutral[400],
  },

  respuestaFila: { flexDirection: "row", gap: 6 },
  respuesta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 34,
    borderRadius: DesignTokens.borderRadius.base,
  },
  punto: { width: 7, height: 7, borderRadius: 4 },
  respuestaTexto: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
  },
  respuestaTextoActivo: { color: DesignTokens.colors.executive.accent },

  repetir: {
    fontSize: 11.5,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[600],
  },
  copiadas: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 8,
  },
  copiadasTexto: { flex: 1, fontSize: 11.5, color: "#0F5132" },
  deshacer: {
    fontSize: 11.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#047857",
  },

  reparto: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: DesignTokens.colors.background.secondary,
    borderRadius: DesignTokens.borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 8,
  },
  repartoTexto: { fontSize: 11.5, color: DesignTokens.colors.neutral[600] },
  repartoSaldo: {
    fontSize: 11.5,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
  },

  compacta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  compactaNumero: {
    width: 14,
    textAlign: "center",
    fontSize: 11,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[500],
  },
  compactaTexto: { flex: 1, minWidth: 0 },
  compactaRuta: { fontSize: 10, color: DesignTokens.colors.neutral[500] },
  compactaDesc: { fontSize: 12.5, color: DesignTokens.colors.neutral[900] },
  compactaHoras: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },
  compactaSinHoras: {
    color: DesignTokens.colors.neutral[300],
    fontWeight: DesignTokens.typography.fontWeight.normal,
  },

  agregar: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.primary[600],
    paddingVertical: 2,
  },

  motivos: { gap: 6 },
  motivo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  motivoTexto: { fontSize: 13, color: DesignTokens.colors.neutral[700] },
  motivoTextoActivo: {
    color: DesignTokens.colors.executive.accent,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  nota: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.base,
    padding: 10,
    fontSize: 12.5,
    minHeight: 52,
    textAlignVertical: "top",
    color: DesignTokens.colors.neutral[900],
  },

  resumen: {
    backgroundColor: DesignTokens.colors.background.secondary,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.md,
    padding: 11,
  },
  resumenTexto: {
    fontSize: 12.5,
    lineHeight: 18,
    color: DesignTokens.colors.neutral[700],
  },
  resumenAvisos: {
    fontSize: 11,
    lineHeight: 15,
    color: DesignTokens.colors.neutral[500],
    marginTop: 4,
  },

  guardar: {
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  guardarInactivo: { backgroundColor: DesignTokens.colors.neutral[300] },
  guardarTexto: {
    fontSize: 14,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#fff",
  },
  guardarTextoInactivo: { color: DesignTokens.colors.neutral[500] },
});

export default JornadaSheet;
