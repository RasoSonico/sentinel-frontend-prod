# Patrones de interacción — estándares de toda la app

Esta carpeta guarda los **lenguajes compartidos** de la app: cosas que el
usuario aprende una vez y reconoce en todas las pantallas. No son estilos de un
módulo; si uno cambia aquí, cambia en todas partes.

Origen: ADR-007 (`docs/adr/ADR-007-maquinaria-jornada-sheet.md`), decisiones
D11 y D12. Nacieron en la hoja de jornada de maquinaria y se elevaron a
estándar porque resolvían algo general: **el usuario no podía predecir qué iba
a pasar ni comprobar qué había pasado.**

| Pieza | Qué resuelve |
|---|---|
| `estiloCerrado.ts` | D11 · Cómo se ve algo que **ya quedó** |
| `src/hooks/ui/useCierreDiferido.ts` | D12 · Qué pasa cuando el usuario **toca** |

---

## D11 · Patrón "cerrado"

Un elemento que el usuario **ya completó en esta pantalla** se pinta con
contorno oscuro y relleno azul tenue. Uno abierto o en edición lleva borde gris
y fondo blanco. Significa *"esto ya quedó; si quieres cambiarlo, tócalo"*.

Las seis reglas están en el encabezado de `estiloCerrado.ts`. Las dos que más
se olvidan:

- **Cerrado ≠ sincronizado.** El estado de envío tiene su propio lenguaje
  (nube, "Por enviar") y los dos conviven en el mismo bloque.
- **El color nunca va solo.** Cerrar siempre cambia también la forma. Si el
  estado solo se distingue por color, está mal hecho.

### ⚠ El pliegue todavía no existe

`DURACION_PLIEGUE` está parada esperando una implementación que no se hizo. El
primer intento usó `layout` de Reanimated y hubo que retirarlo — ver la trampa
de abajo. Cuando se haga, debe respetar la preferencia de "reducir movimiento"
del sistema (`AccessibilityInfo.isReduceMotionEnabled`).

---

## D12 · Regla del tap

*Un tap expresa una sola intención y se cumple completa.*

El error que corrige: un tap tiene dos momentos, cuando el dedo **toca** y
cuando se **levanta**. Los botones actúan al levantar. Si la pantalla se
recompone al tocar, el destino del dedo se mueve y la acción se pierde: hay que
tocar dos veces y la app se siente pesada.

`useCierreDiferido` lo resuelve con dos señales en dos momentos. El detalle
está en su encabezado. Lo que hay que recordar al usarlo:

- El contenedor recibe `propsContenedor`.
- **El elemento abierto recibe `propsElementoAbierto`.** Sin eso su interior es
  inutilizable: cualquier toque dentro lo cierra, incluidos los de sus propios
  botones.
- Todo `ScrollView` con campos necesita `keyboardShouldPersistTaps="handled"`.
- `onBlur` **no cierra por su cuenta**.

**Prueba de aceptación:** *con un elemento abierto y el teclado visible, un solo
tap sobre cualquier botón lo ejecuta; y tocar dentro del elemento abierto no lo
cierra.*

---

## Trampas que ya nos costaron tiempo

Las dos aparecieron construyendo estos patrones. Ninguna la atrapa `tsc` ni
lint: solo salen con el dedo encima del teléfono.

### 1. `layout` de Reanimated sobre una vista que contiene campos de texto

`LinearTransition` anima **cualquier** cambio de tamaño del nodo que lo lleva.
Un campo multilínea crece al escribir, así que **cada tecla** disparaba la
animación del bloque entero: la hoja subía y volvía en milisegundos, se veían
"sombras", y no se alcanzaba a leer lo que se tecleaba. Con el teclado en
`adjustResize` encima, el efecto se duplica.

**Para plegar un bloque hay que animar la entrada y la salida de los
subárboles** —abierto y compacto son dos subárboles distintos, no el mismo nodo
cambiando de tamaño—.

### 2. El `onPress` del hijo corre ANTES que el `onTouchEnd` del padre

Cualquier lógica de "cerrar lo abierto al soltar" montada en un contenedor
tiene que saber si **este mismo gesto** ya abrió algo; si no, deshace la
intención que acaba de expresarse.

Síntoma: una tarjeta compacta se abría y se cerraba sola en milisegundos, casi
imperceptible. `useCierreDiferido` lleva una marca por gesto justamente para
esto.

---

## Dónde se aplican hoy

- `src/modules/maquinaria/components/JornadaSheet.tsx` y sus piezas.

Candidatos a adoptarlos, según el ADR: `CapturaRapidaSheet` (cantidad
confirmada), el wizard del reporte de actividades (pasos completos) y los
filtros elegidos.
