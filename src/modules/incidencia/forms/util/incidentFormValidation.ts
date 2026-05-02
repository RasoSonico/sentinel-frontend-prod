import { z } from "zod";

export const incidentFormSchema = z.object({
  type: z
    .number({ required_error: "El tipo de incidencia es requerido" })
    .min(1, "Debe seleccionar un tipo válido"),
  clasification: z
    .number({ required_error: "La clasificación es requerida" })
    .min(1, "Debe seleccionar una clasificación válida"),
  description: z
    .string({ required_error: "La descripción es requerida" })
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(1000, "La descripción no puede exceder los 1000 caracteres")
    .refine((val) => val.trim().length >= 10, {
      message: "La descripción debe tener al menos 10 caracteres válidos",
    }),
});

export const incidentFormDefaultValues = {
  type: 0,
  clasification: 0,
  description: "",
};

export type IncidentFormData = z.infer<typeof incidentFormSchema>;

// Función para validar campos individuales
export const validateField = (fieldName: keyof IncidentFormData, value: any) => {
  try {
    // Crear un schema parcial solo para el campo específico
    const fieldSchema = z.object({
      [fieldName]: incidentFormSchema.shape[fieldName],
    });
    
    fieldSchema.parse({ [fieldName]: value });
    return null; // No error
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Retornar el primer error del campo
      const fieldError = error.errors.find(err => err.path.includes(fieldName));
      return fieldError?.message || "Error de validación";
    }
    return "Error de validación";
  }
};

// Función para validar todo el formulario
export const validateIncidentForm = (data: Partial<IncidentFormData>) => {
  try {
    incidentFormSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          const fieldName = err.path[0].toString();
          if (!errors[fieldName]) {
            errors[fieldName] = err.message;
          }
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: "Error de validación" } };
  }
};