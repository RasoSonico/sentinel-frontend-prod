import { useQuery } from "@tanstack/react-query";
import { getMyConstructions } from "src/services/api/constructionService";

export const CONSTRUCTIONS_QUERY_KEYS = {
  constructionsByRole: "constructionsByRole",
};

export const useConstructionsByRole = (role: string = "CONTRATISTA") =>
  useQuery({
    queryKey: [CONSTRUCTIONS_QUERY_KEYS.constructionsByRole, role],
    queryFn: () => getMyConstructions(),
  });
