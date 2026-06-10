import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMaquinaria } from "../../api/maquinariaApi";
import { CreateMaquinariaBody } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useCreateMaquinaria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateMaquinariaBody) => createMaquinaria(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO],
      });
      queryClient.invalidateQueries({ queryKey: [MAQUINARIA_QUERY_KEYS.LIST] });
    },
  });
};
