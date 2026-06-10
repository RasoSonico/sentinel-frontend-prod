import { queryOptions, useQuery } from "@tanstack/react-query";
import { useObject, useRealm } from "@realm/react";
import { UpdateMode } from "realm";
import { getConceptsByCatalog } from "../../api/maquinariaApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { ConceptsByWorkItemResponse } from "src/realm/conceptsByWorkItem/Response";
import {
  logApiFetchStart,
  logApiResponse,
  logNoApiData,
  logRealmStoreStart,
  logRealmStoreSuccess,
  logRealmStoreError,
  logHookState,
  logOfflineMode,
  logArrayLength,
} from "../useAvance/utils";

const realmKey = (catalogId: number) => `concepts-by-catalog-${catalogId}`;

export const conceptsByCatalogOptions = (
  catalogId: number | null,
  realm: Realm,
  isOnline: boolean | null,
) =>
  queryOptions({
    queryKey: ["conceptsByCatalog", catalogId],
    enabled: !!catalogId && isOnline === true,
    queryFn: async () => {
      logApiFetchStart("Concepts By Catalog");
      const data = await getConceptsByCatalog(catalogId!);

      logApiResponse("Concepts By Catalog", data);
      logArrayLength("Concepts", data?.length ?? 0);

      if (!data || data.length === 0) {
        logNoApiData("Concepts By Catalog");
        return [];
      }

      logRealmStoreStart("Concepts By Catalog");

      try {
        realm.write(() => {
          realm.create(
            "ConceptsByWorkItemResponse",
            {
              _id: realmKey(catalogId!),
              concepts: data.map((c) => ({
                id: c.id,
                catalog: c.catalog,
                work_item: c.work_item,
                description: c.description,
                unit: c.unit,
                quantity: c.quantity,
                unit_price: c.unit_price,
                clasification: c.clasification,
              })),
              updatedAt: new Date(),
            },
            UpdateMode.Modified,
          );
        });
        logRealmStoreSuccess("Concepts By Catalog");
      } catch (error) {
        logRealmStoreError("Concepts By Catalog", error, data);
        return data;
      }

      return data;
    },
  });

export const useConceptsByCatalog = (catalogId: number | null) => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();

  const cached = useObject(
    ConceptsByWorkItemResponse,
    catalogId ? realmKey(catalogId) : "",
  );

  const q = useQuery(conceptsByCatalogOptions(catalogId, realm, isOnline));

  logHookState("useConceptsByCatalog", {
    isOnline,
    hasRealm: !!realm,
    hasCached: !!cached,
    cachedData: cached ? `${cached.concepts.length} concepts` : null,
    queryState: {
      isLoading: q.isLoading,
      isPending: q.isPending,
      isSuccess: q.isSuccess,
      isError: q.isError,
    },
  });

  if (!isOnline && cached) {
    logOfflineMode("Concepts By Catalog", cached);
  }

  return {
    ...q,
    data: cached?.concepts ? Array.from(cached.concepts) : [],
    hasOfflineData: !!cached,
    isInitialLoading: !!catalogId && !cached && q.isPending,
  };
};
