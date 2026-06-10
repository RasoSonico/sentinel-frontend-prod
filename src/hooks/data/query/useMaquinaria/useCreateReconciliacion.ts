import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReconciliacion } from "../../api/maquinariaApi";
import { CreateReconciliacionBody } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useCreateReconciliacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateReconciliacionBody) => createReconciliacion(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO],
      });
    },
  });
};
