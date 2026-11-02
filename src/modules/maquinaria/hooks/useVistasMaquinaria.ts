import { useEffect, useState } from "react";

import { usePendingCapturaQueue } from "src/hooks/maquinaria/usePendingCapturaQueue";
import { useFechaOperativa } from "src/hooks/utils/useFechaOperativa";
import { usePendingMaquinariaQueue } from "src/hooks/maquinaria/usePendingMaquinariaQueue";

import { construirVista, type VistaMaquina } from "../diaMaquina";
import { filaDeCola, filaDeServidor, type FilaMaquinaria } from "../filaMaquinaria";
import { useHubDiarioData } from "./useHubDiarioData";

/**
 * Las máquinas de la obra, cada una con su día fundido: lo del servidor más
 * lo que el teléfono todavía no envía (ver `diaMaquina.ts`).
 *
 * Es la ÚNICA fuente de la pantalla de maquinaria. La tarjeta, la barra de
 * reportadas y la hoja leen de aquí, y por eso no pueden contradecirse: si la
 * barra contara una cosa y la tarjeta mostrara otra, el supervisor no sabría
 * a cuál creerle.
 */
export const useVistasMaquinaria = () => {
  const data = useHubDiarioData();
  const { hub } = data;
  const { porMaquina } = usePendingCapturaQueue();
  const { altasParaLaLista } = usePendingMaquinariaQueue();
  // El día y la hora con los que se clasifica. El día cambia a medianoche y
  // al volver a primer plano; `pulso` repinta cuando un turno abierto cruza
  // el umbral de olvido con la pantalla abierta (ver el efecto de abajo).
  const hoy = useFechaOperativa();
  const [pulso, setPulso] = useState(0);

  // Sin `useMemo`, a propósito: `hub` es un objeto vivo de Realm cuya
  // identidad no cambia cuando el caché se reescribe, así que una memo sobre
  // él se quedaría con la versión vieja. Fundir veinte máquinas es barato.
  const vistas = ((): VistaMaquina[] => {
    const ahora = new Date();
    const hubEscritoEn = hub?.updatedAt ?? null;

    const deServidor: FilaMaquinaria[] = hub?.maquinarias
      ? Array.from(hub.maquinarias).map(filaDeServidor)
      : [];

    /**
     * Una máquina deja de pintarse como local cuando **el servidor ya la
     * trae**, no cuando su POST responde: el hub tarda un refetch más en
     * incluirla, y soltarla antes la hacía desaparecer y volver.
     */
    const enElServidor = new Set(deServidor.map((f) => f.id));
    const locales = Array.from(altasParaLaLista)
      .filter((alta) => alta.maquinariaId === null || !enElServidor.has(alta.maquinariaId))
      .map(filaDeCola);

    // Las locales primero: son las que acaban de llegar y las que el
    // supervisor está buscando en ese momento.
    return [...locales, ...deServidor].map((fila) =>
      construirVista({
        maquina: fila,
        capturas: Array.from(
          porMaquina.get(
            fila.estancia_id > 0 ? `e-${fila.estancia_id}` : `local-${fila.maquinariaLocalId}`,
          ) ?? [],
        ),
        hubEscritoEn,
        hoy,
        ahora,
      }),
    );
  })();

  // El siguiente turno que pasará a olvidado: a esa hora la máquina cambia
  // de sección sin que nadie toque nada, así que se agenda un repintado.
  const siguienteOlvido = vistas
    .map((v) => v.turnoAbierto)
    .filter((t) => t !== null && !t.olvidado)
    .reduce((min, t) => Math.min(min, t!.olvidadoEn), Infinity);

  useEffect(() => {
    if (!Number.isFinite(siguienteOlvido)) return;
    const espera = Math.max(1000, siguienteOlvido - Date.now() + 1000);
    // setTimeout no admite más de ~24.8 días; un turno no dura tanto.
    const id = setTimeout(() => setPulso((p) => p + 1), Math.min(espera, 2 ** 31 - 1));
    return () => clearTimeout(id);
  }, [siguienteOlvido, pulso]);

  return { ...data, vistas, hoy };
};
