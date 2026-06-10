import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createJornadaTransitoria } from "../../api/maquinariaApi";
import { CreateJornadaTransitoriaBody } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useCreateJornadaTransitoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateJornadaTransitoriaBody) =>
      createJornadaTransitoria(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO],
      });
    },
  });
};
