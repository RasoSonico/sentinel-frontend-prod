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
import {
  usePendingCapturaQueue,
  type CapturaParaEncolar,
} from "src/hooks/maquinaria/usePendingCapturaQueue";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { useSnackbar } from "src/hooks/useSnackbar";
import { useAppSelector } from "src/redux/hooks";
import { selectUserName } from "src/redux/selectors/authSelectors";
import { telemetry } from "src/services/telemetry";
import { AvanceBaseResponse } from "src/realm/avanceBase/Response";
import { AVANCE_QUERY_KEYS } from "src/hooks/data/query/avanceQueries.const";
import { MotivoInactividad } from "src/types/maquinaria";

import {
  actividadesDelTurno,
  tieneRegistros,
  type DetalleVista,
  type TurnoVista,
  type VistaMaquina,
} from "../diaMaquina";
import { construirIndice, type ConceptoBuscable } from "../indiceConceptos";
import {
  avisoDeLecturas,
  diaCorto,
  diaYMes,
  fechaCortaLocal,
  fechaDeInstante,
  formatoHoras,
  formatoLectura,
  horaCorta,
  numeroDe,
  soloLectura,
} from "../horometro";
import BloqueHorometro from "./BloqueHorometro";
import { MOTIVO_LABELS } from "./MaquinariaCard";
import { ActividadesRegistradas, TurnosRegistrados } from "./RegistroJornada";
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
  /** La máquina con su día fundido. Se recalcula en cada render del hub. */
  vista: VistaMaquina | null;
  hoy: string;
  constructionId: number | undefined;
  onRegistrarSalida: () => void;
}

/** "Juan Pérez López" → "J. Pérez". Igual que el servidor nombra autores. */
const nombreCorto = (nombre: string | null | undefined): string => {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return `${partes[0][0].toUpperCase()}. ${partes[1]}`;
  return partes[0] ?? "";
};

/** Las actividades copiadas por "Repetir", sin horas: dependen del horómetro de hoy. */
const copiar = (
  detalles: DetalleVista[],
  indice: ConceptoBuscable[],
): ActividadEnCaptura[] =>
  detalles.map((d) => {
    const base = actividadVacia(uuid.v4());
    const concepto = d.concept
      ? (indice.find((c) => c.id === d.concept) ?? null)
      : null;
    return concepto
      ? { ...base, modo: "concepto" as const, concepto }
      : { ...base, modo: "escrita" as const, texto: d.descripcion };
  });

/**
 * Hoja de jornada — ADR-007 (D1–D12) con la reforma de ADR-009.
 *
 * **La misma hoja, abierta las veces que haga falta.** El supervisor sube a
 * la máquina, lee el inicial y lo guarda; regresa a las 13:10 y agrega una
 * actividad; a las 18:05 captura el final. Cada guardado es una captura en la
 * cola, y la hoja enseña lo ya registrado —con hora y autor— y deja capturar
 * lo que falta (D3).
 *
 * Tres situaciones, sin modos que elegir:
 *
 * - **Jornada vacía:** como siempre —"¿Trabajó hoy?", horómetro, actividades—.
 *   "Guardar arranque" basta con el inicial o con una actividad (D4).
 * - **Con algo registrado:** desaparece "¿Trabajó hoy?"; el horómetro enseña
 *   lo leído y pide solo lo que falta; las actividades se listan y "+ Agregar
 *   actividad" abre una tarjeta nueva. Después del cierre, "Iniciar otro
 *   turno" (D5).
 * - **Cierre olvidado:** la máquina no se puede reportar hasta resolverlo
 *   (enmienda del 31-oct). La hoja solo pide el final de ese turno —sin
 *   sugerencia— o dejarlo sin final; resolverlo no abre turno.
 */
const JornadaSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  vista,
  hoy,
  constructionId,
  onRegistrarSalida,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["70%", "92%"], []);

  const cierre = useCierreDiferido();
  const tecladoArriba = useTecladoVisible();

  const marcarListo = useCallback(() => {
    Keyboard.dismiss();
    cierre.cerrar();
  }, [cierre]);

  const { addToQueue } = usePendingCapturaQueue();
  const isOnline = useNetworkStatus();
  const { showSnackbar } = useSnackbar();
  const autor = nombreCorto(useAppSelector(selectUserName));

  // El catálogo entero de la obra, del caché local: la búsqueda de concepto
  // no toca la red, porque la jornada se captura en obra.
  const base = useObject(AvanceBaseResponse, AVANCE_QUERY_KEYS.BASE);
  const indice = useMemo<ConceptoBuscable[]>(
    () => (base?.catalogs ? construirIndice(base.catalogs) : []),
    [base],
  );

  // ── Qué jornada muestra la hoja ──────────────────────────────────────
  const resolver = vista?.atencion?.motivo === "SIN_FINAL";
  // El nocturno de ayer sigue abierto: la hoja es la de SU jornada (D6).
  const jornada = vista ? (vista.jornadaNocturna ?? vista.hoy) : null;
  const turnoAbierto =
    vista?.turnoAbierto &&
    !vista.turnoAbierto.olvidado &&
    vista.turnoAbierto.jornadaFecha === jornada?.fecha
      ? vista.turnoAbierto.turno
      : null;
  const turnosCerrados = jornada?.turnos.filter((t) => t !== turnoAbierto) ?? [];
  const vacia = !jornada || !tieneRegistros(jornada);
  const noOpero = jornada?.estado === "SIN_OPERAR";

  // ── Estado de la captura ─────────────────────────────────────────────
  const [trabajo, setTrabajo] = useState(true);
  const [motivo, setMotivo] = useState<MotivoInactividad | null>(null);
  const [nota, setNota] = useState("");
  const [inicial, setInicial] = useState("");
  const [final, setFinal] = useState("");
  const [actividades, setActividades] = useState<ActividadEnCaptura[]>([]);
  const [copiadas, setCopiadas] = useState<number | null>(null);
  /** "Iniciar otro turno": la hoja vacía, como la primera captura (D5). */
  const [otroTurno, setOtroTurno] = useState(false);
  const [finalOlvidado, setFinalOlvidado] = useState("");

  // El vaciado va en el RENDER y no en un efecto: en un efecto la hoja se
  // pintaría con los datos de la máquina anterior y recién después se
  // limpiaría.
  const [visibleAntes, setVisibleAntes] = useState(false);
  if (isVisible !== visibleAntes) {
    setVisibleAntes(isVisible);
    if (isVisible) {
      setTrabajo(true);
      setMotivo(null);
      setNota("");
      // Los campos del horómetro arrancan VACÍOS: la última lectura se
      // muestra como sugerencia, no como valor. Precargarla haría fácil no
      // mirar la máquina.
      setInicial("");
      setFinal("");
      // Con la jornada vacía, la Actividad 1 ya está ahí (ADR-007 D4). Con
      // algo registrado, se agrega con el enlace: casi siempre se abre para
      // otra cosa —el final, sobre todo—.
      setActividades(vacia ? [actividadVacia(uuid.v4())] : []);
      setCopiadas(null);
      setOtroTurno(false);
      setFinalOlvidado("");
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
    // Abrir la nueva cancela el cierre que agendó este mismo toque (D12).
    cierre.abrir(nueva.id);
  }, [cierre]);

  const quitarActividad = useCallback((id: string) => {
    setActividades((xs) => xs.filter((a) => a.id !== id));
  }, []);

  const reiniciarActividad = useCallback(
    (id: string) => {
      cambiarActividad(id, { modo: null, concepto: null, texto: "", busqueda: "" });
      cierre.abrir(id);
    },
    [cambiarActividad, cierre],
  );

  // ── Horómetro: qué se ve ─────────────────────────────────────────────
  // Campos para inicial y final: jornada sin lecturas, u otro turno.
  const camposHorometro =
    !turnoAbierto && (otroTurno || (jornada?.turnos.length ?? 0) === 0);
  const ultimoCerrado = turnosCerrados[turnosCerrados.length - 1] ?? null;

  // Con la jornada vacía, el inicial sin tocar toma la última lectura (D4).
  // Al iniciar otro turno, el final del anterior (D5). Con la jornada ya
  // empezada —actividades sin horómetro—, solo cuenta lo que se teclee: la
  // lectura de otro día no es el arranque de hoy.
  const sugerencia = otroTurno
    ? (ultimoCerrado?.final ?? null)
    : vacia
      ? (vista?.ultimoHorometro?.valor ?? null)
      : null;
  const inicialTecleado = inicial.trim() !== "";
  const inicialEfectivo = camposHorometro
    ? inicialTecleado
      ? inicial.trim()
      : sugerencia
    : (turnoAbierto?.inicial ?? null);
  const finalTecleado = (camposHorometro || !!turnoAbierto) && final.trim() !== "";

  const horasMaquina = (() => {
    const i = numeroDe(inicialEfectivo);
    const f = numeroDe(final);
    return finalTecleado && i !== null && f !== null ? f - i : null;
  })();

  // ── Actividades de la captura ────────────────────────────────────────
  const completas = actividades.filter(estaCompleta);
  const registradas = otroTurno ? [] : (jornada?.detalles ?? []);
  const variasActividades = registradas.length + actividades.length > 1;
  const repartidas = actividades.reduce((s, a) => s + (numeroDe(a.horas) ?? 0), 0);
  const faltan =
    horasMaquina !== null && horasMaquina >= 0 ? horasMaquina - repartidas : null;

  // "Repetir": con la jornada vacía, lo del último día trabajado; al iniciar
  // otro turno, lo del turno anterior.
  const delTurnoAnterior =
    otroTurno && ultimoCerrado && jornada
      ? actividadesDelTurno(ultimoCerrado, jornada.detalles)
      : [];
  const repetirFuente = otroTurno
    ? delTurnoAnterior.length
      ? { etiqueta: "del turno anterior", detalles: delTurnoAnterior }
      : null
    : vacia && vista?.ultimaTrabajada?.detalles.length
      ? {
          etiqueta: `del ${diaCorto(vista.ultimaTrabajada.fecha)}`,
          detalles: vista.ultimaTrabajada.detalles,
        }
      : null;
  const listaVacia =
    actividades.length === 1 &&
    actividades[0].modo === null &&
    !estaCompleta(actividades[0]);

  const repetir = () => {
    if (!repetirFuente) return;
    const copias = copiar(repetirFuente.detalles, indice);
    if (!copias.length) return;
    setActividades(copias);
    setCopiadas(copias.length);
    cierre.cerrar();
  };

  const deshacerRepetir = useCallback(() => {
    setActividades([actividadVacia(uuid.v4())]);
    setCopiadas(null);
  }, []);

  // ── "¿Trabajó hoy?" solo con la jornada vacía (D3) ───────────────────
  const preguntaTrabajo = vacia && !otroTurno;
  const noOperoNuevo = preguntaTrabajo && !trabajo;

  // ── Lo que se va a registrar ─────────────────────────────────────────
  const etiquetaMaquina = vista
    ? `${vista.maquina.tipo} ${vista.maquina.marca} ${vista.maquina.modelo}`.trim()
    : "la máquina";
  const primeraCaptura = vacia || otroTurno;
  // El inicial que viaja: solo con campos, y la sugerencia solo en la
  // primera captura y si hay algo más que guardar.
  const inicialAEnviar = camposHorometro
    ? inicialTecleado
      ? inicial.trim()
      : primeraCaptura && (completas.length > 0 || finalTecleado)
        ? sugerencia
        : null
    : null;
  const usaSugerencia = !inicialTecleado && inicialAEnviar !== null;

  // Derivados baratos, sin memo: el compilador de React lo hace mejor.
  const { textoBoton, puedeGuardar, hayNuevo } = (() => {
    if (resolver) return { textoBoton: "", puedeGuardar: false, hayNuevo: false };
    if (noOperoNuevo) {
      return motivo === null
        ? { textoBoton: "Elige un motivo", puedeGuardar: false, hayNuevo: true }
        : { textoBoton: "Registrar jornada", puedeGuardar: true, hayNuevo: true };
    }
    const nuevo = inicialTecleado || completas.length > 0 || finalTecleado;
    if (!nuevo) return { textoBoton: "", puedeGuardar: false, hayNuevo: false };
    if (finalTecleado && !turnoAbierto && inicialAEnviar === null) {
      return { textoBoton: "Falta el inicial", puedeGuardar: false, hayNuevo: true };
    }
    if (finalTecleado) {
      return {
        textoBoton: completas.length ? "Registrar actividad y cierre" : "Registrar cierre",
        puedeGuardar: true,
        hayNuevo: true,
      };
    }
    // "Guardar arranque" es la primera captura de un turno, lleve lectura o
    // solo actividades (D4). Lo demás agrega a lo ya empezado.
    if (inicialAEnviar !== null || (camposHorometro && primeraCaptura)) {
      return { textoBoton: "Guardar arranque", puedeGuardar: true, hayNuevo: true };
    }
    return { textoBoton: "Registrar actividad", puedeGuardar: true, hayNuevo: true };
  })();

  /**
   * Resumen — el mismo texto estándar en todos los casos (D3), para que el
   * primer turno y el segundo se lean igual. Dos líneas como mucho: la forma
   * del registro y lo que la app llenó sola.
   */
  const resumen = ((): { linea: string; avisos: string[] } => {
    const avisos: string[] = [];
    if (usaSugerencia && !otroTurno && vista?.ultimoHorometro?.fecha) {
      avisos.push(
        `Inicial tomado de la última lectura · ${fechaCortaLocal(vista.ultimoHorometro.fecha)}`,
      );
    }
    if (copiadas !== null) {
      avisos.push(`${copiadas} actividades copiadas`);
    }

    if (noOperoNuevo) {
      if (motivo === null) {
        return { linea: "Indica por qué no operó la máquina.", avisos: [] };
      }
      const etiqueta = MOTIVOS.find((m) => m.value === motivo)?.label ?? "";
      return {
        linea: `Se registrará: ${etiquetaMaquina} no operó hoy · ${etiqueta.toLowerCase()}.`,
        avisos: [],
      };
    }

    const lectura = (t: string | null) => {
      const n = numeroDe(t);
      return n !== null ? formatoLectura(n) : "";
    };

    if (completas.length > 0) {
      const horas = finalTecleado
        ? horasMaquina !== null
          ? `, ${formatoHoras(horasMaquina)} h de horómetro`
          : ""
        : turnoAbierto || inicialAEnviar
          ? `, con arranque en ${lectura(inicialEfectivo)} y el cierre pendiente`
          : camposHorometro
            ? ", con el cierre pendiente"
            : "";
      const cuantas =
        completas.length === 1
          ? "en 1 actividad"
          : `en ${completas.length} actividades`;
      return {
        linea: `Se registrará: ${etiquetaMaquina} trabajó hoy${horas}, ${cuantas}.`,
        avisos,
      };
    }
    if (finalTecleado) {
      return {
        linea: `Se registrará: cierre en ${lectura(final)}${
          horasMaquina !== null ? ` · ${formatoHoras(horasMaquina)} h de horómetro` : ""
        }.`,
        avisos,
      };
    }
    if (inicialTecleado) {
      return {
        linea: `Se registrará: arranque de ${etiquetaMaquina} en ${lectura(inicial)}.`,
        avisos,
      };
    }
    return { linea: "", avisos };
  })();

  // ── Registro ─────────────────────────────────────────────────────────
  type Contenido = Omit<
    CapturaParaEncolar,
    | "estanciaId"
    | "maquinariaId"
    | "maquinariaLocalId"
    | "fecha"
    | "autor"
    | "constructionId"
    | "maquinariaEtiqueta"
  >;

  const encolar = (contenido: Contenido) => {
    if (!vista || constructionId === undefined) return false;
    const { maquina } = vista;
    addToQueue({
      ...contenido,
      estanciaId: maquina.estanciaId,
      maquinariaId: maquina.id,
      // Mientras la máquina no tenga estancia en el servidor, la captura
      // espera a su alta.
      maquinariaLocalId: maquina.estanciaId > 0 ? null : maquina.maquinariaLocalId,
      fecha: hoy,
      autor,
      constructionId,
      maquinariaEtiqueta: `${maquina.tipo} · ${maquina.marca} ${maquina.modelo}`,
    });
    return true;
  };

  const confirmar = (texto: string) => {
    showSnackbar(
      isOnline === true ? texto : "Guardada en el teléfono · se enviará al haber señal",
      "success",
    );
    onClose();
  };

  const registrar = () => {
    if (!puedeGuardar) return;
    if (noOperoNuevo) {
      if (!encolar({ estado: "SIN_OPERAR", motivoInactividad: motivo, observaciones: nota.trim() }))
        return;
      telemetry.trackEvent("captura_guardada", { tipo: "no_opero", sin_senal: isOnline === false });
      confirmar("Jornada registrada");
      return;
    }
    const ok = encolar({
      horometroInicial: inicialAEnviar,
      horometroFinal: finalTecleado ? final.trim() : null,
      detalles: completas.map((a) => ({
        concept: a.modo === "concepto" ? (a.concepto?.id ?? null) : null,
        descripcion: a.modo === "escrita" ? a.texto.trim() : "",
        horasEstimadas: variasActividades ? a.horas || null : null,
      })),
    });
    if (!ok) return;
    const partes = [
      inicialAEnviar ? "arranque" : null,
      completas.length ? "actividad" : null,
      finalTecleado ? "cierre" : null,
    ].filter(Boolean);
    telemetry.trackEvent("captura_guardada", {
      tipo: partes.length === 1 ? (partes[0] as string) : "mixta",
      sin_senal: isOnline === false,
      n_actividades: completas.length,
      uso_repetir: copiadas !== null,
      otro_turno: otroTurno,
    });
    confirmar(
      {
        "Guardar arranque": "Arranque guardado",
        "Registrar actividad": "Actividad registrada",
        "Registrar cierre": "Cierre registrado",
        "Registrar actividad y cierre": "Actividad y cierre registrados",
      }[textoBoton] ?? "Guardado",
    );
  };

  const resolverOlvido = (sinFinal: boolean) => {
    if (!sinFinal && finalOlvidado.trim() === "") return;
    const ok = encolar({
      cerrarAnterior: sinFinal ? { sinFinal: true } : { final: finalOlvidado.trim() },
    });
    if (!ok) return;
    telemetry.trackEvent("cierre_olvidado_respondido", {
      respuesta: sinFinal ? "sin_final" : "usar",
      sin_senal: isOnline === false,
    });
    confirmar(sinFinal ? "Turno dejado sin final" : "Final registrado");
  };

  const iniciarOtroTurno = () => {
    setOtroTurno(true);
    setInicial("");
    setFinal("");
    setActividades([actividadVacia(uuid.v4())]);
    setCopiadas(null);
    cierre.cerrar();
    telemetry.trackEvent("turno_iniciado_otro", {});
  };

  const horometroCerrado =
    numeroDe(final) !== null && cierre.abierto !== ID_HOROMETRO;

  // ── Pintado ──────────────────────────────────────────────────────────
  const titulo = vista
    ? `${vista.maquina.tipo} · ${vista.maquina.marca} ${vista.maquina.modelo}`
    : "";
  const jornadaFecha = resolver
    ? (vista?.turnoAbierto?.jornadaFecha ?? hoy)
    : (jornada?.fecha ?? hoy);
  const puedeSalida = (vista?.maquina.estanciaId ?? 0) > 0;
  const despuesDelCierre =
    !otroTurno && !turnoAbierto && turnosCerrados.length > 0;

  // "07:02 · J. Pérez"; con el día delante cuando no es hoy —el arranque del
  // nocturno visto en la madrugada—.
  const pieTurno = (t: TurnoVista) => {
    const dia = fechaDeInstante(t.desde);
    const hora = `${dia && dia !== hoy ? `${diaCorto(dia)} ` : ""}${horaCorta(t.desde)}`;
    return [hora, t.autorInicio].filter(Boolean).join(" · ");
  };

  const contenidoResolver = () => {
    const turno = vista?.turnoAbierto?.turno ?? null;
    const fecha = vista?.turnoAbierto?.jornadaFecha ?? hoy;
    const i = numeroDe(turno?.inicial ?? null);
    const f = numeroDe(finalOlvidado);
    const horas = i !== null && f !== null ? f - i : null;
    const aviso = avisoDeLecturas(i, f);
    const [a, m, d] = hoy.split("-").map(Number);
    const ayer = new Date(Date.UTC(a, m - 1, d - 1)).toISOString().slice(0, 10);
    const cuando = fecha === ayer ? `Ayer (${diaCorto(fecha)})` : `El ${diaCorto(fecha)}`;
    return (
      <View style={estilos.pregunta}>
        <Text style={estilos.preguntaTexto}>
          {cuando} arrancó en{" "}
          <Text style={estilos.negrita}>{i !== null ? formatoLectura(i) : "—"}</Text>{" "}
          y no se capturó el final. Mientras no se resuelva, esta máquina no se
          puede reportar.
        </Text>
        <Text style={[estilos.seccion, { marginTop: 10 }]}>
          Final del {diaCorto(fecha)}
        </Text>
        {/* Sin sugerencia, a propósito: la única fuente honesta del final
            es quien lo leyó. */}
        <BottomSheetTextInput
          style={estilos.entradaOlvido}
          value={finalOlvidado}
          onChangeText={(t) => setFinalOlvidado(soloLectura(t))}
          placeholder="—"
          placeholderTextColor={DesignTokens.colors.neutral[400]}
          inputMode="decimal"
        />
        {horas !== null && (
          <Text style={estilos.preguntaTexto}>
            Serían <Text style={estilos.negrita}>{formatoHoras(horas)} h</Text> el{" "}
            {diaCorto(fecha)}.
          </Text>
        )}
        {aviso && <Text style={estilos.avisoOlvido}>{aviso.texto}</Text>}
        <View style={estilos.preguntaBotones}>
          <TouchableOpacity
            style={[estilos.botonPrimario, f === null && estilos.guardarInactivo]}
            disabled={f === null}
            onPress={() => resolverOlvido(false)}
            activeOpacity={0.85}
          >
            <Text
              style={[estilos.botonPrimarioTexto, f === null && estilos.guardarTextoInactivo]}
            >
              Registrar final
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.botonSecundario}
            onPress={() => resolverOlvido(true)}
            activeOpacity={0.85}
          >
            <Text style={estilos.botonSecundarioTexto}>Dejarlo sin final</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const contenidoCaptura = () => (
    <>
      {otroTurno && ultimoCerrado && (
        <Text style={estilos.turnoAnterior}>
          Turno anterior:{" "}
          <Text style={estilos.negrita}>
            {formatoLectura(numeroDe(ultimoCerrado.inicial) ?? 0)} →{" "}
            {formatoLectura(numeroDe(ultimoCerrado.final) ?? 0)}
            {ultimoCerrado.horas
              ? ` · ${formatoHoras(numeroDe(ultimoCerrado.horas) ?? 0)} h`
              : ""}
          </Text>
          {" · "}
          {delTurnoAnterior.length === 1
            ? "1 actividad"
            : `${delTurnoAnterior.length} actividades`}
        </Text>
      )}

      {/* ── ¿Trabajó hoy? — solo con la jornada vacía ──────────────── */}
      {preguntaTrabajo && (
        <>
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
                    style={[estilos.respuestaTexto, activo && estilos.respuestaTextoActivo]}
                  >
                    {opcion.texto}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {noOperoNuevo ? (
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
                  <Text style={[estilos.motivoTexto, activo && estilos.motivoTextoActivo]}>
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
      ) : (
        <View>
          {/* ── "No operó" ya registrado (P1: aún se le puede agregar) ── */}
          {noOpero && (
            <>
              <Text style={estilos.seccion}>Registrado</Text>
              <Text style={estilos.registradoNoOpero}>
                No operó
                {jornada?.motivo ? ` · ${MOTIVO_LABELS[jornada.motivo] ?? jornada.motivo}` : ""}
              </Text>
            </>
          )}

          {/* ── Horómetro ─────────────────────────────────────────────── */}
          {!noOpero && (
            <>
              <Text style={estilos.seccion}>Horómetro del día</Text>
              {camposHorometro || turnoAbierto ? (
                <>
                  {!otroTurno && turnosCerrados.length > 0 && (
                    <TurnosRegistrados turnos={turnosCerrados} />
                  )}
                  <BloqueHorometro
                    inicial={inicial}
                    final={final}
                    sugerencia={sugerencia}
                    fechaSugerencia={otroTurno ? null : (vista?.ultimoHorometro?.fecha ?? null)}
                    etiquetaSugerencia={
                      otroTurno && ultimoCerrado?.hasta
                        ? `Cierre de las ${horaCorta(ultimoCerrado.hasta)}`
                        : null
                    }
                    inicialRegistrado={
                      turnoAbierto?.inicial
                        ? {
                            valor: turnoAbierto.inicial,
                            pie: pieTurno(turnoAbierto),
                            enCola: turnoAbierto.inicioEnCola,
                          }
                        : null
                    }
                    cerrado={horometroCerrado}
                    onCambiar={({ inicial: i, final: f }) => {
                      if (i !== undefined) setInicial(i);
                      if (f !== undefined) setFinal(f);
                    }}
                    onAbrir={() => cierre.abrir(ID_HOROMETRO)}
                  />
                </>
              ) : (
                <TurnosRegistrados turnos={turnosCerrados} />
              )}
            </>
          )}

          {/* ── Actividades ───────────────────────────────────────────── */}
          <View style={estilos.seccionFila}>
            <Text style={estilos.seccion}>Actividades</Text>
            {registradas.length > 0 ? (
              <Text style={estilos.cuenta}>
                {registradas.length === 1
                  ? "1 registrada"
                  : `${registradas.length} registradas`}
              </Text>
            ) : (
              listaVacia &&
              repetirFuente && (
                <TouchableOpacity onPress={repetir} hitSlop={8}>
                  <Text style={estilos.repetir}>
                    ⧉ Repetir lo {repetirFuente.etiqueta} · {repetirFuente.detalles.length}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {registradas.length > 0 && jornada && (
            <ActividadesRegistradas
              detalles={registradas}
              jornadaFecha={jornada.fecha}
              indice={indice}
              conHoras={variasActividades}
            />
          )}

          {copiadas !== null && (
            <View style={estilos.copiadas}>
              <Text style={estilos.copiadasTexto}>
                Se copiaron {copiadas} actividades, sin horas.
              </Text>
              <TouchableOpacity onPress={deshacerRepetir} hitSlop={8}>
                <Text style={estilos.deshacer}>Deshacer</Text>
              </TouchableOpacity>
            </View>
          )}

          {variasActividades && actividades.length > 0 && faltan !== null && (
            <View style={estilos.reparto}>
              <Text style={estilos.repartoTexto}>
                Repartidas {formatoHoras(repartidas)} de {formatoHoras(horasMaquina ?? 0)} h
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
            const numero = registradas.length + i + 1;
            const compacta = estaCompleta(actividad) && cierre.abierto !== actividad.id;
            if (compacta) {
              return (
                <TouchableOpacity
                  key={actividad.id}
                  style={[estilos.compacta, bloque(true)]}
                  onPress={() => cierre.abrir(actividad.id)}
                  activeOpacity={0.7}
                >
                  <Text style={estilos.compactaNumero}>{numero}</Text>
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
                      style={[estilos.compactaHoras, !actividad.horas && estilos.compactaSinHoras]}
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
                numero={numero}
                indice={indice}
                mostrarHoras={variasActividades}
                // Con la jornada vacía, la primera no se quita (ADR-007 D4);
                // con algo registrado, todas son opcionales.
                sePuedeQuitar={!primeraCaptura || i > 0}
                onCambiar={(parcial) => cambiarActividad(actividad.id, parcial)}
                onReiniciar={() => reiniciarActividad(actividad.id)}
                onQuitar={() => quitarActividad(actividad.id)}
                onAbrir={() => cierre.abrir(actividad.id)}
                onListo={marcarListo}
              />
            );
          })}

          {/* Enlace y no botón: agregar es la excepción, no el camino. */}
          <TouchableOpacity onPress={agregarActividad} hitSlop={8}>
            <Text style={estilos.agregar}>+ Agregar actividad</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Al pie: otro turno (solo después del cierre) y salida ────── */}
      {(despuesDelCierre || puedeSalida) && (
        <View style={estilos.pieLinks}>
          {despuesDelCierre && (
            <View style={estilos.pieLinkFila}>
              <Text style={estilos.pieLinkPregunta}>¿Volvió a trabajar?</Text>
              <TouchableOpacity onPress={iniciarOtroTurno} hitSlop={8}>
                <Text style={estilos.pieLink}>Iniciar otro turno</Text>
              </TouchableOpacity>
            </View>
          )}
          {puedeSalida && (
            <View style={estilos.pieLinkFila}>
              <Text style={estilos.pieLinkPregunta}>
                ¿La máquina ya se fue de la obra?
              </Text>
              <TouchableOpacity onPress={onRegistrarSalida} hitSlop={8}>
                <Text style={estilos.pieLinkRojo}>Registrar salida</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </>
  );

  const muestraPie = !resolver && hayNuevo && !tecladoArriba;

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
        {/* El encabezado dice la jornada, no el día de hoy: el nocturno de
            ayer se sigue capturando en la jornada de ayer (D6). */}
        <Text style={estilos.sobretitulo}>Jornada · {diaYMes(jornadaFecha)}</Text>
        <Text style={estilos.titulo}>{titulo}</Text>
        {isOnline === false && (
          <Text style={estilos.sinSenal}>Sin conexión · se envía solo al recuperarla</Text>
        )}

        {vista && (resolver ? contenidoResolver() : contenidoCaptura())}
      </BottomSheetScrollView>

      {/* Pie FIJO, fuera del scroll, y sin botón cuando no hay nada nuevo
          que registrar (D3). Se repliega mientras el teclado está arriba:
          compite con lo que se escribe e invita a un envío que nadie quiso. */}
      {muestraPie && (
        <View style={estilos.pie}>
          {!!resumen.linea && (
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
          )}
          <TouchableOpacity
            style={[estilos.guardar, !puedeGuardar && estilos.guardarInactivo]}
            onPress={registrar}
            disabled={!puedeGuardar}
            activeOpacity={0.85}
          >
            <Text style={[estilos.guardarTexto, !puedeGuardar && estilos.guardarTextoInactivo]}>
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
  sinSenal: { fontSize: 11, color: "#475569", marginTop: 3 },
  negrita: { fontWeight: DesignTokens.typography.fontWeight.bold, color: "#0F172A" },

  turnoAnterior: {
    fontSize: 11.5,
    color: "#475569",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF0F3",
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
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
  cuenta: { fontSize: 11, color: "#64748B", marginTop: 9 },
  opcional: {
    textTransform: "none",
    letterSpacing: 0,
    fontWeight: DesignTokens.typography.fontWeight.normal,
    color: DesignTokens.colors.neutral[400],
  },
  registradoNoOpero: {
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#991B1B",
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

  pieLinks: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F3",
    paddingTop: 6,
  },
  pieLinkFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 6,
  },
  pieLinkPregunta: { flex: 1, fontSize: 12, color: "#475569" },
  pieLink: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.primary[600],
  },
  pieLinkRojo: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#B91C1C",
  },

  // Cierre olvidado: el mismo recuadro ámbar que la pregunta de D14.
  pregunta: {
    borderWidth: 1.5,
    borderColor: "#D97706",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 14,
  },
  preguntaTexto: { fontSize: 12.5, lineHeight: 18, color: "#334155", marginTop: 4 },
  entradaOlvido: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: DesignTokens.borderRadius.base,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
  },
  avisoOlvido: { fontSize: 11, color: "#92400E", marginTop: 6 },
  preguntaBotones: { flexDirection: "row", gap: 6, marginTop: 10 },
  botonPrimario: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 9,
    backgroundColor: "#1E293B",
  },
  botonPrimarioTexto: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#fff",
  },
  botonSecundario: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  botonSecundarioTexto: {
    fontSize: 12.5,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: "#334155",
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
