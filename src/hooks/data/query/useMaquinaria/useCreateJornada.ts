import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createJornada } from "../../api/maquinariaApi";
import { CreateJornadaBody } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useCreateJornada = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateJornadaBody) => createJornada(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO],
      });
    },
  });
};
