/**
 * Pruebas de la tabla de maquinaria de la previsualización.
 *
 * Se corren con el runner que Node ya trae: `npm run test:logica`.
 *
 * ## Qué prueban
 *
 * Que el teléfono imprima **los mismos números que el PDF**. Esta tabla existe
 * para verificar antes de firmar, así que una diferencia de redondeo entre la
 * pantalla y el entregable no es un detalle cosmético: es la pantalla mintiendo
 * sobre lo que se va a recibir.
 *
 * Por eso los casos de abajo no son casos bonitos. Son los que el servidor
 * documenta como decididos a propósito —el horómetro que baja, la jornada a
 * medias, la máquina que no operó pero tiene lecturas— y uno que solo existe en
 * JavaScript: la resta en punto flotante, que da 8.199999999999999 donde el
 * `Decimal` de Python da 8.2.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  estadoImpreso,
  etiquetaEquipo,
  renglonesMaquinaria,
  totalHorasMaquina,
} from "./maquinariaDelDia.ts";

const maquina = (extra = {}) => ({
  equipo: "Retroexcavadora JCB 3CX",
  estado: "TRABAJANDO",
  motivoInactividad: null,
  horometroInicial: "3419.5",
  horometroFinal: "3427.0",
  ...extra,
});

describe("las cifras", () => {
  test("la resta no arrastra el error del flotante", () => {
    // 1248.3 − 1240.1 en flotante da 8.199999999999999. El PDF dice 8.2.
    const [fila] = renglonesMaquinaria([
      maquina({ horometroInicial: "1240.1", horometroFinal: "1248.3" }),
    ]);
    assert.equal(fila.horas, "8.2");
  });

  test("las horas redondas se imprimen sin decimal de relleno", () => {
    const [fila] = renglonesMaquinaria([
      maquina({ horometroInicial: "1240.0", horometroFinal: "1248.0" }),
    ]);
    assert.equal(fila.horas, "8");
  });

  test("las lecturas llevan separador de miles y una decimal", () => {
    const [fila] = renglonesMaquinaria([
      maquina({ horometroInicial: "1240", horometroFinal: "12480.5" }),
    ]);
    assert.equal(fila.inicial, "1,240.0");
    assert.equal(fila.final, "12,480.5");
  });

  test("un horómetro que BAJA se imprime en negativo, no en cero", () => {
    // Pasa de verdad cuando reemplazan el horómetro. Aplanarlo a cero lo
    // volvería indistinguible de una máquina que no trabajó, y es justo el
    // dato que alguien tiene que mirar.
    const [fila] = renglonesMaquinaria([
      maquina({ horometroInicial: "3427.0", horometroFinal: "12.5" }),
    ]);
    assert.equal(fila.horas, "-3414.5");
  });
});

describe("lo que falta", () => {
  test("la jornada a medias imprime raya, no cero", () => {
    const [fila] = renglonesMaquinaria([
      maquina({ horometroFinal: null }),
    ]);
    assert.equal(fila.inicial, "3,419.5");
    assert.equal(fila.final, "—");
    assert.equal(fila.horas, "—");
  });

  test("sin ninguna lectura, las tres columnas van en raya", () => {
    const [fila] = renglonesMaquinaria([
      maquina({ horometroInicial: null, horometroFinal: null }),
    ]);
    assert.deepEqual(
      [fila.inicial, fila.final, fila.horas],
      ["—", "—", "—"],
    );
  });

  test("una lectura que no es número se trata como ausente", () => {
    // La cola guarda lo que la persona tecleó. Un "" o un "3,419" tienen que
    // salir como raya y no como NaN impreso en un documento.
    const [fila] = renglonesMaquinaria([
      maquina({ horometroInicial: "", horometroFinal: "abc" }),
    ]);
    assert.deepEqual([fila.inicial, fila.final], ["—", "—"]);
  });
});

describe("el estado", () => {
  test("trabajando dice Trabajó", () => {
    assert.equal(estadoImpreso(maquina()), "Trabajó");
  });

  test("sin operar dice el motivo", () => {
    assert.equal(
      estadoImpreso(
        maquina({ estado: "SIN_OPERAR", motivoInactividad: "FALLA_MECANICA" }),
      ),
      "No operó · Falla mecánica",
    );
  });

  test("sin operar y sin motivo no inventa uno", () => {
    assert.equal(
      estadoImpreso(maquina({ estado: "SIN_OPERAR", motivoInactividad: null })),
      "No operó",
    );
  });

  test("la que no operó conserva sus lecturas y sus horas", () => {
    // Si alguien tomó las dos, `final − inicial` significa lo mismo. El
    // documento no las omite por el estado.
    const [fila] = renglonesMaquinaria([
      maquina({
        estado: "SIN_OPERAR",
        motivoInactividad: "CLIMA",
        horometroInicial: "3419.5",
        horometroFinal: "3420.0",
      }),
    ]);
    assert.equal(fila.estado, "No operó · Clima");
    assert.equal(fila.horas, "0.5");
  });
});

describe("el total", () => {
  test("suma solo lo que tiene las dos lecturas", () => {
    assert.equal(
      totalHorasMaquina([
        maquina({ horometroInicial: "1240.0", horometroFinal: "1248.5" }),
        maquina({ horometroInicial: "10.0", horometroFinal: null }),
        maquina({ horometroInicial: "300.0", horometroFinal: "301.5" }),
      ]),
      "10",
    );
  });

  test("sin máquinas no hay total, hay raya", () => {
    // "0" se leería como "estuvo el equipo y no trabajó". No estuvo.
    assert.equal(totalHorasMaquina([]), "—");
  });

  test("con máquinas pero sin ninguna lectura completa, el total es 0", () => {
    assert.equal(totalHorasMaquina([maquina({ horometroFinal: null })]), "0");
  });
});

describe("la etiqueta del equipo", () => {
  test("tipo, marca y modelo con un espacio", () => {
    assert.equal(
      etiquetaEquipo("Retroexcavadora", "JCB", "3CX"),
      "Retroexcavadora JCB 3CX",
    );
  });

  test("un modelo vacío no deja el espacio colgando", () => {
    assert.equal(etiquetaEquipo("Motoconformadora", "CAT", ""), "Motoconformadora CAT");
  });
});
