/**
 * Pruebas de la regla del tap (ADR-007 D12).
 *
 * Se corren con el runner que Node 22 ya trae: `npm run test:logica`. No hay
 * jest, ni testing-library, ni nada que instalar.
 *
 * ## Qué prueban y qué NO
 *
 * **No prueban el teclado.** Nada en Node puede: no hay pantalla, ni teclado,
 * ni medición de layout. Lo que prueban es la **máquina de estados** que
 * decide qué se abre y qué se cierra — y los dos síntomas reportados en
 * dispositivo ("la actividad no sale a la primera", "parece que primero hay
 * que registrar el horómetro") son de esa máquina, no del teclado.
 *
 * ## Por qué hay tantos órdenes
 *
 * React Native **no garantiza** en qué orden entrega `onPress`, `onFocus` y
 * `onTouchEnd`, y el orden cambia entre superficies: un `TouchableOpacity`
 * dentro de un `ScrollView` de gesture-handler no se comporta igual que un
 * `TextInput` que además abre el teclado.
 *
 * Por eso no se prueba "el" orden: se prueban **todos los órdenes plausibles**
 * y se exige que el resultado sea el mismo en todos. Una regla que solo
 * funciona con un orden es una regla que falla en el teléfono de alguien.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { correr, estadoInicial } from "./reglaDelTap.ts";

const abierto = (eventos, desde) => correr(eventos, desde).abierto;

/**
 * Estado con algo ya abierto.
 *
 * Simula el GESTO COMPLETO que lo abrió, no solo el `abrir`. Importa: abrir
 * suelto dejaba colgada la marca de "este gesto ya abrió algo", que en el
 * teléfono se consume al terminar el toque. Con la marca colgada, el gesto
 * siguiente heredaba permiso para no cerrar nada y las pruebas mentían.
 */
const conAbierto = (id) =>
  correr([
    { tipo: "toqueInicia" },
    { tipo: "abrir", id },
    { tipo: "toqueTermina" },
  ]);

describe("Tocar fuera cierra lo abierto (T1)", () => {
  test("un toque en vacío cierra", () => {
    const estado = correr(
      [
        { tipo: "toqueInicia" },
        { tipo: "toqueTermina" },
        { tipo: "cierrePendienteCorre" },
      ],
      conAbierto("horometro"),
    );
    assert.equal(estado.abierto, null);
  });

  test("sin nada abierto no agenda nada", () => {
    const estado = correr([
      { tipo: "toqueInicia" },
      { tipo: "toqueTermina" },
    ]);
    assert.equal(estado.cierreAgendadoEn, null);
  });
});

describe("El interior del elemento abierto es usable", () => {
  test("un toque dentro NO lo cierra", () => {
    const estado = correr(
      [
        { tipo: "toqueInicia" },
        { tipo: "toqueCaeDentro" },
        { tipo: "toqueTermina" },
        { tipo: "cierrePendienteCorre" },
      ],
      conAbierto("actividad-1"),
    );
    assert.equal(estado.abierto, "actividad-1");
  });

  test("tocar 'cambiar' dentro de la tarjeta la reinicia sin cerrarla", () => {
    // "cambiar" llama a abrir() sobre la MISMA tarjeta.
    const estado = correr(
      [
        { tipo: "toqueInicia" },
        { tipo: "toqueCaeDentro" },
        { tipo: "abrir", id: "actividad-1" },
        { tipo: "toqueTermina" },
        { tipo: "cierrePendienteCorre" },
      ],
      conAbierto("actividad-1"),
    );
    assert.equal(estado.abierto, "actividad-1");
  });
});

describe("Abrir otro elemento gana, en cualquier orden (T3)", () => {
  // Las cuatro posiciones en que `abrir` puede llegar respecto al final del
  // toque y al cuadro siguiente. Las cuatro deben terminar igual.
  const ordenes = {
    "onPress antes de onTouchEnd": [
      { tipo: "toqueInicia" },
      { tipo: "abrir", id: "actividad-2" },
      { tipo: "toqueTermina" },
      { tipo: "cierrePendienteCorre" },
    ],
    "onPress DESPUÉS de onTouchEnd": [
      { tipo: "toqueInicia" },
      { tipo: "toqueTermina" },
      { tipo: "abrir", id: "actividad-2" },
      { tipo: "cierrePendienteCorre" },
    ],
    "el cuadro corre antes de que llegue el foco": [
      { tipo: "toqueInicia" },
      { tipo: "toqueTermina" },
      { tipo: "cierrePendienteCorre" },
      { tipo: "abrir", id: "actividad-2" },
    ],
    "foco en press-in, antes de todo": [
      { tipo: "abrir", id: "actividad-2" },
      { tipo: "toqueInicia" },
      { tipo: "toqueTermina" },
      { tipo: "cierrePendienteCorre" },
    ],
  };

  for (const [nombre, eventos] of Object.entries(ordenes)) {
    test(`${nombre} → queda abierta la nueva`, () => {
      assert.equal(abierto(eventos, conAbierto("horometro")), "actividad-2");
    });
  }
});

describe("Los dos síntomas reportados en dispositivo", () => {
  /**
   * "No sale a la primera al escribir las actividades."
   *
   * El horómetro está abierto. El usuario toca el campo de la actividad. El
   * `onFocus` del `TextInput` llega DESPUÉS del `onTouchEnd` de la raíz, así
   * que para cuando la raíz decide ya hay un cierre agendado contra el
   * horómetro — y ese cierre, si no se invalida, apaga la actividad que acaba
   * de abrirse.
   */
  test("con el horómetro abierto, tocar una actividad la abre al PRIMER toque", () => {
    const estado = correr(
      [
        { tipo: "toqueInicia" },
        { tipo: "toqueTermina" },
        { tipo: "abrir", id: "actividad-1" },
        { tipo: "cierrePendienteCorre" },
      ],
      conAbierto("horometro"),
    );
    assert.equal(
      estado.abierto,
      "actividad-1",
      "la actividad se abrió y el cierre del horómetro la volvió a apagar",
    );
  });

  /**
   * "Parece que primero hay que registrar el horómetro."
   *
   * No es que haga falta: es que al compactarse el horómetro no queda nada
   * abierto, y sin nada abierto no se agenda ningún cierre. El segundo intento
   * funcionaba por eso, no por el horómetro.
   */
  test("sin nada abierto, tocar una actividad la abre (por eso el 2° intento sí)", () => {
    const estado = correr([
      { tipo: "toqueInicia" },
      { tipo: "toqueTermina" },
      { tipo: "abrir", id: "actividad-1" },
      { tipo: "cierrePendienteCorre" },
    ]);
    assert.equal(estado.abierto, "actividad-1");
  });
});

describe("Gestos encadenados", () => {
  test("abrir, tocar fuera, abrir otra: termina en la segunda", () => {
    let estado = conAbierto("actividad-1");
    estado = correr(
      [
        { tipo: "toqueInicia" },
        { tipo: "toqueTermina" },
        { tipo: "cierrePendienteCorre" },
      ],
      estado,
    );
    assert.equal(estado.abierto, null);

    estado = correr(
      [
        { tipo: "toqueInicia" },
        { tipo: "abrir", id: "actividad-2" },
        { tipo: "toqueTermina" },
        { tipo: "cierrePendienteCorre" },
      ],
      estado,
    );
    assert.equal(estado.abierto, "actividad-2");
  });

  test("un cierre agendado nunca sobrevive a dos gestos", () => {
    let estado = correr(
      [{ tipo: "toqueInicia" }, { tipo: "toqueTermina" }],
      conAbierto("horometro"),
    );
    assert.notEqual(estado.cierreAgendadoEn, null);

    // Llega otro gesto que abre algo antes de que corra el cuadro.
    estado = correr(
      [
        { tipo: "toqueInicia" },
        { tipo: "abrir", id: "actividad-1" },
        { tipo: "toqueTermina" },
        { tipo: "cierrePendienteCorre" },
      ],
      estado,
    );
    assert.equal(estado.abierto, "actividad-1");
    assert.equal(estado.cierreAgendadoEn, null);
  });
});

describe("Invariantes", () => {
  test("el estado inicial no tiene nada abierto ni agendado", () => {
    assert.equal(estadoInicial.abierto, null);
    assert.equal(estadoInicial.cierreAgendadoEn, null);
  });

  test("un evento desconocido no mueve nada", () => {
    const antes = conAbierto("x");
    assert.deepEqual(correr([{ tipo: "nada" }], antes), antes);
  });
});
