# ADR-004: Fase 2 — Captura contextual (L-02/L-03) y Programa Contractual

**Estado:** Aceptado e implementado (2026-08-12) — alcance sin `CurvaChart` ni `FichaObraSheet`, ver enmienda E17
**Fecha:** 2026-07-19 · revisión de código 2026-07-29 · enmiendas de implementación 2026-08-12
**Autores:** Sergio Cota (producto/desarrollo), sesión de diseño UX/arquitectura asistida
**Implementación:** `docs/sabana-home-fase2-programa.md`
**Referencia visual:** `docs/ux/ux-spec-01.html` (UX-SPEC-01 Rev G — capas Fase 2 de L-01, L-01d Ficha de Obra, curva de L-02)
**Repositorio:** sentinel-frontend-prod. Los cambios de backend se listan como requisitos (ver §Requisitos de backend); su ADR correspondiente se documenta en el repo backend.
**Precedentes:** ADR-003 (Fase 1, decisiones D1–D12 y enmiendas E1–E6) — este ADR activa las capas condicionadas por fase que ADR-003 D8 dejó ancladas.

**Alcance en dos bloques.** Esta fase cubre:

1. **Captura contextual (D12, D13)** — las láminas L-02 (ficha del concepto) y L-03 (captura rápida) que la enmienda **E4 del ADR-003 difirió** de la Fase 1. Se documentan aquí, y no como enmienda a ADR-003, porque ese ADR está `Completed` y describe lo efectivamente distribuido: agregarle decisiones nunca construidas falsearía el registro. En ADR-003 basta actualizar E4 con un puntero a este documento.
2. **Programa contractual (D1–D11)** — indicadores de atraso, curva S valorizada y Ficha de Obra.

**Orden de ejecución:** el bloque 1 va primero. Los sheets son la superficie sobre la que el bloque 2 monta sus capas (recuadro de tres capas y `CurvaChart` en L-02, línea "vs programa" en L-03), siguiendo el mismo patrón de "capas sobre pantallas estables" que la Fase 1 aplicó al header del Hoy. El bloque 1 **no depende del programa**: funciona completo sin una sola versión cargada.

---

## Contexto

Con la Fase 1 en producción, la sábana es el home y la captura vive en el flujo del día. Lo que falta es la respuesta a la pregunta que el usuario de control de obra hace culturalmente: **"este concepto debía llevar tanto — ¿cómo voy?"**. Hoy la app solo muestra ejecutado contra contratado; no existe la vara temporal.

La decisión estratégica (sesiones de diseño, jul-2026) fue **financiero/contractual primero, producción después**: una sola estructura de datos —volumen programado por periodo, por concepto— entrega tres lecturas con cero captura nueva en campo: (a) el atraso por concepto (la lectura cultural dominante), (b) la curva S valorizada (programado × PU vs ejecutado × PU — el entregable ejecutivo), y (c) "este periodo debía $X" (la meta financiera). El plano de **producción** (tab Semana, Last Planner, PPC) queda para Fase 3; este ADR no lo toca, pero depende de la separación conceptual fijada aquí.

**Definiciones de plano (fijadas para todo el proyecto):**

- **Programa (contractual):** la vara que le ponen al contratista — se carga en escritorio, versionado, solo lectura en la app. Visual: capas teal + líneas sobre pantallas contractuales.
- **Producción (Fase 3):** la promesa que el contratista hace — plan semanal propio, captura diaria. Visual: tab propia, morado + barras.
- Cada plano tiene **vocabulario propio** (ver D14): el contractual habla de _programado_; el de producción, de _comprometido_.

**Restricciones:**

- Un solo desarrollador: el costo de captura del programa recae en escritorio (import), jamás en el contratista.
- Los programas reales cambian ≥3 veces por obra (reprogramaciones, convenios, ampliaciones): el versionado es requisito de día uno, no evolución.
- La granularidad de la fuente se respeta: los programas llegan por concepto o por partida según el cliente; **la app jamás prorratea ni inventa distribución** (regla de oro extendida).
- El día de corte es configurable por obra (lunes, domingo, miércoles — lo define el cliente).

---

## Decisiones

### 1. El programa es una capa de solo lectura sobre el plano contractual

**Decisión:** El programa contractual se carga y versiona **en escritorio** (import + admin; el rol INSPECTOR lo asumirá en el futuro). El CONTRATISTA lo ve y reacciona; no existe ninguna superficie de edición en la app móvil. Todos los indicadores comparan contra la **versión vigente**.

**Justificación:**

- Trazabilidad y credibilidad: un programa editable por el ejecutor pierde valor probatorio ante estimaciones y reclamaciones.
- Coherencia con el modelo de dos planos: la vara externa no se negocia en el dispositivo; la promesa propia (Fase 3) sí será del contratista.

**Alternativas rechazadas:**

- _Edición del programa en la app:_ rompe trazabilidad; contradicha por decisión de producto explícita.
- _Vincular programa a actividades con ratios actividad→conceptos (modelo APU/receta):_ rechazada en diseño por cuatro razones: los ratios no son lineales en obra real; mantener la vinculación es trabajo que nadie hará; con 3+ reprogramaciones el costo se multiplica; y si el sistema derivara avances de concepto desde actividades, la sábana dejaría de ser verdad de campo. Los ratios reales emergerán de los datos (visión ML), no se codifican a mano.

---

### 2. Estructura de datos: versiones inmutables + renglones acumulados por corte

**Decisión (contrato conceptual; tablas y migraciones en el ADR de backend):**

- **`ProgramaVersion`:** `catalogo` (FK, ver D3), `numero_version`, `estado` (`VIGENTE` | `HISTORICA` — exactamente una vigente por catálogo), `fecha_carga`, `origen_archivo`, `motivo` (TextChoices: `ORIGINAL`, `REPROGRAMACION`, `CONVENIO`, `AMPLIACION`, `CORRECCION`; mismo patrón `motivo_salida` de Maquinaria), `notas`.
- **`ProgramaConcepto`:** `version` (FK), `concepto` (FK nullable) **o** `partida` (FK nullable) — XOR obligatorio a nivel de validación (D4), `fecha_corte` (date), `volumen_acumulado` (Decimal). Un renglón por (objetivo, corte).
- **Los renglones almacenan el ACUMULADO programado a cada corte, no el delta del periodo.** El delta se deriva en proyección (`acum[n] − acum[n−1]`).
- Las versiones son **inmutables** una vez cargadas: una reprogramación es una versión nueva completa, nunca una edición. La historia queda íntegra ("inicio S28 → S30 → S31, dos reprogramaciones") — trazabilidad para deslindes y materia prima para ML.

**Justificación:**

- Acumulado-como-snapshot es la misma arquitectura ya decidida para mediciones topográficas: los deltas son frágiles ante correcciones; los snapshots no. Además "¿cuánto debía a la fecha?" —la consulta más frecuente— se resuelve con un lookup del corte ≤ hoy, sin sumar.
- Dentro de una versión, el acumulado programado debe ser **no-decreciente** (validación de import); a diferencia del ejecutado topográfico, un programa que "baja" es un error de captura, no una re-medición.

**Alternativas rechazadas:**

- _Volumen por periodo (delta):_ obliga a sumar para cada consulta de acumulado y es frágil ante cortes faltantes.
- _Editar la versión vigente in place:_ destruye la historia; el versionado dejaría de ser real.

---

### 3. El programa cuelga de `Catalog` (pago parcial de la deuda #3 del ADR-003)

**Decisión:** `ProgramaVersion` tiene FK a **`Catalog`**, no a `Construction`. Una obra con N catálogos tiene hasta N programas vigentes; el agregado de obra (esquina PROG., Ficha de Obra) suma las versiones vigentes de todos los catálogos de la construcción.

**Justificación:**

- Los renglones referencian conceptos/partidas, que pertenecen a un catálogo: la FK natural.
- El import llega por catálogo — mismo canal operativo que la carga de conceptos por CSV ya existente (ADR-001 backend).
- La jerarquía real es Obra → Contratos → Catálogos y la entidad `Contrato` no existe (deuda #3). Colgar de catálogo es el punto que **no requiere migración destructiva** cuando `Contrato` llegue: `Contrato` agrupará catálogos y `ProgramaVersion` podrá ganar una FK `contrato` nullable derivable. Colgar de obra sí rompería (un programa de obra no sabría repartirse entre contratos).

**Alternativas rechazadas:**

- _FK a `Construction`:_ pierde la correspondencia renglón→catálogo y complica el multi-contrato futuro.
- _Crear la entidad `Contrato` ahora:_ alcance especulativo sin caso de uso activo; sigue diferida con su migración ya diseñada (esta decisión la des-riesga).

---

### 4. Granularidad respetada: concepto O partida, jamás prorrateo

**Decisión:** Cada renglón apunta a un concepto **o** a una partida, según venga la fuente. Los indicadores se muestran **exclusivamente en el nivel donde el programa existe**: si el programa es por partida, el chip vive en la fila de la partida y los conceptos hijos muestran "sin programa individual". La app no prorratea, no reparte por peso de importes, no infiere.

**Justificación:** extensión de la regla de oro del proyecto (la app nunca inventa datos que después se confunden con verdad de campo). Un prorrateo automático produciría "atrasos" ficticios por concepto que nadie programó, minando la credibilidad del indicador completo.

**Alternativa rechazada:** _prorrateo opcional por peso de importe dentro de la partida_ — registrado como idea, rechazado para cualquier versión: incluso como opt-in siembra datos sintéticos en una superficie que se vende como objetiva.

---

### 5. Carga por import con validación (escritorio)

**Decisión:** El mecanismo de carga es un **import de archivo** (Excel/CSV) por catálogo que crea una `ProgramaVersion` completa en transacción atómica: o entra toda la versión o no entra nada. v1 operable vía Django admin + management command; la UI web de import es evolución. Validaciones mínimas: conceptos/partidas resueltos contra el catálogo (por `wbs_code` o clave; renglones no resueltos = rechazo del archivo con reporte de errores, no carga parcial), volúmenes ≥ 0, acumulados no-decrecientes por objetivo, fechas de corte alineadas al `dia_corte` de la obra. La activación de "vigente" es un paso explícito posterior a la carga (permite cargar y revisar antes de publicar).

**Justificación:**

- El programa ya existe siempre en Excel (anexo contractual o Project→export): el archivo es el formato de intercambio natural, coherente con la filosofía Excel-como-transporte del proyecto.
- Carga atómica + activación explícita = imposible dejar una versión a medias visible para el contratista.

**Alternativas rechazadas:**

- _Captura manual renglón por renglón en admin:_ inviable para catálogos reales (cientos de conceptos × decenas de cortes).
- _Import CSV directo desde MS Project:_ deseable, diferido — el formato de columnas de la plantilla SENTINEL es el contrato estable; mapear Project a esa plantilla es un paso de escritorio aceptable mientras tanto.

---

### 6. Distribución al frontend: el programa viaja en el prefetch, no por invalidación

**Decisión:** El programa vigente se incorpora al paquete offline único **`avance/base/`** (mismo principio del ADR-001 backend): bloque `programa` con `{version_id, numero_version, fecha_carga, renglones[]}` (solo la vigente; renglones planos). Realm recibe las clases embebidas correspondientes (bump de esquema **aditivo**, campos nullable — mismo patrón E1). **No hay invalidación por workers para el programa:** el escritor es escritorio (segundo escritor externo al dispositivo, exactamente el caso que la deuda "invalidación local no bastará con múltiples escritores" anticipó), y el dato es lento por naturaleza — se refresca con el prefetch (login, pull-to-refresh, reconexión). El `version_id` en el paquete funciona como stamp: la UI puede mostrar "programa v3 · cargado 12-jul" para auditabilidad.

**Justificación:** duplicar el mecanismo de entrega (endpoint aparte + caché aparte) crearía dos fuentes de verdad — la alternativa rechazada exacta del ADR-001 backend, Decisión 3. Un dato que cambia ~3 veces por obra no amerita infraestructura de tiempo real.

---

### 7. Indicadores derivados: definición exacta de estados y marcas

**Decisión:** Toda la lógica de estado se deriva en cliente desde `{acumulado programado a la fecha (P), ejecutado acumulado (E), contratado (C)}` con la versión vigente. Estados por objetivo (concepto o partida):

| Estado         | Condición                                  | UI                                                              |
| -------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `SIN_PROGRAMA` | No existen renglones para el objetivo      | Sin chip ni marca (silencio, no error)                          |
| `NO_INICIADO`  | P(hoy) = 0 y existe corte futuro con P > 0 | Chip gris "Inicia S{n}" (primer corte con P > 0)                |
| `AL_DIA`       | E = P(hoy)                                 | Sin chip (el silencio es la norma; solo se señala la excepción) |
| `ADELANTADO`   | E > P(hoy)                                 | Chip azul "Adelantado"                                          |
| `ATRASADO`     | E < P(hoy)                                 | Chip rojo "Atrasado" + "debía P · lleva E"                      |

- La igualdad se evalúa con banda muerta configurable (default **±2%** de P para evitar chips que parpadean por redondeos de campo; el valor exacto se calibra en piloto).
- **Interacción con E2 (porcentajes sin recorte):** E > C (sobre-ejecución del _contratado_) no es un estado del programa — se señala donde ya se decidió (alerta de captura L-03, % > 100 en fila y ficha). Un concepto puede estar simultáneamente "Atrasado" contra programa y sobre-ejecutado contra contrato tras una reprogramación: ambas señales conviven porque miden varas distintas.
- **Marcas en barras:** posición = P(hoy)/C, en la barra de obra (franja), la de catálogo (`SabanaCatalogMetrics`) y las de fila. **Esquina PROG. del Hoy:** a nivel obra, en importes: Σ P(hoy)×PU / Σ C×PU.
- Pateo informal (no reprograman y no ejecutan): sin lógica especial — al llegar el corte con P > 0 y E = 0, `NO_INICIADO` transita solo a `ATRASADO`. El sistema no persigue el pateo: lo exhibe, y localiza en qué eslabón se detuvo el flujo de información (si nadie reprogramó, el problema vive fuera del contratista).

**Alternativa rechazada:** _chip "Al día" explícito en cada fila:_ ruido — cientos de chips verdes idénticos; la señal útil es la desviación.

---

### 8. `CurvaChart`: un componente de curva acumulada para ambas fichas

**Decisión:** Se crea **`CurvaChart`** (componente propio, `react-native-svg`, ~100 líneas: polylines, círculos, textos; **sin librería de charts**), usado con distinta configuración en:

- **Ficha del concepto (L-02):** eje en unidad del concepto; y
- **Ficha de Obra (L-01d):** eje en importes ($M), valorizado.

Anatomía (Rev E del spec): líneas acumuladas — programado punteada gris, ejecutado sólida verde; rejilla con ticks redondeados según magnitud (potencia de 10 o su mitad); zona sombreada de cortes futuros con la punteada continuando **2 cortes** y sus valores etiquetados en los puntos; etiquetas numéricas solo en el corte actual (P y E); **la desviación vive bajo la leyenda, fuera del lienzo**, con signo y color (negativa roja, positiva verde); tap en cualquier punto → tooltip con su valor (detalle bajo demanda). Semántica: corte sin ejecución = **meseta** (punto presente, valor del corte anterior), nunca caída; una caída solo puede provenir de corrección/re-medición y mostrarse es correcto.

**Justificación:**

- La línea acumulada es la forma cultural del programa contractual (curva S): costo de decodificación cero — mismo argumento que sábana-como-home. Las **barras quedan reservadas al plano producción** (Fase 3): la geometría misma señala el plano (teal+líneas = contrato; morado+barras = producción).
- Componente propio vs librería: control total, cero lock-in, y el requerimiento cabe en el presupuesto de un solo dev; `victory-native` queda como plan B documentado si los tooltips/pan crecen en alcance.
- **Dependencia nativa:** verificar si `react-native-svg` ya está en el árbol de dependencias; si falta, es módulo nativo → agendar su alta en el **mismo rebuild del dev build** que `expo-image` (deuda #13 del ADR-003) para pagar una sola recompilación.

**Alternativas rechazadas:**

- _Barras por periodo (diseño previo):_ lectura cultural de producción/LEAN; la lectura de periodo ya vive en la frase "este periodo debías X, llevas Y" del recuadro de la ficha.
- _Etiquetar todos los puntos o solo rejilla sin etiquetas:_ saturación o imprecisión; la síntesis (rejilla + etiquetas clave + tooltip) da fuerza sin ruido.

---

### 9. Ficha de Obra (L-01d): la radiografía general del proyecto

**Decisión:** Nueva superficie `FichaObraSheet`, accesible tocando el **bloque de métricas (AVANCE/PROG.) de la esquina de la franja Hoy** — target = bloque completo con `hitSlop` generoso y chevron "›" como pista de tocabilidad; la zona del nombre de obra **no** es tocable (un solo destino en la franja). Contenido: `SabanaGlobalCard` reciclada como pieza central (cierra la deuda #5 del ADR-003 — mismo componente, datos del agregado de obra, ahora con marca de programado), `CurvaChart` valorizado del proyecto completo, y —**sección candidata, validar antes de construir**— "Mayores desviaciones por partida" (top N de P−E valorizado). Si la sección no convence en revisión, la ficha lanza con card + curva.

**Justificación:**

- El porcentaje es la pregunta: tocarlo abre su historia (manipulación directa). Gramática consistente: _tocar un resumen abre su ficha_ (fila→ficha de concepto; esquina→ficha de obra).
- Evolución registrada: si en obras largas los cortes semanales saturan la curva de obra, agrupar por mes es un cambio de proyección, no de datos.

---

### 10. Activación de capas (ejecuta D8 del ADR-003) y alcance

**Decisión:** Esta fase enciende, en este orden de dependencia: (1) esquina PROG. + marca en barra de obra (requiere agregado backend con P), (2) marca y métricas en línea de catálogo, (3) chips y "programado / ejecutado" en filas, (4) recuadro de periodo + `CurvaChart` en ficha del concepto, (5) Ficha de Obra. El chip eco "Semana" **no** se enciende (Fase 3). Vocabulario intacto: "Importe" = ejecutado×PU; "prog." como abreviatura visible; "Programado contractual" como título de curva; "financiero/cobrado" sigue reservado a estimaciones.

---

### 11. Ausencia de programa = ausencia de UI (principio transversal)

**Decisión:** en **cualquier** superficie donde el programa tenga presencia, si no hay dato de programa el elemento **no se renderiza** — nunca se muestra 0, "—", "0%" ni un estado neutro fabricado. Aplica sin excepción a:

| Superficie                                     | Elemento que se omite sin programa                             |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `HoyResumenHeader`                             | Bloque `PROG. {pct}%` y marca de la barra de obra              |
| `SabanaCatalogMetrics`                         | Texto `prog. {pct}%` y marca de la barra de catálogo           |
| `SabanaTreeItem` (`ConceptRow`, `WorkItemRow`) | Chip de estado, línea "Prog. a hoy", marca de barra            |
| `SabanaSearchResult`                           | Ídem `ConceptRow`                                              |
| `ConceptoSheet` (L-02)                         | Recuadro de tres capas completo y `CurvaChart`                 |
| `CapturaRapidaSheet` (L-03)                    | Línea "vs programa" bajo el nuevo acumulado                    |
| `FichaObraSheet` (L-01d)                       | `CurvaChart`, desviación y sección de desviaciones por partida |
| Reporte Excel                                  | Celdas vacías en la columna programado (nunca 0)               |

**Justificación:** un `0%` o un `0.00` en un indicador de programa **se lee como atraso total**, no como ausencia de dato — es información falsa, no un valor neutro. El caso es frecuente y no excepcional: toda obra sin programa cargado (incluidas GDL y Guanajuato antes del primer import) cae en él, y una obra puede tener un catálogo con programa y otro sin él. Extiende la disciplina que la Fase 1 ya aplica en `HoyResumenHeader` (`resumenObra ? … : null`) y la regla de oro del proyecto: el sistema no fabrica datos que puedan confundirse con realidad de obra.

**Implicación de tipos:** todos los campos de programa son **opcionales** en las interfaces del cliente (`pctProgramado?`, `programadoAFecha?`, `estadoPrograma?`), y `SIN_PROGRAMA` (D7) se representa como ausencia, no como valor. Tolerar backend viejo o catálogos sin versión vigente es el comportamiento por defecto, no un caso de error.

---

### 12. `ConceptoSheet` (L-02): ficha del concepto y gramática de gesto en filas

**Decisión:** se ejecuta la gramática fijada en D4 del ADR-003 — **tocar la fila abre la ficha**; **el botón circular "+" abre la captura rápida**. Aplica a `SabanaTreeItem.ConceptRow` y a `SabanaSearchResult`.

`ConceptoSheet` (`src/modules/avance/components/ConceptoSheet.tsx`) contiene:

1. **Cabecera de contexto** — cejilla `{catálogo} · {partida} › {sección} · {wbs}` + descripción del concepto. Mismo patrón que `AdvanceDetailBottomSheet` tras su reforma (L-01c) y que `CapturaRapidaSheet`: un solo lenguaje de "de qué concepto hablamos" en toda la app.
2. **Acumulado contra contratado** con porcentaje (sin recorte; ver E2).
3. **Trazabilidad de cargas** — últimas 3 con fecha, volumen e indicador de foto, la de hoy resaltada; "Ver historial completo (N cargas)" navega a `AvancesList` con filtro por concepto.
4. **CTA "Registrar avance"** que transiciona a `CapturaRapidaSheet` con el concepto precargado: el camino exploratorio y el rápido convergen.

**Sin endpoint nuevo:** la trazabilidad se deriva del cache Realm `AvancesByCatalogResponse` filtrando por `concept_id` y ordenando por fecha — los mismos datos que ya alimentan el historial. Fechas por `DateUtils` (D9).

**Fases futuras:** el recuadro de tres capas (hoy / corte / rendimiento requerido) y `CurvaChart` **no** entran aquí; son capas de esta misma fase (D8 y E3) que se montan sobre esta lámina y se rigen por D11 (sin dato de programa, no se renderizan).

**Justificación:** la trazabilidad responde "¿qué he cargado en este concepto?" sin salir de la sábana, y la ficha da al usuario un lugar donde decidir con contexto antes de capturar. El "+" conserva la ruta de un solo tap para quien ya sabe qué va a registrar.

**Alternativas rechazadas:** _toda la fila abre captura directa_ (elimina el espacio de consulta); _long-press_ (indescubrible en campo).

---

### 13. `CapturaRapidaSheet` (L-03): captura contextual, offline-first sobre la infraestructura existente

**Decisión:** `src/modules/avance/components/CapturaRapidaSheet.tsx` elimina la cascada catálogo→partida→concepto reutilizando **íntegramente** el motor de `AdvanceRegistrationScreen`. `AdvanceRegistrationScreen` se conserva como ruta alternativa (FAB del historial).

#### 13.1 Requisito de arquitectura: offline-first idéntico al formulario existente

El sheet **no introduce ninguna ruta de red propia**. En concreto:

| Aspecto            | Mecanismo obligatorio                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Apertura del sheet | Datos del cache Realm (`useAvanceBase` → `useSabanaData`); **nunca** un fetch al abrir                                              |
| Envío del avance   | `useAdvanceSubmitToQueue.submitToQueue(formData, context, photos, formSessionId)` → cola Realm → `useAdvanceSyncWorker`             |
| Fotos              | `usePhotoCapture` (archivo local) + el mismo array `Photo[]` que `submitToQueue` encola vía `usePendingPhotoQueue.addPhotosToQueue` |
| GPS                | `useAdvanceLocation`, igual que el formulario                                                                                       |
| Feedback           | Snackbar de `submitToQueue` (ya distingue online/offline)                                                                           |

**Prohibido explícitamente:** crear un hook de subida propio, llamar a la API de SAS desde el sheet, o escribir a Realm por fuera de las colas. El pipeline de fotos ya resuelve archivo local → validación de existencia → cola → SAS → Blob → confirmación, con el ciclo `done` de la enmienda E5 y su lógica de reintentos; duplicarlo rompería el conteo del Hoy (`useTodaySummary` cuenta por máximo entre servidor y cola) y la atomicidad de `completeAdvanceSyncAtomic`.

**Dependencia a resolver antes de implementar:** `submitToQueue` exige un `AdvanceFormContext` completo (`catalogId`, `catalogName`, **`workItemId`**, **`workItemName`**, `conceptDescription`, `constructionId`), pero `SabanaConceptNode` hoy no expone `work_item_id` ni el nombre de la partida — solo `section_id`. `sabanaTreeBuilder` debe **propagar el workitem ancestro a cada `SabanaConceptNode`** (o a `FlatTreeItemConcept`) al construir el árbol. Sin eso, la captura rápida no puede armar el contexto de la cola. `getSearchResults` ya expone el nombre de la partida vía `ancestors`, pero no el id.

#### 13.2 Anatomía (UX-SPEC-01 Rev G, L-03)

1. **Concepto precargado** con acumulado / contratado y **"restan N {unidad}"** en slate `#334155` seminegrita — informativo, no ámbar (el ámbar queda reservado a la alerta de sobre-ejecución en el mismo sheet).
2. **Cantidad** con la unidad en chip de presencia propia junto al input, y **vista previa de consecuencia en vivo**: nuevo acumulado y porcentaje al teclear.
3. **Evidencia fotográfica** en el mismo paso, con acceso directo a cámara.
4. **Incidencia contextual** — "¿Hubo un problema en este frente?" — que nace ligada al concepto y frente, alimentando el análisis de causa con datos conectados en lugar de registros huérfanos.
5. **Aviso de guardado offline** explícito.

#### 13.3 Protección contra el error de dedo: tres capas, sin modal universal

El formulario clásico confirma cada envío con un modal. La captura rápida **no lo replica**: un modal universal muere por habituación (a la captura número cincuenta se confirma sin leer) y cobra un tap a _todas_ las capturas contra el presupuesto de <30 s que justifica esta lámina. En su lugar:

1. **Vista previa de consecuencia permanente** (13.2.2): un `125` donde iba `12.5` se delata como "270.5 / 200.0 (135.3%)" antes de tocar nada.
2. **Confirmación condicionada por anomalía:** cuando el volumen supera lo restante (empujaría el acumulado por encima del contratado), aparece alerta ámbar con el nuevo acumulado y el CTA cambia a "Confirmar y registrar {N} {unidad}". **No bloquea** — la sobre-ejecución es información real de obra (E2) y debe poder registrarse. En v1 la anomalía se dispara **solo** por sobre-ejecución, que es objetiva y no requiere calibración; el umbral estadístico de "carga atípica respecto al histórico del concepto" queda como evolución cuando la trazabilidad acumule historia suficiente.
3. **Snackbar "Deshacer" post-registro:** antes del sync es retirar el item de la cola Realm (`removeFromQueueWithPhotos`); después del sync, la edición inline del detalle ya cubre el caso.

**Alternativa rechazada:** _replicar el modal de confirmación del formulario clásico_ — cumple el objetivo las primeras veces y luego se vuelve un peaje que el usuario tapea sin leer, penalizando el 95% de capturas correctas para atrapar el 5%.

#### 13.4 Telemetría

Se activan los eventos que E4 había dejado pendientes, registrados también en `docs/telemetry.md`:

| Evento                  | Dónde                      | Propiedades                             |
| ----------------------- | -------------------------- | --------------------------------------- |
| `captura_rapida_opened` | `CapturaRapidaSheet` mount | `obra_id`, `origen` (`fila` \| `ficha`) |
| `ficha_concepto_opened` | `ConceptoSheet` mount      | `obra_id`                               |

El sheet genera su propio **`form_session_id`** al montar y lo pasa a `submitToQueue`, que ya lo propaga en `advance_submission_queued`. Esto habilita el join `captura_rapida_opened ↔ advance_submission_queued` y permite medir **abandono en la ruta rápida**, igual que hoy se mide en el formulario clásico vía `advance_form_opened`.

Permiten medir la proporción de capturas por la ruta rápida frente al formulario clásico — indicador directo de la hipótesis de la fase — y, junto con `advance_submission_queued`, el desplazamiento del horario de captura hacia horas de obra.

**Estado de aprobación:** no aparece en la captura rápida (D10 del ADR-003): el momento de velocidad no carga estados que hoy nunca cambian.

---

### 14. Vocabulario: "programado" (contrato) y "comprometido" (producción)

**Decisión:** la UI usa **"programado"** para todo lo que proviene del programa contractual, y reserva **"comprometido"** para el plano de producción de la Fase 3. Se descarta el lenguaje de obligación ("debías X, llevas Y") en ambos planos.

Formas canónicas:

| Superficie                     | Copy                                              |
| ------------------------------ | ------------------------------------------------- |
| Fila de sábana (espacio corto) | `Prog. a hoy 180.0 · ejec. 145.5 m³`              |
| Ficha del concepto             | `programado 180.0 · ejecutado 145.5 m³`           |
| Esquina de la franja Hoy       | `AVANCE` / `PROG.`                                |
| Línea de catálogo              | `prog. 48.0%`                                     |
| Curva y leyenda                | `Programado contractual` / `Ejecutado`            |
| Reporte Excel                  | `Programado del periodo` / `Programado acumulado` |
| Tab Semana (Fase 3)            | `Comprometido N a hoy · llevas M`                 |

**Justificación:** "programado" ya existe en el universo léxico del contratista y es inequívoca — costo de traducción cero, el mismo argumento que sostuvo hacer de la sábana el home. El encuadre de obligación ("debías") es más asertivo y, a futuro, útil para desplazar la perspectiva del usuario hacia la responsabilidad sobre el compromiso, pero introducirlo hoy sería contraproducente: exige un cambio de mentalidad que necesita proceso y confianza acumulada, precisamente lo que esta fase todavía está construyendo. Se difiere como evolución de producto, no de UI.

**Consecuencia arquitectónica:** el vocabulario refuerza la separación de planos junto al color y la geometría (teal + líneas + "programado" = contrato; morado + barras + "comprometido" = producción). Cuando la Fase 3 introduzca el plano de producción, el lenguaje de compromiso puede madurar ahí — donde el dato _sí_ es una promesa propia del contratista — sin tocar el plano contractual.

**Alternativa rechazada:** _lenguaje unificado "debías X · llevas Y" en ambos planos_ — economiza una palabra a costa de borrar la distinción entre lo que el contrato impone y lo que el contratista promete, que es la separación central de todo el diseño.

---

## Inventario de infraestructura

### Se reutiliza tal cual

| Pieza                                                        | Uso en Fase 2                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `avance/base/` + patrón Realm prefetch (ADR-001 backend, E1) | El programa viaja en el mismo paquete; bump aditivo de esquema |
| `computeGlobalStats` / `rollupPct`                           | Base de E y C; P se agrega como serie paralela                 |
| `DateUtils` (+ `dia_corte`)                                  | Resolución de cortes y "P a la fecha"                          |
| `SabanaGlobalCard`                                           | Reciclada como corazón de la Ficha de Obra (deuda #5 saldada)  |
| Patrón de sheets (`@gorhom/bottom-sheet`, detach `toJSON()`) | `FichaObraSheet`                                               |
| Telemetría (`trackEvent`)                                    | Eventos nuevos de esta fase                                    |
| Patrón TextChoices + "Otra/Corrección" (Maquinaria)          | `ProgramaVersion.motivo`                                       |

### Se adapta

| Pieza                                   | Cambio                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `HoyResumenHeader`                      | Esquina PROG. activa; bloque de métricas tocable → `FichaObraSheet`; chevron |
| `SabanaCatalogMetrics`                  | "prog. {pct}%" + marca en barra                                              |
| `SabanaTreeItem` / `SabanaSearchResult` | Chips de estado (D7) y "programado / ejecutado" en filas con programa        |
| `ConceptoSheet` (L-02)                  | Recuadro de periodo + `CurvaChart`                                           |
| `AdvanceReportScreen` / excel_service   | Columna programado vs ejecutado del periodo (requisito backend)              |
| `useTodaySummary` / summary de obra     | Incorpora P valorizado a la fecha                                            |

### Se crea

| Componente                                                 | Patrón base                            |
| ---------------------------------------------------------- | -------------------------------------- |
| `CurvaChart`                                               | react-native-svg a mano (D8)           |
| `FichaObraSheet`                                           | Sheets existentes + `SabanaGlobalCard` |
| `useProgramaVigente` (selectores P a la fecha, estados D7) | Hooks de datos existentes sobre Realm  |
| Tipos/esquemas Realm del bloque `programa`                 | Patrón E1 (aditivo, nullable)          |

---

## Requisitos de backend

(Para el ADR correspondiente del repo backend; nada de esto se implementa en frontend.)

1. **Tablas `ProgramaVersion` / `ProgramaConcepto`** según D2–D4, con constraint de una vigente por catálogo y validación XOR concepto/partida.
2. **Import atómico con reporte de errores** (D5): management command + plantilla; activación explícita de vigente.
3. **`Construction.dia_corte`** (TextChoices día de semana): define los cortes de toda la obra; el import valida contra él.
4. **Extensión de `avance/base/`**: bloque `programa` (versión vigente + renglones planos), siguiendo el principio de paquete único.
5. **Extensión del summary de obra** (`/construction/{id}/summary/`, ADR-002 backend): agrega `importe_programado_a_fecha` (Σ P(hoy)×PU de versiones vigentes) para la esquina PROG. y la Ficha de Obra.
6. **Columna programado en el reporte Excel** (`excel_service`): P del periodo y acumulado junto al ejecutado, respetando granularidad (celdas vacías donde no hay programa — jamás prorrateo).

---

## Prerrequisitos antes de iniciar la implementación

Estas dos piezas deben estar resueltas **antes** de escribir código de Fase 2; no son deuda a pagar después:

1. **Deuda #12 del ADR-003 — limpieza de cache al cambiar de identidad.** Hoy Realm y el cache persistido de React Query sobreviven al logout. La Fase 2 agrava el problema: el programa contractual de una obra quedaría visible para el usuario siguiente en el mismo dispositivo hasta que aterrice el primer refetch, y a diferencia de un avance suelto, un programa completo de otra obra es información sensible y visualmente indistinguible de la propia. Con la reactivación del piloto en puerta y dispositivos que se comparten en obra, el wipe ligado al cambio de identidad es requisito previo.

2. **Propagación del workitem ancestro en `sabanaTreeBuilder`** (ver D13.1): `submitToQueue` exige `workItemId`/`workItemName` y `SabanaConceptNode` hoy no los expone. Sin ese cambio, la captura rápida no puede armar el contexto de la cola offline.

Recomendable, no bloqueante: verificar `react-native-svg` en `package.json` y, si falta, coordinar su alta con el rebuild pendiente de `expo-image` (deuda #13).

---

## Métricas de éxito

| Evento nuevo                | Dónde                  | Propiedades                               |
| --------------------------- | ---------------------- | ----------------------------------------- |
| `ficha_obra_opened`         | `FichaObraSheet` mount | `obra_id`                                 |
| `curva_tooltip_tapped`      | `CurvaChart`           | `contexto` (`concepto` \| `obra`)         |
| `programa_version_activada` | backend (import)       | `catalogo_id`, `numero_version`, `motivo` |

Indicadores: retención/frecuencia de uso en obras **con** programa cargado vs sin él (la hipótesis central de la fase: la vara temporal genera regreso); aperturas de Ficha de Obra y de ficha de concepto con curva; continuidad del desplazamiento del horario de captura (métrica estrella de Fase 1); tiempo de escritorio para cargar/activar una versión (fricción del propio autor: si cargar el programa es tortuoso, no se cargará).

---

## Consecuencias

| Área                          | Impacto                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Captura en campo              | **Cero cambios** — la fase completa es capa de lectura                                                               |
| Realm                         | Bump aditivo (bloque `programa`), patrón E1                                                                          |
| `avance/base/`                | Payload crece con renglones del programa vigente (acotado: renglones ≈ objetivos × cortes)                           |
| Refresco de datos             | El programa se actualiza por prefetch, no por workers (primer dato con escritor externo — precedente para INSPECTOR) |
| Reporte Excel                 | Gana la columna que los clientes exigen (programado vs ejecutado)                                                    |
| Deuda #3 (`Contrato`)         | Des-riesgada: colgar de `Catalog` deja migración futura no destructiva                                               |
| Deuda #5 (`SabanaGlobalCard`) | Saldada (reciclada en Ficha de Obra)                                                                                 |
| Dependencias                  | `react-native-svg` si no está presente (módulo nativo → rebuild coordinado con deuda #13)                            |

---

## Deuda técnica

1. **Entidad `Contrato`** (heredada del ADR-003 #3): migración diseñada (agrupa catálogos; FK nullable en `ProgramaVersion`); ejecutar cuando el multi-contrato sea caso activo.
2. **Banda muerta de estados (±2%)**: valor default sin calibrar; ajustar con evidencia de piloto y considerar hacerla configurable por obra.
3. **"Original vs vigente" en fichas**: los datos lo soportan desde día uno (versiones inmutables); la superficie de comparación se difiere.
4. **Sección "Mayores desviaciones por partida"** de la Ficha de Obra: candidata, pendiente de validación del autor antes de construirse.
5. **Agrupación mensual de la curva de obra**: proyección alternativa para obras largas; activar si los cortes semanales saturan.
6. **Import CSV directo desde MS Project**: mientras tanto, mapeo manual a la plantilla SENTINEL en escritorio.
7. **UI web de import**: v1 opera con admin + management command; la pantalla de carga con preview de validación es evolución (relevante cuando el INSPECTOR asuma la carga).
8. **Tooltip del `CurvaChart`**: si el alcance de interacción crece (pan, comparación de versiones), evaluar migrar a `victory-native` en vez de extender el componente propio.

9. **`authInterceptor.ts` aparentemente huérfano** (detectado al preparar la Etapa 0, 2026-08-03). `src/services/api/interceptors/authInterceptor.ts` exporta `applyAuthInterceptors`, que implementa un manejo de 401 anterior al silent refresh: borra `AsyncStorage.getItem("token")` —llave que nadie escribe, el token vive en SecureStore bajo `auth-token`— y despacha `logout()` del slice, saltándose `forceLogout()`. Un `grep` sobre `src/`, `App.tsx` e `index.ts` no encuentra ninguna invocación: `apiClient.ts` construye su cliente con interceptores propios (`addTokenToRequestsInterceptor`, `responseHandlerInterceptor`) y nunca lo importa. **Pendiente antes de borrarlo:** confirmar que no se usa por import dinámico, en tests, o desde algún cliente axios construido fuera de `apiClient.ts` (`apiRequestWithBaseUrl` crea instancias nuevas). Mientras tanto el archivo se conserva: es código muerto inofensivo —no está enganchado a ningún cliente— pero describe un comportamiento de 401 que contradice `docs/silent-token-refresh.md` y puede inducir a error a quien lo lea. **Fuera del alcance de la Fase 2.**

10. **Experiencia de primera carga tras el wipe de identidad** (propuesta, 2026-08-03). El wipe en sí es imperceptible (decode local de JWT en el caso común; `deleteAll()` + `removeClient()` en el cambio de identidad, decenas de ms dentro de `AuthLoading`). La espera real es el primer prefetch de `avance/base/` del usuario nuevo sobre red de obra — que **ya existe hoy en todo primer login** y no la introduce la Etapa 0, aunque el wipe la vuelve más visible. Propuesta registrada, no construida: revelación escalonada por tiempo transcurrido — 0–800 ms nada (un skeleton de 200 ms es un parpadeo, peor que nada); 800 ms–5 s skeleton de la sábana; >5 s skeleton más una línea honesta con nombre de obra y tamaño del catálogo; >20 s botón de reintentar. **Descartado explícitamente: barra de progreso determinada** — `avance/base/` es una sola respuesta HTTP de tamaño desconocido, no hay señal que alimente un porcentaje, y una barra falsa que se atora cerca del final convierte "cargando" en "se trabó"; hacerla real exigiría `Content-Length` más un parser en streaming. **Decidir después de la Etapa 7**, con el catálogo real de GDL en dispositivo: la duración que justifica o no esta inversión todavía no está medida.

11. **Contadores del Hoy: reemplazar los buckets disjuntos por la marca de agua de E8.** `useTodaySummary` evita el doble conteo de avances porque los buckets son disjuntos —al sincronizar, el item sale de `pending` y aparece en `todaysSynced`— y eso **solo funciona porque `AdvanceSyncWorker` hace `await queryClient.invalidateQueries(...)` antes de continuar**. Es correcto hoy, pero descansa en un acoplamiento invisible: si alguien quita ese `await` por parecer innecesario, el contador empieza a parpadear y nada lo señala. La marca de agua elimina la dependencia y hace el conteo correcto por construcción. **Refactor con evidencia, no ahora**: no hay síntoma reportado y el código actual funciona.

12. **Fotos (`photo_count`): posible unificación bajo E8.** `useTodaySummary` usa `Math.max(photo_count del servidor, fotos en cola)` por avance, con el ciclo `done` que la enmienda E5 de Fase 1 costó afinar. Funciona —y funciona por una razón sólida: compara dos mediciones _del mismo_ dato, no una suma. Unificarlo bajo la marca de agua daría un solo mecanismo para toda la reconciliación, pero **reescribir algo que funciona y que costó estabilizar no se paga solo**. Se registra por consistencia conceptual, no como pendiente accionable.

13. **`cobertura` calculada y sin pintar.** `useProgramaObra` expone la proporción del contrato cubierta por programa, y el backend expone `importe_contratado_con_programa`. La franja usa el **conteo de catálogos** en su lugar ("2 de 3"), que resultó más legible y más accionable que un porcentaje de dinero. El valor sigue disponible si alguna superficie lo necesita.

14. **Decimales asimétricos entre las dos capturas.** `CapturaRapidaSheet` limita a **4** —la precisión real del sistema, `Decimal(14,4)`— y `QuantityInput` del formulario clásico sigue en **2**. Igualarlos cambia el comportamiento de una pantalla fuera del alcance de esta fase; queda a decisión aparte. Al extraer `sanitizarVolumen` se corrigieron dos defectos que arrastraba el formulario clásico: la coma del teclado en español se **borraba** (un `12,5` se convertía en `125`) y un segundo punto congelaba el campo sin explicación.

15. **`programaCalculos` sin suite en el repo.** Se verificó compilándolo aparte y corriéndolo contra los valores canónicos del backend (desviación máxima 3.33e-5, bajo la cota de 1e-4). Es el candidato más claro a primer test del frontend: es puro, no toca Realm ni hooks, y tiene un espejo exacto en `programa/test_reparto.py`.

16. **`WorkItem` sin importe propio (deuda #9 del ADR-003 backend).** El importe de una partida se deriva siempre sumando sus conceptos hijos, tanto en `sabanaTreeBuilder` como en `useProgramaObra`. Una partida a precio alzado **sin conceptos hijos** valoriza a cero y queda invisible en el agregado de obra. Se difiere porque aun en precio alzado el documento que traduce el avance suele seguir siendo un catálogo con conceptos del que solo se reportan partidas.

---

## Guía de implementación (revisión de código, 2026-07-29)

Referencias verificadas contra `sentinel-frontend-prod` / `main` tras la Fase 1. Esta sección existe para que la ejecución respete los patrones ya establecidos y no reinvente mecanismos que ya funcionan en producción.

### Mapa de archivos por decisión

| Decisión                 | Archivo(s)                                                                                | Cambio                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D6 · Esquema Realm       | `src/providers/RealmProvider.tsx`                                                         | Agregar clases a `SENTINEL_SCHEMA` (constante **a nivel de módulo**, no inline), `schemaVersion: 11 → 12`, rama nueva en `handleMigration` |
| D6 · Clases Realm        | `src/realm/avanceBase/` (nuevos `Programa.ts`, `ProgramaConcepto.ts`, `ProgramaCorte.ts`) | Embedded objects; `AvanceBaseCatalog` gana `programa: "Programa?"`                                                                         |
| D6 · Parser              | `src/hooks/data/query/useAvance/utils/avanceBaseParser.ts`                                | Mapear el bloque `programa` en `parseAvanceBaseForRealm`                                                                                   |
| D6 · Tipos API           | `src/types/entities.d.ts`                                                                 | `AvanceBaseCatalog.programa` y tipos hijos                                                                                                 |
| D7 · Cálculo de estados  | `src/hooks/data/query/useAvance/utils/sabanaTreeBuilder.ts`                               | Campos de programa en `SabanaConceptNode`; helpers `programadoAFecha`, `estadoPrograma`, `rendimientoRequerido`                            |
| D7 · Datos del árbol     | `src/modules/avance/hooks/useSabanaData.ts`                                               | Pasar `catalog.programa` a `buildSabanaTree`; extender `SabanaGlobalStats` con programado                                                  |
| D7 · Chips en filas      | `src/modules/avance/components/SabanaTreeItem.tsx` (`ConceptRow`, `WorkItemRow`)          | Chip de estado + línea "Hoy debía X · lleva Y" + marca en `conceptBarBg`                                                                   |
| D7 · Búsqueda            | `src/modules/avance/components/SabanaSearchResult.tsx`                                    | Mismo chip que `ConceptRow`                                                                                                                |
| D7 · Línea de catálogo   | `src/modules/avance/components/SabanaCatalogMetrics.tsx`                                  | Agregar `prog. {pct}%` y marca en `catMetricsBarBg`                                                                                        |
| D10 · Esquina PROG.      | `src/modules/avance/components/HoyResumenHeader.tsx`                                      | Segundo bloque bajo `styles.pctBlock`; marca sobre `styles.barBg`; `TouchableOpacity` con `hitSlop` → `FichaObraSheet`                     |
| D10 · Datos del Hoy      | `src/modules/avance/hooks/useTodaySummary.ts`                                             | `TodayObraResumen` gana `pctProgramado`, `importeProgramado` (del summary extendido)                                                       |
| D8 · Curva               | `src/modules/avance/components/CurvaChart.tsx` (nuevo)                                    | `react-native-svg`                                                                                                                         |
| D9 · Ficha de obra       | `src/modules/avance/components/FichaObraSheet.tsx` (nuevo)                                | Patrón de sheet del módulo                                                                                                                 |
| D12 · Ficha concepto     | `src/modules/avance/components/ConceptoSheet.tsx` (nuevo)                                 | Ficha completa; luego recuadro de tres capas + `CurvaChart` (D8, E3)                                                                       |
| D13 · Captura rápida     | `src/modules/avance/components/CapturaRapidaSheet.tsx` (nuevo)                            | Sobre `useAdvanceSubmitToQueue` + `usePhotoCapture`                                                                                        |
| D13.1 · Contexto de cola | `src/hooks/data/query/useAvance/utils/sabanaTreeBuilder.ts`                               | Propagar `workItemId`/`workItemName` a `SabanaConceptNode`                                                                                 |
| Telemetría               | `src/services/telemetry.ts` → `telemetry.trackEvent`                                      | Eventos de §Métricas                                                                                                                       |

### Patrones obligatorios heredados de la Fase 1

**1. Decimales viajan como `string` en Realm.** `AvanceBaseConcept` almacena `quantity`, `price`, `cumulative_volume` y `quantity_left` como `string` y `sabanaTreeBuilder` los convierte con el helper local `parseNum`. Los volúmenes del programa (`volumen_total`, `volumen_acumulado`) **deben seguir el mismo patrón**: `string` en el esquema Realm y en el parser, `parseNum` al construir el árbol. Rompe la consistencia (y la precisión Decimal(14,4) del backend) almacenarlos como `double`.

**2. Identidad estable de la configuración de Realm.** `SENTINEL_SCHEMA` y `handleMigration` viven a nivel de módulo por una razón descubierta en producción: `@realm/react` compara la config por referencia en cada render y una arrow inline hace que **cierre y reabra el Realm** (carreras `Cannot access realm that has been closed`). Agregar las clases nuevas al array existente; **no** crear un provider ni una config nueva. Y la prop es `onMigration`, no `migration`.

**3. Migración aditiva y selectiva.** La rama nueva de `handleMigration` debe borrar **solo** `AvanceBaseResponse` (donde vive el programa), como ya hace la rama `< 10`. No tocar `AvancesByCatalogResponse` ni las colas (`PendingAdvanceSubmission`, `PendingPhotoSubmission`): el programa no las afecta y borrarlas destruiría capturas sin sincronizar.

```javascript
if (oldRealm.schemaVersion < 12) {
  newRealm.delete(newRealm.objects("AvanceBaseResponse"));
}
```

**4. Porcentajes sin recorte; el clamp es del componente.** `conceptPct`, `rollupPct` y `computeGlobalStats` retornan el valor real con piso 0 y **sin techo** (enmienda E2 de Fase 1). El recorte al 100% vive únicamente en el `width` de cada barra (`Math.min(100, pct)` en `SabanaTreeItem`, `HoyResumenHeader`, `SabanaCatalogMetrics`). Los cálculos de programa siguen la misma regla: `pctProgramado` sin techo, marca de barra recortada al pintar.

**5. Las listas de Realm requieren `Array.from()`.** `useAvanceBase` retorna el objeto Realm vivo (`data: cached ?? null`); `useSabanaData` y `useTodaySummary` ya hacen `Array.from(cached.catalogs)`. Aplicar igual a `catalog.programa.conceptos` y `concepto.cortes`.

**6. Objetos Realm nunca entran a estado React.** Los sheets guardan copia plana (`toJSON()`); guardar el objeto vivo crashea con `Accessing object which has been invalidated` cuando un refetch reescribe el cache con el sheet abierto. Aplica a `FichaObraSheet` y `ConceptoSheet`.

**7. Componentes de fila son presentacionales y memoizados.** `SabanaTreeItem` y sus subcomponentes (`ConceptRow`, `SectionRow`, `WorkItemRow`) están envueltos en `memo` y no consultan datos. Los campos de programa deben llegar **precomputados dentro de `SabanaConceptNode`** desde `sabanaTreeBuilder` — no llamar hooks ni recalcular fechas por fila (una sábana grande renderiza cientos de filas).

**8. Fechas de negocio por `DateUtils`.** D9 del ADR-003. Para el programa: `fecha_corte` y `fecha_inicio` se comparan por componentes de fecha local, nunca con `new Date(string)`. Reutilizar `DateUtils.getTodayUTCRange` / `parseLocalDateParam` según el caso.

**9. El programa no se invalida: se refresca con el prefetch.** El proyecto tiene `refetchOnMount: false` global y la regla "los workers invalidan lo que mutan" (`AdvanceSyncWorker` → `ADVANCES_BY_CATALOG`; `PhotoSyncWorker` → `ADVANCES_BY_CATALOG` + `PHOTOS_BY_DAY`). **Ningún worker debe invalidar el programa**: su escritor es el escritorio, y `useAvanceBase` ya se refresca en login, reconexión y pull-to-refresh. Añadir invalidación aquí introduciría tráfico sin beneficio.

**10. Sheets: patrón `useState` + `useEffect(isVisible)`** sobre `@gorhom/bottom-sheet`, compatible con React Compiler (evitar `setState` durante render). `FotosDelDiaSheet` es el ejemplo más reciente y cercano.

### Notas de ejecución por componente

**`HoyResumenHeader`** es presentacional puro (props + `React.memo`) y ya ejecuta el render condicional `resumenObra ? … : null`. La esquina PROG. debe seguir esa misma disciplina: si el backend no envía programado (obra sin programa cargado), **no renderizar el bloque** en lugar de mostrar 0% — un 0% se lee como "atraso total". Igual para la marca de la barra.

**`useTodaySummary`** ya consume `useConstructionSummary`; los campos nuevos del summary extendido (§Requisitos de backend) entran ahí sin hooks adicionales. Mantener el tipo `TodayObraResumen` con los campos de programa **opcionales** (`pctProgramado?: number`) para tolerar backend viejo, misma disciplina que los campos opcionales de la enmienda E1 de Fase 1.

**`sabanaTreeBuilder`** es el lugar correcto para toda la lógica de programa: es puro, testeable y ya concentra los cálculos (`conceptPct`, `rollupPct`, `computeGlobalStats`, `getSearchResults`). Agregar ahí `programadoAFecha(cortes, hoy)` (interpolación **tramo por tramo** entre los dos cortes que rodean a hoy), `estadoPrograma(...)` con la banda muerta y `rendimientoRequerido(...)`. Los campos resultantes se adjuntan a `SabanaConceptNode` en `buildSabanaTree`, junto al `pct` que ya se calcula ahí.

**`SabanaTreeItem.ConceptRow`** ya tiene la anatomía necesaria: `conceptWbs` (izquierda) y `conceptPct` (derecha) en la fila superior, `conceptNums` con Cont/Ejec, y `conceptBarBg`/`conceptBarFill`. El chip de estado entra junto a `conceptPct`; la línea "Prog. a hoy" sustituye o acompaña a `conceptNums`; la marca de programado es un `View` absoluto sobre `conceptBarBg`. **Cuidado con el ancho**: la fila ya es densa — validar en dispositivo antes de agregar ambos (chip y línea) al mismo tiempo.

**Objetivo del programa a nivel partida:** cuando el CSV viene por partidas, el estado se pinta en `WorkItemRow` y los conceptos hijos quedan sin chip (`SIN_PROGRAMA`). `buildSabanaTree` debe resolver esto al construir, no el componente.

### Deuda de Fase 1 que esta fase toca de cerca

- **`react-native-svg`**: verificar presencia en `package.json` antes de planear `CurvaChart`. Si falta, es módulo nativo → coordinar con el rebuild pendiente de `expo-image` (deuda #13 de Fase 1).
- **Cache que sobrevive al logout** (deuda #12 de Fase 1): el programa hereda el problema — un usuario vería el programa de la obra del usuario anterior hasta el primer refetch. **Recomendación: pagar esa deuda antes de la reactivación del piloto**, no después.
- **`page_size=100`** en avances: sigue truncando con catálogos grandes; el ejecutado que alimenta las comparaciones de programa depende de esa lista.

---

## Enmiendas (2026-07-27, cierre del modelo de datos)

Decisiones tomadas al bajar el diseño a modelo de datos con el ADR de backend (`ADR-003-programa-contractual.md`). Sustituyen o precisan lo indicado en cada caso.

- **E1 — Modelo de dos niveles (sustituye D2).** El programa se almacena como `ProgramaConcepto` (fuente: `fecha_inicio`, `fecha_fin`, `volumen_total` exactos) + `ProgramaCorte` (proyección: serie de acumulados por corte). La versión anterior de D2 describía únicamente filas con acumulado por corte, lo que **destruía la fecha exacta de inicio** y bloqueaba el lookahead. El resto de D2 (inmutabilidad, acumulado-no-delta, versión nueva por reprogramación) sigue vigente.

- **E2 — Vara visible: el día, no el corte (modifica D7).** La tabla de estados de D7 evaluaba contra el último corte ≤ hoy. Se corrige: el estado visible (chip, marca de barra, "programado / ejecutado") se calcula contra el **volumen programado interpolado a hoy**, tramo por tramo entre cortes. Razón: el cliente pregunta "¿cuál es el atraso a hoy?" cualquier día del ciclo, y con un programa que exige de lunes a viernes, no ejecutar lunes y martes es información real, no ruido de granularidad. El corte conserva su papel como **referencia contractual firme**, mostrada como capa secundaria. La banda muerta (±2%) se aplica igual sobre la interpolación.

- **E3 — Jerarquía de referencias por superficie (precisa D7 y D8).** Para evitar saturación, cada superficie carga solo lo que su momento pide:
  - **Fila de la sábana:** una sola línea — "Prog. a hoy X · ejec. Y" + marca de barra al día.
  - **Ficha del concepto:** tres capas en orden de jerarquía — (a) estado de hoy como protagonista, (b) meta del próximo corte con faltante, (c) **rendimiento requerido** (faltante ÷ días al corte) contra el rendimiento programado del tramo.
  - **Curva:** la historia, ya especificada en D8.
    El término es _rendimiento requerido_ (lenguaje de obra, expresa capacidad productiva), no "ritmo". Es la capa preventiva de la fase: cuando el requerido duplica al programado, la alerta llega semanas antes de que el corte lo confirme. En tramos con programado 0 (interrupción) la comparación se omite.

- **E4 — Motivos de versión: `AMPLIACION` eliminada.** Quedan `ORIGINAL`, `REPROGRAMACION`, `CONVENIO`, `CORRECCION`. Una ampliación se formaliza mediante convenio: mantener ambas produciría clasificación inconsistente. Se agrega el estado `DESCARTADA` — los borradores rechazados se conservan, no se eliminan de la BD.

- **E5 — Interfaz de carga en alcance v1 (modifica D5 y la deuda #7).** La carga deja de ser "admin + management command" y pasa a **vistas Django server-rendered** en el backend (seleccionar obra y catálogo → subir CSV con preview de validación → activar). El flujo incorpora **descarga de plantilla pre-poblada** (identificadores ya rellenos desde el catálogo; el usuario solo captura fechas y volumen) con token anti-catálogo-cruzado; la validación se conserva como red de seguridad. El pre-procesamiento del formato de cada cliente ocurre en Excel, fuera del sistema. La deuda #7 (UI web de import) queda saldada; el CSV siempre trae fechas explícitas, por lo que los campos `forma_origen`/`fechas_derivadas` que se habían previsto quedan descartados.

- **E6 — Lookahead: alcance confirmado, superficie pendiente y ejecución al final.** _(Actualizado 2026-07-29: se implementa al cierre de la fase, una vez estables los indicadores; la superficie se documentará primero en el archivo de implementación y este ADR se enmendará con la decisión final. Opciones en evaluación para el acceso, ninguna descartada: segundo ícono en el header de la sábana —requiere acortar el título "Sábana de Avance", que hoy ocupa casi todo el ancho—, chip permanente en la franja Hoy, o segmented control.)_ Se confirma que el lookahead entra en Fase 2 (nace del programa, no de la producción: el programa fija las metas y la producción se alinea a ellas). La pantalla "Próximos" incluirá **lo que inicia en el rango y lo que está en curso**, con secciones distintas. Quedan pendientes de decisión: el punto de acceso desde la sábana (opciones en evaluación: ícono en header, segmented control, chip permanente en la franja Hoy) y el criterio de orden por importe (del periodo vs total del renglón). No bloquea el resto de la fase.

- **E7 — Precisión decimal.** Backend almacena y calcula con `Decimal(14,4)`; el frontend decide el redondeo de presentación (2 o 4) como configuración de cliente, no de usuario.

- **E8 — Marca de agua para reconciliar la cola con el snapshot del servidor (2026-08-05).**

  **Problema.** Realm guarda dos colecciones cuyos ciclos de vida son independientes: `AvanceBaseResponse`, espejo del servidor que se sobrescribe al refetch, y `PendingAdvanceSubmission`, la cola local que ninguna respuesta del servidor toca. Para que la sábana refleje una captura al instante hay que **sumar** ambas — y ahí aparece una ventana en la que el resultado es falso. Con servidor en 200 y una captura de 50: si el item se borra de la cola al sincronizar pero `avance/base/` aún no refrescó, el total baja de 250 a 200 y **el usuario ve desaparecer su trabajo**; si el item se conserva hasta que refresque, al llegar el servidor con 250 el total salta a 300. Ambos caminos están mal en la ventana intermedia.

  El truco que ya usa `useTodaySummary` para fotos —`Math.max(photo_count, fotos en cola)`— **no transfiere**: funciona porque compara dos mediciones _de lo mismo_. Con volúmenes se está sumando, y el máximo entre "acumulado del servidor" y "volumen en cola" no significa nada.

  **Decisión.** Cada item de la cola registra **cuándo sincronizó** (`syncedAt`), y `AvanceBaseResponse` ya registra **cuándo se escribió** (`updatedAt`). La regla: _un item de la cola aporta su volumen solo si todavía no está reflejado en el snapshot_ — es decir, si nunca sincronizó, o si sincronizó **después** de la última escritura del cache.

  | Estado del item               | Comparación              | ¿Aporta? |
  | ----------------------------- | ------------------------ | -------- |
  | Sin sincronizar               | `syncedAt` nulo          | sí       |
  | Sincronizado, cache aún viejo | `syncedAt` > `updatedAt` | sí       |
  | Cache ya refrescado           | `syncedAt` < `updatedAt` | no       |

  **Qué gana.** El objetivo no es solo evitar el doble conteo: es que **el refresco sea visualmente invisible**. El número antes y después del refetch es el mismo, así que el usuario nunca ve un salto ni un bajón. Y lo consigue **sin forzar la invalidación de `BASE` en cada sincronización**, que era la alternativa: ésa funciona, pero re-descarga el paquete completo del catálogo cada vez que se sube un avance — despreciable con los 173 conceptos de GDL, no con una megaobra de N catálogos.

  **Nombres.** El patrón general es _optimistic UI_; el mecanismo del marcador es un _watermark_ (o _high-water mark_), término del procesamiento de flujos: un marcador de hasta dónde avanzó el dato autoritativo, de modo que todo lo anterior ya está contabilizado. La garantía que produce es _read-your-writes_, una de las garantías de sesión de sistemas distribuidos: el cliente debe ver sus propias escrituras aunque la réplica que consulta no las tenga. **Replicache** implementa exactamente esto bajo el nombre de _pending mutations replayed over the server snapshot_, usando un contador monotónico (`lastMutationID`) en vez de una marca de tiempo.

  **Por qué aquí el timestamp basta y no hace falta contador:** las dos marcas las escribe **el mismo dispositivo** — `updatedAt` lo pone `useAvanceBase` al escribir en Realm y `syncedAt` lo pondría el worker en ese mismo teléfono. Mismo reloj, sin desfase posible. Si alguna de las dos llegara del servidor, habría que migrar a contador monotónico.

  **Criterio de aplicación.** El patrón es para datos que **el dispositivo escribe localmente y además vuelve a leer del servidor**. Donde el dispositivo solo lee —el programa contractual, la estructura del catálogo— no hay nada pendiente que reconciliar y aplicarlo sería ruido. Y gana su lugar sobre todo cuando se **agregan valores** (sumas, importes): para conteos de items discretos, buckets disjuntos o `Math.max` pueden bastar.

  **Implementación:** requiere `syncedAt` en `PendingAdvanceSubmission` y conservar el item un momento tras sincronizar; entra en el mismo bump de esquema Realm de la Fase 2.

- **E8b — Contrato exacto de `programadoAFecha` (precisa E2, fijado al implementar el backend, 2026-08-03).**
  _(Se numeró E8b al documentar: nació el mismo día que la marca de agua y ambas quedaron rotuladas E8. Renumerarla a E9 habría corrido toda la secuencia posterior, que ya está citada en código y en el repo de backend.)_
  E2 estableció que el estado visible se calcula contra el volumen interpolado a hoy, tramo por tramo. Al bajarlo a código apareció que "los cortes que rodean a hoy" es insuficiente en los dos tramos extremos. Los puntos de interpolación son los cortes **dentro de la barra** más dos anclas obligatorias:

  ```
  P(hoy) = 0                si hoy <  fecha_inicio
         = volumen_total    si hoy >= fecha_fin
         = interpolación lineal entre los dos puntos que rodean a hoy,
           siendo los puntos: cortes dentro de la barra
           ∪ {(fecha_inicio − 1 día, 0), (fecha_fin, volumen_total)}
  ```

  - **Ancla de inicio en el día anterior al arranque**, no en `fecha_inicio`: el acumulado cuenta el día en curso, así que al cerrar `fecha_inicio` ya se ejecutó un día. Con `(fecha_inicio, 0)` el día 2 de una barra de 36 con 200 m³ daría 7.4074 en vez de 11.1111.
  - **Ancla de fin en `(fecha_fin, volumen_total)`**, descartando los cortes posteriores al fin de barra: la serie normalmente incluye un corte después de `fecha_fin` (el hito que certifica el volumen completo), e interpolar hacia él subvalúa el tramo final — 184.13 en vez de 188.8889.

  **Precisión:** la interpolación parte de acumulados ya redondeados a 4 decimales y puede diferir del reparto ideal en hasta `0.0001`. No se corrige: la serie almacenada es la única fuente que tienen backend y cliente, así que ambos obtienen el mismo número. Esa igualdad —no la exactitud absoluta— es lo que hace cuadrar la esquina PROG. de la franja (que viene del summary de obra) con los chips de las filas (que se calculan en cliente sobre la misma serie).

  **`sabanaTreeBuilder.programadoAFecha` debe replicar `programa/services/reparto.py::programado_a_fecha` del backend, tal cual.** La suite `programa/test_reparto.py` contiene los casos que sirven de espejo para los tests del cliente.

---

- **E9 — Un solo destino por fila: se retira el "+" de las cards (2026-08-05). Sustituye la gramática de D12 y de D4 del ADR-003.**

  **Qué cambia.** La fila de concepto deja de tener dos affordances. Tocarla abre la **ficha del concepto**, y la captura rápida se alcanza **únicamente** desde el CTA "Registrar avance" de esa ficha. Aplica igual a `SabanaTreeItem.ConceptRow` y a `SabanaSearchResult`.

  **Qué queda sin efecto:** el título de D4 del ADR-003 ("fila = ver, '+' = capturar"), la frase de D12 "el botón circular '+' abre la captura rápida", y la anotación 4 de L-02 en el UX-SPEC ("El '+' de la fila en la sábana es el atajo que se salta esta ficha"). La **alternativa rechazada de D12 sigue vigente**: tocar la fila NO lleva a captura directa — lleva a la ficha, que es el espacio de consulta que aquella alternativa eliminaba.

  **Justificación.** La sábana renderiza cientos de filas. Un botón de acción en cada una compite por atención con la información que la sábana existe para mostrar —clave, descripción, porcentaje, barra— y multiplica por el número de conceptos una decisión que el usuario solo toma en uno o dos. La ficha ya contiene todo lo que hace falta para decidir (acumulado, contratado, porcentaje, trazabilidad) **y** el CTA para actuar: separar "ver" de "capturar" en dos targets por fila resultó carga cognitiva sin contrapartida.

  **Qué se pierde, explícitamente.** El atajo de un solo toque para quien ya sabe qué va a registrar. Capturar pasa de un toque a dos, con una transición de sheet en medio. Es el costo aceptado; el `AdvanceRegistrationScreen` sigue disponible desde el FAB del historial para captura en volumen.

  **A vigilar en piloto:** si `captura_rapida_opened` cae respecto al formulario clásico tras este cambio, el atajo hacía más falta de lo estimado y conviene reconsiderarlo — quizá como affordance que aparece solo en la fila activa, no en todas.

---

## Enmiendas de implementación (2026-08-12, cierre de la fase)

Decisiones tomadas al bajar el ADR a código y al usar la app en dispositivo. La implementación completa está en `docs/sabana-home-fase2-programa.md`.

- **E10 — `NO_INICIADO` sale del enum de estados. Sustituye la tabla de D7.** `EstadoPrograma` queda como el resultado de **comparar** (`AL_DIA` | `ADELANTADO` | `ATRASADO`) y "aún no arranca" pasa a ser el campo booleano `DatosPrograma.noIniciado`, **ortogonal** al estado.

  **Qué obligó al cambio.** Un concepto cuyo programa arranca la semana entrante **pero que ya tiene volumen capturado** está a la vez sin iniciar y adelantado. Mientras las dos cosas vivieron en el mismo enum, la fila solo podía anunciar una, y ganaba la menos útil: decía "Inicia 26/07" y se callaba que el contratista va **adelantado de verdad**. No era un criterio equivocado, era una estructura que no admitía el caso.

  Consecuencia en UI: esa fila muestra **ambos chips**, "Adelantado" e "Inicia 26/07".

- **E11 — La sobre-ejecución anula los estados positivos. Precisa D7.** Cuando el acumulado rebasa lo **contratado** (>100%), el chip "Adelantado" cede su lugar a un chip de **puro triángulo ámbar**, y en la ficha el recuadro pasa a ámbar con el titular "Regularizar volumen". Razón: un concepto al 118% puede ir por delante del programa, pero decirle _adelantado_ es decirle **vas bien**, y no va bien — se pasó de lo contratado y eso se regulariza por convenio, no capturando.

  **`ATRASADO` sí sobrevive** a la sobre-ejecución, y es deliberado: no transmite _vas bien_, y las dos señales miden varas distintas, tal como D7 ya contemplaba. El caso es alcanzable porque el importador trata `volumen_total != quantity` como **advertencia, no error** —para no bloquear un convenio aún no reflejado en el catálogo—, así que un programa puede legítimamente exigir más de lo contratado.

- **E12 — Declarar una ausencia real no viola D11. Precisa D11.** La regla prohíbe **fabricar un 0%** que se lea como atraso total; no prohíbe decir que algo falta. Bajo ese criterio se agregan tres superficies que antes callaban:

  | Superficie             | Qué declara ahora                                            |
  | ---------------------- | ------------------------------------------------------------ |
  | `RecuadroPrograma`     | "Programa vencido · cerró el {fecha}, quedan N por ejecutar" |
  | `SabanaCatalogMetrics` | "sin programa cargado"                                       |
  | `HoyResumenHeader`     | "Programa cargado en 2 de 3 catálogos"                       |

  La tercera ataca un riesgo que el ADR no había nombrado: como el denominador del PROG% es el contratado **completo** de la obra, un catálogo sin programa lo arrastra hacia abajo sin explicación — y al revés engaña más, porque si el catálogo programado va bien, la franja puede sugerir que **la obra** va bien cuando una parte ni siquiera está planeada.

- **E13 — El rendimiento programado es el del TRAMO, no el de la ventana al corte. Precisa E3.** `(valor_fin_tramo − valor_inicio_tramo) / días_del_tramo`, no `(meta_corte − P(hoy)) / días_al_corte`. Con la segunda fórmula **ambos números se mueven solos** con el paso de los días y el programado cae a cero el último día del tramo, apagando la comparación justo cuando el atraso es máximo. La forma corregida es una propiedad del programa, estable, y reproduce el `vs 5.6 programado` del UX-SPEC sobre el caso canónico.

- **E14 — El semáforo de las barras se retira. Sustituye el criterio de color de D7/D8.** `barColor`/`pctColor` pintaban avance-contra-contrato como salud (<30% rojo, <60% ámbar, ≥60% verde). Un porcentaje contra contrato **no dice si vas bien**: eso solo lo sabe el programa. Con la Fase 2 encendida producía contradicciones visibles —**barra roja y chip azul "Adelantado" en la misma fila**—. La regla nueva colorea solo hechos ciertos **sin referencia temporal**: 0% gris, 0–100% slate, >100% ámbar. El estado vive **solo** en el chip.

  Con la escala rojo/ámbar/verde liberada, el chip "Adelantado" pasa de azul a **verde**. De cuatro sistemas de color por fila se baja a dos.

- **E15 — La fila con programa vencido cambia de vocabulario.** `Prog. a hoy` deja de tener sentido pasada `fecha_fin` —a esa altura siempre es el volumen total, y "a hoy" sugiere una vara que se sigue moviendo cuando ya se detuvo—. La fila pasa a `Venció 30/08 · faltan 54.5 · ejec. 145.5 m³`, con el ejecutado en la **misma posición final** que en la línea normal, para que no cambie de sitio al recorrer la sábana.

- **E16 — Trazabilidad plegada por defecto. Precisa D12.3.** Es útil, pero no es la pregunta con la que se abre la ficha —esa la responden el acumulado y el recuadro de programa—, así que ocupar media pantalla siempre la volvía ruido. La cabecera lleva la fecha de la última carga (`última: hoy` / `última: 15 jul` / `sin registros`) para que el tap no sea a ciegas, y **sin cargas no hay galón**: el chevron es la promesa de que hay algo adentro.

- **E17 — Alcance construido: sin `CurvaChart` (D8) ni `FichaObraSheet` (D9).** El `CurvaChart` queda **en revisión de producto**, no como deuda técnica: el autor pidió replantear cómo expresar esa información. La Ficha de Obra se difiere con su decisión de datos ya resuelta —la curva de obra exige un endpoint nuevo—. **Consecuencia: la deuda #5 del ADR-003 sigue abierta**, pese a que este ADR la daba por saldada.

  `react-native-svg` **está en `package.json` desde el commit raíz y no requiere rebuild**: la advertencia de D8 sobre coordinarlo con la deuda #13 (`expo-image`, que sí falta) no aplica.

- **E18 — La incidencia contextual de D13.2 no se construyó.** Exige primero una cola offline de incidencias, que hoy no existe: L-03 tiene prohibido abrir rutas de red propias (D13.1). Ya estaba anticipado en §Consideraciones.

- **E19 — Lookahead: cerrado en ADR-005 (2026-08-19). Cierra E6.**
  La enmienda E6 dejó el lookahead confirmado en alcance pero con la superficie sin definir y dos decisiones abiertas (punto de acceso y criterio de orden). Ambas quedan resueltas, junto con el diseño completo de la pantalla, en **`docs/adr/ADR-005-lookahead-proximos.md`** — ADR propio y no enmienda de éste, porque es una superficie nueva con su propio ciclo de vida y este documento ya carga catorce decisiones más la guía de implementación.
  **Resoluciones que cierran E6:**
  - **Pantalla propia**, no sheet: navegación exploratoria con rango, agrupación y salto a fichas; desde un sheet, tocar un concepto abriría otro sheet encima.
  - **Doble punto de acceso:** fila permanente en `HoyResumenHeader` ("Próximos {rango} · N conceptos ›") **más** ícono de binoculares en el header de la sábana, con el título acortado a "Sábana". La telemetría (`lookahead_opened.origen`) mide cuál se usa, para retirar el otro con evidencia.
  - **Orden por importe programado dentro del rango**, no por importe total del concepto ni por fecha.
  - **Dos vistas sobre un solo hook** `useLookahead(rango)`: **Lista** (semana › partida › concepto) y **Gantt** comprimido con línea resumen estilo Project.
  - **Horizontes fijos anclados al corte** (7/15/30 días), etiquetados "Al {fecha} · N días", con valores acumulados.
    **Sin impacto en backend ni en esquema Realm:** el lookahead consume el bloque `programa` de `avance/base/` y las tablas ya construidas — fue precisamente el argumento que motivó el modelo de dos niveles de **E1** (guardar `fecha_inicio` exacta en lugar de solo la serie de cortes).
    **Dependencias sobre las enmiendas de esta fase**, documentadas en la §Referencias cruzadas del ADR-005: marca de agua **E8** para el ejecutado reconciliado, `programadoAFecha` con el contrato de **E8b**, `noIniciado` ortogonal de **E10**, precedencia de chips de **E11**/**E14**, vocabulario de vencido de **E15**, y la gramática de fila sin "+" de **E9** (el lookahead hereda "una fila, un destino").
    **No depende de lo diferido por E17:** el lookahead no usa `CurvaChart` ni `FichaObraSheet`, así que puede implementarse sin resolver antes esa revisión de producto ni el endpoint de curva de obra.
    **Pendiente que bloquea su implementación:** el alcance **multicatálogo** —si la pantalla es del catálogo activo o de la obra completa— registrado como deuda #1 del ADR-005. Define el alcance de la consulta de `useLookahead` y es la única decisión abierta antes de escribir código.

---

## Consideraciones para lo que viene

Casos donde el patrón de marca de agua (E8) **conviene adoptarse de nacimiento**, porque retrofitearlo después cuesta un bump de esquema Realm y una migración:

- **Cola de incidencias.** Hoy `src/modules/incidencia/` no tiene cola: las incidencias van directo a red. D13.2 pide una incidencia contextual dentro de `CapturaRapidaSheet`, y esa lámina tiene prohibido abrir rutas de red propias (D13.1) — así que la incidencia contextual **exige primero una cola offline de incidencias**. Cuando se construya, que nazca con `syncedAt` y la regla de E8.
- **Cola de maquinaria.** `maquinariaHub` y `tiposMaquinaria` son hoy caches de lectura, no colas. Si el Hub Diario llega a capturar offline, aplica el mismo criterio.
- **Rol INSPECTOR.** Cuando el inspector apruebe o rechace desde el dispositivo, el estado de aprobación pasa a ser un dato que el dispositivo **escribe localmente y relee del servidor** — el caso exacto de E8. Y toca además `cumulative_volume`: el día que se filtre por `status='APPROVED'` (ADR-001 backend, Decisión 5), el acumulado cambiará por una acción de otro usuario, no propia. Ahí la reconciliación deja de ser solo optimista y habrá que revisar el criterio.

**Criterio para decidir en cada caso:** el patrón sirve cuando el dispositivo **escribe localmente y relee del servidor el mismo dato**, y gana sobre todo cuando ese dato se **agrega** (sumas, importes) en vez de contarse. Donde el dispositivo solo lee —el programa contractual, la estructura del catálogo— aplicarlo sería ruido.

---

## Ver también

- `docs/sabana-home-fase2-programa.md` — **documento de implementación de esta fase**
- `docs/adr/ADR-003-sabana-home-fase1.md` + enmiendas E1–E6 — la base sobre la que esta fase enciende capas
- `docs/ux/ux-spec-01.html` — Rev E: capas Fase 2 en L-01, L-01d (Ficha de Obra), curva de L-02
- ADR-003 backend (`ADR-003-programa-contractual.md`) + `docs/programa-contractual.md` — el modelo, el import y la distribución
- ADR-001 backend (`ADR-001-sabana-avance.md`) — principio de paquete offline único que D6 extiende
- ADR-002 backend — agregado de obra y fotos en serializer, que D7/D9 consumen
- ADR futuro Fase 3 — tab Semana / Last Planner (plano producción: compromisos, PPC, causas de no cumplimiento)
