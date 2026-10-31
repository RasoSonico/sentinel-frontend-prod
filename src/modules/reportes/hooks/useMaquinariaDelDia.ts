import { useMemo } from "react";

import {
  useHubDiario,
  useHubDiarioFromRealm,
} from "src/hooks/data/query/useMaquinaria";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import { hoyLocal } from "src/hooks/data/query/useAvance/utils/programaCalculos";
import {
  filaDeCola,
  filaDeServidor,
  type FilaMaquinaria,
} from "src/modules/maquinaria/filaMaquinaria";
import { usePendingJornadaQueue } from "src/hooks/maquinaria/usePendingJornadaQueue";
import { usePendingMaquinariaQueue } from "src/hooks/maquinaria/usePendingMaquinariaQueue";
import type { PendingJornadaSubmission } from "src/realm/pendingJornada/PendingJornadaSubmission";

import {
  etiquetaEquipo,
  type MaquinaDelDia,
  type MaquinariaDelDocumento,
} from "../maquinariaDelDia";

/**
 * La maquinaria que entrará al reporte de `fecha`, para previsualizarla.
 *
 * El supervisor no la captura en el wizard: el servidor la copia de lo que se
 * reportó en la tab de Maquinaria ese día. Esto reconstruye **esa misma
 * copia**, con las mismas fuentes que esa tab, para que la revisión enseñe el
 * documento completo.
 *
 * ## De dónde sale cada máquina
 *
 * De las mismas tres fuentes que el hub, y por el mismo motivo: el reporte se
 * arma en obra, donde puede no haber señal.
 *
 *  1. El caché del hub DE ESE DÍA —se guarda por día—, que es lo que el
 *     servidor ya sabe.
 *  2. La cola de jornadas de ese día, para lo capturado que todavía no ha
 *     salido del teléfono. **Manda sobre el hub**: es la captura más
 *     reciente, y mientras no sincronice, allá sigue la versión vieja o
 *     ninguna.
 *  3. La cola de altas, para las máquinas que todavía no existen allá.
 *
 * ## Qué entra a la tabla
 *
 * Solo las que REPORTARON, igual que el documento: de las demás no se sabe
 * nada y un renglón en blanco no es información. Que hubiera más máquinas en
 * obra se dice en la cifra de cabecera del documento ("1 / 3"), no en la
 * tabla.
 *
 * Una jornada en cola cuenta aunque su envío haya fallado: es lo que el
 * supervisor capturó, y es lo que ya hace la tarjeta del hub. Si acaba
 * descartándose, desaparece de aquí al descartarla.
 */
export const useMaquinariaDelDia = (fecha: string): MaquinariaDelDocumento => {
  const { data: obra } = useAssignedConstruction("CONTRATISTA");
  const constructionId = obra?.id ? Number(obra.id) : undefined;

  // Refresca el caché si hay señal. Es la misma query que la tab de
  // Maquinaria, así que no es un viaje de más: comparten clave en React Query.
  //
  // Solo para HOY, porque el hub solo sabe pedir hoy. Para un reporte que
  // lleva días en la cola —o para el detalle de uno ya emitido, que no usa
  // esto— no hay nada que pedir: queda el caché que haya, o ninguno.
  useHubDiario(fecha === hoyLocal() ? constructionId : undefined);

  const hub = useHubDiarioFromRealm(constructionId, fecha);
  const { todas } = usePendingJornadaQueue();
  const { altasParaLaLista } = usePendingMaquinariaQueue();

  // Por fecha, y no "todas las de la cola": sin señal varios días se acumulan
  // jornadas de distintos días, y las de ayer no van en el reporte de hoy.
  const enCola = useMemo(
    () => Array.from(todas).filter((j) => j.fecha === fecha),
    [todas, fecha],
  );

  const filas = useMemo<FilaMaquinaria[]>(() => {
    const delServidor = hub?.maquinarias ? Array.from(hub.maquinarias) : [];
    const idsEnElServidor = new Set(delServidor.map((m) => m.id));
    // Mismo criterio que el hub: una máquina deja de ser local cuando el
    // servidor ya la trae, no cuando su POST responde. Si no, se duplicaría
    // en la ventana entre una cosa y la otra.
    const locales = Array.from(altasParaLaLista).filter(
      (alta) =>
        alta.maquinariaId === null || !idsEnElServidor.has(alta.maquinariaId),
    );
    return [...locales.map(filaDeCola), ...delServidor.map(filaDeServidor)];
  }, [hub, altasParaLaLista]);

  return useMemo(() => {
    // Las máquinas locales comparten `estancia_id = 0` —no tienen estancia
    // todavía—, así que necesitan su propio mapa: en el de estancias se
    // colapsarían en una sola y la jornada de una saldría en todas.
    const porEstancia = new Map<number, PendingJornadaSubmission>();
    const porMaquinariaLocal = new Map<string, PendingJornadaSubmission>();
    for (const item of enCola) {
      if (item.maquinariaLocalId) {
        porMaquinariaLocal.set(item.maquinariaLocalId, item);
      } else {
        porEstancia.set(item.estanciaId, item);
      }
    }

    const conJornada: { fila: FilaMaquinaria; maquina: MaquinaDelDia }[] = [];

    for (const fila of filas) {
      const pendiente = fila.maquinariaLocalId
        ? porMaquinariaLocal.get(fila.maquinariaLocalId)
        : porEstancia.get(fila.estancia_id);

      // La cola primero: si hay captura sin enviar, ESA es la del día.
      const jornada = pendiente
        ? {
            estado: pendiente.estado,
            motivoInactividad: pendiente.motivoInactividad,
            horometroInicial: pendiente.horometroInicial,
            horometroFinal: pendiente.horometroFinal,
          }
        : fila.jornada_id !== null
          ? {
              estado: fila.jornada_estado ?? "",
              motivoInactividad: fila.jornada_motivo_inactividad,
              horometroInicial: fila.jornada_horometro_inicial,
              horometroFinal: fila.jornada_horometro_final,
            }
          : null;

      if (!jornada) continue;

      conJornada.push({
        fila,
        maquina: {
          equipo: etiquetaEquipo(fila.tipo, fila.marca, fila.modelo),
          ...jornada,
        },
      });
    }

    // Por tipo, marca y modelo, que es como ordena el snapshot del servidor.
    // Comparación cruda y no `localeCompare`: lo que importa no es cuál orden
    // sea, sino que la previsualización y el PDF estén de acuerdo.
    conJornada.sort((a, b) => {
      const campos = [
        [a.fila.tipo, b.fila.tipo],
        [a.fila.marca, b.fila.marca],
        [a.fila.modelo, b.fila.modelo],
      ];
      for (const [x, y] of campos) {
        if (x !== y) return x < y ? -1 : 1;
      }
      return 0;
    });

    return {
      maquinas: conJornada.map(({ maquina }) => maquina),
      // Sin caché de ese día y sin nada en la cola, este teléfono no tiene
      // con qué saberlo. Una tabla vacía diría "no hubo equipo", que es otra
      // cosa.
      conocida: hub !== null || enCola.length > 0,
    };
  }, [filas, enCola, hub]);
};
