import { useMemo } from "react";
import { useAvanceBase } from "src/hooks/data/query/useAvance";
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
}

export function useSabanaData(
  selectedCatalogId: number | null,
): UseSabanaDataResult {
  const { data: cached, isInitialLoading } = useAvanceBase();

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

  const tree: SabanaWorkItemNode[] = useMemo(() => {
    if (!cached?.catalogs || effectiveCatalogId === null) return [];
    const catalog = Array.from(cached.catalogs).find(
      (c) => c.id === effectiveCatalogId,
    );
    if (!catalog) return [];
    return buildSabanaTree(Array.from(catalog.work_items));
  }, [cached, effectiveCatalogId]);

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
  };
}
