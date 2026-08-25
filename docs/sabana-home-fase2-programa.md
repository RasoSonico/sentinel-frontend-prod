# Sábana como Home — Fase 2: Captura contextual y Programa Contractual

**Creation Date:** 2026-08-03
**Last Updated:** 2026-08-12
**Status:** Completed (alcance sin `CurvaChart` ni `FichaObraSheet` — ver §4)

> Documento de implementación. Las decisiones y su razonamiento viven en
> `docs/adr/ADR-004-sabana-home-fase2-programa.md` (frontend) y
> `docs/ADR/ADR-003-programa-contractual.md` (backend, otro repo).
> Referencia visual: `docs/ux/ux-spec-01.html` (UX-SPEC-01 Rev G).

---

## 1. Business & Experience Context (Product / UX)

- **Primary Goal:** dar al usuario **la vara temporal** contra la cual medir el avance ejecutado. Hasta la Fase 1 la app mostraba ejecutado contra contratado, lo que responde "¿cuánto llevo?" pero no la pregunta que el contratista hace culturalmente: **"este concepto debía llevar tanto — ¿cómo voy?"**. La hipótesis de producto es que esa vara es lo que genera regreso a la app.

- **User Journey:**
  1. El usuario abre la sábana y la franja "Hoy" muestra dos porcentajes lado a lado: **AVANCE** (ejecutado) y **PROGRAMA** (lo que el contrato exigía a la fecha), con la marca del programado sobre la barra de obra. La distancia entre el relleno y la marca **es** el atraso, sin leer un número.
  2. La línea del catálogo repite la lectura a su nivel; si ese catálogo no tiene programa, lo dice.
  3. Cada fila de concepto lleva un **chip de estado** solo cuando hay desviación, y la línea `Prog. a hoy X · ejec. Y`.
  4. Tocar la fila abre la **ficha del concepto** (L-02): contexto, acumulado, el **recuadro de tres capas** del programa, la trazabilidad de cargas plegada y el CTA.
  5. El CTA transiciona a la **captura rápida** (L-03) con el concepto precargado: cantidad con vista previa de consecuencia en vivo, evidencia fotográfica con miniaturas, y una línea "vs programa" bajo el nuevo acumulado.

- **Business Rules / Edge Cases:**
  - **Ausencia de programa = ausencia de UI (D11).** Sin dato, el elemento **no se renderiza**: nunca 0, "—" ni 0%. Un 0% en un indicador de programa **se lee como atraso total**, que es información falsa, no un neutro.
  - **Declarar una ausencia real NO viola D11** (enmienda E12). "Sin programa cargado" en la línea de catálogo y "Programa cargado en 2 de 3 catálogos" en la franja no fabrican nada: son hechos, y son justo los hechos que faltaban.
  - **Granularidad respetada (D4):** el indicador vive **solo** donde el programa existe. Si el programa es por partida, los conceptos hijos no muestran nada. La app **jamás prorratea hacia abajo**.
  - **La vara visible es el día, no el corte (E2):** el estado se calcula contra el volumen **interpolado a hoy**, tramo por tramo. El corte conserva su papel como referencia contractual firme, en capa secundaria.
  - **La sobre-ejecución anula el "Adelantado".** Un concepto al 118% puede ir por delante del programa, pero decirle *adelantado* es decirle *vas bien*, y no va bien. `ATRASADO` sí sobrevive: no transmite eso y mide otra vara.
  - **"Sin iniciar" y "Adelantado" conviven.** Si el programa arranca la semana entrante y ya hay volumen capturado, el contratista se adelantó de verdad y la fila muestra **ambos chips**.
  - **`AL_DIA` es silencio.** La señal útil es la desviación; cientos de chips verdes idénticos no informan de nada.
  - **Programa vencido:** pasada `fecha_fin` con volumen pendiente, la ficha muestra una alerta ámbar con la salida contractual, y la fila cambia `Prog. a hoy` por `Venció 30/08 · faltan N · ejec. M`.
  - **El programa no se invalida: se refresca con el prefetch.** Su escritor es el escritorio (segundo escritor externo al dispositivo), y `useAvanceBase` ya se refresca en login, reconexión y pull-to-refresh.
  - **Fechas de calendario contractual por componentes**, nunca `new Date("YYYY-MM-DD")` — que interpreta el string como medianoche UTC y en México lo corre un día atrás.

---

## 2. Architecture & Data (The Bridge)

### Endpoints & Services Used

| Endpoint                                     | Uso en esta fase                                              |
| -------------------------------------------- | ------------------------------------------------------------- |
| `GET /api/avance/base/`                      | **Único canal del programa.** Bloque `programa` por catálogo + `ultimas_cargas` por concepto |
| `GET /api/avance/construction/<id>/summary/` | Campos de programa disponibles; **no se consumen como fuente primaria** (ver abajo) |
| `GET /api/avance/physical/?concept=<id>`     | Historial completo del concepto, **solo bajo demanda explícita** |

> **Por qué el PROG% de la franja se calcula en cliente y no viene del summary.** El backend lo expone, pero como fuente primaria no sirve: **el programado cambia con el reloj** y no existe ningún evento al cual enganchar una invalidación de caché. Un valor traído por red envejece solo, y `useConstructionSummary` además no corre sin conexión. Calculándolo en cliente sobre la misma serie que alimenta las filas: la franja y la sábana **no pueden discrepar**, funciona sin señal, y avanza solo al cruzar la medianoche.

### Main Data Models

**Realm — bump aditivo `11 → 12`** (`src/realm/avanceBase/`):

| Clase                     | Notas                                                        |
| ------------------------- | ------------------------------------------------------------ |
| `Programa`                | Embebida en `AvanceBaseCatalog` (`programa: "Programa?"`)     |
| `ProgramaConceptoEmbebido`| `fecha_inicio`, `fecha_fin`, `volumen_total`, `cortes[]`      |
| `ProgramaCorteEmbebido`   | `fecha_corte`, `volumen_acumulado`                            |
| `UltimaCarga`             | Embebida en `AvanceBaseConcept`                               |

**Los decimales se guardan como `string`**, igual que `quantity`/`price`/`cumulative_volume`, y se convierten con `parseNum` al construir el árbol. Guardarlos como `double` rompería la precisión `Decimal(14,4)` del backend.

`PendingAdvanceSubmission` ganó `syncedAt: "date?"` y el estado `"done"` (marca de agua, ver §3).

**Tipos de dominio** (`sabanaTreeBuilder.ts`):

```ts
interface DatosPrograma {
  fila: FilaPrograma;          // serie completa, para que la ficha derive sin buscar
  programado: number;          // P(hoy), SIEMPRE en la unidad del objetivo
  programadoImporte?: number;  // solo a nivel partida, valorizado
  estado: EstadoPrograma;      // AL_DIA | ADELANTADO | ATRASADO
  noIniciado: boolean;         // ORTOGONAL al estado
  vencido?: ProgramaVencido;   // precomputado: las filas no conocen la fecha
  fechaInicio: string;
}
```

> **`noIniciado` es un campo y no un valor del enum**, y ese fue el cambio de modelo de la fase. Mientras "sin iniciar" vivió dentro de `EstadoPrograma`, un concepto que arranca la semana entrante **pero que ya tiene volumen capturado** solo podía anunciar una de las dos cosas, y ganaba la menos útil: decía "Inicia 26/07" y se callaba que el contratista va adelantado. Son hechos independientes: *cómo vas* y *si ya te toca*.

### Interaction Flow (Diagram)

```
avance/base/  ──►  Realm (AvanceBaseResponse)
                      │
                      ├─► useSabanaData ──► buildSabanaTree(workItems, {programa, hoy, volumenEnCola})
                      │        │                    │
                      │        │                    └─► programaCalculos: programadoAFecha,
                      │        │                        estadoPrograma, programaNoIniciado,
                      │        │                        programaVencido
                      │        │
                      │        ├─► SabanaTreeItem / SabanaSearchResult  (chips, línea, marca)
                      │        ├─► SabanaCatalogMetrics                 (Programado %, marca)
                      │        └─► ConceptoSheet ──► RecuadroPrograma   (3 capas + vencido)
                      │                     └─────► CapturaRapidaSheet  (línea "vs programa")
                      │
                      └─► useProgramaObra ──► HoyResumenHeader (PROGRAMA %, marca, alcance)

useFechaOperativa ──► `hoy` inyectado en el árbol y en el agregado de obra
                      (AppState + temporizador a medianoche, 100% local)
```

---

## 3. Technical Implementation Details

### Reusable Components

| Componente / módulo             | Rol                                                                |
| -------------------------------- | ------------------------------------------------------------------ |
| `programaCalculos.ts`            | Funciones **puras** del contrato de programa. No tocan Realm ni hooks |
| `coloresAvance.ts`               | Color de barras y porcentajes, en un solo lugar                    |
| `fechaPrograma.ts`               | `fechaCorta`, `fechaConDia`, `fechaLarga` — por componentes         |
| `sanitizarVolumen.ts`            | Saneado del input de volumen, compartido con el formulario clásico |
| `escala.ts`                      | `sp()`, `fs()`, `lh()` — escalas por clase de dispositivo           |
| `ChipPrograma.tsx`               | Traduce estado → chips, con la precedencia de negocio               |
| `RecuadroPrograma.tsx`           | Las tres capas de E3 + la alerta de programa vencido               |
| `ConceptoSheet.tsx` (L-02)       | Ficha del concepto                                                  |
| `CapturaRapidaSheet.tsx` (L-03)  | Captura contextual sobre el motor existente                        |
| `cacheOwner.ts`                  | Wipe de caché al cambiar de identidad (prerrequisito)               |

### State Management

- **`useFechaOperativa()`** — la fecha local `YYYY-MM-DD` como estado reactivo, con listener de `AppState` y temporizador a medianoche. Sin esto el programado se congela con la app en segundo plano y sin red. Se inyecta en `buildSabanaTree` y en `useProgramaObra`, y `useSabanaData` **la expone** para que la ficha use exactamente la misma: dos relojes distintos podrían contradecirse en el cruce de medianoche.
- **Los campos de programa llegan precomputados dentro del nodo.** `SabanaTreeItem` y `SabanaSearchResult` están envueltos en `memo` y una sábana grande renderiza cientos de filas: no consultan datos ni recalculan fechas.
- **Objetos Realm nunca entran a estado React.** `useSabanaData` hace `toJSON()` sobre `catalog.programa` antes de pasarlo al builder, y la pantalla guarda una copia plana del nodo seleccionado. Sostener el objeto vivo crashea con *"Accessing object which has been invalidated"* cuando un refetch reescribe el cache con el sheet abierto.

### Design Patterns & Key Decisions

**El contrato compartido con el backend.** `programadoAFecha` debe dar **exactamente** lo mismo que `programado_a_fecha` de `reparto.py`. Si divergen, el número de la franja y el de las filas se contradicen en la misma pantalla. Los puntos de interpolación son los cortes **dentro** de la barra más dos anclas: `(fecha_inicio − 1 día, 0)` y `(fecha_fin, volumen_total)`.

Verificado sobre el caso canónico (200 m³, 26-jul → 30-ago, corte domingo): desviación máxima **3.33e-5** contra el reparto ideal, bajo la cota de `1e-4` que declara el ADR.

**`diaCivil` en vez de `Date`.** Las fechas de calendario se comparan con un contador de días propio (algoritmo de Howard Hinnant), exacto para cualquier fecha gregoriana y sin depender del huso del dispositivo ni del horario de verano. Dos fechas de calendario se comparan como calendario.

**Marca de agua para reconciliar cola y snapshot (E8).** Realm guarda dos colecciones con ciclos de vida independientes: `AvanceBaseResponse` (espejo del servidor, se sobrescribe al refetch) y `PendingAdvanceSubmission` (cola local que ninguna respuesta toca). Para que la sábana refleje una captura al instante hay que **sumar** ambas, y ahí aparece una ventana en la que el resultado es falso.

La regla: *un item de la cola aporta su volumen solo si todavía no está reflejado en el snapshot*.

| Estado del item          | Comparación             | ¿Aporta? |
| ------------------------ | ----------------------- | -------- |
| Sin sincronizar          | `syncedAt` nulo         | sí       |
| Sincronizado, cache viejo| `syncedAt` > `updatedAt`| sí       |
| Cache ya refrescado      | `syncedAt` < `updatedAt`| no       |

El objetivo no es solo evitar el doble conteo: es que **el refresco sea visualmente invisible**. El número antes y después del refetch es el mismo. El patrón general es *optimistic UI*; el mecanismo es un *watermark*; la garantía que produce es *read-your-writes*.

**El rendimiento programado es el del TRAMO, no el de la ventana al corte.** Primero se calculó como `(meta_corte − P(hoy)) / días_al_corte`, y con esa fórmula **ambos números se mueven solos con el paso de los días**: en el último día del tramo el programado cae a cero y la tarjeta se apaga justo cuando el atraso es máximo. La forma correcta es `(valor_fin_tramo − valor_inicio_tramo) / días_del_tramo`, una propiedad del programa que no depende de qué día se mire.

**El semáforo de las barras se retiró.** `barColor`/`pctColor` pintaban avance-contra-contrato con escala de salud (<30% rojo, <60% ámbar, ≥60% verde) y vivían **duplicados** en dos archivos. El problema de fondo: un porcentaje contra contrato **no dice si vas bien** —eso solo lo sabe el programa— y con la Fase 2 encendida producía contradicciones visibles: **barra roja y chip azul "Adelantado" en la misma fila**. La regla nueva colorea solo hechos ciertos sin referencia temporal:

| Condición | Barra              | Porcentaje       |
| --------- | ------------------ | ---------------- |
| 0%        | `neutral[300]`     | `neutral[400]`   |
| 0–100%    | `executive.light`  | `neutral[800]`   |
| >100%     | `warning[500]`     | `warning[700]`   |

El relleno es slate y no el azul de marca porque `primary[500]` es vecino del azul con que el chip decía "Adelantado" (hoy verde). El teal queda reservado al plano contractual: marcas y línea del programa.

**Tipografía y espacio no comparten escala.** `sp()` estaba copiado en seis archivos de estilos y **ningún `fontSize` pasaba por él**: los márgenes escalaban por dispositivo y la letra no. `escala.ts` unifica y separa: `sp()` con curva agresiva para espaciado, `fs()` con curva suave (±15% / −5%) y **piso duro en 11 px** para texto, y `lh(fontSize)` que **deriva** la interlínea. El texto tiene un piso de legibilidad que el espacio en blanco no tiene.

**La captura rápida no introduce ninguna ruta de red propia (D13.1).** Apertura desde cache Realm; envío por `submitToQueue` → cola → `useAdvanceSyncWorker`; fotos por `usePhotoCapture` + `usePendingPhotoQueue`. Duplicar ese pipeline rompería el conteo del Hoy y la atomicidad de `completeAdvanceSyncAtomic`.

**La trazabilidad de la ficha no dispara red al abrir.** Las 4 cargas más recientes viajan dentro de `avance/base/`. El historial completo sí es una llamada, pero **solo cuando el usuario la pide** — que es cuando él la pidió y hay conexión.

### New Environment Variables

Ninguna. Dependencias nuevas: ninguna. `react-native-svg` está en `package.json` desde el commit raíz y **no requiere rebuild del dev client** (la advertencia del ADR sobre coordinarlo con la deuda de `expo-image` no aplica).

**Requiere backend con el bloque `programa` en `avance/base/`** y el bump de esquema Realm a 12, cuya migración borra **solo** `AvanceBaseResponse` — nunca las colas, que contienen capturas sin sincronizar.

---

## 4. Technical Debt & TODOs

- **`CurvaChart` — en revisión de producto, no diferida por costo.** El autor pidió replantear cómo expresar esa información antes de construirla. Dato que forzó la conversación: la línea de **ejecutado** no existe en el paquete offline (solo el acumulado de hoy y las 4 cargas recientes). Se puede reconstruir hacia atrás restando cargas posteriores al acumulado actual —4 offline, ~50 con `getAdvancesByConcept`— pero exigiría enmendar D13.1.
- **`FichaObraSheet` (L-01d) diferida completa.** La curva de obra necesita el ejecutado valorizado por corte de **todos** los catálogos, que no es derivable en cliente de ninguna forma: o entra un endpoint nuevo, o la ficha lanza sin curva. **Consecuencia: la deuda #5 del ADR-003 (`SabanaGlobalCard` reciclada) sigue abierta**, aunque el ADR-004 la daba por saldada.
- **`cobertura` calculada y sin pintar.** `useProgramaObra` la expone e `importe_contratado_con_programa` viaja en el summary; la franja usa el **conteo de catálogos** en su lugar, que resultó más legible. El porcentaje de dinero sigue disponible si alguna superficie lo necesita.
- **Banda muerta de estados (±2%) sin calibrar.** Valor default; ajustar con evidencia de piloto y considerar hacerla configurable por obra. La misma constante gobierna la alerta de rendimiento requerido.
- **Decimales asimétricos entre capturas.** La captura rápida limita a **4** (la precisión real, `Decimal(14,4)`); el formulario clásico sigue en **2**. Igualarlos es un cambio de comportamiento de esa pantalla, pendiente de decisión.
- **`page_size=100` en avances**: sigue truncando con catálogos grandes. Es la razón por la que `ultimas_cargas` tuvo que viajar en el paquete offline.
- **`authInterceptor.ts` huérfano**: `applyAuthInterceptors` no lo invoca nadie —el camino vivo es `responseHandlerInterceptor` en `apiClient.ts`— pero describe un manejo de 401 que contradice `docs/silent-token-refresh.md`. Confirmar que no se usa por import dinámico antes de borrarlo.
- **Experiencia de primera carga tras el wipe de identidad**: propuesta de revelación escalonada registrada, no construida. Descartado explícitamente: barra de progreso determinada (`avance/base/` es una sola respuesta de tamaño desconocido y una barra falsa que se atora convierte "cargando" en "se trabó").
- **Contadores del Hoy bajo la marca de agua (E8)**: `useTodaySummary` sigue con buckets disjuntos, correcto hoy pero apoyado en un `await queryClient.invalidateQueries(...)` cuya remoción rompería el contador en silencio. Refactor con evidencia, no ahora.
- **Cola de incidencias inexistente**: la incidencia contextual de L-03 (D13.2) **no se construyó** porque exige primero una cola offline de incidencias. Cuando se construya, que nazca con `syncedAt` y la regla de E8.
- **Lookahead (E6)**: confirmado en alcance de fase, no ejecutado. Punto de acceso desde la sábana sin decidir.
- **Sin cobertura de tests en frontend**: `programaCalculos` se verificó compilándolo aparte y corriéndolo contra los valores canónicos del backend, pero no hay suite en el repo. Es el candidato más claro a primer test, porque es puro y tiene un espejo exacto en `programa/test_reparto.py`.
- **Errores TS preexistentes**: 14 de `tsc`, los mismos 6 grupos de la Fase 1. Esta fase no agregó ninguno.

---

## Ver también

- `docs/adr/ADR-004-sabana-home-fase2-programa.md` — las decisiones y su razonamiento
- `docs/sabana-home-fase1.md` — la base sobre la que esta fase enciende capas
- `docs/ux/ux-spec-01.html` — UX-SPEC-01 Rev G
- **Backend:** `docs/ADR/ADR-003-programa-contractual.md` y `docs/programa-contractual.md`
- **Backend:** `docs/instructivo-carga-programa.md` — cómo se carga un programa
