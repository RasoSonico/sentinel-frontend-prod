/**
 * Pruebas de la geometría de la firma.
 *
 * Se corren con el runner que Node ya trae: `bun run test:logica`.
 *
 * ## Qué prueban y qué NO
 *
 * **No prueban el gesto.** Nada en Node puede: no hay pantalla ni dedo. Lo que
 * prueban es la **geometría**, que es lo que tiene que coincidir punto por
 * punto con `firma/trazo.py` del backend. Si los dos suavizaran distinto, el
 * usuario vería una firma en la pantalla y entregaría otra en el PDF, y eso no
 * se nota revisando código: se nota cuando alguien compara el documento con lo
 * que firmó.
 *
 * Los casos del suavizado son **los mismos** que los de `firma/tests.py`
 * (`CurvasTests`), a propósito. Son el contrato entre los dos lados.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_TRAZOS,
  aPayload,
  caminoCompleto,
  caminoDeTrazo,
  encajar,
  limites,
  problemaDe,
  vaLejos,
} from "./trazo.ts";

const geometria = (trazos, ancho = 640, alto = 260) => ({ ancho, alto, trazos });

describe("suavizado", () => {
  test("un solo punto se dibuja igual, porque un camino de un punto no pinta", () => {
    assert.equal(caminoDeTrazo([[5, 5]]), "M 5 5 l 0.01 0");
  });

  test("dos puntos son una recta", () => {
    assert.equal(
      caminoDeTrazo([
        [0, 0],
        [10, 10],
      ]),
      "M 0 0 L 10 10"
    );
  });

  test("la curva termina en el punto medio del par siguiente", () => {
    // El truco entero, y el mismo caso que `firma/tests.py`: el punto
    // capturado es el CONTROL, no el final. Así la línea pasa suave por donde
    // el dedo cambió de dirección en vez de hacer un vértice.
    assert.equal(
      caminoDeTrazo([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
      "M 0 0 Q 10 0 10 5 L 10 10"
    );
  });

  test("hay una curva por cada punto interior", () => {
    const puntos = Array.from({ length: 40 }, (_, i) => [i, (i * i) % 17]);
    const curvas = caminoDeTrazo(puntos).match(/Q/g) ?? [];
    assert.equal(curvas.length, 38);
  });

  test("varios trazos van en un solo camino, sin pegarse", () => {
    const d = caminoCompleto([
      [
        [0, 0],
        [1, 1],
      ],
      [
        [5, 5],
        [6, 6],
      ],
    ]);
    // Dos `M` significa que el segundo trazo empieza levantando la pluma. Sin
    // eso, los dos trazos quedarían unidos por una raya que nadie dibujó.
    assert.equal((d.match(/M/g) ?? []).length, 2);
  });

  test("un trazo vacío no aporta nada al camino", () => {
    assert.equal(caminoCompleto([[]]), "");
  });
});

describe("filtro de puntos pegados", () => {
  test("el primer punto siempre entra", () => {
    assert.equal(vaLejos(undefined, 0, 0), true);
  });

  test("un dedo quieto no genera puntos", () => {
    // Sin esto, un dedo apoyado llena la cota de 6 000 puntos sin dibujar
    // nada y engorda el payload que sube sin señal.
    assert.equal(vaLejos([10, 10], 10.05, 10.05), false);
  });

  test("un movimiento real sí entra", () => {
    assert.equal(vaLejos([10, 10], 10.2, 10.2), true);
  });
});

describe("cotas", () => {
  test("una firma normal pasa", () => {
    assert.equal(
      problemaDe(
        geometria([
          [
            [100, 100],
            [150, 60],
          ],
        ])
      ),
      null
    );
  });

  test("sin trazos pide que firme, no da un error técnico", () => {
    const problema = problemaDe(geometria([]));
    assert.equal(problema.mensaje, "Traza tu firma para continuar.");
  });

  test("demasiados trazos se rechazan", () => {
    const muchos = Array.from({ length: MAX_TRAZOS + 1 }, () => [[1, 1]]);
    assert.notEqual(problemaDe(geometria(muchos)), null);
  });

  test("un punto fuera de la caja se rechaza", () => {
    // Es la misma cota del servidor. Comprobarla aquí evita que el 400 llegue
    // al cerrar el reporte, que es el peor momento para enterarse.
    assert.notEqual(problemaDe(geometria([[[9999, 10]]])), null);
  });

  test("un lienzo sin medida se rechaza", () => {
    assert.notEqual(problemaDe(geometria([[[1, 1]]], 0)), null);
  });
});

describe("payload", () => {
  test("recorta lo que se salió por un píxel en vez de rechazarlo", () => {
    // Un gesto que roza el borde entrega una coordenada negativa. Mandarla
    // haría que el servidor rechace la firma entera y el usuario vería "la
    // firma salió del área" sin haber hecho nada raro.
    const salida = aPayload(geometria([[[-3, 270]]], 640, 260));
    assert.deepEqual(salida.trazos[0][0], [0, 260]);
  });

  test("redondea a dos decimales", () => {
    const salida = aPayload(geometria([[[12.3456, 40.9999]]]));
    assert.deepEqual(salida.trazos[0][0], [12.35, 41]);
  });

  test("tira los trazos vacíos", () => {
    const salida = aPayload(geometria([[], [[1, 1]]]));
    assert.equal(salida.trazos.length, 1);
  });
});

describe("encaje", () => {
  test("se recorta a la tinta, no al lienzo", () => {
    // Una firma trazada en una esquina tiene que salir del tamaño de la caja.
    // Encajando el lienzo completo saldría diminuta y descentrada.
    const { trazos } = encajar(
      geometria([
        [
          [0, 0],
          [64, 26],
        ],
      ]),
      { x: 0, y: 0, ancho: 100, alto: 100 }
    );
    const [x0, , x1] = limites(trazos);
    assert.ok(Math.abs(x1 - x0 - 100) < 1e-6);
  });

  test("conserva la proporción", () => {
    const { trazos } = encajar(
      geometria([
        [
          [0, 0],
          [100, 50],
        ],
      ]),
      { x: 0, y: 0, ancho: 200, alto: 200 }
    );
    const [x0, y0, x1, y1] = limites(trazos);
    assert.ok(Math.abs((x1 - x0) / (y1 - y0) - 2) < 1e-6);
  });

  test("centra lo que sobra", () => {
    const { trazos } = encajar(
      geometria([
        [
          [0, 0],
          [100, 50],
        ],
      ]),
      { x: 0, y: 0, ancho: 200, alto: 200 }
    );
    const [, y0, , y1] = limites(trazos);
    assert.ok(Math.abs(y0 - 50) < 1e-6);
    assert.ok(Math.abs(200 - y1 - 50) < 1e-6);
  });

  test("una raya horizontal no revienta", () => {
    // Alto cero. Con 0/0 la pantalla se caería al enseñar la firma guardada.
    const { trazos, escala } = encajar(
      geometria([
        [
          [10, 50],
          [200, 50],
        ],
      ]),
      { x: 0, y: 0, ancho: 100, alto: 40 }
    );
    assert.ok(Number.isFinite(escala));
    assert.equal(trazos[0].length, 2);
  });

  test("un solo punto no revienta", () => {
    const { escala } = encajar(geometria([[[10, 50]]]), {
      x: 0,
      y: 0,
      ancho: 100,
      alto: 40,
    });
    assert.ok(Number.isFinite(escala));
  });
});
