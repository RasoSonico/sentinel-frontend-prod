import { useQuery } from "@tanstack/react-query";
import { getMaquinariasByConstruction } from "../../api/maquinariaApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { puedeIntentar } from "src/hooks/utils/red";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useMaquinariasList = (constructionId: number | undefined) => {
  const isOnline = useNetworkStatus();

  return useQuery({
    queryKey: [MAQUINARIA_QUERY_KEYS.LIST, constructionId],
    queryFn: () => getMaquinariasByConstruction(constructionId!),
    enabled: !!constructionId && puedeIntentar(isOnline),
    staleTime: 2 * 60 * 1000,
  });
};
