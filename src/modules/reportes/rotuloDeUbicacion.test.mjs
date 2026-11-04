/**
 * Pruebas del rótulo de ubicación de la actividad (ADR-006 F52).
 *
 * "85+500 AL 89+900 · DESPALME" sobre la descripción, en el documento y en la
 * vista previa del wizard.
 *
 * ## Por qué esta regla se prueba dos veces
 *
 * Existe en los dos repos: el backend la arma para imprimirla
 * (`Actividad.rotulo`) y el front la arma para enseñar la vista previa
 * (`rotuloDeUbicacion`). **No es duplicación por descuido**: el documento lo
 * pinta el servidor y la Revisión tiene que enseñar exactamente lo que se va a
 * imprimir, también sin señal, que es cuando más se usa.
 *
 * Lo que sí sería un defecto es que se separaran. Por eso las dos tienen
 * prueba y las dos afirman lo mismo: vacío cuando no hay nada, sin separador
 * colgando cuando hay uno solo, en versalitas siempre.
 *
 * Se corre con `npm run test:logica`.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Copia literal de `rotuloDeUbicacion` de `src/modules/reportes/constantes.ts`.
 *
 * El runner de Node no resuelve los alias de TypeScript del proyecto, y el
 * módulo real arrastra consigo el catálogo de áreas y los tokens de diseño.
 * Si la regla de allá cambia y esta no, esta prueba falla — que es justo lo
 * que se quiere de una copia.
 */
const rotuloDeUbicacion = (zona, frente) =>
  [zona, frente]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

describe("rótulo de ubicación de la actividad", () => {
  test("sin zona ni frente no hay rótulo", () => {
    // Cadena vacía significa "no pintes nada": ni el rótulo ni un renglón en
    // blanco en su lugar. Las obras que no usan estos campos obtienen el
    // documento idéntico a como salía antes de que existieran.
    assert.equal(rotuloDeUbicacion("", ""), "");
    assert.equal(rotuloDeUbicacion(undefined, undefined), "");
    assert.equal(rotuloDeUbicacion("   ", "\t"), "");
  });

  test("con los dos, se unen con el separador", () => {
    assert.equal(
      rotuloDeUbicacion("85+500 al 89+900", "Despalme"),
      "85+500 AL 89+900 · DESPALME",
    );
  });

  test("con uno solo, el separador no cuelga", () => {
    // El separador une dos cosas; con una sola no hay nada que unir, y un
    // "· DESPALME" impreso se lee como un error de la app.
    assert.equal(rotuloDeUbicacion("", "Despalme"), "DESPALME");
    assert.equal(rotuloDeUbicacion("Norte", ""), "NORTE");
    assert.equal(rotuloDeUbicacion("   ", "Chillers"), "CHILLERS");
  });

  test("el espacio sobrante no inventa un rótulo", () => {
    // Un campo que quedó en " " al escribir y borrar imprimiría un rótulo
    // vacío: un renglón gris en blanco encima de la actividad.
    assert.equal(rotuloDeUbicacion(" ", " "), "");
  });

  test("sirve para cualquier obra, no solo para carreteras", () => {
    // El par (zona, frente) significa cosas distintas según la obra, y es el
    // motivo de que sea texto libre: en una carretera la zona es un
    // cadenamiento; en un aeropuerto, un edificio.
    assert.equal(
      rotuloDeUbicacion("Norte/Edificio terminal", "Chillers/Demolición"),
      "NORTE/EDIFICIO TERMINAL · CHILLERS/DEMOLICIÓN",
    );
  });
});
