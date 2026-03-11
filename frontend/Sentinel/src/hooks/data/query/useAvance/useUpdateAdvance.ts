import { useMutation } from "@tanstack/react-query";
import { updateAdvance } from "../../api/avanceApi";
import { PhysicalAdvanceResponse } from "src/types/entities";

export const useUpdateAdvance = () =>
  useMutation({
    mutationKey: ["updateAdvance"],
    mutationFn: ({
      advanceId,
      updates,
    }: {
      advanceId: number;
      updates: {
        volume?: string;
        comments?: string;
        status?: "PENDING" | "APPROVED" | "REJECTED";
      };
    }): Promise<PhysicalAdvanceResponse> => updateAdvance(advanceId, updates),
  });
