import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { uuid } from "expo-modules-core";

import { hoyLocal } from "src/hooks/data/query/useAvance/utils/programaCalculos";
import type { FirmaPayload, Proveedor } from "src/types/reporte";

import type { AreaReporte } from "../constantes";

/**
 * Borrador del reporte mientras se captura (ADR-006, Decisiones 1–6).
 *
 * **Vive en memoria, no en Realm.** La cola es para lo que ya se declaró
 * terminado y va camino al servidor; un borrador a medias no es eso. Meterlo a
 * Realm obligaría a decidir cuándo se limpia un borrador abandonado, y a
 * distinguir en la cola entre "esto se está escribiendo" y "esto espera red" —
 * dos ciclos de vida distintos en la misma tabla. El ✕ del wizard confirma y
 * descarta; ese es todo el ciclo de vida.
 *
 * El precio es que matar la app a media captura pierde el borrador. Es
 * aceptable: el wizard es una sesión corta y el usuario no ha declarado nada
 * todavía. Persistirlo es aditivo si el campo lo pide.
 *
 * **El numeral de la actividad no vive aquí**: es la posición en el arreglo, y
 * se calcula al pintar. Lo que se persiste al encolar es `orden`.
 */

export interface ActividadBorrador {
  /** Identidad local estable, para reordenar y editar sin depender del índice. */
  id: string;
  texto: string;
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
  | { tipo: "actividad/agregar"; texto: string }
  | { tipo: "actividad/editar"; id: string; texto: string }
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
          { id: uuid.v4(), texto: accion.texto.trim() },
        ],
      };

    case "actividad/editar":
      return {
        ...estado,
        actividades: estado.actividades.map((a) =>
          a.id === accion.id ? { ...a, texto: accion.texto.trim() } : a,
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
  agregarActividad: (texto: string) => void;
  editarActividad: (id: string, texto: string) => void;
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
  /** Hay trabajo que se perdería al salir: lo que confirma el ✕. */
  tieneTrabajoSinGuardar: boolean;
}

const Contexto = createContext<ContextoBorrador | null>(null);

export function BorradorReporteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [borrador, despachar] = useReducer(reducer, undefined, borradorVacio);

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
    (texto: string) => despachar({ tipo: "actividad/agregar", texto }),
    [],
  );
  const editarActividad = useCallback(
    (id: string, texto: string) => despachar({ tipo: "actividad/editar", id, texto }),
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

  const tieneTrabajoSinGuardar =
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
      tieneTrabajoSinGuardar,
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
      tieneTrabajoSinGuardar,
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
