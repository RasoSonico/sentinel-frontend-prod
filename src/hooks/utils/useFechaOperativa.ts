import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { hoyLocal } from "src/hooks/data/query/useAvance/utils/programaCalculos";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function msHastaMedianoche(ahora: Date = new Date()): number {
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  manana.setHours(0, 0, 0, 0);
  // +1s de colchón: despertar exactamente en el límite puede leer el día viejo
  return Math.max(1000, manana.getTime() - ahora.getTime() + 1000);
}

/**
 * Fecha local vigente (`YYYY-MM-DD`), que se actualiza sola cuando cambia el día.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * El programado es el PRIMER dato del sistema que cambia sin que nadie haga
 * nada. El ejecutado cambia cuando alguien captura; el contratado, cuando se
 * carga un catálogo. El programado cambia porque pasó el tiempo — y React no
 * re-renderiza porque pase el tiempo.
 *
 * Sin este hook, el árbol de la sábana se queda con el `hoy` que tenía cuando
 * se construyó. Los escenarios reales:
 *
 *   app cerrada y reabierta al día siguiente ......... remonta, correcto
 *   app en segundo plano varios días CON red ......... el refetch reescribe
 *                                                      Realm y el árbol se
 *                                                      reconstruye — correcto
 *                                                      por rebote, no por diseño
 *   app en segundo plano varios días SIN red ......... NADA lo dispara: el
 *                                                      programado se congela
 *   app abierta cruzando la medianoche ............... igual
 *
 * Los dos últimos son el caso de campo, y son justo los que este hook cubre.
 *
 * ── Cómo ─────────────────────────────────────────────────────────────────────
 * Dos disparadores, ambos 100% locales: cero red, cero servidor, cero base de
 * datos. No hay polling — el temporizador duerme hasta la medianoche siguiente
 * y se vuelve a dormir.
 *
 *   1. AppState → 'active': al volver del segundo plano compara el día guardado
 *      contra hoy. Funciona SIN CONEXIÓN, que es el punto.
 *   2. Temporizador a la siguiente medianoche local, para la app que se queda
 *      abierta.
 *
 * Beneficia también a Fase 1: los contadores del "Hoy" tienen el mismo agujero.
 */
export function useFechaOperativa(): string {
  const [fecha, setFecha] = useState<string>(() => hoyLocal());

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    // setState con la misma cadena es un no-op en React: si el día no cambió,
    // esto no provoca render.
    const sincronizar = () => setFecha(hoyLocal());

    const programarMedianoche = () => {
      if (temporizador) clearTimeout(temporizador);
      const espera = Math.min(msHastaMedianoche(), MS_POR_DIA);
      temporizador = setTimeout(() => {
        sincronizar();
        programarMedianoche();
      }, espera);
    };

    const alCambiarEstado = (estado: AppStateStatus) => {
      if (estado === "active") {
        sincronizar();
        // Reprogramar: el temporizador pudo no dispararse en segundo plano, o
        // haberlo hecho con un desfase, según lo que permita el sistema.
        programarMedianoche();
      }
    };

    programarMedianoche();
    const suscripcion = AppState.addEventListener("change", alCambiarEstado);

    return () => {
      if (temporizador) clearTimeout(temporizador);
      suscripcion.remove();
    };
  }, []);

  return fecha;
}
