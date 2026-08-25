import { AvanceBaseWorkItem, ProgramaApi } from "src/types/entities";
import {
  EstadoPrograma,
  FilaPrograma,
  estadoPrograma,
  hoyLocal,
  programaNoIniciado,
  programaVencido,
  ProgramaVencido,
  programadoAFecha,
  proximoCorte,
} from "./programaCalculos";

// ─── Domain types ────────────────────────────────────────────────────────────

/** Una de las últimas cargas del concepto (trazabilidad de la ficha L-02). */
export interface UltimaCargaNode {
  fecha: string;
  volumen: number;
  tiene_foto: boolean;
}

/**
 * Datos de programa adjuntos a un nodo. TODO opcional: la ausencia de programa
 * se representa como ausencia (D11), nunca como cero — un 0% en un indicador de
 * programa se lee como atraso total, que es información falsa.
 */
export interface DatosPrograma {
  /** La fila completa, para que la ficha derive corte y rendimiento sin buscar. */
  fila: FilaPrograma;
  /**
   * Volumen programado a hoy, interpolado tramo por tramo (E2). SIEMPRE en la
   * unidad del objetivo, tal como viene de la serie.
   */
  programado: number;
  /**
   * El mismo programado, valorizado en dinero.
   *
   * Presente SOLO a nivel partida, y por una razón concreta: una partida agrupa
   * conceptos de unidades distintas —m³ con PZA y LOTE— así que su volumen no
   * es comparable contra nada. Se valoriza por la fracción de su propio avance
   * aplicada a su importe contratado.
   *
   * A nivel concepto no se guarda: el importe es trivialmente
   * `programado × price` y duplicarlo invitaría a que los dos valores se
   * desincronicen.
   */
  programadoImporte?: number;
  estado: EstadoPrograma;
  /**
   * El programa aún no exige nada de este objetivo, pero lo hará.
   *
   * ORTOGONAL a `estado`, no una variante suya: un concepto que arranca la
   * semana entrante y que ya tiene volumen capturado está a la vez sin iniciar
   * y adelantado, y la fila debe poder anunciar las dos cosas.
   */
  noIniciado: boolean;
  /**
   * El programa ya cerró y quedó volumen sin ejecutar. Se precomputa aquí —y no
   * en la fila— porque los componentes de fila son presentacionales y no
   * conocen la fecha operativa (patrón 7 de la guía del ADR-004).
   *
   * A nivel partida viene valorizado, igual que `programadoImporte`.
   */
  vencido?: ProgramaVencido;
  /** Fecha contractual exacta de arranque, para el chip "Inicia {fecha}". */
  fechaInicio: string;
}

export interface SabanaConceptNode {
  id: number;
  description: string;
  wbs_code: string | null;
  unit: string;
  quantity: number;
  price: number;
  cumulative_volume: number;
  quantity_left: number;
  clasification: string;
  section_id: number | null;
  // Partida ancestro, propagada al construir el árbol. La captura rápida la
  // necesita: submitToQueue exige un AdvanceFormContext completo con
  // workItemId/workItemName, y desde una fila de la sábana no hay forma de
  // remontar al workitem (section_id solo apunta a la sección).
  // Prerrequisito bloqueante del ADR-004 (D13.1).
  work_item_id: number;
  work_item_name: string;
  // Nombre de la sección contenedora, para la cejilla de contexto de la ficha
  // ({catálogo} · {partida} › {sección} · {wbs}). null cuando el concepto
  // cuelga directo de la partida.
  section_name: string | null;
  pct: number;
  /** Últimas cargas del concepto, listas para la ficha sin llamada de red. */
  ultimas_cargas: UltimaCargaNode[];
  /**
   * Solo cuando el programa está a NIVEL CONCEPTO. Si el programa del catálogo
   * viene por partida, esto queda `undefined` y el indicador vive en la fila de
   * la partida: la app no prorratea hacia abajo (D4).
   */
  programa?: DatosPrograma;
}

export interface SabanaSectionNode {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
  work_item_id: number;
  directConcepts: SabanaConceptNode[];
  children: SabanaSectionNode[];
  pct: number;
}

export interface SabanaWorkItemNode {
  id: number;
  name: string;
  directConcepts: SabanaConceptNode[];
  sections: SabanaSectionNode[];
  pct: number;
  /**
   * Solo cuando el programa está a NIVEL PARTIDA (contratos a precio alzado).
   * El estado se calcula VALORIZADO —fracción del avance propio de la partida
   * contra su importe contratado— porque una partida agrupa conceptos de
   * unidades distintas y sumar volúmenes de m³ con PZA no significa nada.
   * Es la misma fórmula que usa el agregado de obra en el backend.
   */
  programa?: DatosPrograma;
}

export interface SabanaGlobalStats {
  global_pct: number;
  total_contracted: number;
  total_executed: number;
  /**
   * Programado a hoy, valorizado, del catálogo. `null` cuando NINGÚN objetivo
   * del catálogo tiene programa — D11: sin dato no se renderiza, y un 0 aquí
   * se leería como atraso total.
   */
  total_programmed: number | null;
  /** Porcentaje programado contra el contratado completo, sin techo. */
  programmed_pct: number | null;
}

// ─── Flat tree types (for virtualized FlatList) ───────────────────────────────

export type FlatTreeItemWorkItem = {
  type: "workitem";
  nodeKey: string;
  id: number;
  name: string;
  pct: number;
  depth: 0;
  isExpanded: boolean;
};

export type FlatTreeItemSection = {
  type: "section";
  nodeKey: string;
  id: number;
  name: string;
  level: number;
  pct: number;
  depth: 1 | 2;
  isExpanded: boolean;
};

export type FlatTreeItemConcept = {
  type: "concept";
  nodeKey: string;
  concept: SabanaConceptNode;
  depth: 0 | 1 | 2;
};

export type FlatTreeItem =
  | FlatTreeItemWorkItem
  | FlatTreeItemSection
  | FlatTreeItemConcept;

// ─── Search types ─────────────────────────────────────────────────────────────

export interface SearchResultAncestor {
  name: string;
  level: number;
}

export interface SearchResultItem {
  concept: SabanaConceptNode;
  ancestors: SearchResultAncestor[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// Los porcentajes NO se recortan a 100: la sobre-ejecución se refleja tal
// cual (decisión de producto, ADR-003 Fase 1). Piso en 0: nunca negativos.
// El recorte visual de las barras es responsabilidad de cada componente.
function conceptPct(concept: SabanaConceptNode): number {
  if (concept.quantity === 0) return 0;
  return Math.max(0, (concept.cumulative_volume / concept.quantity) * 100);
}

// Value-weighted rollup: Σ(cumulative_volume × price) / Σ(quantity × price) × 100
// Industry standard for construction — avoids equal weighting of large vs small items.
function rollupPct(concepts: SabanaConceptNode[]): number {
  let totalExecuted = 0;
  let totalContracted = 0;
  for (const c of concepts) {
    totalExecuted += c.cumulative_volume * c.price;
    totalContracted += c.quantity * c.price;
  }
  if (totalContracted === 0) return 0;
  return Math.max(0, (totalExecuted / totalContracted) * 100);
}

function collectLeafConcepts(section: SabanaSectionNode): SabanaConceptNode[] {
  const direct = section.directConcepts;
  const fromChildren = section.children.flatMap(collectLeafConcepts);
  return [...direct, ...fromChildren];
}

// ─── Core builders ────────────────────────────────────────────────────────────

/**
 * Índice de las filas de programa por objetivo, para resolver en O(1) al
 * construir. Se arma una vez por catálogo, no por concepto.
 */
function indexarPrograma(programa?: ProgramaApi | null) {
  const porConcepto = new Map<number, FilaPrograma>();
  const porPartida = new Map<number, FilaPrograma>();
  if (!programa) return { porConcepto, porPartida };

  for (const fila of Array.from(programa.conceptos ?? [])) {
    const parsed: FilaPrograma = {
      fecha_inicio: fila.fecha_inicio,
      fecha_fin: fila.fecha_fin,
      volumen_total: parseNum(fila.volumen_total),
      cortes: Array.from(fila.cortes ?? []).map((c) => ({
        fecha_corte: c.fecha_corte,
        volumen_acumulado: parseNum(c.volumen_acumulado),
      })),
    };
    if (fila.concept_id != null) porConcepto.set(fila.concept_id, parsed);
    else if (fila.work_item_id != null) porPartida.set(fila.work_item_id, parsed);
  }
  return { porConcepto, porPartida };
}

/** Calcula programado y estado para un objetivo, o `undefined` si no hay fila. */
function datosDePrograma(
  fila: FilaPrograma | undefined,
  ejecutado: number,
  hoy: string,
): DatosPrograma | undefined {
  if (!fila) return undefined;
  const programado = programadoAFecha(fila, hoy);
  const siguiente = proximoCorte(fila, hoy);
  // "Hay corte futuro con volumen por encima de lo ya programado": es lo que
  // distingue un programa que aún no arranca de uno que ya no pide nada.
  const hayVolumenFuturo =
    !!siguiente && siguiente.volumen_acumulado > programado;
  return {
    fila,
    programado,
    estado: estadoPrograma(programado, ejecutado),
    noIniciado: programaNoIniciado(programado, hayVolumenFuturo),
    vencido: programaVencido(fila, ejecutado, hoy) ?? undefined,
    fechaInicio: fila.fecha_inicio,
  };
}

export interface OpcionesArbol {
  /** Bloque `programa` del catálogo; `null`/ausente = sin programa vigente. */
  programa?: ProgramaApi | null;
  /** Fecha operativa `YYYY-MM-DD`. Se inyecta para que el árbol se recalcule
   *  al cambiar el día (ver `useFechaOperativa`) y para poder probarlo. */
  hoy?: string;
  /**
   * Volumen capturado localmente que el snapshot del servidor TODAVÍA no
   * incluye, por concepto (marca de agua, E8).
   *
   * Se SUMA a `cumulative_volume` para que la captura se refleje al instante en
   * toda la sábana —fila, sección, partida y global— sin esperar al refetch, y
   * sin que el número dé un salto cuando el refetch llegue.
   */
  volumenEnCola?: Map<number, number>;
}

export function buildSabanaTree(
  workItems: AvanceBaseWorkItem[],
  opciones: OpcionesArbol = {},
): SabanaWorkItemNode[] {
  const hoy = opciones.hoy ?? hoyLocal();
  const enCola = opciones.volumenEnCola;
  const { porConcepto, porPartida } = indexarPrograma(opciones.programa);

  return workItems.map((wi) => {
    // Parse concepts
    const allConcepts: SabanaConceptNode[] = wi.concepts.map((c) => ({
      id: c.id,
      description: c.description,
      wbs_code: c.wbs_code,
      unit: c.unit,
      quantity: parseNum(c.quantity),
      price: parseNum(c.price),
      // Confirmado por el servidor MÁS lo capturado que aún no refleja.
      cumulative_volume:
        parseNum(c.cumulative_volume) + (enCola?.get(c.id) ?? 0),
      quantity_left: parseNum(c.quantity_left),
      clasification: c.clasification,
      section_id: c.section_id,
      work_item_id: wi.id,
      work_item_name: wi.name,
      section_name: null, // se resuelve al distribuir a su sección
      pct: 0,
      ultimas_cargas: Array.from(c.ultimas_cargas ?? []).map((carga) => ({
        fecha: carga.fecha,
        volumen: parseNum(carga.volumen),
        tiene_foto: !!carga.tiene_foto,
      })),
    }));

    // Attach pct per concept now that numbers are parsed
    for (const c of allConcepts) {
      c.pct = conceptPct(c);
      // Programa a nivel concepto. Si el catálogo se programó por partida, este
      // lookup no encuentra nada y el concepto queda sin indicador — correcto:
      // "sin programa individual" (D4).
      c.programa = datosDePrograma(
        porConcepto.get(c.id),
        c.cumulative_volume,
        hoy,
      );
    }

    // Build section map (id → node), all start with empty children/concepts
    const sectionMap = new Map<number, SabanaSectionNode>(
      (wi.sections ?? []).map((s) => [
        s.id,
        {
          id: s.id,
          name: s.name,
          level: s.level,
          parent_id: s.parent_id,
          work_item_id: s.work_item_id,
          directConcepts: [],
          children: [],
          pct: 0,
        },
      ]),
    );

    // Wire parent → children for sections
    for (const section of sectionMap.values()) {
      if (section.parent_id !== null) {
        sectionMap.get(section.parent_id)?.children.push(section);
      }
    }

    // Distribute concepts to their node
    const directConcepts: SabanaConceptNode[] = [];
    for (const concept of allConcepts) {
      if (concept.section_id === null) {
        directConcepts.push(concept);
      } else {
        const target = sectionMap.get(concept.section_id);
        if (target) {
          concept.section_name = target.name;
          target.directConcepts.push(concept);
        } else {
          // orphaned concept (data issue) — attach to workitem
          directConcepts.push(concept);
        }
      }
    }

    // Compute rollup pct for each section (leaf-to-root)
    for (const section of sectionMap.values()) {
      section.pct = rollupPct(collectLeafConcepts(section));
    }

    // Root sections (level 2, no parent)
    const rootSections = [...sectionMap.values()].filter(
      (s) => s.parent_id === null,
    );

    const allWorkItemConcepts = [
      ...directConcepts,
      ...allConcepts.filter((c) => c.section_id !== null),
    ];

    // Programa a nivel partida. La comparación va VALORIZADA: la partida no
    // tiene unidad propia comparable —agrupa m³ con PZA y LOTE—, así que el
    // ejecutado es Σ(volumen × precio) y el programado es la fracción del
    // avance propio de la partida aplicada a su importe contratado. No es
    // prorrateo: no se asigna volumen a los conceptos hijos, que siguen sin
    // programa individual. Misma fórmula que el agregado de obra del backend.
    const filaPartida = porPartida.get(wi.id);
    let programaPartida: DatosPrograma | undefined;
    if (filaPartida) {
      let importeContratado = 0;
      let importeEjecutado = 0;
      for (const c of allWorkItemConcepts) {
        importeContratado += c.quantity * c.price;
        importeEjecutado += c.cumulative_volume * c.price;
      }
      const programadoVolumen = programadoAFecha(filaPartida, hoy);
      const fraccion =
        filaPartida.volumen_total > 0
          ? programadoVolumen / filaPartida.volumen_total
          : 0;
      const programadoImporte = fraccion * importeContratado;
      const siguiente = proximoCorte(filaPartida, hoy);
      const hayVolumenFuturo =
        !!siguiente && siguiente.volumen_acumulado > programadoVolumen;
      programaPartida = {
        fila: filaPartida,
        programado: programadoVolumen,
        programadoImporte,
        // La comparación va en dinero, que es lo único homogéneo en una partida.
        estado: estadoPrograma(programadoImporte, importeEjecutado),
        noIniciado: programaNoIniciado(programadoImporte, hayVolumenFuturo),
        // Valorizado: el 4º argumento sustituye el volumen de la fila por el
        // importe contratado, que es la unidad en que va `importeEjecutado`.
        vencido:
          programaVencido(
            filaPartida,
            importeEjecutado,
            hoy,
            importeContratado,
          ) ?? undefined,
        fechaInicio: filaPartida.fecha_inicio,
      };
    }

    return {
      id: wi.id,
      name: wi.name,
      directConcepts,
      sections: rootSections,
      pct: rollupPct(allWorkItemConcepts),
      programa: programaPartida,
    };
  });
}

// ─── Flat tree for virtualized FlatList ───────────────────────────────────────

export function buildFlatTree(
  tree: SabanaWorkItemNode[],
  expandedIds: Set<string>,
): FlatTreeItem[] {
  const items: FlatTreeItem[] = [];

  for (const wi of tree) {
    const wiKey = `wi-${wi.id}`;
    const wiExpanded = expandedIds.has(wiKey);

    items.push({
      type: "workitem",
      nodeKey: wiKey,
      id: wi.id,
      name: wi.name,
      pct: wi.pct,
      depth: 0,
      isExpanded: wiExpanded,
    });

    if (!wiExpanded) continue;

    // Direct concepts (section_id === null, live under workitem)
    for (const concept of wi.directConcepts) {
      items.push({
        type: "concept",
        nodeKey: `c-${concept.id}`,
        concept,
        depth: 0,
      });
    }

    // Level-2 sections
    for (const section of wi.sections) {
      const sKey = `s-${section.id}`;
      const sExpanded = expandedIds.has(sKey);

      items.push({
        type: "section",
        nodeKey: sKey,
        id: section.id,
        name: section.name,
        level: section.level,
        pct: section.pct,
        depth: 1,
        isExpanded: sExpanded,
      });

      if (!sExpanded) continue;

      // Level-2 direct concepts
      for (const concept of section.directConcepts) {
        items.push({
          type: "concept",
          nodeKey: `c-${concept.id}`,
          concept,
          depth: 1,
        });
      }

      // Level-3 sections
      for (const child of section.children) {
        const cKey = `s-${child.id}`;
        const cExpanded = expandedIds.has(cKey);

        items.push({
          type: "section",
          nodeKey: cKey,
          id: child.id,
          name: child.name,
          level: child.level,
          pct: child.pct,
          depth: 2,
          isExpanded: cExpanded,
        });

        if (!cExpanded) continue;

        for (const concept of child.directConcepts) {
          items.push({
            type: "concept",
            nodeKey: `c-${concept.id}`,
            concept,
            depth: 2,
          });
        }
      }
    }
  }

  return items;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function getSearchResults(
  tree: SabanaWorkItemNode[],
  query: string,
): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  const results: SearchResultItem[] = [];

  function matchesConcept(concept: SabanaConceptNode): boolean {
    if (!q) return true;
    return (
      concept.description.toLowerCase().includes(q) ||
      (concept.wbs_code?.toLowerCase().includes(q) ?? false)
    );
  }

  function matchesAncestor(ancestors: SearchResultAncestor[]): boolean {
    if (!q) return true;
    return ancestors.some((a) => a.name.toLowerCase().includes(q));
  }

  for (const wi of tree) {
    const wiAncestor: SearchResultAncestor = { name: wi.name, level: 1 };

    // Direct concepts under workitem
    for (const concept of wi.directConcepts) {
      if (matchesConcept(concept) || matchesAncestor([wiAncestor])) {
        results.push({ concept, ancestors: [wiAncestor] });
      }
    }

    for (const section of wi.sections) {
      const sAncestor: SearchResultAncestor = {
        name: section.name,
        level: section.level,
      };
      const ancestors2 = [wiAncestor, sAncestor];

      for (const concept of section.directConcepts) {
        if (matchesConcept(concept) || matchesAncestor(ancestors2)) {
          results.push({ concept, ancestors: ancestors2 });
        }
      }

      for (const child of section.children) {
        const cAncestor: SearchResultAncestor = {
          name: child.name,
          level: child.level,
        };
        const ancestors3 = [wiAncestor, sAncestor, cAncestor];

        for (const concept of child.directConcepts) {
          if (matchesConcept(concept) || matchesAncestor(ancestors3)) {
            results.push({ concept, ancestors: ancestors3 });
          }
        }
      }
    }
  }

  return results;
}

// ─── Global stats ─────────────────────────────────────────────────────────────

export function computeGlobalStats(
  tree: SabanaWorkItemNode[],
): SabanaGlobalStats {
  let totalContracted = 0;
  let totalExecuted = 0;
  let totalProgrammed = 0;
  let hayPrograma = false;

  function addConcept(concept: SabanaConceptNode) {
    totalContracted += concept.quantity * concept.price;
    totalExecuted += concept.cumulative_volume * concept.price;
    if (concept.programa) {
      hayPrograma = true;
      totalProgrammed += concept.programa.programado * concept.price;
    }
  }

  function walkSection(section: SabanaSectionNode) {
    section.directConcepts.forEach(addConcept);
    section.children.forEach(walkSection);
  }

  for (const wi of tree) {
    wi.directConcepts.forEach(addConcept);
    wi.sections.forEach(walkSection);
    // Programa a nivel partida: ya viene valorizado. No se suma con el de los
    // conceptos porque son excluyentes — un catálogo se programa por uno u otro.
    if (wi.programa?.programadoImporte != null) {
      hayPrograma = true;
      totalProgrammed += wi.programa.programadoImporte;
    }
  }

  // Sin recorte a 100 (ver nota en conceptPct); piso en 0
  const global_pct =
    totalContracted > 0
      ? Math.max(0, (totalExecuted / totalContracted) * 100)
      : 0;

  return {
    global_pct,
    total_contracted: totalContracted,
    total_executed: totalExecuted,
    total_programmed: hayPrograma ? totalProgrammed : null,
    programmed_pct:
      hayPrograma && totalContracted > 0
        ? Math.max(0, (totalProgrammed / totalContracted) * 100)
        : null,
  };
}
