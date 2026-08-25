/**
 * Cálculos del programa contractual (ADR-004 D7, enmiendas E2 y E3).
 *
 * Funciones PURAS sobre la serie que viaja en `avance/base/`. Viven en su
 * propio módulo y no dentro de `sabanaTreeBuilder` —que es donde el ADR las
 * ubicaba— solo por navegabilidad: ese archivo ya concentra el armado del árbol
 * y la búsqueda. La propiedad que el ADR pedía se conserva íntegra: son puras,
 * no tocan Realm ni hooks, y se prueban solas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTRATO COMPARTIDO CON EL BACKEND — `programa/services/reparto.py`
 * ═══════════════════════════════════════════════════════════════════════════
 * `programadoAFecha` debe dar EXACTAMENTE lo mismo que `programado_a_fecha`
 * del backend. Si divergen, el número de la franja del Hoy y el de las filas
 * de la sábana se contradicen en la misma pantalla.
 *
 * Las fechas se comparan por COMPONENTES DE FECHA LOCAL, nunca con
 * `new Date(string)` — que interpreta un `YYYY-MM-DD` como medianoche UTC y en
 * México lo corre un día hacia atrás (D9 del ADR-003).
 */

/** Volumen mínimo bajo el cual un programado se considera cero. */
const EPSILON = 0.00005;

/**
 * Banda muerta del estado, ±2% del programado (D7).
 * Evita chips que parpadean por redondeos de campo. Valor sin calibrar: se
 * ajusta con evidencia de piloto (deuda #2 del ADR-004).
 */
export const BANDA_MUERTA = 0.02;

/**
 * Resultado de COMPARAR ejecutado contra programado. Nada más.
 *
 * `NO_INICIADO` salió de aquí a propósito: no es un resultado de comparación,
 * es una propiedad del programa —todavía no exige nada— y es **ortogonal** al
 * avance. Mientras vivieron en el mismo enum, un concepto cuyo programa arranca
 * la semana entrante pero que ya tiene volumen capturado solo podía anunciar
 * una de las dos cosas, y la que ganaba era la menos útil: decía "Inicia 26/07"
 * y se callaba que el contratista va adelantado. Ahora conviven: el estado dice
 * cómo va y `DatosPrograma.noIniciado` dice que aún no arranca.
 */
export type EstadoPrograma = "AL_DIA" | "ADELANTADO" | "ATRASADO";

export interface CorteSerie {
  /** `YYYY-MM-DD` */
  fecha_corte: string;
  volumen_acumulado: number;
}

export interface FilaPrograma {
  fecha_inicio: string;
  fecha_fin: string;
  volumen_total: number;
  cortes: CorteSerie[];
}

// ─── Fechas: aritmética por componentes locales ──────────────────────────────

/**
 * `YYYY-MM-DD` → número comparable (días desde época civil, sin husos).
 *
 * Se usa un contador de días propio y no `Date` para que la comparación no
 * dependa del huso del dispositivo ni del horario de verano: dos fechas de
 * calendario se comparan como calendario.
 */
export function diaCivil(fecha: string): number {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return NaN;
  // Algoritmo de días desde la era civil (Howard Hinnant): exacto para
  // cualquier fecha gregoriana, sin depender de Date.
  const anio = m <= 2 ? a - 1 : a;
  const era = Math.floor(anio / 400);
  const yoe = anio - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Fecha local de hoy como `YYYY-MM-DD`, por componentes (nunca ISO/UTC). */
export function hoyLocal(referencia: Date = new Date()): string {
  const mes = String(referencia.getMonth() + 1).padStart(2, "0");
  const dia = String(referencia.getDate()).padStart(2, "0");
  return `${referencia.getFullYear()}-${mes}-${dia}`;
}

// ─── El contrato ─────────────────────────────────────────────────────────────

/**
 * Volumen programado a `hoy`, interpolando TRAMO POR TRAMO entre los dos
 * puntos que rodean a hoy — no de punta a punta de la barra (enmienda E2).
 *
 *   hoy <  fecha_inicio → 0
 *   hoy >= fecha_fin    → volumen_total
 *   en medio            → interpolación lineal entre los puntos que lo rodean
 *
 * Los puntos son los cortes DENTRO de la barra más dos anclas, y ambas son
 * necesarias:
 *
 *   (fecha_inicio − 1 día, 0)   el acumulado es cero al cerrar el día ANTERIOR
 *                               al arranque: al cerrar `fecha_inicio` ya se
 *                               ejecutó un día completo de trabajo.
 *   (fecha_fin, volumen_total)  al cerrar el fin de barra está todo.
 *
 * Sin el ancla de inicio, el día 2 de una barra de 36 días con 200 m³ daría
 * 7.4074 en vez de 11.1111. Sin la de fin, un día posterior al cierre
 * interpolaría hacia un corte que cae FUERA de la barra y se quedaría corto.
 *
 * En un tramo con programado plano (una interrupción del programa) devuelve el
 * mismo valor en ambos extremos — correctamente plano, sin inventar volumen
 * que el contrato no pedía.
 */
export function programadoAFecha(fila: FilaPrograma, hoy: string): number {
  const dInicio = diaCivil(fila.fecha_inicio);
  const dFin = diaCivil(fila.fecha_fin);
  const dHoy = diaCivil(hoy);

  if (isNaN(dInicio) || isNaN(dFin) || isNaN(dHoy)) return 0;
  if (dHoy < dInicio) return 0;
  if (dHoy >= dFin) return fila.volumen_total;

  const tramo = tramoQueContiene(fila, dHoy);
  if (!tramo) return fila.volumen_total;

  const diasTramo = tramo.hasta.dia - tramo.desde.dia;
  if (diasTramo <= 0) return tramo.desde.valor;
  const avance =
    ((tramo.hasta.valor - tramo.desde.valor) * (dHoy - tramo.desde.dia)) /
    diasTramo;
  return tramo.desde.valor + avance;
}

interface Punto {
  dia: number;
  valor: number;
}

/**
 * Los puntos de interpolación de la barra: los cortes que caen DENTRO de ella
 * más las dos anclas obligatorias descritas arriba.
 *
 * Se aísla para que `programadoAFecha` y el rendimiento del tramo trabajen
 * sobre exactamente la misma geometría — si divergieran, el recuadro de la
 * ficha podría comparar contra un tramo que no es el que produjo el número de
 * la fila.
 */
function puntosDeInterpolacion(fila: FilaPrograma): Punto[] {
  const dInicio = diaCivil(fila.fecha_inicio);
  const dFin = diaCivil(fila.fecha_fin);
  const puntos: Punto[] = [{ dia: dInicio - 1, valor: 0 }];
  for (const corte of fila.cortes) {
    const dCorte = diaCivil(corte.fecha_corte);
    if (!isNaN(dCorte) && dCorte >= dInicio && dCorte < dFin) {
      puntos.push({ dia: dCorte, valor: corte.volumen_acumulado });
    }
  }
  puntos.push({ dia: dFin, valor: fila.volumen_total });
  puntos.sort((a, b) => a.dia - b.dia);
  return puntos;
}

/** Tramo `[desde, hasta)` que contiene el día dado, o `null` si cae fuera. */
function tramoQueContiene(
  fila: FilaPrograma,
  dia: number,
): { desde: Punto; hasta: Punto } | null {
  const puntos = puntosDeInterpolacion(fila);
  for (let i = 0; i < puntos.length - 1; i++) {
    if (dia >= puntos[i].dia && dia < puntos[i + 1].dia) {
      return { desde: puntos[i], hasta: puntos[i + 1] };
    }
  }
  return null;
}

/**
 * Volumen/día que el programa pide EN EL TRAMO vigente (E3).
 *
 * Es una propiedad del programa, no del avance: no depende de qué día se mire
 * dentro del tramo ni de cuánto se lleve ejecutado. Esa estabilidad es lo que
 * la hace servir de referencia — un denominador que se mueve solo porque pasan
 * los días no permitiría leer "necesito el doble de lo planeado".
 *
 * Devuelve `null` cuando hoy cae fuera de la barra (antes del arranque o desde
 * el fin en adelante): ahí el programa no pide nada por día y no hay contra qué
 * comparar.
 */
export function rendimientoProgramadoDelTramo(
  fila: FilaPrograma,
  hoy: string,
): number | null {
  const dHoy = diaCivil(hoy);
  if (isNaN(dHoy)) return null;
  const tramo = tramoQueContiene(fila, dHoy);
  if (!tramo) return null;
  const dias = tramo.hasta.dia - tramo.desde.dia;
  if (dias <= 0) return null;
  return (tramo.hasta.valor - tramo.desde.valor) / dias;
}

/**
 * El programa todavía no exige nada, pero exigirá: aún no arranca.
 *
 * Se calcula aparte del estado porque son hechos independientes. Un concepto
 * puede no haber arrancado y estar adelantado al mismo tiempo —el contratista
 * se adelantó al programa— y la fila debe poder decir las dos cosas.
 */
export function programaNoIniciado(
  programado: number,
  proximoCorteConVolumen: boolean,
): boolean {
  return programado <= EPSILON && proximoCorteConVolumen;
}

/**
 * Estado del objetivo contra el programa (D7, corregido por E2: se evalúa
 * contra el volumen interpolado a HOY, no contra el último corte).
 *
 * `SIN_PROGRAMA` NO es un valor de retorno: la ausencia de programa se
 * representa como ausencia de dato (D11), y quien no tiene fila simplemente no
 * llama a esta función.
 *
 * `AL_DIA` es silencio en la UI: la señal útil es la desviación, y cientos de
 * chips verdes idénticos serían ruido.
 */
export function estadoPrograma(
  programado: number,
  ejecutado: number,
): EstadoPrograma {
  if (programado <= EPSILON) {
    // El programa no exige nada a la fecha. Si aun así hay volumen capturado,
    // el contratista se adelantó y eso ES un adelanto real —no un empate—:
    // decirlo "al día" borraría el único mérito que hay que reportar.
    return ejecutado > EPSILON ? "ADELANTADO" : "AL_DIA";
  }

  const tolerancia = programado * BANDA_MUERTA;
  if (Math.abs(ejecutado - programado) <= tolerancia) return "AL_DIA";
  return ejecutado > programado ? "ADELANTADO" : "ATRASADO";
}

export interface ProgramaVencido {
  /** Volumen que el programa exigía y nunca se ejecutó. */
  faltante: number;
  /** Fecha en que la barra debía cerrar. */
  fechaFin: string;
  /** Días transcurridos desde el cierre. */
  diasDeVencimiento: number;
}

/**
 * El programa de este objetivo YA CERRÓ y quedó volumen sin ejecutar.
 *
 * Es el hueco que dejaban las dos tarjetas del recuadro: pasada `fecha_fin` no
 * hay próximo corte ni tramo vigente, así que ambas desaparecían y la ficha se
 * quedaba muda justo en el caso que más exige actuar. La ausencia de tarjetas
 * era correcta —no existe la meta ni el rendimiento— pero el silencio no lo
 * era: aquí sí hay dato, y es el más accionable de todos.
 *
 * `null` cuando el programa sigue vigente o cuando cerró habiendo cumplido: un
 * concepto terminado a tiempo no necesita que se le diga nada.
 */
export function programaVencido(
  fila: FilaPrograma,
  ejecutado: number,
  hoy: string,
  /**
   * Total esperado en la MISMA unidad que `ejecutado`. Por defecto el volumen
   * de la fila, que es lo correcto a nivel concepto. A nivel partida hay que
   * pasar el importe contratado: ahí la comparación va valorizada porque una
   * partida agrupa m³ con PZA y su volumen no es comparable contra nada.
   */
  totalEsperado: number = fila.volumen_total,
): ProgramaVencido | null {
  const dFin = diaCivil(fila.fecha_fin);
  const dHoy = diaCivil(hoy);
  if (isNaN(dFin) || isNaN(dHoy) || dHoy <= dFin) return null;

  const faltante = totalEsperado - ejecutado;
  if (faltante <= EPSILON) return null;

  return {
    faltante,
    fechaFin: fila.fecha_fin,
    diasDeVencimiento: dHoy - dFin,
  };
}

/** Primer corte con volumen mayor al ya programado a hoy. */
export function proximoCorte(
  fila: FilaPrograma,
  hoy: string,
): CorteSerie | null {
  const dHoy = diaCivil(hoy);
  const ordenados = [...fila.cortes].sort(
    (a, b) => diaCivil(a.fecha_corte) - diaCivil(b.fecha_corte),
  );
  for (const corte of ordenados) {
    if (diaCivil(corte.fecha_corte) > dHoy) return corte;
  }
  return null;
}

export interface RendimientoRequerido {
  /** Volumen/día que hace falta para llegar a la meta del próximo corte. */
  requerido: number;
  /** Volumen/día que el programa pide en el tramo vigente (no depende de hoy). */
  programado: number;
  diasAlCorte: number;
  faltante: number;
}

/**
 * Capa preventiva de la fase (E3): cuando el requerido se despega del
 * programado, la alerta llega semanas antes de que el corte lo confirme.
 *
 * Las dos cifras se leen como una razón —"necesito 3× lo planeado"— y por eso
 * el programado NO se recalcula sobre la ventana que queda al corte: si lo
 * hiciera, ambos números se moverían solos con el paso de los días y en el
 * último día del tramo el programado caería a cero, apagando la comparación
 * justo cuando el atraso es máximo. El programado es el del TRAMO, estable.
 *
 * Devuelve `null` —y la UI omite la tarjeta— cuando no hay próximo corte,
 * cuando ya se alcanzó la meta, o cuando el tramo vigente pide cero (una
 * interrupción del programa, o un hoy fuera de la barra): ahí no hay contra qué
 * comparar y fabricar un denominador sería inventar.
 */
export function rendimientoRequerido(
  fila: FilaPrograma,
  ejecutado: number,
  hoy: string,
): RendimientoRequerido | null {
  const siguiente = proximoCorte(fila, hoy);
  if (!siguiente) return null;

  const diasAlCorte = diaCivil(siguiente.fecha_corte) - diaCivil(hoy);
  if (diasAlCorte <= 0) return null;

  const faltante = siguiente.volumen_acumulado - ejecutado;
  if (faltante <= EPSILON) return null;

  const programado = rendimientoProgramadoDelTramo(fila, hoy);
  if (programado === null || programado <= EPSILON) return null;

  return {
    requerido: faltante / diasAlCorte,
    programado,
    diasAlCorte,
    faltante,
  };
}
