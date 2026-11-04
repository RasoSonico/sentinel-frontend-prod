import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { uuid } from "expo-modules-core";

import { hoyLocal } from "src/hooks/data/query/useAvance/utils/programaCalculos";
import { useBorradorStore } from "src/hooks/reportes/useBorradoresDeReporte";
import type { FirmaPayload, Proveedor } from "src/types/reporte";

import type { AreaReporte } from "../constantes";

/**
 * Borrador del reporte mientras se captura (ADR-006, Decisiones 1–6).
 *
 * **Vive en Realm desde F43**, en su propia tabla `BorradorReporte` — no en la
 * cola, que es para lo que ya se declaró terminado y va camino al servidor.
 *
 * Hasta aquí vivía en memoria, con este argumento escrito: *"el wizard es una
 * sesión corta y el usuario no ha declarado nada todavía"*. **El campo dijo lo
 * contrario en las dos mitades.** La sesión no es corta: los supervisores
 * capturan a lo largo de toda la jornada, entrando y saliendo entre
 * Actividades, Fotos y Observaciones conforme avanza el trabajo. Y lo
 * capturado sí es trabajo: un supervisor tocó la tab de Reportes sin querer y
 * perdió el día entero, sin aviso, porque esta pantalla era lo único que lo
 * sostenía.
 *
 * Lo que se guarda se guarda **en cada cambio, con rebote**, y lo que quede
 * pendiente del rebote se escribe al desmontar: salir del wizard por donde sea
 * —la tab, el gesto de atrás, que Android mate la app— dejó de ser destructivo.
 *
 * **El numeral de la actividad no vive aquí**: es la posición en el arreglo, y
 * se calcula al pintar. Lo que se persiste al encolar es `orden`.
 */

/**
 * Dónde ocurrió la actividad, en las palabras de la obra.
 *
 * **Texto libre y opcionales.** Lo que significan cambia con la obra y lo
 * deciden quienes la ejecutan: en una carretera la zona es un cadenamiento
 * ("85+500 al 89+900") y el frente una etapa ("Despalme"); en un aeropuerto la
 * zona es un edificio y el frente un sistema. Un catálogo obligaría a dar de
 * alta valores antes de poder capturar en cada obra nueva.
 *
 * Vacíos cuando no aplican, y entonces el documento no imprime nada: ni el
 * rótulo ni un renglón en blanco en su lugar.
 */
export interface DatosActividad {
  texto: string;
  zona: string;
  frente: string;
}

export interface ActividadBorrador extends DatosActividad {
  /** Identidad local estable, para reordenar y editar sin depender del índice. */
  id: string;
}

export interface FotoBorrador {
  id: string;
  localUri: string;
  filename: string;
  fileSize: number;
  /** Obligatorio para guardar; puede estar vacío mientras se captura la tanda. */
  pie: string;
  takenAt: Date;
}

export interface BorradorReporte {
  /**
   * Día LOCAL que el reporte documenta, `YYYY-MM-DD`.
   *
   * Se fija UNA vez, al abrir el wizard, y no se mueve. Deliberadamente NO usa
   * `useFechaOperativa`: ese hook existe para que el programado avance con el
   * reloj, y aquí el efecto sería el contrario al deseado — empezar la captura
   * a las 23:58 y guardarla a las 00:02 cambiaría la fecha del reporte debajo
   * del usuario, sobre un campo que la interfaz le presenta como de solo
   * lectura. El día que se documenta es aquel en que se empezó a documentar.
   */
  fechaReporte: string;
  proveedorIds: number[];
  contratistas: Proveedor[];
  /**
   * Supervisora(s) de la obra, tomadas del roster en P-00.
   *
   * No son seleccionables y NO viajan en el payload —el servidor las escribe
   * desde el mismo roster—, pero se guardan aquí para que la Revisión pueda
   * pintar el documento completo sin volver a la red: el wizard se llena
   * offline con frecuencia.
   */
  supervisores: Proveedor[];
  /**
   * Área seleccionada en P-00. `null` hasta que el usuario elige: no hay valor
   * por default a propósito — un default convertiría "no lo pensé" en "es
   * Topografía", sobre un dato que encabeza el documento.
   */
  area: AreaReporte | null;
  actividades: ActividadBorrador[];
  fotos: FotoBorrador[];
  conclusion: string;
  /**
   * La firma de quien cierra. `null` hasta que se firma, y firmar es
   * obligatorio: sin esto el botón de cerrar no se habilita.
   *
   * Se guarda la GEOMETRÍA, también cuando salió del perfil, para que el
   * reporte encolado se baste solo: puede sincronizarse días después, y para
   * entonces su autor pudo haber cambiado o borrado la firma de su perfil.
   */
  firma: FirmaPayload | null;
}

/**
 * Recorta los tres campos antes de guardarlos.
 *
 * Se hace AQUÍ y no en la pantalla porque el espacio sobrante decide cosas:
 * una zona que es " " se imprimiría como rótulo vacío, y dos frentes que solo
 * difieren en un espacio final aparecerían como dos chips distintos.
 */
const normalizar = (datos: DatosActividad): DatosActividad => ({
  texto: datos.texto.trim(),
  zona: datos.zona.trim(),
  frente: datos.frente.trim(),
});

const borradorVacio = (): BorradorReporte => ({
  fechaReporte: hoyLocal(),
  proveedorIds: [],
  contratistas: [],
  supervisores: [],
  area: null,
  actividades: [],
  fotos: [],
  conclusion: "",
  firma: null,
});

type Accion =
  | { tipo: "proveedores"; contratistas: Proveedor[]; supervisores: Proveedor[] }
  | { tipo: "area"; area: AreaReporte }
  | { tipo: "actividad/agregar"; datos: DatosActividad }
  | { tipo: "actividad/editar"; id: string; datos: DatosActividad }
  | { tipo: "actividad/eliminar"; id: string }
  | { tipo: "actividad/reordenar"; ids: string[] }
  | { tipo: "fotos/agregar"; fotos: Omit<FotoBorrador, "id">[] }
  | { tipo: "foto/pie"; id: string; pie: string }
  | { tipo: "foto/eliminar"; id: string }
  | { tipo: "fotos/reordenar"; ids: string[] }
  | { tipo: "conclusion"; texto: string }
  | { tipo: "firma"; firma: FirmaPayload | null }
  | { tipo: "reiniciar" };

const porIds = <T extends { id: string }>(items: T[], ids: string[]): T[] => {
  const mapa = new Map(items.map((item) => [item.id, item]));
  const ordenados = ids
    .map((id) => mapa.get(id))
    .filter((item): item is T => item !== undefined);
  // Cualquiera que el orden nuevo no mencione se conserva al final: perder un
  // elemento por un id mal pasado sería destruir trabajo del usuario.
  const vistos = new Set(ids);
  return [...ordenados, ...items.filter((item) => !vistos.has(item.id))];
};

function reducer(estado: BorradorReporte, accion: Accion): BorradorReporte {
  switch (accion.tipo) {
    case "proveedores":
      return {
        ...estado,
        contratistas: accion.contratistas,
        supervisores: accion.supervisores,
        // Una sola lista para el POST: el servidor clasifica por el `tipo` del
        // catálogo. Se conservan además separadas porque la miniatura las pinta
        // en renglones distintos del cajetín.
        proveedorIds: [...accion.contratistas, ...accion.supervisores].map(
          (p) => p.id,
        ),
      };

    case "area":
      return { ...estado, area: accion.area };

    case "actividad/agregar":
      return {
        ...estado,
        actividades: [
          ...estado.actividades,
          { id: uuid.v4(), ...normalizar(accion.datos) },
        ],
      };

    case "actividad/editar":
      return {
        ...estado,
        actividades: estado.actividades.map((a) =>
          a.id === accion.id ? { ...a, ...normalizar(accion.datos) } : a,
        ),
      };

    case "actividad/eliminar":
      return {
        ...estado,
        actividades: estado.actividades.filter((a) => a.id !== accion.id),
      };

    case "actividad/reordenar":
      return { ...estado, actividades: porIds(estado.actividades, accion.ids) };

    case "fotos/agregar":
      return {
        ...estado,
        fotos: [
          ...estado.fotos,
          ...accion.fotos.map((foto) => ({ ...foto, id: uuid.v4() })),
        ],
      };

    case "foto/pie":
      return {
        ...estado,
        fotos: estado.fotos.map((f) =>
          f.id === accion.id ? { ...f, pie: accion.pie } : f,
        ),
      };

    case "foto/eliminar":
      return {
        ...estado,
        fotos: estado.fotos.filter((f) => f.id !== accion.id),
      };

    case "fotos/reordenar":
      return { ...estado, fotos: porIds(estado.fotos, accion.ids) };

    case "conclusion":
      return { ...estado, conclusion: accion.texto };

    case "firma":
      return { ...estado, firma: accion.firma };

    case "reiniciar":
      return borradorVacio();

    default:
      return estado;
  }
}

interface ContextoBorrador {
  borrador: BorradorReporte;
  setProveedores: (contratistas: Proveedor[], supervisores: Proveedor[]) => void;
  setArea: (area: AreaReporte) => void;
  agregarActividad: (datos: DatosActividad) => void;
  editarActividad: (id: string, datos: DatosActividad) => void;
  eliminarActividad: (id: string) => void;
  reordenarActividades: (ids: string[]) => void;
  agregarFotos: (fotos: Omit<FotoBorrador, "id">[]) => void;
  setPieDeFoto: (id: string, pie: string) => void;
  eliminarFoto: (id: string) => void;
  reordenarFotos: (ids: string[]) => void;
  setConclusion: (texto: string) => void;
  /** `null` la borra, para volver a firmar. */
  setFirma: (firma: FirmaPayload | null) => void;
  reiniciar: () => void;
  /** Hay algo capturado. Ya no es "lo que se perdería": nada se pierde. */
  tieneContenido: boolean;
  /**
   * Este borrador ya existía al abrirse: se está **retomando**, no empezando.
   *
   * Se fija al montar y no cambia después. Un borrador nuevo deja de estar
   * vacío en cuanto se marca al primer contratista, así que mirar el contenido
   * para responder esto diría "retomado" a los dos segundos de haber empezado.
   */
  retomado: boolean;
  /**
   * Deja de guardar.
   *
   * Lo llama el wizard al encolar el reporte: desde ese instante el contenido
   * es de la cola y volver a escribirlo aquí resucitaría un borrador que el
   * usuario ya cerró.
   */
  cerrarBorrador: () => void;
}

const Contexto = createContext<ContextoBorrador | null>(null);

/**
 * Cuánto se espera antes de escribir a Realm.
 *
 * Las observaciones despachan en cada tecla, así que sin rebote esto sería una
 * escritura por letra —y cada una notifica a quien observe la tabla—. Lo que
 * caiga dentro de la ventana al salir no se pierde: el desmontaje lo escribe.
 */
const REBOTE_MS = 600;

export function BorradorReporteProvider({
  borradorId,
  constructionId,
  constructionName,
  children,
}: {
  /** Borrador que se abre. Nuevo o retomado: aquí no se distingue. */
  borradorId: string;
  constructionId: number;
  constructionName: string;
  children: React.ReactNode;
}) {
  // `useBorradorStore` y no `useBorradoresDeReporte`: este proveedor ESCRIBE
  // la tabla en cada cambio, y suscribirse a ella lo re-renderizaría entero
  // —con su lista de fotos— por cada guardado que él mismo provoca.
  const { leerBorrador, guardarBorrador } = useBorradorStore();

  /**
   * Se hidrata UNA vez, en el inicializador perezoso.
   *
   * Un borrador retomado conserva su `fechaReporte` original aunque se abra al
   * día siguiente: el día que el reporte documenta es aquel en que se empezó a
   * documentar, y moverlo al retomar reescribiría el encabezado del documento
   * a espaldas del usuario.
   */
  const [inicial] = useState(() => leerBorrador(borradorId));

  const [borrador, despachar] = useReducer(
    reducer,
    undefined,
    () => inicial ?? borradorVacio(),
  );

  /**
   * Se lee una sola vez y de la misma lectura que hidrató el estado: preguntar
   * de nuevo a Realm volvería a parsear todo el borrador para quedarse con un
   * booleano.
   */
  const retomado = inicial !== null;

  const hidratadoRef = useRef(false);
  const pendienteRef = useRef<(() => void) | null>(null);
  const cerradoRef = useRef(false);

  const cerrarBorrador = useCallback(() => {
    cerradoRef.current = true;
    pendienteRef.current = null;
  }, []);

  useEffect(() => {
    // El primer pase es el estado que acabamos de LEER: reescribirlo solo
    // serviría para crear una fila vacía por cada vez que alguien abre el
    // wizard y se arrepiente antes de tocar nada.
    if (!hidratadoRef.current) {
      hidratadoRef.current = true;
      return;
    }
    if (cerradoRef.current) return;

    const escribir = () =>
      guardarBorrador(
        borradorId,
        { constructionId, constructionName },
        borrador,
      );
    pendienteRef.current = escribir;

    const id = setTimeout(() => {
      escribir();
      pendienteRef.current = null;
    }, REBOTE_MS);
    return () => clearTimeout(id);
  }, [
    borrador,
    borradorId,
    constructionId,
    constructionName,
    guardarBorrador,
  ]);

  /**
   * Al desmontar se escribe lo que quedó a medio rebote.
   *
   * **Es el caso que esta tabla existe para cubrir.** Tocar la tab de Reportes
   * desmonta la ruta modal sin pasar por ningún botón del wizard; sin esto, la
   * última media docena de cambios se iría con ella.
   */
  useEffect(
    () => () => {
      if (!cerradoRef.current) pendienteRef.current?.();
      pendienteRef.current = null;
    },
    [],
  );

  const setProveedores = useCallback(
    (contratistas: Proveedor[], supervisores: Proveedor[]) =>
      despachar({ tipo: "proveedores", contratistas, supervisores }),
    [],
  );
  const setArea = useCallback(
    (area: AreaReporte) => despachar({ tipo: "area", area }),
    [],
  );
  const agregarActividad = useCallback(
    (datos: DatosActividad) => despachar({ tipo: "actividad/agregar", datos }),
    [],
  );
  const editarActividad = useCallback(
    (id: string, datos: DatosActividad) =>
      despachar({ tipo: "actividad/editar", id, datos }),
    [],
  );
  const eliminarActividad = useCallback(
    (id: string) => despachar({ tipo: "actividad/eliminar", id }),
    [],
  );
  const reordenarActividades = useCallback(
    (ids: string[]) => despachar({ tipo: "actividad/reordenar", ids }),
    [],
  );
  const agregarFotos = useCallback(
    (fotos: Omit<FotoBorrador, "id">[]) => despachar({ tipo: "fotos/agregar", fotos }),
    [],
  );
  const setPieDeFoto = useCallback(
    (id: string, pie: string) => despachar({ tipo: "foto/pie", id, pie }),
    [],
  );
  const eliminarFoto = useCallback(
    (id: string) => despachar({ tipo: "foto/eliminar", id }),
    [],
  );
  const reordenarFotos = useCallback(
    (ids: string[]) => despachar({ tipo: "fotos/reordenar", ids }),
    [],
  );
  const setConclusion = useCallback(
    (texto: string) => despachar({ tipo: "conclusion", texto }),
    [],
  );
  const setFirma = useCallback(
    (firma: FirmaPayload | null) => despachar({ tipo: "firma", firma }),
    [],
  );
  const reiniciar = useCallback(() => despachar({ tipo: "reiniciar" }), []);

  const tieneContenido =
    borrador.actividades.length > 0 ||
    borrador.fotos.length > 0 ||
    borrador.conclusion.trim().length > 0;

  const valor = useMemo(
    () => ({
      borrador,
      setProveedores,
      setArea,
      agregarActividad,
      editarActividad,
      eliminarActividad,
      reordenarActividades,
      agregarFotos,
      setPieDeFoto,
      eliminarFoto,
      reordenarFotos,
      setConclusion,
      setFirma,
      reiniciar,
      tieneContenido,
      retomado,
      cerrarBorrador,
    }),
    [
      borrador,
      setProveedores,
      setArea,
      agregarActividad,
      editarActividad,
      eliminarActividad,
      reordenarActividades,
      agregarFotos,
      setPieDeFoto,
      eliminarFoto,
      reordenarFotos,
      setConclusion,
      setFirma,
      reiniciar,
      tieneContenido,
      retomado,
      cerrarBorrador,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBorradorReporte(): ContextoBorrador {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error(
      "useBorradorReporte debe usarse dentro de BorradorReporteProvider",
    );
  }
  return contexto;
}
