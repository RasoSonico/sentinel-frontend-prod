import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeEstancia } from "../../api/maquinariaApi";
import { CloseEstanciaBody } from "src/types/maquinaria";
import { MAQUINARIA_QUERY_KEYS } from "../maquinariaQueries.const";

export const useCloseEstancia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      estanciaId,
      body,
    }: {
      estanciaId: number;
      body: CloseEstanciaBody;
    }) => closeEstancia(estanciaId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MAQUINARIA_QUERY_KEYS.HUB_DIARIO],
      });
      queryClient.invalidateQueries({ queryKey: [MAQUINARIA_QUERY_KEYS.LIST] });
    },
  });
};
