import { useMutation } from "@tanstack/react-query";
import { submitAdvance } from "../../api/avanceApi";
import { SubmitAdvance } from "src/types/avance";

export const useSubmitAdvance = () =>
  useMutation({
    mutationKey: ["submitAdvance"],
    mutationFn: (advance: SubmitAdvance) => submitAdvance(advance),
  });
