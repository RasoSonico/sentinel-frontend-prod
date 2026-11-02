/**
 * El día de una máquina como lo ve el supervisor: lo que el servidor ya sabe
 * MÁS lo capturado en el teléfono que todavía no llega (ADR-009 D2, D3, D8).
 *
 * ## Por qué hace falta fundir
 *
 * El hub lo arma el servidor, y en obra se captura sin señal. Si la pantalla
 * pintara solo el hub, la actividad de las 13:10 guardada en modo avión no
 * aparecería en la hoja, la máquina seguiría "Sin reportar" y la barra no la
 * contaría — invitando a capturar dos veces. Para el usuario, que no se haya
 * enviado es un trámite: lo guardado cuenta igual (C9).
 *
 * ## Cómo
 *
 * Se parte de la jornada del servidor y se le aplican, en orden, las capturas
 * de la cola con **las mismas reglas que aplica `POST /capturas/`** (backend
 * `maquinaria/capturas.py`): un inicial abre turno, las actividades van a la
 * jornada del turno abierto —o a la de su fecha si no hay—, un final cierra.
 * Si estas reglas divergieran de las del servidor, la hoja enseñaría algo y
 * el servidor guardaría otra cosa.
 *
 * Una captura ya CONFIRMADA deja de aplicarse en cuanto el caché del hub es
 * más nuevo que su confirmación: a partir de ahí el hub ya la trae, y
 * aplicarla otra vez duplicaría actividades.
 *
 * Sin React ni Realm a propósito —entra lo leído, sale una vista plana— para
 * poder probarlo con el runner de Node (`diaMaquina.test.mjs`) y para que lo
 * que la hoja guarde en su estado nunca sea un objeto vivo de Realm.
 */

/**
 * Espejo de `MAQUINARIA_TURNO_OLVIDADO_HORAS` del servidor.
 *
 * Solo se usa para turnos abiertos EN EL TELÉFONO, que todavía no tienen el
 * `olvidado_en` que calcula el servidor. Para los demás manda el del servidor.
 */
export const UMBRAL_OLVIDO_HORAS = 14;

// ── Entradas: lo que llega del hub y de la cola ─────────────────────────────

export interface DetalleServidor {
  orden: number;
  concept: number | null;
  descripcion: string;
  horas_estimadas: string | null;
  registrado_en?: string | null;
  autor?: string | null;
}

export interface TurnoServidor {
  id: number;
  inicial: string | null;
  final: string | null;
  horas: string | null;
  desde: string;
  hasta: string | null;
  autor_inicio: string | null;
  autor_cierre: string | null;
  cerrado_sin_final: boolean;
}

export interface JornadaServidor {
  fecha: string;
  estado: string | null;
  motivo_inactividad: string | null;
  turnos: ArrayLike<TurnoServidor>;
  detalles: ArrayLike<DetalleServidor>;
}

export interface TurnoAbiertoServidor {
  id: number;
  jornada_fecha: string;
  inicial: string | null;
  desde: string;
  olvidado_en: string;
}

/** Una máquina del hub. Una alta local la trae casi vacía. */
export interface MaquinaServidor {
  id: number;
  tipo: string;
  marca: string;
  modelo: string;
  propietario_tipo: string;
  estancia_id: number;
  maquinariaLocalId: string | null;
  jornada_hoy: JornadaServidor | null;
  turno_abierto: TurnoAbiertoServidor | null;
  jornada_turno_abierto: JornadaServidor | null;
  requiere_atencion: string | null;
  dias_sin_reporte: number;
  ultimo_horometro: string | null;
  ultimo_horometro_fecha: string | null;
  ultima_jornada_trabajada_fecha: string | null;
  ultima_jornada_trabajada_detalles: ArrayLike<DetalleServidor>;
}

export interface CapturaLocal {
  _id: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  errorMotivo: string | null;
  syncedAt: Date | null;
  fecha: string;
  registradoEn: string;
  autor: string;
  horometroInicial: string | null;
  horometroFinal: string | null;
  cerrarAnteriorFinal: string | null;
  cerrarAnteriorSinFinal: boolean;
  estado: string | null;
  motivoInactividad: string | null;
  detalles: ArrayLike<DetalleServidor>;
}

// ── Salida: la vista plana ──────────────────────────────────────────────────

export interface DetalleVista {
  concept: number | null;
  descripcion: string;
  horasEstimadas: string | null;
  registradoEn: string | null;
  autor: string | null;
  /** Guardado en el teléfono y todavía sin enviar: lleva la nube. */
  enCola: boolean;
}

export interface TurnoVista {
  inicial: string | null;
  final: string | null;
  horas: string | null;
  desde: string;
  hasta: string | null;
  autorInicio: string | null;
  autorCierre: string | null;
  cerradoSinFinal: boolean;
  inicioEnCola: boolean;
  cierreEnCola: boolean;
}

export interface JornadaVista {
  fecha: string;
  /** TRABAJANDO · SIN_OPERAR · null (sin reportar: el arranque no reporta). */
  estado: string | null;
  motivo: string | null;
  turnos: TurnoVista[];
  detalles: DetalleVista[];
}

export type EstadoDia = "SIN_REPORTAR" | "TRABAJANDO" | "NO_OPERO";
export type Seccion = "ATENCION" | "SIN_TRABAJAR" | "TRABAJANDO";

export type Atencion =
  | { motivo: "FALLIDA"; capturaId: string; mensaje: string; conflicto: string | null }
  | { motivo: "SIN_FINAL"; jornadaFecha: string; turno: TurnoVista }
  | { motivo: "RECONCILIACION"; dias: number };

export interface VistaMaquina {
  /** Llave estable para la lista y para reencontrar la máquina. */
  llave: string;
  maquina: {
    id: number;
    tipo: string;
    marca: string;
    modelo: string;
    propietario: string;
    estanciaId: number;
    maquinariaLocalId: string | null;
  };
  /** La jornada de HOY, fundida. Siempre existe, aunque esté vacía. */
  hoy: JornadaVista;
  /**
   * El turno sin final de la máquina, si lo hay, con su jornada y si ya pasó
   * el umbral de olvido.
   */
  turnoAbierto: {
    jornadaFecha: string;
    turno: TurnoVista;
    olvidado: boolean;
    /** Epoch ms en que pasa a cierre olvidado. */
    olvidadoEn: number;
  } | null;
  /** La jornada del turno abierto cuando es de otro día y sigue en curso. */
  jornadaNocturna: JornadaVista | null;
  /** De la jornada de HOY: lo único que cuenta para la barra. */
  estadoDia: EstadoDia;
  reportada: boolean;
  seccion: Seccion;
  atencion: Atencion | null;
  /** Hay algo en el teléfono sin enviar (incluido un envío fallido). */
  enCola: boolean;
  /** Actividades de la jornada que la tarjeta resume (hoy, o la nocturna). */
  actividades: number;
  /** TRABAJANDO y ningún turno con lectura (ADR-009 D8, posición 5). */
  faltaHorometro: boolean;
  ultimoHorometro: { valor: string; fecha: string | null } | null;
  ultimaTrabajada: { fecha: string; detalles: DetalleVista[] } | null;
  diasSinReporte: number;
}

// ── Aritmética de lecturas, en décimas ──────────────────────────────────────

/**
 * Las lecturas se restan en DÉCIMAS ENTERAS: `1248.3 − 1240.1` en flotante da
 * 8.199999999999999. Mismo criterio que `maquinariaDelDia.ts`.
 */
const decimas = (lectura: string | null): number | null => {
  if (lectura === null || lectura.trim() === "") return null;
  const valor = Number(lectura);
  return Number.isFinite(valor) ? Math.round(valor * 10) : null;
};

const textoDeDecimas = (d: number): string => {
  const signo = d < 0 ? "-" : "";
  const abs = Math.abs(d);
  return `${signo}${Math.floor(abs / 10)}.${abs % 10}`;
};

/** `final − inicial` como cadena con una decimal, o `null`. Sin acotar a cero. */
export const horasDeLecturas = (
  inicial: string | null,
  final: string | null,
): string | null => {
  const i = decimas(inicial);
  const f = decimas(final);
  return i === null || f === null ? null : textoDeDecimas(f - i);
};

/** Suma de las horas de los turnos completos, o `null` si ninguno lo está. */
export const horasDeJornada = (turnos: TurnoVista[]): string | null => {
  const completas = turnos
    .map((t) => decimas(t.horas))
    .filter((d): d is number => d !== null);
  return completas.length
    ? textoDeDecimas(completas.reduce((a, b) => a + b, 0))
    : null;
};

// ── Conversión de lo del servidor ───────────────────────────────────────────

const detalleDeServidor = (d: DetalleServidor): DetalleVista => ({
  concept: d.concept,
  descripcion: d.descripcion,
  horasEstimadas: d.horas_estimadas,
  registradoEn: d.registrado_en ?? null,
  autor: d.autor ?? null,
  enCola: false,
});

const turnoDeServidor = (t: TurnoServidor): TurnoVista => ({
  inicial: t.inicial,
  final: t.final,
  horas: t.horas,
  desde: t.desde,
  hasta: t.hasta,
  autorInicio: t.autor_inicio,
  autorCierre: t.autor_cierre,
  cerradoSinFinal: t.cerrado_sin_final,
  inicioEnCola: false,
  cierreEnCola: false,
});

const jornadaDeServidor = (j: JornadaServidor): JornadaVista => ({
  fecha: j.fecha,
  estado: j.estado,
  motivo: j.motivo_inactividad,
  turnos: Array.from(j.turnos).map(turnoDeServidor),
  detalles: Array.from(j.detalles).map(detalleDeServidor),
});

const jornadaVacia = (fecha: string): JornadaVista => ({
  fecha,
  estado: null,
  motivo: null,
  turnos: [],
  detalles: [],
});

const estaAbierto = (t: TurnoVista) => t.final === null && !t.cerradoSinFinal;

/** Una captura que ya no se reintenta sola: necesita a una persona. */
const atorada = (c: CapturaLocal) =>
  c.status === "failed" && c.retryCount >= c.maxRetries;

/**
 * ¿El hub ya trae esta captura? Solo si se confirmó ANTES de que se escribiera
 * el caché. Sin caché, nada lo trae.
 */
const yaEnElHub = (c: CapturaLocal, hubEscritoEn: Date | null) =>
  c.status === "done" &&
  c.syncedAt !== null &&
  hubEscritoEn !== null &&
  c.syncedAt.getTime() < hubEscritoEn.getTime();

export const estadoDiaDe = (j: JornadaVista): EstadoDia =>
  j.estado === "TRABAJANDO"
    ? "TRABAJANDO"
    : j.estado === "SIN_OPERAR"
      ? "NO_OPERO"
      : "SIN_REPORTAR";

/** ¿Hay algo registrado —enviado o en cola— en esta jornada? */
export const tieneRegistros = (j: JornadaVista): boolean =>
  j.estado !== null || j.turnos.length > 0 || j.detalles.length > 0;

// ── La fusión ───────────────────────────────────────────────────────────────

export interface EntradaVista {
  maquina: MaquinaServidor;
  /** Las capturas de ESTA máquina, en el orden en que se guardaron. */
  capturas: CapturaLocal[];
  hubEscritoEn: Date | null;
  /** Fecha local de hoy, YYYY-MM-DD. */
  hoy: string;
  ahora: Date;
}

export function construirVista({
  maquina,
  capturas,
  hubEscritoEn,
  hoy,
  ahora,
}: EntradaVista): VistaMaquina {
  const jornadas = new Map<string, JornadaVista>();
  const jornadaDe = (fecha: string) => {
    let j = jornadas.get(fecha);
    if (!j) {
      j = jornadaVacia(fecha);
      jornadas.set(fecha, j);
    }
    return j;
  };

  if (maquina.jornada_hoy) {
    jornadas.set(maquina.jornada_hoy.fecha, jornadaDeServidor(maquina.jornada_hoy));
  }
  if (maquina.jornada_turno_abierto) {
    jornadas.set(
      maquina.jornada_turno_abierto.fecha,
      jornadaDeServidor(maquina.jornada_turno_abierto),
    );
  }

  // El turno abierto del servidor, como referencia a la MISMA vista que vive
  // en su jornada: cerrarlo desde la cola tiene que verse ahí.
  let abierto: { jornadaFecha: string; turno: TurnoVista; olvidadoEn: number } | null =
    null;
  if (maquina.turno_abierto) {
    const ta = maquina.turno_abierto;
    const jornada = jornadaDe(ta.jornada_fecha);
    let turno = jornada.turnos.find((t) => estaAbierto(t) && t.desde === ta.desde);
    if (!turno) {
      // La jornada del turno no vino completa (no debería): se arma lo mínimo
      // para no perder que hay un turno abierto.
      turno = {
        inicial: ta.inicial,
        final: null,
        horas: null,
        desde: ta.desde,
        hasta: null,
        autorInicio: null,
        autorCierre: null,
        cerradoSinFinal: false,
        inicioEnCola: false,
        cierreEnCola: false,
      };
      jornada.turnos.push(turno);
    }
    abierto = {
      jornadaFecha: ta.jornada_fecha,
      turno,
      olvidadoEn: new Date(ta.olvidado_en).getTime(),
    };
  }

  let fallida: CapturaLocal | null = null;
  let enCola = false;

  for (const c of capturas) {
    if (yaEnElHub(c, hubEscritoEn)) continue;
    const pendiente = c.status !== "done";
    if (pendiente) enCola = true;

    // Una fallida no se aplica: el servidor la rechazó y lo que traía no
    // está en ninguna parte. La tarjeta la manda a "Requiere atención".
    if (atorada(c)) {
      fallida = fallida ?? c;
      continue;
    }

    // ── Resolver un cierre olvidado ───────────────────────────────────
    if (c.cerrarAnteriorFinal !== null || c.cerrarAnteriorSinFinal) {
      if (abierto) {
        const t = abierto.turno;
        if (c.cerrarAnteriorFinal !== null) {
          t.final = c.cerrarAnteriorFinal;
          t.horas = horasDeLecturas(t.inicial, t.final);
        } else {
          t.cerradoSinFinal = true;
        }
        t.hasta = c.registradoEn;
        t.autorCierre = c.autor || null;
        t.cierreEnCola = pendiente;
        abierto = null;
      }
      continue;
    }

    // ── "No operó" ────────────────────────────────────────────────────
    if (c.estado === "SIN_OPERAR") {
      const j = jornadaDe(c.fecha);
      j.estado = "SIN_OPERAR";
      j.motivo = c.motivoInactividad;
      continue;
    }

    // ── Un inicial con turno abierto: el servidor lo rechazará entero ──
    if (c.horometroInicial !== null && abierto) continue;

    if (c.horometroInicial !== null) {
      const turno: TurnoVista = {
        inicial: c.horometroInicial,
        final: null,
        horas: null,
        desde: c.registradoEn,
        hasta: null,
        autorInicio: c.autor || null,
        autorCierre: null,
        cerradoSinFinal: false,
        inicioEnCola: pendiente,
        cierreEnCola: false,
      };
      jornadaDe(c.fecha).turnos.push(turno);
      abierto = {
        jornadaFecha: c.fecha,
        turno,
        olvidadoEn:
          new Date(c.registradoEn).getTime() + UMBRAL_OLVIDO_HORAS * 3600 * 1000,
      };
    }

    // ── Actividades: a la jornada del turno abierto, o a la de su fecha ──
    const renglones = Array.from(c.detalles).sort((a, b) => a.orden - b.orden);
    if (renglones.length) {
      const j = jornadaDe(abierto ? abierto.jornadaFecha : c.fecha);
      for (const d of renglones) {
        j.detalles.push({
          concept: d.concept,
          descripcion: d.descripcion,
          horasEstimadas: d.horas_estimadas,
          registradoEn: c.registradoEn,
          autor: c.autor || null,
          enCola: pendiente,
        });
      }
      // P1: una actividad después de "No operó" la pasa a TRABAJANDO.
      j.estado = "TRABAJANDO";
      j.motivo = null;
    }

    // ── El final cierra, DESPUÉS de las actividades ───────────────────
    if (c.horometroFinal !== null && abierto) {
      const t = abierto.turno;
      t.final = c.horometroFinal;
      t.horas = horasDeLecturas(t.inicial, t.final);
      t.hasta = c.registradoEn;
      t.autorCierre = c.autor || null;
      t.cierreEnCola = pendiente;
      abierto = null;
    }
  }

  const hoyJ = jornadaDe(hoy);
  const olvidado = abierto !== null && ahora.getTime() > abierto.olvidadoEn;
  const jornadaNocturna =
    abierto && !olvidado && abierto.jornadaFecha !== hoy
      ? jornadaDe(abierto.jornadaFecha)
      : null;

  const estadoDia = estadoDiaDe(hoyJ);
  const reportada = estadoDia !== "SIN_REPORTAR";

  // Prioridad: lo que no se envió, luego el cierre olvidado —que bloquea
  // reportar—, luego la reconciliación, que se apaga en cuanto hoy se reporta.
  let atencion: Atencion | null = null;
  if (fallida) {
    atencion = {
      motivo: "FALLIDA",
      capturaId: fallida._id,
      mensaje: fallida.errorMessage ?? "No se pudo enviar",
      conflicto: fallida.errorMotivo,
    };
  } else if (abierto && olvidado) {
    atencion = {
      motivo: "SIN_FINAL",
      jornadaFecha: abierto.jornadaFecha,
      turno: abierto.turno,
    };
  } else if (maquina.requiere_atencion === "RECONCILIACION" && !reportada) {
    atencion = { motivo: "RECONCILIACION", dias: maquina.dias_sin_reporte };
  }

  // El nocturno en curso pone la máquina en "Trabajando" con el estatus de
  // ESA jornada (P2) — pero solo si ya trabajó: un arranque de anoche sin
  // actividades no reporta, igual que el de esta mañana (D2).
  const nocturnoTrabajando = jornadaNocturna?.estado === "TRABAJANDO";
  const seccion: Seccion = atencion
    ? "ATENCION"
    : nocturnoTrabajando || estadoDia === "TRABAJANDO"
      ? "TRABAJANDO"
      : "SIN_TRABAJAR";

  const jornadaTarjeta = nocturnoTrabajando && jornadaNocturna ? jornadaNocturna : hoyJ;
  const faltaHorometro =
    jornadaTarjeta.estado === "TRABAJANDO" &&
    !jornadaTarjeta.turnos.some((t) => t.inicial !== null || t.final !== null);

  // La última lectura de cierre: la del teléfono si hay una más nueva que la
  // del servidor. Es la sugerencia del inicial.
  let ultimoHorometro: VistaMaquina["ultimoHorometro"] = maquina.ultimo_horometro
    ? { valor: maquina.ultimo_horometro, fecha: maquina.ultimo_horometro_fecha }
    : null;
  for (const [fecha, j] of [...jornadas.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const t of j.turnos) {
      if (t.final !== null && (!ultimoHorometro?.fecha || fecha >= ultimoHorometro.fecha)) {
        ultimoHorometro = { valor: t.final, fecha };
      }
    }
  }

  const ultimaTrabajada = maquina.ultima_jornada_trabajada_fecha
    ? {
        fecha: maquina.ultima_jornada_trabajada_fecha,
        detalles: Array.from(maquina.ultima_jornada_trabajada_detalles).map(
          detalleDeServidor,
        ),
      }
    : null;

  return {
    // Con el id del servidor en cuanto existe: la fila local y la del hub
    // comparten llave, y la transición al sincronizar es una actualización
    // y no una fila que muere y otra que nace.
    llave: maquina.id > 0 ? `m-${maquina.id}` : `local-${maquina.maquinariaLocalId}`,
    maquina: {
      id: maquina.id,
      tipo: maquina.tipo,
      marca: maquina.marca,
      modelo: maquina.modelo,
      propietario: maquina.propietario_tipo,
      estanciaId: maquina.estancia_id,
      maquinariaLocalId: maquina.maquinariaLocalId,
    },
    hoy: hoyJ,
    turnoAbierto: abierto
      ? {
          jornadaFecha: abierto.jornadaFecha,
          turno: abierto.turno,
          olvidado,
          olvidadoEn: abierto.olvidadoEn,
        }
      : null,
    jornadaNocturna,
    estadoDia,
    reportada,
    seccion,
    atencion,
    enCola,
    actividades: jornadaTarjeta.detalles.length,
    faltaHorometro,
    ultimoHorometro,
    ultimaTrabajada,
    diasSinReporte: maquina.dias_sin_reporte,
  };
}

/**
 * Las actividades de un turno ya cerrado: las registradas entre su arranque
 * y su cierre, incluida la que vino con el cierre (decisión del 31-oct).
 * Alimenta "Turno anterior · N actividades" y "Repetir lo del turno anterior".
 */
export const actividadesDelTurno = (
  turno: TurnoVista,
  detalles: DetalleVista[],
): DetalleVista[] => {
  const desde = new Date(turno.desde).getTime();
  const hasta = turno.hasta ? new Date(turno.hasta).getTime() : Infinity;
  return detalles.filter((d) => {
    if (!d.registradoEn) return false;
    const t = new Date(d.registradoEn).getTime();
    return t >= desde && t <= hasta;
  });
};
