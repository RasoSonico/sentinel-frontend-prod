import type { AvanceBaseCatalog } from "src/realm/avanceBase/Catalog";

/**
 * Índice plano de conceptos de la obra, para la búsqueda de la hoja de jornada
 * (ADR-007 D5).
 *
 * ## Por qué un índice propio y no el árbol de la sábana
 *
 * `buildSabanaTree` calcula programa, porcentajes, volúmenes acumulados y
 * colores por fila. La búsqueda no necesita nada de eso: necesita texto, clave
 * WBS y ruta. Construir el árbol completo **de cada catálogo** en cada
 * pulsación sería pagar un cálculo caro por un resultado que no lo usa.
 *
 * ## Por qué cruza todos los catálogos
 *
 * La hoja ya no pregunta el catálogo: se deduce del concepto elegido. Eso
 * elimina un paso al usuario pero obliga a buscar en toda la obra, no en uno.
 *
 * Todo sale del caché local (`AvanceBaseResponse`), así que **funciona sin
 * señal** — que es el único modo que importa: la jornada se captura en obra.
 */

export interface ConceptoBuscable {
  id: number;
  descripcion: string;
  wbs: string | null;
  /** "Plataforma › Terracerías". Lo que distingue dos conceptos homónimos. */
  ruta: string;
}

export interface ResultadoBusqueda {
  /** Como mucho `TOPE_VISIBLE`. */
  visibles: ConceptoBuscable[];
  /** Cuántos coinciden en total, para el "y N más". */
  total: number;
}

/** Desde la segunda letra: con una, media obra coincide y no acota nada. */
export const MINIMO_LETRAS = 2;

/** Más de cinco renglones en un sheet obligan a desplazar para seguir leyendo. */
export const TOPE_VISIBLE = 5;

/**
 * Arma el índice una vez, al abrir la hoja.
 *
 * La ruta se resuelve aquí y no al pintar: son las mismas secciones para
 * muchos conceptos, y recalcular la cadena de ancestros en cada tecla sería
 * repetir el mismo recorrido cientos de veces.
 */
export function construirIndice(
  catalogos: ArrayLike<AvanceBaseCatalog>,
): ConceptoBuscable[] {
  const indice: ConceptoBuscable[] = [];

  for (const catalogo of Array.from(catalogos)) {
    for (const partida of Array.from(catalogo.work_items)) {
      // Las secciones vienen planas, con `parent_id`: se indexan para poder
      // subir la cadena sin recorrer la lista una vez por concepto.
      const porId = new Map<number, { name: string; parent_id: number | null }>();
      for (const seccion of Array.from(partida.sections)) {
        porId.set(seccion.id, {
          name: seccion.name,
          parent_id: seccion.parent_id ?? null,
        });
      }

      const rutaDeSeccion = (seccionId: number | null): string[] => {
        const nombres: string[] = [];
        let actual = seccionId;
        // Tope de profundidad: un `parent_id` que apunte en círculo colgaría
        // la app en el teclado. Diez niveles es más de lo que cualquier
        // catálogo real usa.
        for (let i = 0; actual != null && i < 10; i += 1) {
          const seccion = porId.get(actual);
          if (!seccion) break;
          nombres.unshift(seccion.name);
          actual = seccion.parent_id;
        }
        return nombres;
      };

      for (const concepto of Array.from(partida.concepts)) {
        indice.push({
          id: concepto.id,
          descripcion: concepto.description,
          wbs: concepto.wbs_code ?? null,
          ruta: [partida.name, ...rutaDeSeccion(concepto.section_id ?? null)]
            .filter(Boolean)
            .join(" › "),
        });
      }
    }
  }

  return indice;
}

/**
 * Busca por descripción o por clave WBS.
 *
 * Por WBS además del texto porque quien conoce la obra teclea "1.2.03" y llega
 * en cuatro pulsaciones; obligarlo a describir el concepto sería más lento
 * justo para el que más la usa.
 */
export function buscar(
  indice: ConceptoBuscable[],
  consulta: string,
): ResultadoBusqueda {
  const q = consulta.trim().toLowerCase();
  if (q.length < MINIMO_LETRAS) return { visibles: [], total: 0 };

  const coinciden = indice.filter(
    (c) =>
      c.descripcion.toLowerCase().includes(q) ||
      (c.wbs?.toLowerCase().includes(q) ?? false),
  );

  return { visibles: coinciden.slice(0, TOPE_VISIBLE), total: coinciden.length };
}

/**
 * Parte un texto en los tres trozos que necesita el resaltado: antes, lo que
 * coincide, y después.
 *
 * Devuelve el texto entero como "antes" cuando no hay coincidencia, para que
 * el componente pinte siempre igual y no tenga que ramificar.
 */
export function partirPorCoincidencia(
  texto: string,
  consulta: string,
): [string, string, string] {
  const q = consulta.trim().toLowerCase();
  if (!q) return [texto, "", ""];
  const i = texto.toLowerCase().indexOf(q);
  if (i < 0) return [texto, "", ""];
  return [texto.slice(0, i), texto.slice(i, i + q.length), texto.slice(i + q.length)];
}
