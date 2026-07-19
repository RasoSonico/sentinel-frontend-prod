# ADR-003: Sábana como Home — Rediseño de navegación y flujo del contratista (Fase 1)

**Fecha:** 2026-07-16
**Referencia visual:** `docs/ux/ux-spec-01.html` (UX-SPEC-01 Rev D — láminas L-01, L-01a, L-01b, L-01c; L-02 y L-03 en afinación)
**Repositorio:** sentinel-frontend-prod. Los cambios de backend se listan como requisitos, no como alcance de este ADR (ver §Requisitos de backend y `ADR-001-sabana-avance.md` del repo backend).

---

## Contexto

La telemetría de adopción (ADR-001/ADR-002 de telemetría) muestra abandono del rol CONTRATISTA: las únicas pantallas con uso real son `AdvanceRegistrationScreen`, `AdvanceListScreen` y `SabanaScreen`; la tab Incidencias está abandonada por completo. La hora promedio de registro es 17:37 (rango 09:58–22:57), lo que indica que la captura ocurre al final del día desde notas de libreta — la app funciona como sustituto del Excel nocturno, no como herramienta de campo, y por lo tanto **agrega trabajo en lugar de eliminarlo**.

El diagnóstico estratégico: la app está organizada por entidades de base de datos (avances, incidencias, maquinaria como tabs) en lugar del flujo de trabajo real del contratista (capturar en campo → cerrar el día → entregar reporte al cliente). La sábana es el único artefacto que el usuario reconoce sin entrenamiento (es su formato de toda la vida) y por ello se convierte en el home y punto de captura.

Esta Fase 1 cubre exclusivamente la reestructura de la zona Sábana (home) y sus pantallas satélite. El programa contractual (Fase 2), la tab Semana/LPS (Fase 3) y los diagnósticos cruzados (Fase 4) tienen ADRs propios futuros; este documento establece los puntos de anclaje que esas fases activarán sin rediseño (ver Decisión 8).

**Restricciones:**

- Un solo desarrollador: cada decisión prioriza reutilizar infraestructura existente; los componentes nuevos son sheets o headers sobre patrones ya probados en producción (módulo Maquinaria).
- Offline-first intacto: ninguna decisión toca el motor de cola Realm ni el pipeline de fotos. _(Enmendado durante la implementación: el pipeline de fotos recibió un ajuste acotado de ciclo de vida — ver Enmienda E5; el motor de cola de avances sigue intacto.)_
- El rediseño no puede requerir re-entrenamiento del usuario: el lenguaje visual existente (cards, chips, bottom sheets, tokens) se conserva.

---

## Decisiones

### 1. Navegación: la sábana es el home; Incidencias deja de ser tab

**Decisión:** `AppNavigator` (rol CONTRATISTA) queda en Fase 1 con cuatro tabs: **Sábana (inicial) · Reportes · Maquinaria · Perfil**. Se elimina la tab Incidencias. `AdvanceListScreen` deja de ser la pantalla inicial y pasa a ser historial dentro del stack de Sábana. El stack de Reportes (`ReportSelection` → `AdvanceReport`) se extrae del speed dial a tab de primer nivel. La tab **Semana** (plano de producción, Last Planner) se agregará en Fase 3 — no se monta placeholder.

**Justificación:**

- La sábana es el modelo mental preexistente del contratista; el costo de aprendizaje del home es cero.
- Telemetría: Incidencias como destino autónomo tiene abandono total. Una incidencia es algo que _ocurre_ durante el trabajo, no un módulo que se visita; su captura se mueve al flujo del día (Decisión 2) y al contexto del concepto (L-03).
- El reporte es el momento de valor de la app (el entregable que el cliente exige) y estaba oculto tras un speed dial FAB. Los momentos de valor no se esconden.
- Los roles no-CONTRATISTA no se tocan en esta fase.

**Alternativas rechazadas:**

- _Pantalla "Hoy" dedicada como quinta tab:_ sobre-ingeniería para un solo desarrollador; el patrón header-resumen (`HubResumenHeader` de Maquinaria) resuelve lo mismo sin pantalla nueva.
- _Conservar la tab Incidencias:_ contradicha por los datos de uso.
- _Tab Semana con placeholder "próximamente":_ pantallas muertas dañan la percepción de producto (lección de los roles esqueleto).

---

### 2. `HoyResumenHeader`: franja ejecutiva del día como ListHeader de la sábana

**Decisión:** Se crea `src/modules/avance/components/HoyResumenHeader.tsx`, insertado como primer elemento del `ListHeader` de `SabanaScreen` (viaja con el scroll; **no** es sticky). Composición (L-01 Rev D):

1. Fila superior: "Hoy · {fecha local}" a la izquierda con cejilla "Obra · {nombre}"; en la esquina superior derecha, apilados, `AVANCE {pct}%` y (Fase 2) `PROG. {pct}%`.
2. Barra delgada de progreso de obra con marca de programado (marca visible solo en Fase 2), y fila de importes `Ejecutado $X · Contratado $Y`.
3. Tres contadores tocables: **Avances · Fotos · Incidencias** (conteos del día). No existe contador "Por sync": duplicaría el ícono de nube del header de navegación (`QueueHeaderButton`), que ya navega a `PendingSyncScreen`.
4. Fila de acciones: **"Reporte del día"** (navega a `AdvanceReport` con `dateFrom = dateTo = hoy` vía params de ruta) e **"Incidencia"** (navega a `IncidentRegistrationScreen`).

Datos vía hook nuevo `useTodaySummary`: conteos derivados de las queries/Realm existentes filtradas al día local (usar `DateUtils.localDateToUTCRange`, ver Decisión 9) + agregado de obra servido por backend (ver §Requisitos de backend).

**Justificación:**

- Al abrir la app, la primera pregunta del usuario es "¿cómo voy hoy?"; el header la responde y desaparece al hacer scroll hacia el trabajo (la sábana toma el 100% de la pantalla). El costo de altura se paga solo en el aterrizaje.
- Patrón ya probado: `HubResumenHeader` (Maquinaria) usa exactamente esta mecánica de contadores-filtro en franja full-width.
- El botón "Reporte del día" convierte el momento de valor en una acción de un tap desde el home.

**Alternativas rechazadas:**

- _Header fijo o colapsable sticky:_ trabajo especulativo; se difiere hasta tener evidencia de piloto (ver Deuda técnica).
- _Contador "Por sync":_ redundante; espacio en la franja es el recurso más caro.

---

### 3. Zona oscura ejecutiva / zona blanca del catálogo; global de obra en la franja

**Decisión:** La división de color se vuelve semántica: **zona oscura (header + franja Hoy) = resumen ejecutivo del día y de la obra; zona blanca = dominio exclusivo del catálogo y sus conceptos.** En consecuencia:

- El porcentaje global mostrado en la franja es de **obra completa**, calculado con la ponderación por importes ya implementada en `sabanaTreeBuilder` (`rollupPct`: Σ ejecutado×PU / Σ contratado×PU — única agregación defendible entre unidades heterogéneas; equivale a valor ganado). El valor se consume de un agregado de backend, **no** se computa en cliente sumando árboles de catálogos (ver §Requisitos de backend y Deuda técnica).
- `SabanaGlobalCard` (card oscura grande) **se retira** del cuerpo de la sábana. El componente queda disponible para reciclarse en una futura ficha de obra.
- El selector de catálogo existente (`SabanaCatalogSelector` + su bottomsheet) queda **intacto** y gana debajo una línea compacta de métricas del catálogo activo: `Físico {pct}% · prog. {pct}% · Importe ${ejecutado}` con barra delgada (datos que `computeGlobalStats` ya produce para el catálogo cargado; la parte "prog." es Fase 2).

**Vocabulario reservado (decisión de nomenclatura):** "**Importe**" = volumen ejecutado × PU. "**Financiero/cobrado**" queda reservado para el módulo de estimaciones futuro. Ninguna pantalla de esta fase usa la palabra "financiero".

**Justificación:**

- Responde la pregunta jerárquica correcta primero ("¿cuánto lleva toda la obra?") sin robar la zona blanca al catálogo, y ahorra ~60px verticales frente a la card.
- Recursos visuales de costo cero en RN: barras `View`, `fontVariant: ['tabular-nums']`, cejillas tipográficas. Anillo SVG o contadores animados se difieren hasta que el piloto pida más jerarquía.

**Alternativas rechazadas:**

- _Panel entintado nuevo obra→catálogo en la zona blanca (Rev B del spec):_ saturaba la pantalla y duplicaba lenguaje visual; descartado en revisión.
- _Mantener la GlobalCard con alcance de catálogo y sumar una card de obra:_ dos cards pesadas compitiendo.
- _Calcular el global de obra en cliente:_ en megaobra implica descargar miles de conceptos para un número.

---

### 4. Gramática de gesto en filas de concepto: fila = ver, "+" = capturar

**Decisión:** `SabanaTreeItem` (filas de concepto) y `SabanaSearchResult` reciben dos affordances: tocar la fila abre la **ficha del concepto** (`ConceptoSheet`, lámina L-02) con trazabilidad de cargas; el botón circular "+" abre la **captura rápida** (`CapturaRapidaSheet`, lámina L-03) con el concepto precargado. Ambos son bottom sheets (`@gorhom/bottom-sheet`, ya en dependencias; patrón estructural de `ReportarJornadaSheet`/`AdvanceDetailBottomSheet`). La ficha incluye botón "Registrar avance" que transiciona a la captura: el camino exploratorio y el rápido convergen.

La captura rápida **reutiliza íntegro el motor existente**: `useAdvanceSubmitToQueue` → cola Realm → `useAdvanceSyncWorker` (transacción atómica), `usePhotoCapture`/`usePhotoUpload` (SAS + Blob) y `useAdvanceLocation`. Elimina únicamente la cascada de selección catálogo→partida→concepto. `AdvanceRegistrationScreen` (formulario completo) se conserva como ruta alternativa vía FAB del historial (Decisión 6).

**Estado de detalle:** la anatomía visual fina de L-02 y L-03 está en afinación en el UX-SPEC; este ADR fija la gramática de interacción y la arquitectura de componentes. Se enmendará con revisión menor al cerrar esas láminas.

**Justificación:**

- Una regla por gesto, consistente en toda la app, aprendible en segundos.
- La cascada de dropdowns es la fricción que hace que la libreta siga ganando en campo; el objetivo de producto es captura < 30 segundos.
- El aviso anti-duplicado ("ya registraste X hoy en este concepto") vive dentro del sheet de captura — el momento exacto de riesgo (sustituye al badge "hoy" descartado, ver historial de revisiones del spec).

**Alternativas rechazadas:**

- _Toda la fila abre captura directa:_ pierde la fila como consulta y elimina el espacio para la trazabilidad que el usuario pidió.
- _Menú contextual con long-press:_ indescubrible en campo (guantes, sol).

---

### 5. Los contadores del Hoy navegan; nunca filtran el árbol en sitio

**Decisión:** Tocar un contador **empuja una pantalla**; jamás aplica un filtro silencioso sobre la sábana:

| Contador    | Destino                                                                 | Desarrollo          |
| ----------- | ----------------------------------------------------------------------- | ------------------- |
| Avances     | `AdvanceListScreen` con `route.params.initialFilter = { rango: hoy }`   | Existente + param   |
| Fotos       | `FotosDelDiaSheet` — galería en grid agrupada por **partida › sección** | **Nuevo (pequeño)** |
| Incidencias | `IncidentListScreen` con filtro inicial = hoy                           | Existente + param   |

La galería usa `SectionList`; el encabezado de cada sección reutiliza el breadcrumb de ancestros que `getSearchResults` ya construye para la búsqueda de la sábana (`ancestors`). Conceptos con `section_id = null` muestran solo la partida; con nivel 3, el breadcrumb completo. Miniaturas desde `thumbnail_blob_path` (el backend ya genera thumbnails). Tap en foto → navega al avance que la respalda. **Fallback documentado:** si se recorta alcance, el contador Fotos navega al historial de hoy (las cards muestran conteo de fotos) y la galería pasa a Deuda técnica.

**Justificación:**

- Un filtro aplicado silenciosamente sobre el árbol es un estado de modo oculto: el usuario no recuerda por qué "desapareció su catálogo". La sábana permanece sin modos.
- Dos de tres destinos son pantallas existentes con un parámetro nuevo; `IncidentListScreen` (huérfana de la tab eliminada) revive como destino contextual.
- Agrupar por partida › sección da contexto de trabajo ("hoy estuve en cimentaciones › zapatas"), a diferencia del WBS suelto por foto.

**Alternativas rechazadas:**

- _Filtrado in-place de la sábana:_ trampa de modo descrita arriba.
- _WBS como pie de cada foto:_ identificación sin contexto; descartado en revisión.

---

### 6. Historial de avances: reforma ligera de `AdvanceListScreen`

**Decisión (L-01b):**

1. **Agrupación por día:** `FlatList` → `SectionList` con secciones por fecha local; los títulos usan `useRelativeDate` existente ("Hoy", "Ayer", fecha).
2. **Card rejerarquizada** (`AdvanceItemCard`): el volumen con unidad es el único protagonista tipográfico; debajo, fila de metadatos con `Importe ${monto}` etiquetado (línea propia — la etiqueta y la separación vertical son la distinción, no solo el color), y `📷 {n} · {hora}` a la derecha ("sin foto" en ámbar cuando aplique); la partida baja a cejilla `{partida} · {wbs}`; borde izquierdo por estado se conserva.
3. **FAB simple:** el speed dial se elimina (su acción "Reporte" ya es tab); queda FAB "+" → `AdvanceRegistrationScreen`.
4. `AdvanceListHeader` (resumen + filtros) se conserva y aprende a inicializarse desde `route.params.initialFilter`.

**Justificación:**

- El rol de la pantalla cambió (de home a historial/detalle del día): el día es la unidad de memoria del contratista y el volumen es la noticia de cada registro; la partida se repite card tras card (contexto, no noticia).
- Cambios de estilo y de contenedor de lista; la lógica de datos no se toca.

**Alternativas rechazadas:**

- _Reconstrucción de la pantalla:_ innecesaria; la estructura es sólida.
- _Importe pegado al volumen en la misma línea:_ sin distinción legible entre dos cifras (revisión del 16-jul).

---

### 7. Sheet de detalle de avance: contexto compacto + evidencia visible

**Decisión (L-01c), sobre `AdvanceDetailBottomSheet`:**

1. Los tres bloques etiquetados Catálogo/Partida/Concepto se compactan en **un bloque de contexto**: cejilla `{catálogo} · {partida} › {sección} · {wbs}` + descripción del concepto — el mismo patrón de cabecera de ficha (L-02) y captura (L-03).
2. Se agrega **franja horizontal de miniaturas** de la evidencia (solo lectura en esta fase; agregar fotos desde el detalle queda en Deuda técnica). Hoy la evidencia se captura y jamás vuelve a verse: es el hueco más grave del sheet.
3. La **edición inline** de volumen y comentario (lápiz → input, validación zod, guardar/cancelar) se conserva tal cual; el importe se recalcula en vivo (lógica existente de `handleAdvanceUpdated`).
4. El formateo de fecha migra a `DateUtils` (ver Decisión 9; el bug se registra también en Deuda técnica por si el fix se difiere del primer PR).

**Alternativas rechazadas:**

- _Rediseño completo del sheet:_ la edición inline está bien resuelta; se preserva.

---

### 8. Renderizado condicionado por fase (puntos de anclaje para Fases 2 y 3)

**Decisión:** Los elementos de fases futuras visibles en el UX-SPEC **no se construyen ni se muestran** en Fase 1; el layout les reserva el anclaje para activarse sin rediseño:

| Elemento (lámina)                                                 | Fase que lo activa            |
| ----------------------------------------------------------------- | ----------------------------- |
| Esquina `PROG. {pct}%` y marca en barras (franja, catline, filas) | Fase 2 — programa contractual |
| Chips `Atrasado` / `Inicia S{n}` en filas de concepto             | Fase 2                        |
| Gráfica programado vs ejecutado en ficha (L-02)                   | Fase 2                        |
| Chip eco "Semana {n}: …" en la franja Hoy                         | Fase 3 — tab Semana           |

**Justificación:** no se muestran promesas sin datos (lección de los placeholders de roles), y las fases posteriores aterrizan como _capas_ sobre pantallas ya estables, no como rediseños.

---

### 9. Patrón obligatorio de fechas: `DateUtils`, nunca `new Date(string)` para negocio

**Decisión:** Toda fecha de negocio (fechas de avance, filtros, títulos de sección, rangos de reporte) se procesa con `src/utils/dateUtils.ts`:

- Mostrar: `useFormattedDate`/`useRelativeDate`/`CommonDateFormats` (interpretan UTC → local correctamente).
- Filtrar por día/rango local: `DateUtils.localDateToUTCRange` / `createDateFilter` (`useDateRangeFilter`). **No** usar `localDateToUTC` para filtrado — el propio código lo marca deprecated para ese uso.
- Prohibido `new Date("YYYY-MM-DD")` y `toISOString().split("T")[0]` sobre fechas de negocio: interpretan medianoche UTC y corren el día en CDMX.

**Instancias conocidas a corregir en esta fase:** `AdvanceDetailBottomSheet` (`new Date(advance.date).toLocaleDateString(...)` muestra el día anterior) y `AdvanceReportScreen` (`toISOString().split("T")[0]` — crítico porque el botón "Reporte del día" del Hoy header hereda el rango; a la hora pico de uso, 17:37+, generaría el reporte del día equivocado).

**Justificación:** tercera aparición de la misma familia de bug (la primera se corrigió en Maquinaria). Se eleva de fix puntual a patrón documentado.

---

### 10. Estado PENDING/APPROVED/REJECTED: visible en historial, ausente del flujo de captura

**Decisión (producto):** El estado de aprobación se mantiene visible en `AdvanceItemCard` y en el sheet de detalle como señal del flujo futuro con rol INSPECTOR, por decisión explícita del producto (es más problemático ocultarlo que explicarlo). No aparece en la franja Hoy ni en la captura rápida: el momento de velocidad no carga estados que hoy nunca cambian.

**Relación con backend:** `cumulative_volume` sigue sin filtrar por estado (ver ADR-001 backend, Decisión 5); sin cambios en esta fase.

---

## Inventario de infraestructura (verificado contra código, 2026-07-16)

### Se reutiliza tal cual

| Pieza                                                   | Ubicación                                                              | Uso en Fase 1                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Motor de cola offline (Realm, atómico)                  | `useAdvanceSubmitToQueue`, `useAdvanceSyncWorker`                      | Captura rápida escribe a la misma cola; cero cambios                          |
| Pipeline de fotos (SAS, bulk, GPS)                      | `usePhotoCapture`, `usePhotoUpload`, `useAdvanceLocation`              | Captura rápida y (lectura) franja de evidencia — ciclo de vida ajustado, ver E5 |
| Fórmula ponderada por importes                          | `sabanaTreeBuilder` → `computeGlobalStats`, `rollupPct`                | Línea de métricas del catálogo; el backend replica la misma fórmula para obra |
| Breadcrumb de ancestros                                 | `getSearchResults` → `ancestors`                                       | Encabezados de `FotosDelDiaSheet` y cejillas de contexto                      |
| Selector de catálogo + bottomsheet                      | `SabanaCatalogSelector`                                                | Intacto; solo gana la línea de métricas debajo                                |
| Fechas relativas y filtros UTC                          | `useRelativeDate`, `createDateFilter`, `DateUtils.localDateToUTCRange` | Títulos de sección del historial; `initialFilter` de contadores               |
| Telemetría                                              | `telemetry.trackEvent` (`src/services/telemetry.ts`)                   | Eventos nuevos de esta fase (ver §Métricas de éxito)                          |
| Patrón de sheet con reset compatible con React Compiler | sheets de Maquinaria ("setState during render")                        | `ConceptoSheet`, `CapturaRapidaSheet`, `FotosDelDiaSheet`                     |

### Se adapta

| Pieza                                   | Cambio                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `AppNavigator`                          | Tabs del CONTRATISTA: Sábana inicial, Reportes a primer nivel, Incidencias fuera |
| `SabanaScreen` (ListHeader)             | + `HoyResumenHeader`; + línea de métricas bajo el selector; − `SabanaGlobalCard` |
| `SabanaTreeItem` / `SabanaSearchResult` | + `onPress` (ficha) y `onCapture` ("+") en filas de concepto                     |
| `AdvanceListScreen`                     | `SectionList` por día; card rejerarquizada; FAB simple; `initialFilter` por ruta |
| `AdvanceDetailBottomSheet`              | Bloque de contexto único; franja de evidencia; `DateUtils`                       |
| `AdvanceReportScreen`                   | Params de fecha inicial (`dateFrom`/`dateTo`); fix UTC                           |
| `IncidentListScreen`                    | Filtro inicial por ruta (pantalla existente, revive como destino contextual)     |

### Se crea

| Componente                                               | Patrón base                                      |
| -------------------------------------------------------- | ------------------------------------------------ |
| `HoyResumenHeader` + hook `useTodaySummary`              | `HubResumenHeader` (Maquinaria)                  |
| `ConceptoSheet` (ficha del concepto — L-02 en afinación) | `AdvanceDetailBottomSheet`                       |
| `CapturaRapidaSheet` (L-03 en afinación)                 | `ReportarJornadaSheet` + motor de cola existente |
| `FotosDelDiaSheet`                                       | `SectionList` + grid; thumbnails existentes      |

---

## Requisitos de backend

Este ADR no implementa backend; lo siguiente debe existir para que la Fase 1 funcione completa (documentar en el repo backend, en la línea de `ADR-001-sabana-avance.md`):

1. **Agregado global de obra:** endpoint o campo anotado que retorne, por `Construction`: `{ pct_fisico, importe_ejecutado, importe_contratado }`, calculado con la misma fórmula ponderada por importes (`Sum` sobre conceptos de la obra), cacheable. Motivación: en megaobra el cliente no debe descargar N árboles de catálogo para un número (ver Deuda técnica si se decide un interim).
2. **Fotos en el serializer de avances:** el list/detail de avances debe exponer `photo_count` y la lista de fotos con URL de thumbnail (la relación `Photo → physical_advance` y `thumbnail_blob_path` ya existen; falta exponerlos con SAS de lectura o URL servible). Dependencia directa de: indicador 📷 en cards, franja de evidencia (L-01c) y `FotosDelDiaSheet` (L-01a).
3. Sin cambios en `cumulative_volume` ni en estados (Decisión 10).

---

## Métricas de éxito (instrumentación de esta fase)

El rediseño nació de un problema de adopción medible; su evaluación usa la telemetría existente más estos eventos nuevos:

| Evento nuevo             | Dónde                      | Propiedades                                       |
| ------------------------ | -------------------------- | ------------------------------------------------- |
| `captura_rapida_opened`  | `CapturaRapidaSheet` mount | `obra_id`, `origen` (`fila` \| `ficha`)           |
| `ficha_concepto_opened`  | `ConceptoSheet` mount      | `obra_id`                                         |
| `hoy_counter_tapped`     | `HoyResumenHeader`         | `counter` (`avances` \| `fotos` \| `incidencias`) |
| `reporte_del_dia_tapped` | `HoyResumenHeader`         | `obra_id`                                         |

Indicadores a observar (KQL sobre lo ya instrumentado + lo nuevo):

- **Desplazamiento del horario de captura** hacia horas de obra (hoy: promedio 17:37) — el indicador central de que la app pasó de sustituto de Excel a herramienta de campo.
- Proporción de avances capturados vía `CapturaRapidaSheet` vs formulario clásico.
- Caída del abandono de formulario (join `advance_form_opened` ↔ `advance_submission_queued` ya documentado en `docs/telemetry.md`).
- % de avances con foto (evento `advance_submitted.photo_count`).

---

## Consecuencias

| Área                | Impacto                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navegación          | Tabs del CONTRATISTA reordenadas; deep links / rutas de Incidencias como tab dejan de existir (el registro y la lista siguen accesibles por stack) |
| `SabanaScreen`      | Header crece (franja Hoy) pero viaja con el scroll; `SabanaGlobalCard` se retira                                                                   |
| `AdvanceListScreen` | `SectionList`; card nueva; pierde el speed dial; gana `initialFilter`                                                                              |
| Componentes nuevos  | 4 (todos sheets/headers sobre patrones probados)                                                                                                   |
| Backend             | 2 requisitos (agregado de obra; fotos en serializer) — sin ellos, la franja muestra solo contadores y las miniaturas no cargan                     |
| Realm               | Cambio **aditivo** v11 en el cache de avances (fotos/wbs/sección; ver Enmienda E1) — el motor de cola queda intacto                                |
| Telemetría          | 4 eventos nuevos                                                                                                                                   |
| Usuario             | Cero re-entrenamiento: mismo lenguaje visual; la sábana que ya conoce gana acciones                                                                |

---

## Deuda técnica

1. **Agregado de obra en backend (bloqueante suave):** si el endpoint no llega con el primer PR, la franja puede lanzar sin la línea de obra (solo fecha + contadores + acciones); prohibido el cálculo cliente multi-catálogo como interim.
2. **Bugs UTC pendientes de pago en esta fase:** `AdvanceDetailBottomSheet` (`new Date(date).toLocaleDateString` → muestra día anterior en CDMX) y `AdvanceReportScreen` (`toISOString().split("T")[0]`). Patrón general en Decisión 9. Nota: `DateUtils.localDateToUTC` está deprecated para filtrado; auditar llamadas restantes (p. ej. defaults de formularios) y migrar a `localDateToUTCRange` donde corresponda.
3. **Entidad `Contrato` inexistente:** jerarquía real Obra → Contratos → Catálogos; hoy no hay tabla `Contrato`. Impacta a Fase 2 (el programa contractual y el de erogaciones son anexos de un contrato: decidir de qué cuelgan las versiones — catálogo u obra — y documentar la migración futura). Diferida explícitamente, mismo tratamiento que `horas_trabajadas` en Maquinaria.
4. **Sistemas de cola duplicados:** convive el legacy `useOfflineSync` (AsyncStorage, genérico) con la cola Realm (`useAdvanceSyncWorker`). La Fase 1 usa exclusivamente la cola Realm; consolidar y retirar el legacy (y los thunks deprecated de `advanceSlice`: `registerAdvance`, `approveAdvance`/`rejectAdvance` sin uso real) en una limpieza posterior.
5. **`SabanaGlobalCard` huérfana:** retirada de la sábana; decidir reciclaje (ficha de obra) o eliminación.
6. **Mini-barra sticky del Hoy al hacer scroll-up:** diferida hasta evidencia de piloto.
7. **Punto discreto "hoy" en filas de concepto:** el badge se descartó; si el piloto pide la señal en fila, regresa como punto junto al WBS (registrado para no re-debatir).
8. **Agregar fotos desde el sheet de detalle:** la franja de evidencia es solo lectura en esta fase.
9. **Galería `FotosDelDiaSheet`:** si se recorta, el contador Fotos navega al historial de hoy (fallback aprobado) y la galería queda aquí.
10. **`photo_count`/fotos en serializer:** dependencia de backend (§Requisitos); mientras no exista, la card omite el indicador 📷 en lugar de mostrar dato falso.
11. **Contador de Avances optimista (ledger `done` en la cola de avances):** al sincronizar un lote grande tras estar offline, el contador Avances del Hoy se hunde y se recupera por escalones (p. ej. 9→5-6-7→9): cada item sale de la cola al confirmar, pero el cache solo lo refleja con refetches que aterrizan a otro ritmo. La solución de fondo —acordada como norte de UX (*optimistic UI*: lo capturado cuenta desde la captura y solo se descuenta lo que falla, señalizado por el ícono de nube)— es replicar el patrón `done` de las fotos (E5) en la cola de avances: marcar en vez de borrar dentro de `completeAdvanceSyncAtomic`, campo `physicalAdvanceId` en el item (bump de esquema), dedup por id en el contador y blindar los consumidores que asumen "item presente = no enviado" (badge de nube, `PendingSyncScreen`, worker, telemetría `queue_size`). Se difiere deliberadamente porque toca el corazón atómico del motor congelado por este ADR y exige pruebas de rutas de crash; ejecutarla idealmente junto con la deuda #4 (consolidación de colas). **Interim disponible de riesgo ~0:** invalidar por item dentro del loop del worker (el hundimiento se convierte en parpadeos de −1 de ~1 s), pendiente de que el piloto lo amerite.
12. **Cache local no se limpia al cambiar de usuario:** el cache Realm y el de React Query (persistido en AsyncStorage) sobreviven al logout; al iniciar sesión otro usuario en el mismo dispositivo ve datos del usuario anterior (obra, avances) hasta que los refetches aterrizan — observado al alternar usuarios de prueba (el summary de la obra cacheada del usuario previo respondió 404). Pendiente: wipe de caches ligado al cambio de identidad.
13. **Cache de imágenes por id con `expo-image`:** la estabilización de URL por id (E6) cubre la galería, pero la franja de evidencia del detalle re-descarga thumbnails con cada SAS nueva del cache de avances. `expo-image` con `cacheKey` por id de foto resuelve ambos de raíz; requiere módulo nativo (recompilar el dev build), así que se difiere a un momento de build conveniente.

---

## Enmiendas (2026-07-16, revisión de implementación)

Decisiones cerradas durante la implementación de esta fase, con el autor del producto:

- **E1 — Esquema Realm del cache de avances (modifica la Consecuencia "Realm"):** para que `photo_count`/`photos`/`concept_wbs_code`/`concept_section_name` lleguen a las cards e historial (la UI lee exclusivamente del cache Realm), el esquema `PhysicalAdvanceResponse` recibe esos campos opcionales y se registra el embebido `AdvancePhoto` (schemaVersion 11, migración que borra solo el cache de avances; se repuebla al siguiente sync). La restricción original protege la *semántica* del motor de cola, que queda intacta. Nota descubierta al implementar: la prop correcta de `@realm/react` es `onMigration` — el nombre usado antes (`migration`) era ignorado, por lo que las migraciones v8/v10 nunca corrieron por esa vía.
- **E2 — Porcentajes sin recorte a 100 (modifica D3 y la fórmula heredada):** todos los porcentajes de la sábana (agregado de obra, `computeGlobalStats`, `rollupPct`, `conceptPct`) muestran el valor real, sobre-ejecución incluida (>100%), con piso en 0; solo las **barras** se recortan visualmente al 100% de ancho. Recortar el número ocultaba información real de obra.
- **E3 — Idempotencia de envío de avances (extiende §Requisitos de backend):** `Physical.client_id` (UUID unique nullable) + create idempotente en backend; el worker envía el `_id` UUID que la cola ya genera. Cierra la duplicación por respuesta perdida antes de que la franja y el reporte del día dependan de esos números. Documentado como ADR-002 del repo backend (que también cubre el agregado de obra y las fotos en el serializer, ambos ya implementados).
- **E4 — Alcance de esta entrega:** las decisiones ligadas a las láminas L-02/L-03 (ficha `ConceptoSheet`, captura `CapturaRapidaSheet`, gestos de fila de la D4 y sus eventos `ficha_concepto_opened`/`captura_rapida_opened`) quedan **diferidas** a la enmienda que cierre esas láminas en el UX-SPEC. El resto de la Fase 1 está implementado, incluida la galería `FotosDelDiaSheet` (el fallback documentado no fue necesario).

Enmiendas del 2026-07-17 (ajustes surgidos en pruebas de campo del autor):

- **E5 — Ciclo de vida de la cola de fotos e invalidación por workers (modifica la restricción "pipeline de fotos intacto"):** en pruebas reales, el contador Fotos del Hoy contaba **hacia abajo** durante la subida (3→2→1→3): cada foto se borraba de la cola al confirmar su subida, pero el `photo_count` del servidor solo llega a la UI con un refetch posterior — cada foto cruzaba una "tierra de nadie" contable. Se ajustó el ciclo de vida: la foto pasa a un estado nuevo **`done`** (subida y confirmada) y se elimina de la cola **solo después** de que el refetch de avances aterrizó; el contador usa **máximo por avance** entre servidor y cola, inmune por construcción a sub-conteos y dobles conteos. Complementariamente se estableció la regla de que **los workers invalidan las queries que su mutación afecta** (el de avances ya lo hacía; el de fotos ahora invalida la lista de avances *y* la galería del día — con `refetchOnMount: false` global, nadie más refresca esos datos). La atomicidad del motor de cola de *avances* no se tocó.
- **E6 — Refinamientos de la galería (afinan D5/D7 sin contradecirlas):** la galería precarga al aterrizar en el home (la query ya no espera a que el sheet se abra); las URLs de thumbnails se **estabilizan por id de foto** (el token SAS cambia en cada respuesta y rompía el cache de imágenes del dispositivo — con la URL estable cada thumbnail se descarga una vez al día); cada thumbnail muestra un **pie de foto con la hora local de toma** (`taken_at`, fallback `uploaded_at` — la hora de toma es la que correlaciona visualmente con el avance, decisión de producto); y los thumbnails de la franja de evidencia del detalle abren un **visor a pantalla completa** con swipe y zoom (dependencia nueva `react-native-image-viewing`, JS sin módulos nativos — la evidencia sigue siendo solo lectura, D7 intacta).

## Ver también

- `docs/ux/ux-spec-01.html` — UX-SPEC-01 Rev D (láminas y anotaciones con el razonamiento de cada revisión)
- `ADR-001-sabana-avance.md` (repo backend) — estructura Section/WBS, `avance/base/`, decisiones de `cumulative_volume`
- ADR-001/ADR-002 de telemetría — fuente de los datos de adopción que motivan esta fase
- `docs/telemetry.md` — eventos existentes y queries KQL
- `docs/maquinaria-register_module.md` — patrones reutilizados (HubResumenHeader, sheets, setState-during-render)
- ADRs futuros: Fase 2 (programa contractual y versionado), Fase 3 (tab Semana / Last Planner)
