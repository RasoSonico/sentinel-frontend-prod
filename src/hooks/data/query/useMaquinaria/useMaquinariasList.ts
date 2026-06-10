import { useQuery } from "@tanstack/react-query";
import { getMaquinariasByConstruction } from "../../api/maquinariaApi";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useMaquinariasList = (constructionId: number | undefined) => {
  const isOnline = useNetworkStatus();

  return useQuery({
    queryKey: [MAQUINARIA_QUERY_KEYS.LIST, constructionId],
    queryFn: () => getMaquinariasByConstruction(constructionId!),
    enabled: !!constructionId && isOnline === true,
    staleTime: 2 * 60 * 1000,
  });
};
