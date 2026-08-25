import { useEffect, useMemo } from "react";
import { useAvanceBase } from "src/hooks/data/query/useAvance";
import { useFechaOperativa } from "src/hooks/utils/useFechaOperativa";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { ProgramaApi } from "src/types/entities";
import {
  buildSabanaTree,
  computeGlobalStats,
  SabanaGlobalStats,
  SabanaWorkItemNode,
} from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";

export interface SabanaCatalogOption {
  id: number;
  name: string;
  construction_name: string;
}

interface UseSabanaDataResult {
  catalogs: SabanaCatalogOption[];
  effectiveCatalogId: number | null;
  tree: SabanaWorkItemNode[];
  globalStats: SabanaGlobalStats;
  hasOfflineData: boolean;
  isLoading: boolean;
  /**
   * La fecha operativa con la que se construyó ESTE árbol. Se expone para que
   * las superficies que derivan más programa (la ficha del concepto) usen
   * exactamente la misma: dos relojes distintos podrían contradecirse en el
   * cruce de medianoche.
   */
  hoy: string;
  /**
   * Refetch manual del paquete offline. Es la palanca del pull-to-refresh: la
   * vía por la que el usuario fuerza la llegada de un programa recién activado
   * —cuyo escritor es el escritorio y por tanto ningún worker invalida— o
   * corrige un número que sospecha viejo.
   */
  refetch: () => Promise<unknown>;
}

export function useSabanaData(
  selectedCatalogId: number | null,
): UseSabanaDataResult {
  const { data: cached, isInitialLoading, refetch } = useAvanceBase();

  const catalogs: SabanaCatalogOption[] = useMemo(() => {
    if (!cached?.catalogs) return [];
    return Array.from(cached.catalogs).map((c) => ({
      id: c.id,
      name: c.name,
      construction_name: c.construction_name,
    }));
  }, [cached]);

  // Resolve which catalog is actually active: prefer user selection if valid,
  // otherwise fall back to the first available catalog.
  const effectiveCatalogId: number | null = useMemo(() => {
    if (catalogs.length === 0) return null;
    const valid = catalogs.find((c) => c.id === selectedCatalogId);
    return valid ? selectedCatalogId : catalogs[0].id;
  }, [selectedCatalogId, catalogs]);

  // La fecha entra como dependencia a propósito: el programado cambia porque
  // pasa el tiempo, y sin esto el árbol se quedaría con el "hoy" del momento en
  // que se construyó (ver useFechaOperativa).
  const hoy = useFechaOperativa();

  // Marca de agua (E8): lo capturado que el snapshot todavía no incluye. Se
  // recalcula cuando cambia la cola o cuando el cache se reescribe, así que la
  // captura aparece al instante y el refetch posterior no mueve el número.
  const { volumenEnColaPorConcepto, purgarSincronizados } =
    usePendingAdvanceQueue();
  const cacheActualizadoEn = cached?.updatedAt ?? null;

  const volumenEnCola = useMemo(
    () => volumenEnColaPorConcepto(cacheActualizadoEn),
    [volumenEnColaPorConcepto, cacheActualizadoEn],
  );

  // El cache ya alcanzó a los sellados: dejarlos los duplicaría.
  useEffect(() => {
    if (cacheActualizadoEn) purgarSincronizados(cacheActualizadoEn);
  }, [cacheActualizadoEn, purgarSincronizados]);

  const tree: SabanaWorkItemNode[] = useMemo(() => {
    if (!cached?.catalogs || effectiveCatalogId === null) return [];
    const catalog = Array.from(cached.catalogs).find(
      (c) => c.id === effectiveCatalogId,
    );
    if (!catalog) return [];
    return buildSabanaTree(Array.from(catalog.work_items), {
      // `toJSON()` desprende el objeto Realm: el árbol vive en estado de React
      // a través de los sheets, y sostener el vivo crashea con "Accessing
      // object which has been invalidated" cuando un refetch lo reescribe.
      programa: catalog.programa
        ? (catalog.programa.toJSON() as unknown as ProgramaApi)
        : null,
      hoy,
      volumenEnCola,
    });
  }, [cached, effectiveCatalogId, hoy, volumenEnCola]);

  const globalStats: SabanaGlobalStats = useMemo(
    () => computeGlobalStats(tree),
    [tree],
  );

  return {
    catalogs,
    effectiveCatalogId,
    tree,
    globalStats,
    hasOfflineData: !!cached,
    isLoading: isInitialLoading,
    hoy,
    refetch,
  };
}
