import { useCallback, useMemo } from "react";
import * as FileSystem from "expo-file-system";
import { useQuery, useRealm } from "@realm/react";
import { uuid } from "expo-modules-core";

import { BorradorReporte as BorradorRealm } from "src/realm/borradorReporte/BorradorReporte";
import type { FirmaPayload, Proveedor } from "src/types/reporte";
import type { AreaReporte } from "src/modules/reportes/constantes";
import type {
  ActividadBorrador,
  BorradorReporte,
  FotoBorrador,
} from "src/modules/reportes/state/BorradorReporteContext";

/**
 * El borrador del reporte, guardado en el teléfono (ADR-006 F43).
 *
 * Cierra la deuda #1 del ADR-006. Lo que la cerró no fue el argumento técnico
 * —que ya estaba escrito— sino el campo: los supervisores **no usan el wizard
 * como wizard**. Capturan a lo largo de toda la jornada, entrando y saliendo,
 * y una salida accidental costaba el día entero.
 *
 * **Son dos hooks y la diferencia importa.** {@link useBorradorStore} solo
 * escribe y lee por id; {@link useBorradoresDeReporte} además se SUSCRIBE a la
 * tabla. Quien captura usa el primero: suscribir el wizard a la tabla que él
 * mismo está escribiendo lo haría re-renderizarse entero —fotos incluidas— en
 * cada guardado.
 */

/** Cuánto vive un borrador sin que nadie lo toque. */
export const VIGENCIA_HORAS = 36;
const VIGENCIA_MS = VIGENCIA_HORAS * 60 * 60 * 1000;

const parse = <T,>(json: string, respaldo: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return respaldo;
  }
};

/** Lo que la lista y el modal necesitan saber de un borrador sin abrirlo. */
export interface ResumenBorrador {
  id: string;
  constructionId: number;
  constructionName: string;
  fechaReporte: string;
  actividadesCount: number;
  fotosCount: number;
  tieneConclusion: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vencido = (fila: BorradorRealm, ahora: number): boolean =>
  ahora - fila.updatedAt.getTime() > VIGENCIA_MS;

const resumir = (fila: BorradorRealm): ResumenBorrador => ({
  id: fila._id,
  constructionId: fila.constructionId,
  constructionName: fila.constructionName,
  fechaReporte: fila.fechaReporte,
  actividadesCount: parse<ActividadBorrador[]>(fila.actividadesJson, []).length,
  fotosCount: parse<FotoBorrador[]>(fila.fotosJson, []).length,
  tieneConclusion: fila.conclusion.trim().length > 0,
  createdAt: fila.createdAt,
  updatedAt: fila.updatedAt,
});

/**
 * La actividad **tal como pudo quedar guardada**, que no es la de hoy.
 *
 * Un borrador vive hasta 36 h y puede haberse escrito con la versión anterior
 * de la app. Declarar aquí la forma vieja es lo que obliga a `aEstado` a
 * completarla, en vez de confiar en que el JSON traiga lo que el tipo promete.
 */
type ActividadGuardada = Omit<ActividadBorrador, "zona" | "frente"> &
  Partial<Pick<ActividadBorrador, "zona" | "frente">>;

/**
 * De la fila de Realm al estado que mueve el wizard.
 *
 * `takenAt` vuelve a ser `Date`: JSON lo guardó como cadena y el resto del
 * módulo —la cola, el payload— lo trata como fecha. Rehidratarlo aquí y no en
 * cada consumidor es lo que evita que una cadena se cuele hasta el
 * `toISOString()` del envío.
 */
const aEstado = (fila: BorradorRealm): BorradorReporte => ({
  fechaReporte: fila.fechaReporte,
  proveedorIds: parse<number[]>(fila.proveedorIdsJson, []),
  contratistas: parse<Proveedor[]>(fila.contratistasJson, []),
  supervisores: parse<Proveedor[]>(fila.supervisionJson, []),
  area: fila.area ? (fila.area as AreaReporte) : null,
  // Zona y frente llegaron en F52: un borrador abierto ANTES no los trae, y
  // un `undefined` donde el tipo promete `string` revienta en el primer
  // `.trim()` —el de las sugerencias de la pantalla de captura—. Se completan
  // AQUÍ, el único sitio donde lo guardado vuelve a ser estado, por lo mismo
  // que `takenAt`: para que ningún consumidor tenga que acordarse.
  actividades: parse<ActividadGuardada[]>(fila.actividadesJson, []).map(
    (a) => ({ ...a, zona: a.zona ?? "", frente: a.frente ?? "" }),
  ),
  fotos: parse<(Omit<FotoBorrador, "takenAt"> & { takenAt: string })[]>(
    fila.fotosJson,
    [],
  ).map((foto) => ({ ...foto, takenAt: new Date(foto.takenAt) })),
  conclusion: fila.conclusion,
  firma: fila.firmaJson ? parse<FirmaPayload | null>(fila.firmaJson, null) : null,
});

/**
 * Leer y escribir borradores **sin suscribirse a la tabla**.
 *
 * Es el que usa el wizard. `useQuery` lo re-renderizaría en cada guardado
 * —suyo y ajeno—, y el wizard guarda en cada cambio: sería un render completo
 * por cada pausa al teclear, arrastrando la lista de fotos consigo.
 */
export function useBorradorStore() {
  const realm = useRealm();

  /**
   * El estado completo de un borrador, para arrancar el wizard.
   *
   * Devuelve `null` si no existe o ya venció, y entonces el wizard arranca en
   * blanco: abrir un borrador caduco a medio llenar sería peor que no abrirlo.
   */
  const leerBorrador = useCallback(
    (id: string | undefined): BorradorReporte | null => {
      if (!id) return null;
      const fila = realm.objectForPrimaryKey(BorradorRealm, id);
      if (!fila || vencido(fila, Date.now())) return null;
      return aEstado(fila);
    },
    [realm],
  );

  /**
   * Escribe el borrador completo. Crea la fila la primera vez.
   *
   * `createdAt` solo se fija al nacer: es lo que distingue "cuándo empezó esta
   * captura" de "cuándo se tocó por última vez", y la caducidad cuelga de la
   * segunda.
   */
  const guardarBorrador = useCallback(
    (
      id: string,
      contexto: { constructionId: number; constructionName: string },
      borrador: BorradorReporte,
    ) => {
      const ahora = new Date();
      realm.write(() => {
        const fila = realm.objectForPrimaryKey(BorradorRealm, id);
        if (fila) {
          fila.fechaReporte = borrador.fechaReporte;
          fila.area = borrador.area ?? "";
          fila.conclusion = borrador.conclusion;
          fila.actividadesJson = JSON.stringify(borrador.actividades);
          fila.fotosJson = JSON.stringify(borrador.fotos);
          fila.proveedorIdsJson = JSON.stringify(borrador.proveedorIds);
          fila.contratistasJson = JSON.stringify(borrador.contratistas);
          fila.supervisionJson = JSON.stringify(borrador.supervisores);
          fila.firmaJson = borrador.firma
            ? JSON.stringify(borrador.firma)
            : null;
          fila.updatedAt = ahora;
          return;
        }
        realm.create(BorradorRealm, {
          _id: id,
          constructionId: contexto.constructionId,
          constructionName: contexto.constructionName,
          fechaReporte: borrador.fechaReporte,
          area: borrador.area ?? "",
          conclusion: borrador.conclusion,
          actividadesJson: JSON.stringify(borrador.actividades),
          fotosJson: JSON.stringify(borrador.fotos),
          proveedorIdsJson: JSON.stringify(borrador.proveedorIds),
          contratistasJson: JSON.stringify(borrador.contratistas),
          supervisionJson: JSON.stringify(borrador.supervisores),
          firmaJson: borrador.firma ? JSON.stringify(borrador.firma) : null,
          createdAt: ahora,
          updatedAt: ahora,
        });
      });
    },
    [realm],
  );

  /**
   * Borra un borrador.
   *
   * **`borrarArchivos` NO es un detalle de limpieza: decide si se destruyen
   * fotos.** Cuando el borrador se cierra y pasa a la cola, los archivos
   * siguen siendo del reporte encolado —la cola guarda los mismos `localUri`—
   * y borrarlos dejaría al reporte sin nada que subir. Solo se borran cuando
   * el borrador se descarta de verdad: al elegir "Nuevo" o al caducar.
   */
  const descartarBorrador = useCallback(
    async (id: string, opciones: { borrarArchivos: boolean }) => {
      const fila = realm.objectForPrimaryKey(BorradorRealm, id);
      if (!fila) return;

      const archivos = opciones.borrarArchivos
        ? parse<FotoBorrador[]>(fila.fotosJson, []).map((f) => f.localUri)
        : [];

      realm.write(() => {
        realm.delete(fila);
      });

      for (const uri of archivos) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          // Un archivo que no se pudo borrar es espacio ocupado, no un fallo:
          // la fila ya no existe y nada lo va a volver a leer.
          console.warn("[Borrador] No se pudo borrar la foto local:", error);
        }
      }
    },
    [realm],
  );

  /**
   * Tira los borradores que nadie tocó en {@link VIGENCIA_HORAS} horas, con
   * sus fotos. Devuelve cuántos.
   *
   * Las 36 h salen de la jornada real: cubren un día que cruza la medianoche y
   * la mañana siguiente, que es cuando alguien podría retomar lo de ayer. Más
   * allá de eso, un borrador abierto ya no es trabajo en curso — es basura que
   * va a estorbar en el modal de "tienes un reporte en curso".
   *
   * **Aquí vive la vigencia, y es el único lugar donde se mide.** Evaluarla al
   * pintar sería leer el reloj durante el render, que da resultados distintos
   * en renders que deberían ser iguales. Como la lista observa la tabla, basta
   * con borrar: las filas desaparecen solas de la pantalla.
   */
  const purgarVencidos = useCallback(async (): Promise<number> => {
    const ahora = Date.now();
    const caducos = [...realm.objects(BorradorRealm)].filter((fila) =>
      vencido(fila, ahora),
    );
    if (caducos.length === 0) return 0;

    const total = caducos.length;
    const archivos = caducos.flatMap((fila) =>
      parse<FotoBorrador[]>(fila.fotosJson, []).map((f) => f.localUri),
    );

    realm.write(() => {
      realm.delete(caducos);
    });

    for (const uri of archivos) {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (error) {
        console.warn("[Borrador] No se pudo borrar la foto local:", error);
      }
    }
    return total;
  }, [realm]);

  /**
   * Dónde estaba el usuario la última vez. `null` si el borrador es nuevo o
   * si nunca pasó del encuadre.
   */
  const leerUltimaSeccion = useCallback(
    (id: string | undefined): string | null => {
      if (!id) return null;
      const fila = realm.objectForPrimaryKey(BorradorRealm, id);
      if (!fila || vencido(fila, Date.now())) return null;
      return fila.ultimaSeccion || null;
    },
    [realm],
  );

  /**
   * Apunta en qué sección quedó.
   *
   * **No toca `updatedAt` a propósito.** La caducidad de 36 h se mide desde la
   * última EDICIÓN, y moverse entre secciones no es editar: si contara, dejar
   * el wizard abierto y pasear por la cinta mantendría vivo para siempre un
   * borrador que nadie está llenando.
   *
   * Si la fila todavía no existe no hace nada: el borrador nuevo aún no se ha
   * guardado, y uno nuevo abre por el encuadre de cualquier forma.
   */
  const marcarSeccion = useCallback(
    (id: string, seccion: string) => {
      const fila = realm.objectForPrimaryKey(BorradorRealm, id);
      if (!fila || fila.ultimaSeccion === seccion) return;
      realm.write(() => {
        fila.ultimaSeccion = seccion;
      });
    },
    [realm],
  );

  /** Id para un borrador nuevo. Se acuña antes de abrir el wizard. */
  const nuevoBorradorId = useCallback(() => uuid.v4(), []);

  return {
    leerBorrador,
    guardarBorrador,
    descartarBorrador,
    purgarVencidos,
    leerUltimaSeccion,
    marcarSeccion,
    nuevoBorradorId,
  };
}

/**
 * Lo anterior **más la consulta viva** de la tabla, para pintar.
 *
 * Lo usa la zona de Reportes, que necesita saber si hay un borrador para
 * ofrecer retomarlo y para que la fila aparezca y desaparezca sola.
 */
export function useBorradoresDeReporte() {
  const store = useBorradorStore();
  const todos = useQuery(BorradorRealm);

  /** Los borradores guardados, del más reciente al más viejo. */
  const borradores = useMemo(
    () =>
      [...todos]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map(resumir),
    [todos],
  );

  const borradorDeLaObra = useCallback(
    (constructionId: number | null): ResumenBorrador | null =>
      constructionId === null
        ? null
        : (borradores.find((b) => b.constructionId === constructionId) ?? null),
    [borradores],
  );

  return { ...store, borradores, borradorDeLaObra };
}
