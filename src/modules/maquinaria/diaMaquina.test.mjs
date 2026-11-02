/**
 * Pruebas de la fusión del día de una máquina (ADR-009 D2, D8).
 *
 * Se corren con el runner de Node: `npm run test:logica`.
 *
 * Lo que se prueba es que el teléfono clasifique y pinte lo mismo que el
 * servidor va a guardar: que el arranque no reporte, que una actividad en
 * cola sí, que la actividad de la madrugada vaya a la jornada del turno
 * nocturno, y que el cierre olvidado bloquee.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  actividadesDelTurno,
  construirVista,
  horasDeLecturas,
} from "./diaMaquina.ts";

const HOY = "2026-10-16";
const AYER = "2026-10-15";
const AHORA = new Date("2026-10-16T13:00:00-06:00");

const maquina = (extra = {}) => ({
  id: 1,
  tipo: "Motoconformadora",
  marca: "Caterpillar",
  modelo: "140",
  propietario_tipo: "RENTADA",
  estancia_id: 10,
  maquinariaLocalId: null,
  jornada_hoy: null,
  turno_abierto: null,
  jornada_turno_abierto: null,
  requiere_atencion: null,
  dias_sin_reporte: 0,
  ultimo_horometro: "8871.5",
  ultimo_horometro_fecha: "2026-10-14",
  ultima_jornada_trabajada_fecha: null,
  ultima_jornada_trabajada_detalles: [],
  ...extra,
});

let secuencia = 0;
const captura = (extra = {}) => ({
  _id: `c${(secuencia += 1)}`,
  status: "pending",
  retryCount: 0,
  maxRetries: 3,
  errorMessage: null,
  errorMotivo: null,
  syncedAt: null,
  fecha: HOY,
  registradoEn: "2026-10-16T07:02:00-06:00",
  autor: "J. Pérez",
  horometroInicial: null,
  horometroFinal: null,
  cerrarAnteriorFinal: null,
  cerrarAnteriorSinFinal: false,
  estado: null,
  motivoInactividad: null,
  detalles: [],
  ...extra,
});

const actividad = (descripcion, extra = {}) =>
  captura({
    detalles: [{ orden: 1, concept: null, descripcion, horas_estimadas: null }],
    ...extra,
  });

const vista = (m, capturas, hubEscritoEn = null, ahora = AHORA) =>
  construirVista({ maquina: m, capturas, hubEscritoEn, hoy: HOY, ahora });

describe("clasificación del día (D2)", () => {
  test("sin nada: sin trabajar, sin reportar", () => {
    const v = vista(maquina(), []);
    assert.equal(v.seccion, "SIN_TRABAJAR");
    assert.equal(v.estadoDia, "SIN_REPORTAR");
    assert.equal(v.reportada, false);
  });

  test("el arranque solo NO reporta, aunque esté en cola", () => {
    const v = vista(maquina(), [captura({ horometroInicial: "8871.5" })]);
    assert.equal(v.seccion, "SIN_TRABAJAR");
    assert.equal(v.reportada, false);
    assert.equal(v.enCola, true);
    assert.equal(v.hoy.turnos.length, 1);
  });

  test("una actividad en cola ya la pasa a Trabajando", () => {
    const v = vista(maquina(), [actividad("Acarreo")]);
    assert.equal(v.seccion, "TRABAJANDO");
    assert.equal(v.reportada, true);
    assert.equal(v.actividades, 1);
    assert.equal(v.hoy.detalles[0].enCola, true);
  });

  test("sin lecturas y trabajando: falta el horómetro", () => {
    assert.equal(vista(maquina(), [actividad("Acarreo")]).faltaHorometro, true);
    assert.equal(
      vista(maquina(), [
        captura({ horometroInicial: "1.0" }),
        actividad("Acarreo"),
      ]).faltaHorometro,
      false,
    );
  });

  test("no operó reporta y queda en sin trabajar", () => {
    const v = vista(maquina(), [
      captura({ estado: "SIN_OPERAR", motivoInactividad: "CLIMA" }),
    ]);
    assert.equal(v.estadoDia, "NO_OPERO");
    assert.equal(v.seccion, "SIN_TRABAJAR");
    assert.equal(v.reportada, true);
  });

  test("P1: una actividad después de no operó la pasa a Trabajando", () => {
    const v = vista(maquina(), [
      captura({ estado: "SIN_OPERAR", motivoInactividad: "CLIMA" }),
      actividad("Acarreo"),
    ]);
    assert.equal(v.estadoDia, "TRABAJANDO");
    assert.equal(v.hoy.motivo, null);
  });
});

describe("turnos", () => {
  test("arranque, actividad y cierre arman un turno de 8.0 h", () => {
    const v = vista(maquina(), [
      captura({ horometroInicial: "8871.5" }),
      actividad("Formación de terraplén"),
      captura({ horometroFinal: "8879.5", registradoEn: "2026-10-16T18:05:00-06:00", autor: "L. Ruiz" }),
    ]);
    const [turno] = v.hoy.turnos;
    assert.equal(turno.horas, "8.0");
    assert.equal(turno.autorCierre, "L. Ruiz");
    assert.equal(v.turnoAbierto, null);
    assert.equal(v.ultimoHorometro.valor, "8879.5");
  });

  test("un inicial con turno abierto se ignora: el servidor lo rechazará", () => {
    const v = vista(maquina(), [
      captura({ horometroInicial: "100.0" }),
      captura({ horometroInicial: "200.0" }),
    ]);
    assert.equal(v.hoy.turnos.length, 1);
  });

  test("las horas se restan en décimas, no en flotante", () => {
    assert.equal(horasDeLecturas("1240.1", "1248.3"), "8.2");
    assert.equal(horasDeLecturas("1240.0", "12.0"), "-1228.0");
  });

  test("actividades del turno: entre su arranque y su cierre", () => {
    const v = vista(maquina(), [
      captura({ horometroInicial: "1.0", registradoEn: "2026-10-16T07:00:00-06:00" }),
      actividad("Dentro", { registradoEn: "2026-10-16T09:00:00-06:00" }),
      captura({ horometroFinal: "9.0", registradoEn: "2026-10-16T15:00:00-06:00" }),
      actividad("Después", { registradoEn: "2026-10-16T16:00:00-06:00" }),
    ]);
    const dentro = actividadesDelTurno(v.hoy.turnos[0], v.hoy.detalles);
    assert.deepEqual(dentro.map((d) => d.descripcion), ["Dentro"]);
  });
});

describe("turno nocturno (C7)", () => {
  const conNocturno = () =>
    maquina({
      turno_abierto: {
        id: 5,
        jornada_fecha: AYER,
        inicial: "4210.0",
        desde: "2026-10-15T21:00:00-06:00",
        olvidado_en: new Date(
          new Date("2026-10-15T21:00:00-06:00").getTime() + 14 * 3600 * 1000,
        ).toISOString(),
      },
      jornada_turno_abierto: {
        fecha: AYER,
        estado: null,
        motivo_inactividad: null,
        turnos: [{
          id: 5, inicial: "4210.0", final: null, horas: null,
          desde: "2026-10-15T21:00:00-06:00", hasta: null,
          autor_inicio: "M. Soto", autor_cierre: null, cerrado_sin_final: false,
        }],
        detalles: [],
      },
    });

  test("la actividad de la madrugada va a la jornada de ayer", () => {
    const v = vista(conNocturno(), [actividad("Carga", { fecha: HOY })], null,
      new Date("2026-10-16T03:05:00-06:00"));
    assert.equal(v.jornadaNocturna.fecha, AYER);
    assert.equal(v.jornadaNocturna.detalles.length, 1);
    assert.equal(v.hoy.detalles.length, 0);
    assert.equal(v.seccion, "TRABAJANDO");
    // La barra de HOY no la cuenta: lo reportado es de ayer.
    assert.equal(v.reportada, false);
  });

  test("pasadas las 14 h es un cierre olvidado y pide atención", () => {
    const v = vista(conNocturno(), [], null, new Date("2026-10-16T13:00:00-06:00"));
    assert.equal(v.seccion, "ATENCION");
    assert.equal(v.atencion.motivo, "SIN_FINAL");
    assert.equal(v.jornadaNocturna, null);
  });

  test("resolverlo en cola lo saca de atención sin abrir turno", () => {
    const v = vista(conNocturno(), [captura({ cerrarAnteriorFinal: "4219.0" })]);
    assert.equal(v.atencion, null);
    assert.equal(v.turnoAbierto, null);
    assert.equal(v.seccion, "SIN_TRABAJAR");
  });
});

describe("cola contra hub", () => {
  test("una captura confirmada que el hub ya trae no se aplica dos veces", () => {
    const hub = maquina({
      jornada_hoy: {
        fecha: HOY, estado: "TRABAJANDO", motivo_inactividad: null, turnos: [],
        detalles: [{ orden: 1, concept: null, descripcion: "Acarreo", horas_estimadas: null }],
      },
    });
    const enviada = actividad("Acarreo", {
      status: "done", syncedAt: new Date("2026-10-16T10:00:00Z"),
    });
    const v = vista(hub, [enviada], new Date("2026-10-16T10:00:05Z"));
    assert.equal(v.hoy.detalles.length, 1);
    assert.equal(v.enCola, false);
  });

  test("una fallida va a atención y no se pinta como registrada", () => {
    const v = vista(maquina(), [
      actividad("Acarreo", { status: "failed", retryCount: 3, errorMessage: "No" }),
    ]);
    assert.equal(v.atencion.motivo, "FALLIDA");
    assert.equal(v.hoy.detalles.length, 0);
  });

  test("la reconciliación se apaga en cuanto hoy se reporta", () => {
    const m = maquina({ requiere_atencion: "RECONCILIACION", dias_sin_reporte: 8 });
    assert.equal(vista(m, []).atencion.motivo, "RECONCILIACION");
    assert.equal(vista(m, [actividad("Acarreo")]).atencion, null);
  });
});

describe("cambio de día", () => {
  const ayerCompleto = (extra = {}) => [
    captura({ fecha: AYER, horometroInicial: "100.0", registradoEn: "2026-10-15T07:00:00-06:00", ...extra }),
    actividad("Acarreo", { fecha: AYER, registradoEn: "2026-10-15T13:00:00-06:00", ...extra }),
    captura({ fecha: AYER, horometroFinal: "108.0", registradoEn: "2026-10-15T18:00:00-06:00", ...extra }),
  ];

  test("trabajó ayer en un turno: hoy vuelve a sin trabajar · sin reportar", () => {
    // Hub de HOY ya refrescado: no trae jornada de hoy ni turno abierto.
    const hub = maquina({
      ultimo_horometro: "108.0",
      ultimo_horometro_fecha: AYER,
      ultima_jornada_trabajada_fecha: AYER,
      ultima_jornada_trabajada_detalles: [
        { orden: 1, concept: null, descripcion: "Acarreo", horas_estimadas: null },
      ],
    });
    const v = vista(hub, []);
    assert.equal(v.seccion, "SIN_TRABAJAR");
    assert.equal(v.estadoDia, "SIN_REPORTAR");
    assert.equal(v.reportada, false);
    assert.equal(v.actividades, 0);
    assert.equal(v.ultimoHorometro.valor, "108.0");
  });

  test("lo de ayer que sigue en la cola no se cuela en hoy", () => {
    // Sin señal toda la noche: las tres capturas de ayer siguen pendientes.
    const v = vista(maquina(), ayerCompleto());
    assert.equal(v.seccion, "SIN_TRABAJAR");
    assert.equal(v.reportada, false);
    assert.equal(v.hoy.detalles.length, 0);
    assert.equal(v.turnoAbierto, null);
    // Pero sí es la última lectura: sugiere el inicial de hoy.
    assert.equal(v.ultimoHorometro.valor, "108.0");
    assert.equal(v.ultimoHorometro.fecha, AYER);
    assert.equal(v.enCola, true);
  });

  test("lo de ayer ya enviado y aún sin purgar tampoco", () => {
    const enviadas = ayerCompleto({ status: "done", syncedAt: new Date("2026-10-15T18:01:00-06:00") });
    const v = vista(maquina(), enviadas, new Date("2026-10-16T07:00:00-06:00"));
    assert.equal(v.seccion, "SIN_TRABAJAR");
    assert.equal(v.enCola, false);
  });

  test("un arranque de anoche sin actividades no es Trabajando", () => {
    // Arrancó a las 21:00 y nadie reportó nada: está en curso, pero el
    // arranque no reporta (D2), ni hoy ni ayer.
    const v = vista(maquina(), [
      captura({ fecha: AYER, horometroInicial: "100.0", registradoEn: "2026-10-15T21:00:00-06:00" }),
    ], null, new Date("2026-10-16T06:00:00-06:00"));
    assert.equal(v.seccion, "SIN_TRABAJAR");
    assert.equal(v.reportada, false);
  });
});
