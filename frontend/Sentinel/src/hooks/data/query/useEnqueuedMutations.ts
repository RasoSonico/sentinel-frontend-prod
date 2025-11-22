import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { MutationState } from "@tanstack/react-query";

export interface EnqueuedMutation {
  mutationKey?: (string | number)[];
  state: MutationState<any, any, any, any>;
  isPending: boolean;
  variables?: any;
}

export const useEnqueuedMutations = () => {
  const queryClient = useQueryClient();

  const enqueuedMutations: EnqueuedMutation[] = useMemo(() => {
    return queryClient
      .getMutationCache()
      .getAll()
      .filter((mutation) => mutation.state.status !== "idle")
      .map((mutation) => ({
        mutationKey: mutation.options.mutationKey as
          | (string | number)[]
          | undefined,
        state: mutation.state,
        isPending: mutation.state.status === "pending",
        variables: mutation.state.variables,
      }));
  }, [queryClient, queryClient.getMutationCache().getAll().length]);

  return enqueuedMutations;
};
