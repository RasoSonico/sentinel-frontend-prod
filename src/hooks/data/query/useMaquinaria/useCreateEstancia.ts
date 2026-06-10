import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEstancia } from "../../api/maquinariaApi";
import { CreateEstanciaBody } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useCreateEstancia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEstanciaBody) => createEstancia(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO],
      });
    },
  });
};
