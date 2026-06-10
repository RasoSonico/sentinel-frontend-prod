import { z } from "zod";
import { DateUtils } from "src/utils/dateUtils";

export const altaMaquinariaSchema = z.object({
  tipo: z.number({ required_error: "Selecciona el tipo de maquinaria" }),
  marca: z.string().min(1, "La marca es requerida"),
  modelo: z.string().min(1, "El modelo es requerido"),
  propietario_tipo: z.enum(["PROPIA", "RENTADA", "SUBCONTRATISTA"], {
    required_error: "Selecciona el tipo de propiedad",
  }),
  tipo_permanencia: z.enum(["RESIDENTE", "TRANSITORIA"], {
    required_error: "Selecciona el tipo de permanencia",
  }),
  fecha_ingreso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
});

export type AltaMaquinariaFormData = z.infer<typeof altaMaquinariaSchema>;

export const altaMaquinariaDefaultValues: AltaMaquinariaFormData = {
  tipo: undefined as unknown as number,
  marca: "",
  modelo: "",
  propietario_tipo: undefined as unknown as "PROPIA",
  tipo_permanencia: undefined as unknown as "RESIDENTE",
  fecha_ingreso: DateUtils.localDateToUTC(new Date()),
};
