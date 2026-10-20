# ADR-007: Maquinaria — Hoja de jornada, patrón "cerrado" y regla del tap

**Fecha:** 2026-10-14
**Estado:** Aceptado (diseño). Implementación pendiente.
**Referencia visual:** `docs/ux/maquinaria-hoja-jornada.html` (UX-SPEC-03 Rev K, prototipo interactivo de referencia)
**Repositorio:** sentinel-frontend-prod. Los cambios de backend se listan como requisitos (ver §Requisitos de backend); se documentarán en un ADR propio del repo backend.

---

## Contexto

El módulo de Maquinaria (tab Maquinaria, rol CONTRATISTA) se diseñó y funcionó, pero dejó de usarse. La inspección del código (frontend `main` @aa13fd2, backend `main` @58bca8e, 13-oct-2026) encontró que el problema no es la cantidad de taps: **el usuario no puede predecir qué va a pasar ni comprobar qué pasó**. Hallazgos principales:

| # | Hallazgo | Tipo |
|---|---|---|
| H1 | Una máquina **transitoria** no se puede reportar nunca: el alta abre siempre una estancia, el hub la muestra y la tarjeta manda a `/jornadas/transitoria/`, que responde **400 "tiene una estancia abierta"**. Reproducido con prueba contra el backend. Además la estancia queda abierta y a los 6 días pide reconciliación | Bug |
| H2 | El contador "Reportadas" cuenta solo `TRABAJANDO`; el filtro del cliente muestra todo lo que tiene jornada. El número no coincide con la lista | Bug |
| H3 | La pregunta del parte diario ("¿trabajó hoy?") no aparece: hay dos botones con colores de semáforo ("Reportar jornada" / "Sin operar") | Claridad |
| H4 | Lo capturado no vuelve a verse: la tarjeta dice "Trabajando" sin dónde ni cuándo, y no se puede corregir aunque el `PATCH` existe | Claridad |
| H5 | Automatización opaca: residente/transitoria cambia endpoint y oculta acciones; "Repetir ayer" rellena sin decir de qué fecha y requiere red | Claridad |
| H7 | Cascada catálogo → concepto con dropdowns de texto largo, sin WBS ni partida | Fricción |
| H9 | Sin cola offline: sin señal, guardar falla | Infraestructura |
| H10 | Horómetro inicial/final listo en backend (12-oct) y sin UI | Dato nuevo |

Este ADR cubre **la hoja de jornada** (el sheet donde se reporta el día de una máquina) y eleva a **estándar de toda la app** dos comportamientos que nacieron en ella: el **patrón "cerrado"** (D11) y la **regla del tap** (D12).

**Restricciones:**

- El usuario es el residente o supervisor que atiende la obra. Puede ser la misma persona que captura avances. La hoja debe resolverse en segundos y no competir con su atención en campo.
- **El caso común no paga el costo del caso raro.** Casi todos los días una máquina hace una sola actividad: la primera tiene que estar lista para escribir, sin botón de "agregar" antes.
- Claridad no significa siempre menos taps. Toda automatización se anuncia (qué se precargó y de dónde) y el usuario conserva el control del registro.
- Offline-first: la hoja escribe a una cola Realm, como avances (ADR-003, ADR-004 E8). Ninguna acción de la hoja depende de la red.
- Un solo desarrollador: se reutilizan el motor de cola de avances, la búsqueda de la sábana y Reanimated (ya instalado por `@gorhom/bottom-sheet`).

**Datos de producto que fijan el diseño (13–14 oct):**

- El horómetro se lee directo de la máquina y sirve para **rendimientos reales**: horas máquina contra avance. Lo traen todas las máquinas; volteos y pipas no, y en ellas no se registra.
- Una máquina puede hacer **N actividades** en el día con **un solo horómetro**. El horómetro da el total de horas; las actividades dicen en qué se repartieron.
- Una actividad puede ser un **concepto del catálogo** o una **actividad escrita** (ej. una retro cargando estructura metálica, que no es concepto).
- "Trabajó y luego se descompuso" se registra en observaciones y se confirma cuando cambie el estado de la máquina.
- Las **transitorias** salen del flujo: una renta de dos días es una estancia normal corta; ollas revolvedoras y volteos no se registran por jornada (su dato vive en el reporte de colado y de acarreos).

---

## Decisiones

### D1. Una tarjeta, una hoja

**Decisión:** La tarjeta de máquina del hub abre siempre la misma hoja, `JornadaSheet`. `JornadaSheet` reemplaza a `ReportarJornadaSheet` y `SinOperarSheet`. La pregunta "¿trabajó?" vive dentro de la hoja, no en la tarjeta.

**Justificación:** Un gesto, un destino (misma regla que la sábana, ADR-004 E9). La pregunta formulada como pregunta elimina la traducción que hoy hace el usuario entre dos botones de semáforo (H3).

**Alternativas rechazadas:**
- *Conservar dos botones en la tarjeta:* "Sin operar" no se lee como un reporte válido.
- *Pase de lista en el hub (filas que se responden en sitio):* mejor solo con muchas máquinas por obra; inputs dentro de una lista con teclado son la parte más frágil de React Native.

---

### D2. "¿Trabajó hoy?": selección compacta, "Sí" por defecto

**Decisión:** Dos botones de 34 px de alto: **"Sí, trabajó"** (seleccionado por defecto) y **"No operó"**. La opción elegida usa el patrón "cerrado" (D11). El estado se refuerza solo con un **punto de color** de 7 px: verde para "Sí", rojo para "No operó"; el no elegido lleva el punto gris. Sin texto secundario ("elegir motivo" se eliminó: elegir la opción ya lleva a los motivos).

**Justificación:** Es la primera lectura de la hoja, pero no debe robarle atención al horómetro ni a las actividades. El relleno usa el lenguaje de "cerrado" y no el color semántico, para que toda la hoja hable un solo idioma (D11). El punto de color basta para distinguir el estado de un vistazo.

**Alternativas rechazadas:**
- *Relleno verde/rojo completo:* satura la hoja y compite con el resto (descartado en revisión del 14-oct).
- *Botones grandes de 46 px con subtítulo:* ocupan demasiado para una pregunta que casi siempre se responde "Sí".

---

### D3. Horómetro del día: dos campos que se compactan en una línea

**Decisión:**

1. **Bloque abierto** (borde gris, fondo blanco): campos **Inicial** y **Final**.
2. **Inicial como placeholder.** El campo llega vacío mostrando la última lectura en gris (`3,419.5`), con la leyenda "**Última lectura · {fecha}**" en gris y negritas. Si el usuario no lo toca, ese valor se usa como dato. Al tocarlo, el campo está vacío y escribe encima; la leyenda cambia a "Editado". Si borra lo escrito, vuelve la sugerencia.
3. **Regla de la sugerencia:** el inicial se sugiere **solo si desde esa lectura no hay días sin reporte**. Si los hay, el campo queda vacío (sin placeholder) y la última lectura aparece como referencia, con un aviso: "Hay N días sin reporte desde ese cierre. Lee el inicial en la máquina". Sugerir en ese caso borraría del registro horas que nadie vio.
4. **Final:** placeholder "—" y leyenda "Léelo en la máquina". Las horas (`final − inicial`) aparecen en vivo debajo.
5. **Compactar:** al salir del bloque con un final válido, el bloque se pliega en una línea con el patrón "cerrado": `3,419.5 → 3,427.0 · 7.5 h · editar`. Tocar la línea lo reabre con el foco en el final.
6. **Sin final, no se compacta** y la hoja registra solo el **arranque** (D9).
7. **Avisos que no bloquean** (criterio del backend: advertir sin bloquear): final menor que inicial ("¿Cambiaron el horómetro? Puedes guardar así") y más de 16 h en una jornada.
8. **Máquina sin horómetro:** el bloque no se muestra (pendiente la bandera en el alta, ver Deuda #2).

**Justificación:** Las horas se derivan de dos lecturas y se auditan solas (backend, `docs/maquinaria.md` §Horómetro). En el caso normal la lectura inicial es el cierre anterior: pedirla de nuevo duplica trabajo. El placeholder evita esa captura sin precargar un dato oculto, y la regla del punto 3 protege el único caso en que sugerir sería mentir.

**Alternativas rechazadas:**
- *Inicial precargado como valor en gris:* se confunde con un placeholder y no queda claro si se va a guardar (revisión del 14-oct). Como placeholder real, el comportamiento coincide con lo que el usuario espera de un campo.
- *Inicial siempre precargado:* las horas no vistas por la obra desaparecen por construcción.
- *Registro obligatorio en dos momentos (arranque/cierre, propuesta C):* exige un hábito que la telemetría no muestra (captura promedio 17:37). Queda como posibilidad (D9), no como obligación.

---

### D4. Actividades: lista de N, la primera siempre presente

**Decisión:**

- La **Actividad 1** existe desde que se abre la hoja y no se puede quitar; se vacía con "cambiar".
- **"+ Agregar actividad"** es un enlace (no un botón) debajo de la lista. Inserta la tarjeta en su lugar, sin modal ni navegación, con una animación de despliegue.
- Las **actividades agregadas** llevan **✕ en la esquina superior derecha**. Entre "cambiar" y la ✕ hay un **separador vertical** de 1 px y 12 px de espacio, para no tocar una por la otra. Al quitar una, se pliega y las demás se renumeran.
- "Trabajó" exige **al menos una actividad completa**.

**Justificación:** Con una actividad, la hoja equivale a la de hoy más el horómetro. El caso de varias actividades existe sin estorbar. La ✕ va donde el usuario espera encontrarla (esquina superior derecha).

**Alternativas rechazadas:**
- *Lista vacía con botón "agregar" para la primera:* cobra un tap al caso común.
- *✕ en la esquina superior izquierda:* va contra la costumbre de uso (revisión del 14-oct).

---

### D5. Tarjeta de actividad: concepto **ó** actividad escrita

**Decisión:**

1. **Estado vacío:** dos campos del mismo tamaño separados por una **"Ó"** literal: `⌕ Concepto del catálogo` y `✎ Escribe qué hizo la máquina`.
2. **Al tocar uno, el otro desaparece:** el campo no elegido y la "Ó" se pliegan (~240 ms), el elegido da un pulso breve (escala 1 → 1.018 → 1, ~320 ms) y queda con el foco.
3. **El tipo pasa al encabezado:** "ACTIVIDAD 1 · ⌕ CONCEPTO" o "ACTIVIDAD 2 · ✎ ESCRITA", entrando desde la izquierda. El contenido usa todo el ancho de la tarjeta.
4. **Triple redundancia del tipo:** palabra en el encabezado, ícono (⌕ / ✎) y tono del borde mientras está abierta (azul acero / arena). Ninguna capa depende solo del color.
5. **"cambiar"** aparece en el encabezado **desde que se entra a un camino** (no "cancelar"). Limpia la tarjeta y despliega los dos caminos con la animación al revés. Cambiar de camino reemplaza lo anterior; nunca queda un dato escondido.
6. **Búsqueda de concepto:**
   - Solo concepto: **sin dropdown de catálogo**. El catálogo se deduce del concepto elegido.
   - Busca en **todos los catálogos de la obra**, por descripción o por WBS, **sobre los datos locales** (sin red).
   - Sin sugerencias al entrar al campo. Se busca desde la **segunda letra**; antes se muestra "Escribe al menos 2 letras para buscar en el catálogo".
   - Cada resultado lleva la **ruta de la sábana**: `Plataforma › Terracerías · 1.2.03` en una línea pequeña y la descripción debajo, con lo escrito resaltado.
   - Máximo 5 resultados, con "y N más · sigue escribiendo para acotar". Sin resultados: "Ningún concepto coincide con «…»".
   - Al elegir, la tarjeta conserva la ruta y la descripción con el mismo formato.
7. **Actividad escrita:** campo de texto que crece con el contenido; se confirma al salir (D12).

**Justificación:** La "ó" visible enseña la regla antes de tocar nada, sin cobrar un tap extra; plegar el camino no elegido deja claro dónde se está escribiendo. La ruta distingue conceptos homónimos de partidas distintas y es la misma que el usuario ya conoce de la búsqueda de la sábana.

**Alternativas rechazadas:**
- *Selector de dos posiciones arriba (V2):* un tap extra en cada actividad escrita y una fila permanente en cada tarjeta. Descartada definitivamente.
- *Un solo campo que busca y ofrece "usar como texto" (V3):* la más ligera, pero la opción de escribir libre solo se descubre al empezar a escribir.
- *Etiqueta de tipo a la izquierda del contenido:* le quita ancho a la descripción del concepto.
- *Sugerencias ("trabajó aquí ayer", "capturaste avance hoy"):* diferidas (Deuda #1).

---

### D6. Bloque compacto de actividades

**Decisión:** Al cerrarse (D12), las actividades completas se compactan en **un solo bloque numerado** con el patrón "cerrado". Cada renglón tiene dos líneas:

```
 1   ⌕ Plataforma › Terracerías · 1.2.03          5.5 h
     Excavación en cepas a máquina en materi…
 2   ✎ Escrita                                     2.0 h
     Carga de estructura metálica a frente 3
```

- Número a la izquierda; ícono del tipo y ruta con WBS en la primera línea (10 px); descripción en la segunda (12.5 px), ambas truncadas a una línea.
- Horas a la derecha, solo si hay dos o más actividades; "— h" en gris si no se capturaron.
- Renglones consecutivos comparten bloque: el contorno envuelve el grupo y los separa una línea tenue. La actividad que se abre sale del bloque mientras se edita.
- Tocar un renglón lo abre completo (D12, regla 3).
- Una tarjeta vacía o a medio llenar **nunca se compacta**.

**Justificación:** Revisar la jornada debe ser lo más rápido posible. Una columna de horas y una columna de numeración se leen de arriba abajo como un parte. La numeración tiene valor propio: es como se nombran las actividades en el resumen y en el recibo.

**Alternativas rechazadas:**
- *Renglón independiente por actividad (Compacta A):* más bordes y más altura por la misma información.
- *Sin compactar:* ~110 px por actividad contra ~44 px.
- *Renglón de una línea sin ruta:* se descartó; la ruta es necesaria para distinguir conceptos homónimos.

---

### D7. Horas por actividad: opcionales, desde la segunda actividad

**Decisión:** El campo "Horas · opcional" aparece en cada tarjeta solo cuando hay **dos o más actividades**. Con una sola, esa actividad se lleva el total del horómetro. Sobre la lista se muestra el reparto: "Repartidas 5.5 de 7.5 h · faltan 2.0" (o "completo" / "sobran"). **No bloquea** guardar.

**Justificación:** El horómetro da el total; repartirlo solo tiene sentido cuando hay más de una actividad. Obligarlo cobraría un paso extra cada vez. Sin reparto, el rendimiento se calcula por jornada y no por concepto en esos días.

**Alternativas rechazadas:** *Reparto obligatorio* (paso extra frecuente); *reparto automático en partes iguales* (dato inventado).

---

### D8. "Repetir" en línea

**Decisión:** Junto al rótulo "ACTIVIDADES", a la derecha: **"⧉ Repetir lo del {fecha} · {N}"**.

- Visible **solo mientras la lista está vacía**, para no pisar nada capturado.
- La fecha es la de la **última jornada trabajada** real, no "ayer" (puede ser de hace varios días).
- Copia las actividades **sin horas** (las horas dependen del horómetro de hoy).
- Deja un aviso: "Se copiaron N actividades del {fecha}, sin horas. **Deshacer**".
- Funciona sin red: las actividades de la última jornada viajan en el hub cacheado (§Requisitos de backend).

**Justificación:** Una máquina hace lo mismo por temporadas; repetir la lista completa es el atajo de mayor valor. Decir de qué día viene y cuántas actividades trae evita el "Repetir ayer" actual, que rellenaba sin explicar (H5).

---

### D9. Resumen y botón de registro

**Decisión:** Encima del botón, una frase dice lo que se va a registrar y se reescribe en vivo:

> Se registrará: **la JCB 3CX trabajó hoy 7.5 h** de horómetro. En **1.2.03 Excavación en cepas** (5.5 h) y **Carga de estructura metálica** (2.0 h).

El botón dice lo que falta o lo que va a hacer:

| Estado | Botón |
|---|---|
| "Sí" sin actividad completa | "Agrega al menos una actividad" (deshabilitado) |
| "Sí" con actividades y sin final | **"Guardar arranque"** — la jornada queda abierta; el resumen dice "el cierre queda pendiente" |
| "Sí" con actividades y final | **"Registrar jornada"** |
| "No operó" sin motivo | "Elige un motivo" (deshabilitado) |
| "No operó" con motivo | "Registrar jornada" |

Al registrar, la hoja confirma ("Jornada registrada" / "Arranque guardado") e indica "☁ Por enviar" mientras está en la cola.

**Justificación:** El resumen es el antídoto contra la automatización opaca: todo lo precargado (inicial sugerido, actividades repetidas) queda a la vista antes de guardar. "Guardar arranque" permite el registro en dos momentos sin crear un modo que elegir.

---

### D10. "No operó"

**Decisión:** Elegir "No operó" pliega el horómetro y las actividades y muestra los motivos existentes (Falla mecánica, Sin operador, Sin frente de trabajo, Clima, Otro motivo) y una nota opcional. Volver a "Sí" restaura lo capturado; no hay que vaciar nada.

---

### D11. Patrón "cerrado" — **estándar de toda la app**

**Decisión:** Un elemento que el usuario ya completó en la pantalla actual se presenta con **contorno oscuro y relleno azul tenue**. Un elemento abierto o en edición se presenta con **borde gris y fondo blanco**. Este lenguaje es exclusivo: ningún otro estado usa esa combinación.

**Significado para el usuario:** "Esto ya quedó. Si quieres cambiarlo, tócalo."

**Especificación visual:**

| Estado | Borde | Fondo | Uso |
|---|---|---|---|
| **Abierto / editando** | 1 px `neutral[300]` (#D1D5DB) | `background.primary` (#FFFFFF) | Bloque mientras se captura |
| **Cerrado — bloque** | 1.5 px `executive.secondary` (#334155) | **nuevo** `cerrado.fondo` (#F8FAFC, slate 50) | Bloques compactados: horómetro, actividades |
| **Cerrado — control de selección** | 1.5 px `executive.secondary` (#334155) | **nuevo** `cerrado.fondoControl` (#F1F5F9, slate 100) | Opción elegida en selecciones de una opción (Sí/No) |
| No elegido (control) | 1 px `neutral[200]` (#E5E7EB) | blanco | Opción disponible no elegida |

Se crean dos tokens nuevos en `designTokens.ts` (`cerrado.fondo`, `cerrado.fondoControl`) y una constante de estilos compartida (ver Guía de implementación). En controles pequeños se usa el fondo slate 100 porque slate 50 casi no se distingue del blanco a ese tamaño.

**Reglas:**

1. **Cerrado = completo en esta pantalla, no sincronizado.** El estado de envío al servidor tiene su propio lenguaje (ícono de nube, "Por enviar"). Los dos estados conviven: un bloque puede estar cerrado y por enviar.
2. **Lo cerrado siempre se puede reabrir con un tap.** Si un dato no se puede editar (solo lectura, aprobado por inspector), no usa este patrón.
3. **El color nunca va solo.** Cerrar siempre cambia también la forma: un bloque se compacta, un control se marca. El estado se lee aunque no se distingan los colores.
4. **Sin color semántico en el relleno.** Verde, rojo y ámbar no rellenan elementos cerrados. Si hace falta un matiz (Sí/No), va en un punto pequeño. El ámbar sigue reservado a alertas (`coloresAvance.ts`).
5. **Un valor por defecto válido cuenta como cerrado** (ej. "Sí, trabajó" preseleccionado), porque se guardará tal cual. Una **sugerencia** (placeholder) no cuenta como cerrado hasta que el bloque se cierra.
6. **No se combina con bordes izquierdos de color**, reservados a `AdvanceListScreen`.
7. **Transición abierto → cerrado:** pliegue de altura y opacidad de 240–280 ms, `ease-out`. Respeta "reducir movimiento" del sistema (sin animación, cambio directo).

**Justificación:** Durante el diseño, tres elementos distintos (la respuesta elegida, el horómetro capturado y la actividad compacta) terminaron hablando el mismo idioma sin planearlo. Hacerlo regla convierte un detalle visual en algo que el usuario aprende una vez y reconoce en toda la app: no necesita leer para saber qué ya quedó. Esto atiende la causa raíz del abandono (H4: lo capturado no vuelve a verse).

**Alternativas rechazadas:**
- *Color semántico por estado (verde = hecho):* se confunde con el plano de avance y con estados de aprobación.
- *Contorno oscuro también en edición:* dice "cerrado" cuando el bloque está abierto (la primera versión del horómetro lo hacía; corregido el 14-oct).

**Alcance:** se aplica a toda superficie nueva de captura. Candidatos a adoptarlo en revisiones futuras: `CapturaRapidaSheet` (cantidad confirmada), el wizard de Reporte de Actividades (pasos completos) y los filtros elegidos.

---

### D12. Regla del tap — **estándar de toda la app**

**Decisión:** **Un tap expresa una sola intención y se cumple completa.** En concreto:

| # | Regla | Ejemplo en la hoja |
|---|---|---|
| T1 | **Un tap fuera confirma y cierra.** Lo escrito se guarda y el elemento se cierra con el mismo tap. No hay un tap de "confirmar" separado del de "salir". | Escribir una actividad y tocar un área vacía: queda guardada y compactada |
| T2 | **Un tap sobre un accionable ejecuta el accionable.** El cierre del elemento abierto ocurre **después** de la acción. Nada se mueve bajo el dedo mientras dura el gesto. | Escribiendo una actividad, tocar "+ Agregar actividad": se crea la nueva y luego se compacta la anterior |
| T3 | **Un tap sobre otro elemento compacto lo abre**, en ese mismo tap, y cierra el que estaba abierto. | Con el renglón 1 abierto, tocar el renglón 2 |
| T4 | **Tocar fuera nunca descarta.** Borrar es siempre explícito (✕, "cambiar"). | Salir de una actividad a medio escribir conserva el texto |
| T5 | **Lo incompleto no se cierra.** Un elemento sin dato válido queda abierto y visible. | Una búsqueda de concepto sin elegir resultado |

**Por qué existe T2 (el error que corrige):** un tap tiene dos momentos: cuando el dedo toca (*press in*) y cuando se levanta (*press out*). Los botones ejecutan su acción al levantar el dedo. Si la pantalla se compacta al tocar, la lista se encoge y, al levantar el dedo, el botón ya no está debajo: la acción se pierde. El usuario tiene que tocar dos veces y lo percibe como una app "pesada".

**Justificación:** Cada tap extra es una pregunta que el usuario no hizo ("¿seguro que quieres salir?"). La regla convierte el fuera-de-foco en confirmación y garantiza que el destino del tap no se mueva.

**Alternativas rechazadas:**
- *Botón "Listo" por tarjeta:* agrega un tap en cada actividad.
- *Compactar al tocar (press in):* mueve el layout y pierde el tap (comportamiento de la Rev I).
- *Descartar al tocar fuera:* pérdida silenciosa de datos en campo.

**Implementación en React Native (normativa):**

1. **Contenedor de captura de la hoja:** un `View` raíz con `onStartShouldSetResponderCapture` que **observa** el inicio de cada toque (devuelve `false`, no roba el gesto) y registra si cae dentro de un elemento abierto, en otro elemento compacto o fuera.
2. **Cierre diferido:** si el toque cae sobre un accionable (`Pressable`, input), el cierre se agenda **después** de su `onPress` (`requestAnimationFrame` o `InteractionManager.runAfterInteractions`). Si cae en un área vacía, el cierre ocurre de inmediato.
3. **El teclado también mueve el layout:** todo `ScrollView` / `BottomSheetScrollView` con inputs usa `keyboardShouldPersistTaps="handled"` (ya es el patrón en `CapturaRapidaSheet` y `SabanaScreen`), para que el primer tap con teclado abierto llegue al botón. El teclado se cierra después de la acción, no antes.
4. **`onBlur` no cierra por sí solo** si hay un cierre diferido pendiente; lo hace el agendado del punto 2, para no cambiar el layout a mitad del gesto.
5. **Animaciones de layout con Reanimated** (`Layout` / `LinearTransition`, ya disponible): nunca `LayoutAnimation` global, que anima toda la pantalla.

**Alcance:** toda lista editable en sitio y todo sheet con secciones que se compactan. Prueba de aceptación estándar: *con un elemento abierto y el teclado visible, un solo tap sobre cualquier botón visible ejecuta ese botón.*

---

### D13. Transitorias fuera del flujo

**Decisión:** La app deja de ofrecer "Transitoria" en el alta. Toda máquina se reporta igual, sobre su estancia. Una renta corta es una estancia que se cierra al registrar la salida. Las máquinas ya registradas como transitorias se tratan como residentes.

**Justificación:** Corrige H1 sin lógica especial y elimina una distinción del modelo de datos que el usuario nunca vio pero que cambiaba el comportamiento (H5). Para ollas y volteos, el dato útil es el de colado o acarreo, no la jornada.

**Alternativas rechazadas:** *Sección "Visitas" con flujo propio:* conserva una distinción sin valor de negocio.

---

### D14. Cierre olvidado: se pregunta

**Decisión:** Si la jornada anterior quedó solo con arranque y el usuario captura el inicial de hoy, la hoja pregunta: "La jornada del {fecha} arrancó en {inicial} y quedó sin cierre. ¿Usar {lectura} como cierre del {fecha}? Serían {h} h ese día." con **"Sí, usarlo"** / **"No, lo corrijo después"**. "No" no bloquea.

**Justificación:** La lectura inicial de hoy es, casi siempre, el cierre de ayer. Preguntar mantiene al supervisor en control del registro; rellenar en silencio no.

**Estado:** aprobado el 13-oct; no está en el prototipo (ver Deuda #4).

---

## Inventario de infraestructura

### Se reutiliza tal cual

| Pieza | Ubicación | Uso |
|---|---|---|
| Motor de cola offline + marca de agua | `useAdvanceSubmitToQueue`, `useAdvanceSyncWorker`, ADR-004 E8 | Patrón para la cola de jornadas (cola propia, mismo diseño) |
| Búsqueda con ancestros | `sabanaTreeBuilder.getSearchResults` (`ancestors`) | Búsqueda de concepto con ruta (D5) |
| Datos del catálogo offline | `useAvanceBase` → Realm `AvanceBaseResponse` | Fuente local de la búsqueda (sin red) |
| Bottom sheet | `@gorhom/bottom-sheet`, patrón `useState` + `useEffect(isVisible)` | `JornadaSheet` |
| Animaciones | `react-native-reanimated` ~3.17 | Plegados, pulso, entradas de encabezado |
| Escalas | `escala.ts` (`sp`, `fs`, `lh`) | Toda la hoja |
| Fechas | `DateUtils`, `useFechaOperativa`, `fechaPrograma.ts` | "Última lectura · mar 13", fecha de la jornada |
| Telemetría | `telemetry.trackEvent` | Eventos de §Métricas |
| Idempotencia | `Jornada.client_id` (backend, 13-oct) | Reintentos de la cola |

### Se adapta

| Pieza | Cambio |
|---|---|
| `MaquinariaCard` | Un solo destino (la hoja); sin botones "Reportar jornada" / "Sin operar"; sin borde izquierdo de color. Rediseño completo pendiente (Deuda #3) |
| `HubDiarioScreen` | Monta `JornadaSheet` en lugar de dos sheets |
| `AltaMaquinariaForm` | Retira "Permanencia" (D13); agrega "¿Tiene horómetro?" si se aprueba (Deuda #2) |
| `designTokens.ts` | Tokens `cerrado.fondo` y `cerrado.fondoControl` (D11) |
| Tipos `maquinaria.ts` y Realm del hub | Actividades de la última jornada, bandera de lectura confiable (§Requisitos de backend) |

### Se crea

| Componente | Responsabilidad |
|---|---|
| `JornadaSheet` | Orquesta la hoja: respuesta, horómetro, actividades, resumen, registro (D1–D10) |
| `RespuestaTrabajo` | Selección Sí/No compacta (D2) |
| `BloqueHorometro` | Campos, placeholder, horas en vivo, avisos, compactación (D3, D14) |
| `ListaActividades` | Lista, agregar/quitar, bloque compacto numerado, reparto de horas, repetir (D4, D6, D7, D8) |
| `TarjetaActividad` | Dos caminos, "ó", plegado, encabezado de tipo, "cambiar", ✕ (D5) |
| `BuscadorConcepto` | Búsqueda local con ruta y resaltado (D5) |
| `estiloCerrado.ts` (`src/styles/patrones/`) | Constantes del patrón "cerrado" (D11) |
| `useCierreDiferido` | Implementación de la regla del tap: registra el toque, difiere el cierre tras la acción (D12) |
| `useJornadaSubmitToQueue` + `useJornadaSyncWorker` | Cola offline de jornadas con `client_id` y marca de agua |

---

## Requisitos de backend

Este ADR no implementa backend. Debe existir lo siguiente (ADR propio en el repo backend):

1. **`DetalleJornada`** (tabla nueva, la que estaba diferida): `jornada` FK (cascade), `orden`, `catalog` FK nulo, `concept` FK nulo, `descripcion` (texto), `horas` decimal nulo.
   - Un renglón es válido si tiene concepto **o** descripción. Si tiene concepto, el catálogo se deduce de él.
   - `TRABAJANDO` exige al menos un renglón válido; `SIN_OPERAR` no lleva renglones.
   - La suma de horas puede no coincidir con el horómetro: se advierte en el cliente, no se rechaza.
   - **Migración:** cada jornada actual se convierte en una jornada con un renglón, copiando su `catalog` y `concept`. Después se retiran `Jornada.catalog` y `Jornada.concept`.
2. **`TRABAJANDO` ya no exige catálogo a nivel jornada** (hoy lo exige el serializer): el dato vive en los renglones.
3. **Hub diario**, por máquina, además de lo que ya entrega (`ultimo_horometro`, `ultimo_horometro_fecha`):
   - `ultima_jornada_trabajada`: fecha y lista de renglones (para "Repetir", D8);
   - `lectura_confiable`: booleano, verdadero si desde `ultimo_horometro_fecha` no hay días sin reporte (D3, regla 3);
   - jornada abierta del día anterior sin cierre, si existe (D14).
   Con subconsultas correlacionadas, para conservar la promesa de 4 queries.
4. **Transitorias (D13):** el alta deja de aceptar `TRANSITORIA`; `/jornadas/transitoria/` queda obsoleto. Las estancias abiertas de transitorias existentes se revisan una vez.
5. **`Maquinaria.tiene_horometro`** booleano, por defecto `true`, si se aprueba la Deuda #2.
6. **Contador del hub:** "Reportadas" y el filtro usan la misma definición (H2). Estados sin solaparse: Trabajó · No operó · Sin reporte.

---

## Métricas de éxito

| Evento nuevo | Dónde | Propiedades |
|---|---|---|
| `jornada_sheet_opened` | `JornadaSheet` mount | `obra_id`, `estado_previo` (`sin_reporte` \| `arranque` \| `registrada`) |
| `jornada_registrada` | Al encolar | `obra_id`, `estado`, `n_actividades`, `n_conceptos`, `n_escritas`, `con_horometro`, `inicial_editado`, `horas_repartidas`, `uso_repetir`, `solo_arranque` |
| `jornada_repetir_usado` | Tap en "Repetir" | `obra_id`, `dias_desde_ultima`, `deshecho` |
| `actividad_cambiada` | Tap en "cambiar" | `de` (`concepto` \| `escrita`) |

Indicadores:

- **Adopción:** jornadas registradas por máquina en sitio por día (hoy el módulo está en desuso).
- **Calidad del dato:** % de jornadas con horómetro; % de inicial editado (si es alto, la sugerencia falla); % de jornadas con horas repartidas.
- **Catálogo:** proporción de actividades escritas contra conceptos. Una proporción alta en una obra indica trabajo fuera de catálogo o un catálogo difícil de buscar.
- **Fricción de la regla del tap:** `actividad_cambiada` inmediatamente después de crear una actividad (indicio de tap equivocado).

---

## Consecuencias

| Área | Impacto |
|---|---|
| Hoja de jornada | Dos sheets se reemplazan por uno; el reporte se puede revisar completo antes de guardar |
| Lenguaje visual | Patrón "cerrado" y regla del tap pasan a ser estándares de toda la app (D11, D12) |
| Datos | Jornada con N actividades (concepto o escrita) y horas repartidas: base para rendimientos por concepto |
| Offline | La jornada se captura sin señal (hoy falla) |
| Modelo | Transitorias desaparecen del flujo; corrige H1 |
| Backend | Tabla nueva, migración de datos y cambios en el hub (§Requisitos) |
| Realm | Cola nueva de jornadas; esquema del hub crece (aditivo) |
| Usuario | El primer día cambia la forma de reportar; la pregunta "¿Trabajó hoy?" y el resumen reducen la curva |

---

## Deuda técnica

1. **Sugerencias de concepto** ("trabajó aquí el {fecha}", "capturaste avance hoy"): diferidas por decisión de producto. La lámina A′ (Rev B) conserva el diseño.
2. **Máquinas sin horómetro:** pendiente decidir si el alta pregunta "¿Tiene horómetro?" (`tiene_horometro`) para ocultar el bloque, o si el bloque queda siempre visible y opcional.
3. **Tarjeta del hub y reconciliación:** fuera de este ADR. Pendiente: tarjeta con recibo, casillas de arranque/cierre para jornadas abiertas, semana visible en lugar del modal rojo de reconciliación (propuesta A del análisis, UX-SPEC-03 Rev A).
4. **Cierre olvidado (D14):** aprobado, sin prototipo.
5. **Observaciones del día en "Sí, trabajó":** la hoja final no tiene dónde registrar "trabajó y luego se descompuso" (decisión del 13-oct: va en observaciones). Propuesta: enlace "+ Nota del día" bajo las actividades, que se compacta con el patrón "cerrado".
6. **Cola offline con arranque:** "Guardar arranque" crea la jornada y el cierre es un `PATCH` posterior. Si el arranque sigue en la cola cuando llega el cierre, la cola debe fusionarlos (un solo `POST`) en lugar de encolar un `PATCH` sobre un id que aún no existe.
7. **Rendimiento de la búsqueda local** en catálogos muy grandes (miles de conceptos): medir antes de optimizar; si hace falta, índice en memoria por obra al abrir la hoja.
8. **Sin pruebas en frontend:** la regla del tap (D12) es el primer candidato a prueba de interacción automatizada.

---

## Guía de implementación

| Archivo | Decisiones |
|---|---|
| `src/styles/designTokens.ts` | D11 (tokens) |
| `src/styles/patrones/estiloCerrado.ts` | D11 |
| `src/hooks/ui/useCierreDiferido.ts` | D12 |
| `src/modules/maquinaria/components/JornadaSheet.tsx` | D1, D9, D10 |
| `src/modules/maquinaria/components/RespuestaTrabajo.tsx` | D2 |
| `src/modules/maquinaria/components/BloqueHorometro.tsx` | D3, D14 |
| `src/modules/maquinaria/components/ListaActividades.tsx` | D4, D6, D7, D8 |
| `src/modules/maquinaria/components/TarjetaActividad.tsx` | D5 |
| `src/modules/maquinaria/components/BuscadorConcepto.tsx` | D5 |
| `src/hooks/data/query/useMaquinaria/useJornadaSubmitToQueue.ts`, `useJornadaSyncWorker.ts` | D9, offline |
| `src/modules/maquinaria/components/MaquinariaCard.tsx`, `screens/HubDiarioScreen.tsx` | D1 |
| `src/modules/maquinaria/forms/AltaMaquinariaForm.tsx` | D13 |
| Se eliminan: `ReportarJornadaSheet.tsx`, `SinOperarSheet.tsx`, `useConceptsByCatalog.ts`, `useCreateJornadaTransitoria.ts` | D1, D5, D13 |

**Orden sugerido:** (1) tokens y `estiloCerrado` + `useCierreDiferido`, con una prueba de la regla del tap; (2) backend `DetalleJornada` + hub; (3) `TarjetaActividad` y `BuscadorConcepto`; (4) `BloqueHorometro`; (5) `JornadaSheet` y cola offline; (6) retiro de los sheets viejos y de transitorias.

---

## Ver también

- `docs/ux/maquinaria-hoja-jornada.html` — UX-SPEC-03 Rev K, prototipo interactivo de referencia
- `docs/ux/maquinaria-jornada-propuestas.html` — UX-SPEC-03 Rev A, diagnóstico (H1–H12) y propuestas A/B/C
- `docs/maquinaria-register_module.md` — documentación del módulo actual (junio 2026)
- Backend: `docs/maquinaria.md` (§Horómetro, §Idempotencia de la jornada, §Preparaciones para el futuro)
- ADR-003 (D4, D9) — gramática de gestos y fechas; ADR-004 (E8, E9) — marca de agua y "una fila, un destino"
- ADR-006 — Reporte de Actividades (candidato a adoptar D11 y D12)
