import {
  useHubDiario,
  useHubDiarioFromRealm,
} from "src/hooks/data/query/useMaquinaria";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import { hoyLocal } from "src/hooks/data/query/useAvance/utils/programaCalculos";
import { construirVista, horasDeJornada } from "src/modules/maquinaria/diaMaquina";
import { filaDeCola, filaDeServidor } from "src/modules/maquinaria/filaMaquinaria";
import { usePendingCapturaQueue } from "src/hooks/maquinaria/usePendingCapturaQueue";
import { usePendingMaquinariaQueue } from "src/hooks/maquinaria/usePendingMaquinariaQueue";

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
 * copia**, con la MISMA fusión que esa tab (`diaMaquina.ts`), para que la
 * revisión enseñe el documento completo y no pueda contradecir a la tarjeta.
 *
 * ## De dónde sale cada máquina
 *
 * De las mismas tres fuentes que el hub, y por el mismo motivo: el reporte se
 * arma en obra, donde puede no haber señal.
 *
 *  1. El caché del hub DE ESE DÍA —se guarda por día—, que es lo que el
 *     servidor ya sabe.
 *  2. La cola de capturas, para lo capturado que todavía no ha salido del
 *     teléfono. Se aplica encima del hub con las reglas del servidor.
 *  3. La cola de altas, para las máquinas que todavía no existen allá.
 *
 * ## Qué entra a la tabla
 *
 * Solo las que REPORTARON —trabajó o no operó—, igual que el documento. El
 * arranque solo no reporta y no entra: el documento no tiene cómo decir "se
 * leyó el horómetro pero no se sabe si trabajó".
 *
 * El horómetro es el de los turnos (P3): el inicial del primero, el final del
 * último y, en horas, la suma de los turnos completos.
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
  const { porMaquina, todas } = usePendingCapturaQueue();
  const { altasParaLaLista } = usePendingMaquinariaQueue();

  // Sin `useMemo`: `hub` es un objeto vivo de Realm cuya identidad no cambia
  // al reescribirse el caché. Ver `useVistasMaquinaria`.
  const delServidor = hub?.maquinarias
    ? Array.from(hub.maquinarias).map(filaDeServidor)
    : [];
  const enElServidor = new Set(delServidor.map((f) => f.id));
  const filas = [
    ...Array.from(altasParaLaLista)
      .filter((alta) => alta.maquinariaId === null || !enElServidor.has(alta.maquinariaId))
      .map(filaDeCola),
    ...delServidor,
  ];

  const maquinas: { orden: string[]; maquina: MaquinaDelDia }[] = [];
  for (const fila of filas) {
    const vista = construirVista({
      maquina: fila,
      capturas: Array.from(
        porMaquina.get(
          fila.estancia_id > 0 ? `e-${fila.estancia_id}` : `local-${fila.maquinariaLocalId}`,
        ) ?? [],
      ),
      hubEscritoEn: hub?.updatedAt ?? null,
      hoy: fecha,
      ahora: new Date(),
    });
    const jornada = vista.hoy;
    if (jornada.estado === null) continue;

    const turnos = jornada.turnos;
    maquinas.push({
      orden: [fila.tipo, fila.marca, fila.modelo],
      maquina: {
        equipo: etiquetaEquipo(fila.tipo, fila.marca, fila.modelo),
        estado: jornada.estado,
        motivoInactividad: jornada.motivo,
        horometroInicial: turnos[0]?.inicial ?? null,
        horometroFinal: turnos[turnos.length - 1]?.final ?? null,
        horas: horasDeJornada(turnos),
      },
    });
  }

  // El mismo orden que el documento: por tipo, marca y modelo.
  maquinas.sort((a, b) => {
    for (let i = 0; i < a.orden.length; i += 1) {
      if (a.orden[i] !== b.orden[i]) return a.orden[i] < b.orden[i] ? -1 : 1;
    }
    return 0;
  });

  return {
    maquinas: maquinas.map(({ maquina }) => maquina),
    conocida:
      hub !== null || Array.from(todas).some((c) => c.fecha === fecha),
  };
};
