/**
 * Pruebas del paso del selector de fechas a los días que pide la descarga.
 *
 * Se corren con el runner de Node: `npm run test:logica`. Fijan la zona del
 * centro de México, que es donde el corte en la "T" del ISO se equivoca de día.
 */

globalThis.process.env.TZ = "America/Mexico_City";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { diasDe, fechaLocal, periodoDe } from "./periodo.ts";

describe("fechaLocal", () => {
  test("una fecha pura pasa tal cual", () => {
    assert.equal(fechaLocal("2026-10-31"), "2026-10-31");
  });

  test("el último segundo de octubre en UTC sigue siendo 31 de octubre", () => {
    // 23:59:59 del 31 en el centro = 05:59:59 del 1-nov en UTC.
    assert.equal(fechaLocal("2026-11-01T05:59:59.999Z"), "2026-10-31");
  });

  test("el primer segundo del día", () => {
    assert.equal(fechaLocal("2026-10-01T06:00:00.000Z"), "2026-10-01");
  });
});

describe("periodoDe", () => {
  test("un rango del selector da sus días locales", () => {
    assert.deepEqual(
      periodoDe({
        type: "range",
        startDate: "2026-10-01T06:00:00.000Z",
        endDate: "2026-11-01T05:59:59.999Z",
      }),
      { desde: "2026-10-01", hasta: "2026-10-31" },
    );
  });

  test("un día suelto es un rango de un día", () => {
    assert.deepEqual(periodoDe({ type: "single", date: "2026-10-15" }), {
      desde: "2026-10-15",
      hasta: "2026-10-15",
    });
  });

  test("al revés se ordena", () => {
    assert.deepEqual(
      periodoDe({ type: "range", startDate: "2026-10-20", endDate: "2026-10-10" }),
      { desde: "2026-10-10", hasta: "2026-10-20" },
    );
  });

  test("sin filtro no hay periodo", () => {
    assert.equal(periodoDe(null), null);
  });
});

describe("diasDe", () => {
  test("cuenta los dos extremos", () => {
    assert.equal(diasDe({ desde: "2026-10-01", hasta: "2026-10-31" }), 31);
    assert.equal(diasDe({ desde: "2026-10-15", hasta: "2026-10-15" }), 1);
    assert.equal(diasDe({ desde: "2026-01-01", hasta: "2026-12-31" }), 365);
  });
});
