import { AvanceBaseWorkItem } from "src/types/entities";

// ─── Domain types ────────────────────────────────────────────────────────────

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
  pct: number;
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
}

export interface SabanaGlobalStats {
  global_pct: number;
  total_contracted: number;
  total_executed: number;
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

export function buildSabanaTree(
  workItems: AvanceBaseWorkItem[],
): SabanaWorkItemNode[] {
  return workItems.map((wi) => {
    // Parse concepts
    const allConcepts: SabanaConceptNode[] = wi.concepts.map((c) => ({
      id: c.id,
      description: c.description,
      wbs_code: c.wbs_code,
      unit: c.unit,
      quantity: parseNum(c.quantity),
      price: parseNum(c.price),
      cumulative_volume: parseNum(c.cumulative_volume),
      quantity_left: parseNum(c.quantity_left),
      clasification: c.clasification,
      section_id: c.section_id,
      pct: 0,
    }));

    // Attach pct per concept now that numbers are parsed
    for (const c of allConcepts) {
      c.pct = conceptPct(c);
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

    return {
      id: wi.id,
      name: wi.name,
      directConcepts,
      sections: rootSections,
      pct: rollupPct(allWorkItemConcepts),
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

  function addConcept(concept: SabanaConceptNode) {
    totalContracted += concept.quantity * concept.price;
    totalExecuted += concept.cumulative_volume * concept.price;
  }

  function walkSection(section: SabanaSectionNode) {
    section.directConcepts.forEach(addConcept);
    section.children.forEach(walkSection);
  }

  for (const wi of tree) {
    wi.directConcepts.forEach(addConcept);
    wi.sections.forEach(walkSection);
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
  };
}
