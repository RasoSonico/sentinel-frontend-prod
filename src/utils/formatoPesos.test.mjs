/**
 * Pruebas del formato de pesos. Se corren con `npm run test:logica`.
 *
 * Los casos son los de la especificación de la tarjeta de obra (UX-SPEC-05):
 * el máximo que admite la base, montos sin centavos, centavos de un dígito,
 * el cero del default y el vacío.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { formatoPesos, hayMonto } from "./formatoPesos.ts";

describe("formatoPesos", () => {
  test("completo y con comas de miles", () => {
    assert.equal(formatoPesos("1284567890.45"), "$1,284,567,890.45");
  });

  test("el máximo de la base, sin perder un centavo", () => {
    // 13 enteros: un `number` ya no lo representaría exacto.
    assert.equal(formatoPesos("9999999999999.99"), "$9,999,999,999,999.99");
  });

  test("sin centavos, siempre dos", () => {
    assert.equal(formatoPesos("850000"), "$850,000.00");
    assert.equal(formatoPesos("0.5"), "$0.50");
  });

  test("montos chicos y ceros a la izquierda", () => {
    assert.equal(formatoPesos("999"), "$999.00");
    assert.equal(formatoPesos("1000"), "$1,000.00");
    assert.equal(formatoPesos("0001000.10"), "$1,000.10");
  });

  test("el cero se formatea; decidir si se muestra es de quien llama", () => {
    assert.equal(formatoPesos("0.00"), "$0.00");
  });

  test("más de dos decimales se cortan, no se redondean", () => {
    assert.equal(formatoPesos("10.999"), "$10.99");
  });

  test("negativos", () => {
    assert.equal(formatoPesos("-1500.5"), "-$1,500.50");
  });

  test("vacío o no numérico: null", () => {
    assert.equal(formatoPesos(""), null);
    assert.equal(formatoPesos(null), null);
    assert.equal(formatoPesos(undefined), null);
    assert.equal(formatoPesos("abc"), null);
    assert.equal(formatoPesos("1,000"), null);
  });
});

describe("hayMonto", () => {
  test("el default 0.00 no es un presupuesto", () => {
    assert.equal(hayMonto("0.00"), false);
    assert.equal(hayMonto("0"), false);
    assert.equal(hayMonto(""), false);
    assert.equal(hayMonto(null), false);
  });

  test("cualquier monto distinto de cero sí", () => {
    assert.equal(hayMonto("0.50"), true);
    assert.equal(hayMonto("1284567890.45"), true);
  });
});
