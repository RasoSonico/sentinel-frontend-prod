import React from "react";
import ProgramStatusBadge from "./ProgramStatusBadge";
import { DatosPrograma } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { fechaCorta } from "../utils/fechaPrograma";

interface Props {
  programa?: DatosPrograma;
  /**
   * El acumulado rebasó lo CONTRATADO. Llega desde la fila porque es un hecho
   * del contrato, no del programa: `DatosPrograma` no conoce la cantidad
   * contratada y no debería.
   */
  sobreEjecutado?: boolean;
  compact?: boolean;
}

/**
 * Traduce el estado de programa a chips (ADR-004 D7).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOS REGLAS DE NEGOCIO QUE NO SON OBVIAS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **1. La sobre-ejecución anula el "Adelantado".** Un concepto al 118% puede ir
 * por delante del programa, pero decirle "Adelantado" es decirle *vas bien*, y
 * no va bien: se pasó de lo contratado y eso se cobra en un convenio, no en una
 * estimación. Cuando hay sobre-ejecución, el chip positivo cede su lugar al
 * triángulo de alerta. Solo el triángulo: el texto "Regularizar volumen" ya
 * viaja en la fila, unos píxeles abajo, y repetirlo aquí gastaría el ancho que
 * la fila no tiene.
 *
 * **`ATRASADO` sí sobrevive** a la sobre-ejecución, y es intencional: "Atrasado"
 * no transmite *vas bien*, y las dos señales miden varas distintas (D7). Tras
 * una reprogramación un concepto puede deber más de lo contratado y ambas cosas
 * son ciertas a la vez.
 *
 * **2. "Sin iniciar" y "Adelantado" conviven.** Si el programa arranca la semana
 * entrante y ya hay volumen capturado, el contratista se adelantó de verdad. El
 * modelo viejo solo podía anunciar una de las dos y elegía la menos útil.
 *
 * Devuelve `null` en dos casos, y la diferencia importa:
 *
 *   · sin programa  → D11: ausencia de dato es ausencia de UI. No se fabrica
 *                     un chip neutro ni un 0%.
 *   · AL_DIA        → el silencio ES la señal. Solo se marca la excepción;
 *                     cientos de chips verdes idénticos no informan de nada.
 *
 * Centraliza la traducción para que la fila del árbol y el resultado de
 * búsqueda no puedan divergir.
 */
const ChipPrograma: React.FC<Props> = ({
  programa,
  sobreEjecutado = false,
  compact = true,
}) => {
  if (!programa) return null;

  const inicia = programa.noIniciado ? (
    <ProgramStatusBadge
      key="inicia"
      status="notStarted"
      compact={compact}
      showIcon={false}
      label={`Inicia ${fechaCorta(programa.fechaInicio)}`}
    />
  ) : null;

  if (programa.estado === "ATRASADO") {
    return (
      <>
        <ProgramStatusBadge status="delayed" compact={compact} showIcon={false} />
        {inicia}
      </>
    );
  }

  // AL_DIA y ADELANTADO son estados "sin problema" contra el programa; la
  // sobre-ejecución los reemplaza porque sí lo hay, contra el contrato.
  if (sobreEjecutado) {
    return (
      <>
        <ProgramStatusBadge
          status="overExecuted"
          compact={compact}
          showIcon
          label=""
        />
        {inicia}
      </>
    );
  }

  if (programa.estado === "ADELANTADO") {
    return (
      <>
        <ProgramStatusBadge status="ahead" compact={compact} showIcon={false} />
        {inicia}
      </>
    );
  }

  return inicia;
};

export default React.memo(ChipPrograma);
