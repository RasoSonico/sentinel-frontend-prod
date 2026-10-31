/**
 * Regla del tap (ADR-007 D12) como **máquina de estados pura**.
 *
 * Vive separada del hook a propósito. El defecto que esta regla corrige no es
 * visual: es de **orden de eventos**, y el orden en que React Native entrega
 * `onPress`, `onFocus` y `onTouchEnd` no está garantizado ni es el mismo en
 * todas las superficies. Un bug de orden no se razona mirando el código; se
 * prueba contra cada orden posible.
 *
 * Aquí no hay React, ni React Native, ni temporizadores: entra un evento, sale
 * un estado. Eso es lo que permite probarla de verdad (`reglaDelTap.test.mjs`).
 *
 * ## El principio
 *
 * El cierre se decide **dos veces**: cuando se agenda y cuando va a ejecutarse.
 * Entre esos dos momentos puede haber pasado un `abrir`, y entonces el cierre
 * ya no representa lo que el usuario quiso. La `generacion` es lo que permite
 * notarlo sin importar en qué orden llegaron los eventos.
 */

export interface EstadoTap {
  /** Id del elemento abierto, o `null`. */
  abierto: string | null;
  /** El toque en curso cayó dentro del elemento abierto. */
  dentro: boolean;
  /** Durante este gesto se llamó a `abrir`. */
  abrioEnEsteGesto: boolean;
  /**
   * Sube con cada `abrir` o `cerrar`.
   *
   * Un cierre agendado guarda la generación que había al agendarse; si al
   * ejecutarse no coincide, alguien cambió de opinión en el camino y el cierre
   * se descarta.
   */
  generacion: number;
  /** Generación con la que se agendó el cierre pendiente, o `null`. */
  cierreAgendadoEn: number | null;
}

export type EventoTap =
  /** Empieza un toque. Captura en la raíz: corre antes que cualquier hijo. */
  | { tipo: "toqueInicia" }
  /** Captura del elemento abierto: el toque es suyo. */
  | { tipo: "toqueCaeDentro" }
  /** Alguien pidió abrir: un `onPress`, un `onFocus`. */
  | { tipo: "abrir"; id: string }
  /** Cierre explícito del componente. */
  | { tipo: "cerrar" }
  /** Termina el toque. Aquí se decide si se agenda un cierre. */
  | { tipo: "toqueTermina" }
  /** El cuadro siguiente llegó y el cierre agendado va a ejecutarse. */
  | { tipo: "cierrePendienteCorre" };

export const estadoInicial: EstadoTap = {
  abierto: null,
  dentro: false,
  abrioEnEsteGesto: false,
  generacion: 0,
  cierreAgendadoEn: null,
};

export function reducir(estado: EstadoTap, evento: EventoTap): EstadoTap {
  switch (evento.tipo) {
    case "toqueInicia":
      // Solo se olvida DÓNDE cayó el toque anterior.
      //
      // `abrioEnEsteGesto` **no se toca aquí**, y es deliberado: hay
      // superficies donde el `onFocus` de un campo llega ANTES de esta
      // captura, y borrar la marca aquí descartaba un `abrir` que sí
      // pertenecía a este gesto. El elemento se abría y el cierre agendado lo
      // apagaba un cuadro después: "no sale a la primera". La marca se consume
      // al TERMINAR el toque, que es donde se usa.
      return { ...estado, dentro: false };

    case "toqueCaeDentro":
      return { ...estado, dentro: true };

    case "abrir":
      // Abrir INVALIDA cualquier cierre agendado, haya llegado antes o después
      // del final del toque. Es el punto entero de la generación: sin esto,
      // tocar un campo mientras otro bloque estaba abierto agendaba un cierre
      // que llegaba tarde y apagaba el que acababa de abrirse.
      return {
        ...estado,
        abierto: evento.id,
        abrioEnEsteGesto: true,
        generacion: estado.generacion + 1,
        cierreAgendadoEn: null,
      };

    case "cerrar":
      return {
        ...estado,
        abierto: null,
        generacion: estado.generacion + 1,
        cierreAgendadoEn: null,
      };

    case "toqueTermina": {
      // La marca se CONSUME aquí: se usa para decidir y queda limpia para el
      // gesto siguiente. Si se limpiara al empezar, un `onFocus` adelantado se
      // perdería; si no se limpiara nunca, un `abrir` viejo bloquearía cierres
      // legítimos para siempre.
      const consumido = { ...estado, abrioEnEsteGesto: false };

      // El toque fue dentro del abierto: su interior tiene que ser usable.
      if (estado.dentro) return consumido;
      // Este gesto ya dijo qué quería abrir; cerrarlo sería deshacerlo.
      if (estado.abrioEnEsteGesto) return consumido;
      // No hay nada abierto que cerrar.
      if (estado.abierto === null) return consumido;
      // Ya hay uno agendado.
      if (estado.cierreAgendadoEn !== null) return consumido;
      return { ...consumido, cierreAgendadoEn: estado.generacion };
    }

    case "cierrePendienteCorre": {
      if (estado.cierreAgendadoEn === null) return estado;
      // La segunda decisión. Si la generación cambió, entre el agendado y
      // ahora alguien abrió o cerró algo: este cierre ya no representa nada.
      if (estado.cierreAgendadoEn !== estado.generacion) {
        return { ...estado, cierreAgendadoEn: null };
      }
      return {
        ...estado,
        abierto: null,
        generacion: estado.generacion + 1,
        cierreAgendadoEn: null,
      };
    }

    default:
      return estado;
  }
}

/** Aplica una secuencia completa. Lo que usan las pruebas. */
export const correr = (eventos: EventoTap[], desde = estadoInicial): EstadoTap =>
  eventos.reduce(reducir, desde);
