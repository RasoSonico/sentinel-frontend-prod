import { useMemo } from "react";
import { useAvanceBase } from "src/hooks/data/query/useAvance";
import { useFechaOperativa } from "src/hooks/utils/useFechaOperativa";
import {
  FilaPrograma,
  programadoAFecha,
} from "src/hooks/data/query/useAvance/utils/programaCalculos";

export interface ProgramaObra {
  /** Σ programado a hoy × precio unitario, sobre las versiones vigentes. */
  importeProgramado: number;
  /** Σ contratado de TODA la obra (denominador del porcentaje). */
  importeContratado: number;
  /** Σ contratado que SÍ tiene programa encima. */
  importeConPrograma: number;
  /** Porcentaje contra el contrato COMPLETO, sin techo (E2). */
  pct: number;
  /**
   * Proporción del contrato cubierta por programa. Es un CTA, no una nota al
   * pie: un 0.62 significa que el 38% de la obra está sin programar y hay que
   * regularizarlo.
   */
  cobertura: number;
  /** Catálogos de la obra con versión vigente. */
  catalogosConPrograma: number;
  /** Catálogos de la obra, con y sin programa. */
  catalogosTotal: number;
}

/**
 * Agregado de programa a nivel obra, CALCULADO EN CLIENTE.
 *
 * ── Por qué en cliente y no del summary del backend ──────────────────────────
 * El backend lo expone (`pct_programado`, ADR-003 §8.2) y ese campo sigue ahí,
 * pero como fuente PRIMARIA no sirve: el programado cambia con el reloj, y no
 * existe ningún evento al cual enganchar una invalidación de caché. Un valor
 * traído por red envejece solo, y `useConstructionSummary` además ni siquiera
 * corre sin conexión (`enabled: isOnline`).
 *
 * Calculándolo aquí, sobre la misma serie que alimenta las filas de la sábana:
 *
 *   · la franja y las filas NO PUEDEN discrepar — mismo dato, misma función
 *   · funciona sin señal, que es el caso de obra
 *   · nunca envejece: avanza con `useFechaOperativa`
 *
 * ── Devuelve `null`, nunca ceros ─────────────────────────────────────────────
 * Si ningún catálogo de la obra tiene versión vigente, no hay dato. Un 0% en un
 * indicador de programa se lee como atraso total, que es información falsa
 * (D11): la esquina PROG. simplemente no se renderiza.
 *
 * Replica la fórmula de `programa/services/agregados.py` para que el número de
 * la app y el del backend coincidan si algún día se comparan.
 */
export function useProgramaObra(): ProgramaObra | null {
  const { data: cached } = useAvanceBase();
  const hoy = useFechaOperativa();

  return useMemo(() => {
    if (!cached?.catalogs) return null;

    let importeProgramado = 0;
    let importeContratado = 0;
    let importeConPrograma = 0;
    let hayPrograma = false;
    let catalogosConPrograma = 0;
    let catalogosTotal = 0;

    for (const catalogo of Array.from(cached.catalogs)) {
      catalogosTotal += 1;
      // Índices del programa vigente de ESTE catálogo. Una obra puede tener
      // unos catálogos programados y otros no (D3).
      const porConcepto = new Map<number, FilaPrograma>();
      const porPartida = new Map<number, FilaPrograma>();

      if (catalogo.programa) {
        hayPrograma = true;
        catalogosConPrograma += 1;
        for (const fila of Array.from(catalogo.programa.conceptos)) {
          const parsed: FilaPrograma = {
            fecha_inicio: fila.fecha_inicio,
            fecha_fin: fila.fecha_fin,
            volumen_total: parseFloat(fila.volumen_total) || 0,
            cortes: Array.from(fila.cortes).map((c) => ({
              fecha_corte: c.fecha_corte,
              volumen_acumulado: parseFloat(c.volumen_acumulado) || 0,
            })),
          };
          if (fila.concept_id != null) porConcepto.set(fila.concept_id, parsed);
          else if (fila.work_item_id != null)
            porPartida.set(fila.work_item_id, parsed);
        }
      }

      for (const partida of Array.from(catalogo.work_items)) {
        const conceptos = Array.from(partida.concepts);
        let contratadoPartida = 0;

        for (const concepto of conceptos) {
          const cantidad = parseFloat(concepto.quantity) || 0;
          const precio = parseFloat(concepto.price) || 0;
          const contratado = cantidad * precio;
          contratadoPartida += contratado;
          importeContratado += contratado;

          const fila = porConcepto.get(concepto.id);
          if (fila) {
            importeProgramado += programadoAFecha(fila, hoy) * precio;
            importeConPrograma += contratado;
          }
        }

        // Programa por partida: se valoriza por la FRACCIÓN de su propio avance
        // aplicada a su importe contratado. No es prorrateo — no se asigna
        // volumen a los conceptos hijos, que siguen sin programa individual.
        const filaPartida = porPartida.get(partida.id);
        if (filaPartida) {
          const fraccion =
            filaPartida.volumen_total > 0
              ? programadoAFecha(filaPartida, hoy) / filaPartida.volumen_total
              : 0;
          importeProgramado += fraccion * contratadoPartida;
          importeConPrograma += contratadoPartida;
        }
      }
    }

    if (!hayPrograma) return null;

    return {
      importeProgramado,
      importeContratado,
      importeConPrograma,
      // Denominador: el contratado COMPLETO, no el cubierto. Así PROG. y AVANCE
      // son el mismo tipo de número en la misma franja y se leen lado a lado.
      // Sin techo y con piso en 0 (E2).
      pct:
        importeContratado > 0
          ? Math.max(0, (importeProgramado / importeContratado) * 100)
          : 0,
      cobertura:
        importeContratado > 0 ? importeConPrograma / importeContratado : 0,
      catalogosConPrograma,
      catalogosTotal,
    };
  }, [cached, hoy]);
}
