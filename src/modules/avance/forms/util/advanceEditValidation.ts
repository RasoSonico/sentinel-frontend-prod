import { z } from "zod";

/**
 * Schema de validación para editar avances
 * Solo incluye campos editables: volume y comments
 */
export const advanceEditSchema = z.object({
  volume: z
    .string()
    .refine((val) => !!val && !isNaN(Number(val)) && Number(val) > 0, {
      message: "Ingresa una cantidad válida mayor a cero",
    })
    .refine((val) => {
      if (!val || isNaN(Number(val))) return true; // Skip if invalid number (handled by previous refine)
      
      // Check for maximum 2 decimal places
      const decimalPlaces = val.includes('.') ? val.split('.')[1]?.length || 0 : 0;
      return decimalPlaces <= 2;
    }, {
      message: "El volumen no puede tener más de 2 decimales",
    }),
  comments: z.string().optional(),
});

export const advanceEditDefaultValues = {
  volume: "",
  comments: "",
};

export type AdvanceEditFormData = z.infer<typeof advanceEditSchema>;