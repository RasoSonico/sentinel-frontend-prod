/**
 * Pruebas de la duración de la obra en días naturales, ambos extremos
 * incluidos. Se corren con `npm run test:logica`.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { diasNaturales, duracionObra } from "./duracionObra.ts";

describe("diasNaturales", () => {
  test("cuenta el día de inicio y el de fin", () => {
    // 17 de enero + 28 + 31 + 30 + 31 + 30.
    assert.equal(diasNaturales("2026-01-15", "2026-06-30"), 167);
  });

  test("el mismo día es 1 día", () => {
    assert.equal(diasNaturales("2026-06-30", "2026-06-30"), 1);
  });

  test("febrero es febrero: del 31 de enero al 28 de febrero son 29 días", () => {
    assert.equal(diasNaturales("2026-01-31", "2026-02-28"), 29);
  });

  test("años bisiestos", () => {
    assert.equal(diasNaturales("2028-01-01", "2028-12-31"), 366);
    assert.equal(diasNaturales("2026-01-01", "2026-12-31"), 365);
  });

  test("acepta fechas con hora, como pueden llegar del servidor", () => {
    assert.equal(diasNaturales("2026-01-15T00:00:00", "2026-06-30"), 167);
  });

  test("sin alguna fecha, o con el fin antes del inicio, no hay duración", () => {
    assert.equal(diasNaturales(null, "2026-06-30"), null);
    assert.equal(diasNaturales("2026-01-15", ""), null);
    assert.equal(diasNaturales("2026-06-30", "2026-01-15"), null);
  });
});

describe("duracionObra", () => {
  test("el texto de la tarjeta", () => {
    assert.equal(duracionObra("2026-01-15", "2026-06-30"), "167 días");
    assert.equal(duracionObra("2026-06-30", "2026-06-30"), "1 día");
    assert.equal(duracionObra("2026-01-15", "2027-06-30"), "532 días");
    assert.equal(duracionObra("2026-01-01", "2028-12-31"), "1,096 días");
    assert.equal(duracionObra(null, "2026-06-30"), null);
  });
});
