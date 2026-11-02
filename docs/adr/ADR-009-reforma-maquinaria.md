# ADR-009: Maquinaria — Varias capturas por jornada y hub por clasificación

**Fecha:** 2026-10-31
**Estado:** Implementado (2026-10-31). Pendientes P1–P3 decididos; ver §Enmiendas de implementación.
**Referencia visual:** `docs/ux/reforma-maquinaria.html` (UX-SPEC-04 Rev J)
**Repositorio:** sentinel-frontend-prod. La contraparte de servidor es el **ADR-007 del repo backend** (`docs/ADR/ADR-007-reforma-maquinaria.md`): modelo `Captura` y `Turno`, endpoint `POST /capturas/` y campos nuevos del hub. Aquí se citan sus decisiones como **B1–B9**.
**Enmienda a:** ADR-007 (D2, D3, D9, D14 y Deudas #3, #4 y #6). Ver §Enmiendas a ADR-007.

---

## Contexto

La hoja de jornada (ADR-007) está implementada y funciona. Al revisarla contra el uso real en obra (`main` @f5c96a0, 31-oct) aparecieron estos problemas:

| # | Hallazgo | Tipo |
|---|---|---|
| H1 | **Una vez enviada, la máquina queda congelada todo el día.** `JornadaSheet` muestra "Ya reportada hoy" con el botón apagado y la línea "Editarla todavía no es posible desde aquí" | Bug de flujo |
| H2 | **El cierre de la tarde no se puede capturar.** "Guardar arranque" (D9) crea la jornada, y por H1 la hoja ya no deja capturar el final. El flujo de dos momentos que aprobó D9 no funciona | Bug de flujo |
| H3 | **"Guardar arranque" exige una actividad.** El supervisor lee el horómetro al subir a la máquina, antes de que trabaje, y no puede guardarlo | Fricción |
| H4 | **La cola no sabe hacer `PATCH`** (Deuda #6). Cualquier diseño que edite una jornada enviada choca con la captura sin señal | Infraestructura |
| H5 | **El hub obliga a inspeccionar cada tarjeta.** El estado solo se distingue por color y las tarjetas van revueltas, "como tener todos los dulces en un cajón" | Claridad |
| H6 | **El horómetro se lee por turno, no por día.** Una máquina puede volver a trabajar después del cierre, o tener un turno nocturno que cruza la medianoche | Modelo (resuelto en B2) |

**Datos de producto que fijan el diseño (31-oct):**

- **Una jornada es un día.** Si la máquina hizo 1 o 15 actividades es otro tema. La primera actividad la marca como trabajando.
- **El horómetro es de la máquina; las actividades son de la jornada.** Las lecturas se toman al iniciar y al terminar, y las actividades se capturan en medio. **El dato duro es el horómetro**; las horas por actividad son un plus subjetivo.
- **El supervisor se sube a la máquina, captura el inicial, lo guarda y sigue su día** hasta que reporta actividades.
- **Guardar el arranque no garantiza que la máquina trabaje.** Solo una actividad la pasa a "Trabajando".
- **Varios turnos el mismo día son el caso extremo, no el base.**
- **No se pide la hora de ejecución.** Vale la hora en que se registra. El usuario asume que así es y no hay que explicárselo.
- **Corregir lo ya enviado queda fuera de esta iteración.**
- **Las máquinas sin horómetro siguen viendo el bloque** (bombas, revolvedoras).

**Restricciones:**

- **Se reutiliza la hoja implementada:** mismos bloques, patrón "cerrado" (D11), regla del tap (D12), "Repetir", compacta B y resumen. No se hacen hojas nuevas.
- **Offline-first:** cada guardado es un envío a la cola Realm, como hoy.

---

## Vocabulario

| Término | Qué es |
|---|---|
| **Jornada** | El día operativo de una máquina. Una por máquina y día |
| **Turno** | Una lectura inicial y una final del horómetro (B2). Pertenece al día en que **empieza**. Solo puede haber uno abierto por máquina |
| **Captura** | Lo que el usuario guarda de una vez: arranque, actividades, cierre o varias cosas juntas. Es **la unidad de la cola** (B1) |
| **Reportada** | La máquina tiene al menos una actividad **o** se marcó "No operó". **El arranque no reporta.** Lo guardado sin señal también cuenta |

"Turno" es palabra del sistema. En pantalla aparece **una sola vez**, en "¿Volvió a trabajar? Iniciar otro turno". El usuario captura lecturas y actividades; el sistema arma los turnos con ellas.

---

## Decisiones

### D1. La cola envía capturas, no jornadas (cierra la Deuda #6)

**Decisión:** Cada guardado de la hoja encola una **captura** con su propio `client_id` y su `registrado_en`, que es la hora del teléfono al guardar. El worker las envía en orden a `POST /capturas/` (B1). El servidor las suma a la jornada.

**Justificación:** cada captura es un `POST` como los de hoy, así que la cola no tiene que aprender `PATCH` ni fusionar arranque con cierre. La Deuda #6 desaparece por diseño.

**Alternativas rechazadas:** *`PATCH` sobre la jornada*: exige conocer el id de servidor y fusionar en la cola, que es justo la Deuda #6.

---

### D2. Qué clasifica a una máquina en el día

**Decisión:**

| Lo guardado hoy (servidor + cola) | Estado | Sección del hub | ¿Reportada? |
|---|---|---|---|
| Nada | Sin reportar | Sin trabajar | No |
| Solo horómetro inicial | Sin reportar | Sin trabajar | **No** |
| "No operó" + motivo | No operó | Sin trabajar | Sí |
| ≥1 actividad, **enviada o en cola** | Trabajando | Trabajando | Sí |
| Envío fallido · cierre olvidado · reconciliación | — | Requiere atención | Según lo que tenga |

- **Lo único que pasa una máquina a "Trabajando" es una actividad.** Una actividad que todavía está en la cola ya cuenta. Para el usuario, que no se haya enviado es solo un trámite: se sube cuando haya red.
- El servidor manda `estado_dia` (B7). El cliente lo **funde con la cola** en `filaMaquinaria.ts`: una actividad en cola sube la máquina a "Trabajando"; un arranque en cola no la mueve.

**Justificación:** el arranque es una lectura, no una afirmación de que la máquina trabajó. Si contara como reporte, la barra diría "reportada" de una máquina de la que no se sabe nada.

---

### D3. La hoja se vuelve a abrir: lo registrado se lee y lo que falta se captura

**Decisión:** `JornadaSheet` deja de bloquearse después del primer guardado. Al abrirla con una jornada existente:

| Bloque | Lo ya registrado | Lo que se puede capturar |
|---|---|---|
| ¿Trabajó hoy? | — | **Solo si la jornada está vacía.** En cuanto hay algo guardado, desaparece |
| Horómetro, turno abierto | El inicial como texto, con "HH:MM · autor" debajo | El final, en su campo de siempre |
| Horómetro, turno cerrado | Una línea: "8,871.5 → 8,879.5 · 8.0 h" y debajo "07:02 J. Pérez · 18:05 L. Ruiz" | — |
| Actividades | Una lista con hora, ruta/WBS o "✎ Escrita", descripción, autor y horas si las hay | "+ Agregar actividad" abre una tarjeta nueva (ADR-007 D5) |

**Reglas de lenguaje:**
- **Lo registrado no lleva el patrón "cerrado"**, porque no se reabre: corregir está fuera de alcance y D11 regla 2 lo prohíbe. Es texto sin caja: sin contorno oscuro y sin chevron.
- **Lo que se captura sigue D11 y D12** sin cambios: tarjeta de actividad, campos del horómetro y compacta B.
- **Lo que está en cola** muestra solo la nube de la cola (`cloud-upload-outline`), sin texto, junto al dato.

**El botón dice lo que se va a registrar:**

| Lo nuevo en la hoja | Botón |
|---|---|
| Inicial y/o actividades, sin turno abierto y sin final | **Guardar arranque** |
| Actividades, con turno ya abierto y sin final | **Registrar actividad** |
| Solo el final | **Registrar cierre** |
| Actividades + final | **Registrar actividad y cierre** |
| "No operó" + motivo | **Registrar jornada** (como hoy) |
| Nada nuevo | *Sin botón* |

**El resumen sobre el botón es el mismo texto en todos los casos:**
- **Con actividades**, el estándar que ya existe en `JornadaSheet`: *"Se registrará: {tipo} {marca} {modelo} trabajó hoy{horas}, en {N} actividad(es)."* `{horas}` sale de la lógica actual: `, con arranque en {inicial} y el cierre pendiente`, `, {h} h de horómetro`, `, con el cierre pendiente` o nada. `{N}` cuenta las actividades **de esta captura**.
- **Solo arranque:** *"Se registrará: arranque de la {tipo} en {inicial}."*
- **Solo cierre:** *"Se registrará: cierre en {final} · {h} h de horómetro."*
- **"No operó":** sin cambios.
- Se conservan los avisos de lo precargado: inicial tomado de la última lectura y actividades copiadas.

**Justificación:** es la hoja que ya existe y funciona. El usuario ve lo que ya guardó y completa lo que falta. Si el resumen cambiara entre casos, el del primer turno leería una cosa y el del segundo otra.

**Alternativas rechazadas:**
- *Una hoja nueva con "Turno abierto", "Iniciar turno" y "Cerrar turno"* (Rev D): le pasa al usuario un concepto del sistema y descarta lo construido.
- *Lo registrado con el patrón "cerrado":* contradice D11.
- *La línea "Regístrala al terminarla: queda con la hora en que la guardas":* explica un detalle del sistema que no es problema del usuario.

---

### D4. "Guardar arranque" con el inicial **o** con una actividad (corrige ADR-007 D9)

**Decisión:** "Guardar arranque" se habilita con cualquier contenido: solo el inicial, solo actividades, o las dos cosas.
- **Inicial sin tocar:** se usa la última lectura, como hoy (D3), con el aviso "Inicial tomado de la última lectura · {fecha}".
- **Sin lectura previa** (primer día de la máquina) y sin inicial: se guarda sin horómetro, **sin aviso en la hoja**. El hub mostrará "Sin horómetro" (D8).

**Justificación:** el supervisor lee el horómetro al subir, antes de que haya actividad (H3).

---

### D5. "¿Volvió a trabajar? Iniciar otro turno"

**Decisión:** Después de un cierre, la hoja muestra al pie dos líneas:

> ¿Volvió a trabajar? **Iniciar otro turno**
> ¿La máquina ya se fue de la obra? **Registrar salida**

Antes del cierre solo aparece la de salida.

"Iniciar otro turno" abre la hoja **vacía, como la primera captura del día**:
- Inicial con placeholder igual al final del turno anterior, y campo final.
- Actividades, con "Repetir lo del turno anterior · N".
- Resumen y "Guardar arranque".
- Arriba, una sola línea de solo lectura:

> Turno anterior: **8,871.5 → 8,879.5 · 8.0 h** · 2 actividades

Después de un cierre, "+ Agregar actividad" sigue disponible y **no abre turno**: la actividad va a la jornada del día.

**Justificación:** el turno nuevo se registra completo, como el primero. La línea del turno anterior da contexto al inicial sugerido y evita duplicar actividades.

**Alternativas rechazadas:**
- *Apilar un segundo bloque de horómetro* (Rev E): mezcla dos turnos en una sola pantalla.
- *"Capturar otra lectura":* se confundía con corregir.
- *"Modificar lectura":* es corrección, que queda fuera de esta iteración.

---

### D6. Turno nocturno

**Decisión:**
- Con un turno abierto que empezó ayer, la hoja dice **"Jornada · {día de inicio}"** en el encabezado y muestra ese turno.
- En lo registrado, la hora lleva el día debajo cuando no coincide con el de la jornada ("22:10 / jue 15").
- El resumen es el estándar (D3), sin texto especial.
- En qué sección del hub va esa máquina mientras su turno de ayer sigue abierto: **ver P2**.

---

### D7. Cierre olvidado (ajusta ADR-007 D14)

**Decisión:** D14 se conserva. La pregunta aparece **dentro del bloque del horómetro** cuando alguien captura un inicial nuevo y el turno anterior sigue sin final:

> Ayer (jue 15) arrancó en **8,871.5** y no se capturó el final. ¿Usar **8,879.5** como final de ayer? Serían **8.0 h** el jueves.
> [ **Sí, usarlo** ] [ **No, dejarlo sin final** ]

La respuesta viaja en la misma captura (`cerrar_anterior`, B4).

**Cambio respecto a D14:** "No, lo corrijo después" pasa a "No, dejarlo sin final". Corregir está fuera de esta iteración, y la regla de un solo turno abierto obliga a cerrar el anterior.

---

### D8. Hub: tres clasificaciones y una tarjeta de siete posiciones

**Secciones, en este orden:** **Requiere atención · Sin trabajar · Trabajando.** Una sección vacía no aparece.

**Tarjeta (todas iguales, cada dato siempre en el mismo lugar):**

```
┌───────────────────────────────────────────────────┐
│ [1 Tipo]  [2 Marca]  [3 Modelo]                     │
│ [4 Estatus]   [5 Faltante]          [6 Acción]    › │
│ [7 Propiedad]                                ☁     │
└───────────────────────────────────────────────────┘
```

| Pos. | Contenido |
|---|---|
| 1 · 2 · 3 | Tipo (seminegrita) · marca · modelo. Si no cabe, se recorta **solo la marca** |
| 4 Estatus | ● verde "N actividades" · ● rojo "No operó · {motivo}" · ● amarillo "Sin reportar" (`warning[400]`, como hoy) · en "Requiere atención", solo el problema, en rojo |
| 5 Faltante | **Solo en "Trabajando"**, y solo si la jornada no tiene ninguna lectura de horómetro: "Sin horómetro" (`falta_horometro`, B7). Nunca coincide con la 6 |
| 6 Acción | Solo dos: **Reportar** (sin reportar) y **Resolver** (requiere atención) |
| 7 Propiedad | Propia · Rentada · Subcontrato |
| ☁ | Esquina inferior derecha, solo si hay algo en cola. Solo el ícono `cloud-upload-outline`, **sin texto**, en gris pizarra. Reemplaza al `cloud-offline` que hoy usa `MaquinariaCard` |
| › | Siempre. **Toda la tarjeta abre la hoja** de la máquina |

**Reglas visuales:**
- **"Requiere atención" va todo en rojo:** contorno del grupo, punto, texto y "Resolver".
- **El hub no usa el patrón "cerrado"**, porque son datos del servidor. Los grupos son blancos.
- **Medidas:** relleno de 7 px arriba y abajo y de 12 px a la izquierda; 2 px entre las líneas 1 y 2, y 1 px entre la 2 y la 3; interlineado 1.35. Alto de referencia: unos 68 px.

**Encabezado:** fecha y **barra de reportadas**, por ejemplo "4 de 7 reportadas" (D2). Reemplaza a los cuatro contadores-filtro actuales (En sitio / Reportadas / Sin reportar / Sin operar). Deja de haber filtros.

**Motivos de "Requiere atención":**

| Motivo | Pos. 4 | "Resolver" abre |
|---|---|---|
| Envío fallido (cola) | "No se envió" | El rescate de la cola (Reintentar / Descartar), como hoy |
| Turno de ayer sin final (`SIN_FINAL`, B7; umbral en P2) | "Ayer quedó sin final" | La hoja, con la pregunta de D7 al capturar el inicial |
| Reconciliación | El texto actual del motivo | El modal de reconciliación existente |

**Justificación:** el estado deja de leerse solo por color: lo dice la sección. Las tarjetas son predecibles porque cada dato tiene un lugar fijo. La barra mide lo que el supervisor controla, que es reportar, y lo obliga a reportar también lo que no trabajó: si no se sube, no hay certeza, solo se asume por omisión.

**Alternativas rechazadas:**
- *Cuatro secciones por momento del turno* (Rev D): más complejidad de la necesaria.
- *Barra de máquinas trabajando:* premia algo que el supervisor no controla.
- *"Maquinaria ociosa":* a las 07:00 las máquinas no están ociosas; simplemente no hay registro.
- *Nube en ámbar:* compite con el punto amarillo de "Sin reportar".

---

### D9. Máquinas sin horómetro: fuera de esta iteración

**Decisión:** El alta no pregunta "¿Tiene horómetro?". Las máquinas sin horómetro ven el bloque como hoy y lo dejan vacío.

**Consecuencia aceptada:** como la app no distingue "no tiene horómetro" de "nadie tomó la lectura", esas máquinas mostrarán **"Sin horómetro" cada día que trabajen**.

---

## Flujos por caso

Ejemplo: una obra con 7 máquinas, el jueves 15 y el viernes 16 de octubre.

### C1. Caso base: un turno, varias capturas

| Hora | El usuario | Botón | Hub |
|---|---|---|---|
| 07:02 | Abre la hoja vacía y escribe el inicial 8,871.5 | Guardar arranque | Sin trabajar · Sin reportar · **Reportar** |
| 09:40 | Abre la hoja: ve el inicial registrado. Agrega 1.2.07 | Registrar actividad | Trabajando · "1 actividad" |
| 13:10 | Agrega una actividad escrita | Registrar actividad | Trabajando · "2 actividades" |
| 18:05 | Escribe el final 8,879.5 | Registrar cierre | Trabajando · "2 actividades" |
| 18:20 | Abre la hoja: todo registrado y sin botón. Al pie: "Iniciar otro turno" y "Registrar salida" | — | — |

Si al cerrar también agrega una actividad, el botón dice "Registrar actividad y cierre".

### C2. Arranque con actividad
A las 07:30 captura el inicial y una actividad → "Guardar arranque" → **Trabajando**.

### C3. Solo actividad, sin tocar el inicial
El inicial toma la última lectura, con su aviso → "Guardar arranque" → **Trabajando**.

### C4. Primer día, sin lectura previa
Solo una actividad, sin inicial → "Guardar arranque", sin aviso → **Trabajando · "Sin horómetro"**.

### C5. Agregar después del cierre
"+ Agregar actividad" → "Registrar actividad". No abre turno.

### C6. Otro turno el mismo día
1. A las 19:30, en la hoja ya cerrada: "¿Volvió a trabajar? **Iniciar otro turno**".
2. La hoja abre vacía con "Turno anterior: …" y el inicial sugerido 8,879.5.
3. "Guardar arranque". Se completa como C1. Las horas del día se suman.

### C7. Turno nocturno
1. **Jue 15, 21:00:** si el turno de día ya cerró, es C6; si es lo primero del día, es C1.
2. **Jue 15, 22:10:** "Registrar actividad".
3. **Vie 16, 03:05:** abre la máquina → la hoja dice **"Jornada · jue 15 oct"** → "Registrar actividad". En lo registrado, la hora sale como "03:05 / vie 16".
4. **Vie 16, 06:00:** escribe el final → "Registrar cierre".
5. **Vie 16, 07:00:** el turno de día abre la máquina → hoja vacía de la jornada del 16 → C1.

### C8. No operó
Con la jornada vacía: "No operó" + motivo → "Registrar jornada" → **Sin trabajar · "No operó · {motivo}"**. Cuenta como reportada. Si después llega una actividad: **P1**.

### C9. Sin señal
Lo que se guarda aparece de inmediato en lo registrado, con la nube al lado. En el hub, la tarjeta se clasifica **como si ya se hubiera enviado** y lleva la nube en la esquina. Al enviarse, la nube desaparece y la tarjeta no cambia de sección.

### C10. Envío fallido
La captura recibe un 4xx → **Requiere atención · "No se envió" · Resolver** → rescate existente.

### C11. Cierre olvidado
1. Jue 15: "Guardar arranque" en 8,871.5. Nadie captura el final.
2. Vie 16: **Requiere atención · "Ayer quedó sin final" · Resolver** (P2).
3. Resolver → hoja del 16 → escribe el inicial 8,879.5 → aparece la pregunta de D7.
4. "Sí, usarlo" → el jueves queda con 8.0 h y se abre el turno del 16. "No, dejarlo sin final" → el jueves queda marcado sin final y se abre el del 16.

**Sin señal en C11:** el cliente detecta el turno abierto con su caché (`turno_abierto`, B7) y muestra D7 antes de guardar. Si el servidor responde 409 de todas formas (B4), la máquina va a "Requiere atención".

---

## Inventario

| Archivo | Cambio |
|---|---|
| `JornadaSheet.tsx` | Quitar el bloqueo `yaReportada`. Modo "registrado + captura" (D3). Botón y resumen según el contenido. "¿Trabajó hoy?" solo con la jornada vacía. Pie tras el cierre (D5). Línea "Turno anterior". Encabezado de la jornada del turno abierto (D6). Pregunta de D7 |
| `BloqueHorometro.tsx` | El inicial registrado como texto y el final capturable. El turno cerrado en una línea de solo lectura con autores. Placeholder del inicial = final del turno anterior cuando lo hay |
| `MaquinariaCard.tsx` | Reescrita con las siete posiciones (D8). Nube `cloud-upload-outline` gris y sin texto. Sin botones ni banners internos |
| `HubResumenHeader.tsx` | Barra "N de M reportadas" en lugar de los cuatro contadores-filtro |
| `HubDiarioScreen.tsx` | Tres secciones en orden fijo y sin filtros. "Resolver" despacha según el motivo |
| `filaMaquinaria.ts` | Clasificación de D2: funde `estado_dia` con la cola |
| `usePendingJornadaQueue.ts` | La unidad de la cola pasa a ser la **captura** (D1). `registrado_en` se fija al guardar |
| `useMaquinariaSyncWorker.ts` | Envía las capturas en orden por máquina a `POST /capturas/`. Un 409 de B4 lleva la máquina a "Requiere atención" |
| `types/maquinaria.ts`, `MaquinariaHubItemRealm.ts` | Campos nuevos del hub y de la jornada (B7) |
| `useMaquinariaDelDia.ts`, `ReporteDetailScreen.tsx` (reportes) | Leer las horas desde los turnos (P3) |

**Se reutiliza tal cual:** la tarjeta de actividad, la búsqueda de concepto, "Repetir", la compacta B, los motivos de "No operó", `SalidaObraSheet`, el modal de reconciliación y el rescate de la cola.

---

## Criterios de aceptación

Se prueban en el dispositivo. Un caso se acepta cuando ocurre todo lo listado y no aparece nada más.

- **A. Base (C1).** Cuatro capturas, cuatro envíos. La tarjeta pasa a *Trabajando* con la primera actividad, no con el arranque. A las 18:20 la hoja no tiene botón y muestra lo registrado con hora y autor.
- **B. Arranque solo.** Se guarda. La barra no cuenta la máquina y la tarjeta dice "Sin reportar · Reportar".
- **C. Primer día (C4).** Se guarda solo con una actividad y sin aviso. La tarjeta dice "1 actividad · Sin horómetro".
- **D. Otro turno (C6).** "Iniciar otro turno" solo aparece después del cierre. La hoja abre vacía con la línea del turno anterior.
- **E. Nocturno (C7).** El encabezado dice la jornada del 15. La actividad de las 03:05 muestra "vie 16" debajo de la hora.
- **F. Sin señal (C9).** En modo avión, una actividad pasa la tarjeta a *Trabajando* de inmediato, la barra la cuenta y aparece la nube sin texto. Al volver la señal, la nube desaparece y nada cambia de sección.
- **G. Cierre olvidado (C11).** Aparece la pregunta de D7, y las dos respuestas dejan un solo turno abierto.
- **H. Hub.** Solo existen "Reportar" y "Resolver". Todo "Requiere atención" va en rojo. Ninguna tarjeta usa el patrón "cerrado". El tipo y el modelo nunca se recortan.
- **I. Resumen.** Las actividades de C1, C6 y C7 muestran el mismo texto estándar.

---

## Enmiendas a ADR-007

| Decisión | Cambio |
|---|---|
| D1 | Sin cambio: una tarjeta abre una hoja. La hoja ahora se reabre (D3) |
| D2 | "¿Trabajó hoy?" solo se muestra con la jornada vacía |
| D3 | El inicial sugerido es el final del turno anterior cuando lo hay |
| D9 | **Corrige:** "Guardar arranque" ya no exige actividad (D4). El botón y el resumen dependen del contenido (D3) |
| D14 | "No, lo corrijo después" → "No, dejarlo sin final" (D7) |
| Deuda #2 | Sigue abierta (D9) |
| Deuda #3 | **Resuelta** por D8 |
| Deuda #4 | **Resuelta**: D14 entra con D7 |
| Deuda #6 | **Resuelta por diseño** (D1) |

---

## Consecuencias

- **El supervisor puede capturar como trabaja:** la lectura al subir, las actividades conforme pasan y la lectura al bajar.
- **El hub se lee por sección**, y la barra mide reportes.
- **La cola cambia de unidad:** de jornada a captura. Realm y el worker se reescriben para eso.
- **Las máquinas sin horómetro dicen "Sin horómetro" a diario** hasta que se resuelva la Deuda #2.
- **No hay forma de corregir un dato enviado.** Antes tampoco la había (H1), pero ahora es explícito.

---

## Deuda técnica

1. **Corregir lo enviado** ("Modificar lectura" y edición de actividades): siguiente iteración, sobre el control de cambios genérico.
2. **"¿Tiene horómetro?" en el alta** (ADR-007 Deuda #2).
3. **La app usa tres nubes distintas** (`cloud-upload-outline`, `cloud-offline`, `cloud-offline-outline`). Este ADR alinea maquinaria con la cola; los demás módulos quedan pendientes.
4. **Texto para el 409 por captura concurrente** (dos personas abren turno sin señal): falta definirlo.

---

## Pendientes de decisión

- **P1. Una actividad después de "No operó".** ¿La hoja de una máquina con "No operó" registrado ofrece "+ Agregar actividad"? Propuesta: **sí**. La jornada pasa a *Trabajando* y el motivo se guarda en observaciones (B5).
- **P2. Turno abierto de ayer: ¿nocturno u olvidado?** Propuesta: **hasta 14 h abierto es un turno en curso**: la tarjeta del 16 va en *Trabajando*, con el estatus de esa jornada, y abre la hoja del turno del 15. La barra del 16 no la cuenta. **Más de 14 h es un cierre olvidado** y va a *Requiere atención*.
- **P3. Horómetro en el reporte ejecutivo con varios turnos.** Lo resuelve el backend (B8). El cliente solo muestra lo que llegue.

---

## Enmiendas de implementación (2026-10-31)

Decididas con el autor al implementar. Mandan sobre el texto de arriba. Las del servidor están en el ADR-007 del backend (E1–E13).

| # | Sobre | Cambio |
|---|---|---|
| F1 | P1 | **Aceptada.** Con "No operó" registrado, la hoja enseña "No operó · {motivo}" y ofrece "+ Agregar actividad"; la actividad la pasa a *Trabajando* |
| F2 | P2 | **Aceptada: 14 h.** El servidor manda `olvidado_en` en `turno_abierto`, así que la tarjeta cambia de sección sin señal. Solo los turnos abiertos en el propio teléfono usan la copia del umbral (`UMBRAL_OLVIDO_HORAS`) |
| F3 | P3 | **Aceptada.** La previsualización imprime el inicial del primer turno, el final del último y la suma de los turnos completos en la columna "Horas" |
| F4 | D7, C11 | **El cierre olvidado BLOQUEA y se resuelve aparte.** La máquina va a *Requiere atención* y no se puede reportar hasta resolverlo. "Resolver" abre la hoja con solo el recuadro del cierre olvidado: un campo para el final de ese turno **sin sugerencia** —la única fuente honesta es quien lo leyó— y "Dejarlo sin final". Resolver **no abre turno**: la máquina pasa a *Sin trabajar* y el ciclo del día empieza limpio. **Desaparece la pregunta dentro del bloque del horómetro** al capturar el inicial (D7 tal como se diseñó, y la lámina C-1) |
| F5 | D1 | **La cola se detiene por máquina.** Si una captura falla, las siguientes de esa misma máquina esperan hasta Reintentar o Descartar; las demás máquinas siguen. Evita errores en cascada (un cierre detrás de un arranque rechazado) |
| F6 | D5 | **"Repetir lo del turno anterior"** copia las actividades registradas entre el arranque y el cierre de ese turno (por `registrado_en`), incluida la que vino con el cierre. Las de después del cierre no son de ese turno |
| F7 | D4 | **La sugerencia del inicial solo viaja en la primera captura** (jornada vacía u otro turno). Con la jornada ya empezada —actividades sin horómetro—, solo cuenta un inicial tecleado: la lectura de otro día no es el arranque de hoy |
| F8 | D3 | **Resumen del arranque:** "Se registrará: arranque de {tipo} {marca} {modelo} en {inicial}." en vez de "de la {tipo}": el artículo fijo daba "de la camión volteo" |
| F9 | D3 | Con la jornada vacía, la Actividad 1 ya está abierta (como antes). Con algo registrado no hay tarjeta vacía: se agrega con "+ Agregar actividad", y las nuevas se numeran después de las registradas. "Registrar salida" pasa al pie de la hoja; la tarjeta ya no tiene ícono de salida |
| F10 | D8 | La tarjeta del cierre olvidado dice "Ayer quedó sin final", o "El {fecha} quedó sin final" si no fue ayer. La de reconciliación, "{N} días sin reporte" |
| F11 | Realm | **schemaVersion 21.** El caché del hub guarda la jornada completa (`JornadaHubRealm`, `TurnoRealm`, `TurnoAbiertoRealm`) y ya no guarda los contadores del servidor: la barra cuenta sobre lo fundido con la cola. La cola de jornadas se muda a `PendingCapturaSubmission`: cada jornada sin enviar se vuelve una captura con lo mismo que traía |
| F12 | D2, P2 | **El nocturno en curso solo va a *Trabajando* si su jornada ya tiene actividades.** Un arranque de anoche sin actividades queda en *Sin trabajar · Sin reportar*, igual que uno de esta mañana; tocarlo abre la hoja de la jornada de ese turno |
| F13 | Cambio de día | La pantalla toma el día de `useFechaOperativa` (medianoche y regreso a primer plano), no de un `new Date()` por render: con la app abierta al cruzar la medianoche, el hub y la llave del refetch se quedaban en el día anterior. También se repinta sola cuando un turno abierto cruza el umbral de olvido |

### Dónde vive cada cosa

| Pieza | Archivo |
|---|---|
| Fusión servidor + cola y clasificación (D2, D8) | `src/modules/maquinaria/diaMaquina.ts` (+ `diaMaquina.test.mjs`, `npm run test:logica`) |
| Vistas para la pantalla | `src/modules/maquinaria/hooks/useVistasMaquinaria.ts` |
| Cola de capturas | `src/hooks/maquinaria/usePendingCapturaQueue.ts`, `src/realm/pendingJornada/PendingCapturaSubmission.ts` |
| Envío en orden por máquina | `src/hooks/maquinaria/useMaquinariaSyncWorker.ts` |
| Lo registrado (sin patrón "cerrado") | `src/modules/maquinaria/components/RegistroJornada.tsx` |

## Métricas y telemetría

- **Capturas por jornada** (mediana y p90).
- **% de jornadas con turno completo**: debe subir, porque el cierre por fin se puede capturar.
- **% de jornadas con más de un turno.**
- **Uso de "Iniciar otro turno"** y **respuestas a D7**.

Eventos: `captura_guardada` (`tipo`: arranque / actividad / cierre / mixta; `sin_senal`), `turno_iniciado_otro`, `cierre_olvidado_respondido` (`usar` / `sin_final`).

---

## Ver también

- Backend: `docs/ADR/ADR-007-reforma-maquinaria.md` (B1–B9)
- `docs/ux/reforma-maquinaria.html`: UX-SPEC-04 Rev J
- ADR-007: hoja de jornada, patrón "cerrado" (D11) y regla del tap (D12)
- ADR-006 F32: resaltado de llegada
