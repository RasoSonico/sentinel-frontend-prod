import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { AVANCE_QUERY_KEYS } from "./avanceQueries.const";
import { Construction } from "src/types/entities";
import {
  advancesByCatalogOptions,
  assignedConstructionOptions,
  avanceBaseOptions,
  catalogsByConstructionOptions,
} from "./useAvanceQueries";
import { authMeQueryOptions } from "./useAuthQueries";
import { useAuth } from "src/hooks/useAuth";

export type PrefetchOptions = {
  staleTime?: number;
  cacheTime?: number;
};

export const useAvancePrefetch = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const prefetchAvance = useCallback(async (options?: PrefetchOptions) => {
    console.group("useAvancePrefetch: Starting prefetch with options", options);
    try {
      console.log("🔄 Prefetching avance queries...");

      console.log("➡️ Prefetching auth me data");
      queryClient.prefetchQuery(authMeQueryOptions());

      // First, prefetch base query
      console.log("➡️ Prefetching avance base data");
      const avanceBase = await queryClient.fetchQuery(avanceBaseOptions);

      console.log(`➡️ Prefetching advances for catalog ${avanceBase[0]?.id}`);
      queryClient.prefetchQuery(
        advancesByCatalogOptions({ catalogId: avanceBase[0]?.id ?? null })
      );

      // Then prefetch construction and use its result for catalogs
      console.log("➡️ Prefetching assigned construction");
      const assignedConstruction = await queryClient.fetchQuery(
        assignedConstructionOptions()
      );

      // If we got a construction, prefetch its catalogs
      if (assignedConstruction?.id) {
        console.log(
          `➡️ Prefetching catalogs for construction ${assignedConstruction.id}`
        );
        queryClient.prefetchQuery(
          catalogsByConstructionOptions(Number(assignedConstruction.id))
        );
      }
    } catch (error) {
      console.error("❌ Error during prefetch:", error);
      // Only throw if this is a critical auth error
      if (error instanceof Error && error.message.includes("401")) {
        logout();
      }
    } finally {
      console.log("✅ Prefetch complete");
      console.groupEnd();
    }
  }, []);

  const invalidateAvanceQueries = async () => {
    console.group("useAvancePrefetch: Invalidating avance queries");

    const assignedConstruction = queryClient.getQueryData<Construction>([
      AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION,
    ]);

    if (assignedConstruction?.id) {
      await queryClient.invalidateQueries({
        queryKey: [
          AVANCE_QUERY_KEYS.CATALOGS_BY_CONSTRUCTION,
          assignedConstruction.id,
        ],
      });
      console.log(
        `✅ Invalidated catalogs for construction ${assignedConstruction.id}`
      );
    }

    await queryClient.invalidateQueries({
      queryKey: [
        AVANCE_QUERY_KEYS.ASSIGNED_CONSTRUCTION,
        AVANCE_QUERY_KEYS.BASE,
      ],
    });
    console.log("✅ Invalidation complete");
    console.groupEnd();
  };

  const isPrefetched = (queryKey: string[]) => {
    return queryClient.getQueryData(queryKey) !== undefined;
  };

  return {
    prefetchAvance,
    invalidateAvanceQueries,
    isPrefetched,
  };
};
