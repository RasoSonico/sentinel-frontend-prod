# ADR-005: Lookahead "Próximos" — pantalla de anticipación sobre el programa contractual

**Estado:** Propuesto
**Fecha:** 2026-08-19 · decisiones D12–D13 cerradas 2026-08-26
**Autores:** Sergio Cota (producto/desarrollo), sesión de diseño UX/arquitectura asistida
**Referencia visual:** `docs/ux/ux-spec-01.html` (UX-SPEC-01 Rev K — lámina **L-01e**)
**Repositorio:** sentinel-frontend-prod
**Depende de:** `ADR-004` D1–D14 y sus enmiendas **E1–E18** (modelo de programa contractual, distribución vía `avance/base/`, ausencia de dato, marca de agua, gramática de fila) y `ADR-003-programa-contractual.md` del repo backend (`ProgramaVersion` / `ProgramaConcepto` / `ProgramaCorte`).
**Alineado con la implementación real:** `docs/sabana-home-fase2-programa.md` (Fase 2 cerrada el 2026-08-12).
**Referenciado desde:** ADR-004, enmienda E6.

---

## Contexto

El ADR-004 dejó el lookahead con alcance confirmado pero superficie sin definir, y con dos decisiones abiertas: el punto de acceso y el criterio de orden. Este ADR las cierra y añade las que surgieron al diseñar la pantalla en detalle.

La motivación es de producto: **el control de obra en México reacciona al atraso en lugar de anticiparlo.** El resto de la Fase 2 mide lo que ya ocurrió (atraso por concepto, curva, desviación); el lookahead es la única superficie que mira hacia adelante, y por eso es donde el programa contractual deja de ser un reporte y se convierte en herramienta de gestión: qué arranca pronto, cuánto pesa en dinero, y qué hay que preparar antes de que sea tarde.

La estructura de datos que lo hace posible ya está decidida: `ProgramaConcepto` guarda `fecha_inicio` / `fecha_fin` exactas (fue precisamente el argumento que motivó el modelo de dos niveles del ADR-004 E1) y `ProgramaCorte` guarda la serie de acumulados. **Este ADR no requiere ningún cambio de backend ni de esquema.**

**Restricciones:**

- Un solo desarrollador: la pantalla debe construirse con componentes y datos ya existentes.
- El módulo de producción (Fase 3, Last Planner) **no existe** ni en backend ni en frontend; la tab "Semana" sigue siendo proyección. Nada aquí puede depender de él.
- Offline-first: la pantalla no puede introducir rutas de red nuevas.

---

## Decisiones

### 1. Pantalla propia, no bottom sheet

**Decisión:** `LookaheadScreen` dentro del `SabanaNavigator`, no un sheet.

**Justificación:** un sheet resuelve una tarea corta sobre un objeto ya elegido (patrón de `ConceptoSheet`, `FotosDelDiaSheet`). El lookahead es navegación exploratoria: selector de rango, dos vistas, agrupación jerárquica, scroll largo y salto a fichas. Desde un sheet, tocar un concepto abriría **otro sheet encima** — apilamiento que el proyecto ha evitado sistemáticamente.

**Alternativa rechazada:** _alojarlo dentro de la Ficha de Obra_ (considerado mientras el lookahead era una sección): convierte una consulta frecuente en contenido de segundo nivel. La enmienda **E17 del ADR-004** confirma además que `FichaObraSheet` **no se construyó** —la curva de obra exige un endpoint que no existe— así que colgar el lookahead de ella lo habría bloqueado por completo.

---

### 2. Doble punto de entrada: fila en la franja Hoy + ícono en el header

**Decisión:** dos accesos complementarios en `SabanaScreen`:

1. **Fila permanente en `HoyResumenHeader`** — "Próximos {rango} · {N} conceptos ›" — bajo los contadores del día.
2. **Ícono de binoculares** en el header de navegación, junto a `QueueHeaderButton`. El título de pantalla se acorta de "Sábana de Avance" a **"Sábana"** para liberar ancho.

Ambos se rigen por D11 del ADR-004: **sin programa vigente, ninguno se renderiza.** Con el matiz de **E12**: declarar una ausencia real no viola D11, así que en una obra con programa **parcial** (algunos catálogos sí, otros no) la entrada sí aparece y el alcance se declara en la pantalla — coherente con el "Programa cargado en 2 de 3 catálogos" que la franja ya muestra.

**Justificación:** el lookahead solo produce valor si se abre _antes_ de que el atraso exista, así que la descubribilidad pesa más que el ahorro de píxeles. La fila lleva etiqueta y conteo — enseña el feature y genera hábito — pero desaparece con el scroll; el ícono lo mantiene accesible durante todo el recorrido de la sábana, que es cuando el usuario está mirando conceptos. El binocular es icónicamente transparente para "mirar adelante" y no colisiona con la nube de sincronización.

**Alternativas rechazadas:**

- _Cuarto contador junto a Avances/Fotos/Incidencias:_ visualmente elegante y de altura cero, pero rompe la semántica de esa fila — los tres actuales cuentan **lo capturado hoy**; este contaría **lo que viene**.
- _Tercer botón en la fila de acciones:_ obliga a abreviar "Reporte del día" e "Incidencia", deja tres targets estrechos en 320px, y mezcla acciones de captura con navegación de consulta.
- _Tab propia:_ el espacio de tabs está comprometido — la quinta corresponde a **Semana** (producción, Fase 3), que se conserva reservada para el diseño futuro.

---

### 3. Dos vistas sobre un solo hook: Lista y Gantt

**Decisión:** segmented control **Lista / Gantt** en la cabecera de la pantalla. Un único hook `useLookahead(rango)` devuelve la estructura **semana › partida › concepto**; las pestañas solo cambian el render.

**Justificación:** ambas responden preguntas distintas —Lista da descripciones, volúmenes e importes; Gantt da forma temporal y traslapes— y comparten exactamente los mismos datos. Un solo hook hace el cambio de pestaña instantáneo y evita duplicar la lógica de cálculo, que es donde vive el riesgo de divergencia.

---

### 4. Lista: la semana ordena, la partida agrupa

**Decisión:** secciones por semana (con periodo e importe del periodo), y dentro de cada una, partidas colapsables cuyo importe es **el de esa semana**, expandibles a conceptos con WBS, chip de días, descripción, volumen e importe. Sección final **"En curso"** para conceptos ya iniciados que terminan dentro del rango.

**Justificación:** la semana es la unidad de planeación y coincide con el ciclo de corte; la partida es la unidad con la que se cotiza a un proveedor y se contrata cuadrilla. Agrupar por partida además colapsa una megaobra a 3–6 filas por semana.

**Consecuencia aceptada:** una misma partida puede aparecer en dos semanas con montos distintos — son arranques distintos. La lectura "cuánto pesa Estructura en total" no vive aquí, vive en la sábana.

**Con más de un catálogo** la jerarquía gana un nivel intermedio: **semana › catálogo › partida › concepto** (ver D12).

---

### 5. Gantt comprimido: lo que se conserva y lo que se renuncia

**Decisión:** columnas semanales fijas determinadas por el rango (máximo 4–5), **sin scroll horizontal, sin zoom, sin dependencias, sin hitos**. Partidas como **línea resumen estilo Project** (línea con topes triangulares, de `min(fecha_inicio)` a `max(fecha_fin)` de sus conceptos); conceptos como barras. Fila superior con el importe programado por semana. **Línea de hoy continua**: un único `View` absoluto en el contenedor del gráfico, detrás de las barras (z-index 0, opacidad ~.35), nunca una marca por pista.

**Justificación:** el scroll horizontal con encabezado sincronizado es donde estos componentes se vuelven inmanejables; renunciar a él mantiene el costo en el presupuesto de un solo desarrollador. La línea resumen es idioma que el usuario ya lee sin explicación. Y la línea de hoy debe ser continua porque **el tiempo es un eje único**: fraccionarla sugeriría que cada fila tiene su propio instante.

**Implementación:** `View` con posicionamiento absoluto y anchos en porcentaje. **No requiere `react-native-svg`** — lo que evita la dependencia nativa pendiente del proyecto.

**Consecuencia aceptada:** la línea resumen puede dibujar un tramo continuo donde hay periodos sin actividad entre conceptos; se declara en la carta de partida.

---

### 6. Carta contextual con foco, no navegación directa

**Decisión:** tocar una fila del Gantt (**la fila completa, nunca la barra** — 11px es un target imposible con guantes) abre una carta in situ con **variante de foco**: las demás filas bajan a 35% de opacidad, la fila activa se tiñe, su barra engrosa a 15px y un caret triangular conecta la carta con el inicio de la barra. Cierre explícito con **✕** más tap fuera de la zona de barra. El scroll nunca abre ni cierra. Varias cartas abiertas son posibles y deliberadas.

**Justificación:** navegar directo a la ficha obligaría a entrar y salir tres veces para comparar tres conceptos, perdiendo cada vez la posición relativa — que es justamente lo que se está leyendo. El foco resuelve el vínculo carta↔barra sin sacrificar el contexto alrededor.

**Alternativa rechazada:** _tooltip estilo app de inversión_ — ahí el tooltip existe porque los puntos de una serie son anónimos; aquí cada barra es una entidad con ficha propia, y un tooltip competiría con un destino mejor.

---

### 7. Anatomía de la carta: seis secciones nombradas

**Decisión:** vocabulario fijo para especificación e implementación:

| Sección                      | Contenido                                                                   |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Información del concepto** | WBS · partida · nombre del concepto en negritas                             |
| **Información de programa**  | Inicia · Termina · Duración · **Meta** (valor en `{unidad}/día`)            |
| **Zona contextual**          | Frase de una línea + franja horizontal de distribución (9px, sin etiquetas) |
| **Tabla**                    | Tres horizontes con cuadro de color, volumen, importe y %                   |
| **Aviso al pie**             | Nota separada por línea punteada, **fuera del ámbar**                       |
| **Footer**                   | Chip de estado + "Ver ficha ›"                                              |

Detalles de copy y color decididos: la frase cambia según el caso —"El concepto completo se ejecuta dentro de los próximos 30 días" cuando cabe, "En 30 días se ejecuta el **32%** del concepto" cuando no—; **los cuadros de color de la tabla son la leyenda de la franja**, por lo que la franja no lleva etiquetas propias; el tramo fuera de ventana se dibuja rayado y **no tiene renglón en la tabla**, y esa ausencia refuerza el aviso.

**Justificación del aviso fuera del ámbar:** en el sistema visual el ámbar significa alerta (sobre-ejecución, atraso). Este aviso es una aclaración de alcance, no una alerta: se resuelve como nota al pie en gris con separador punteado, el mínimo peso visual que sigue siendo legible.

---

### 8. Cuatro estados de la carta

**Decisión:**

| Estado          | Tratamiento                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Por iniciar** | Carta completa; chip **gris** "Inicia en N días" (apagado, como en sábana). Corresponde a `DatosPrograma.noIniciado`                                                     |
| **En curso**    | Chip continuo **"Atrasado por {abs(vol)} {unidad}"** o "Al día"; línea de ejecutado **bajo** la franja; meta recalculada descontando lo ejecutado                        |
| **Vencido**     | **Layout propio sin tabla ni franja**: pendiente por ejecutar en grande, ejecutado vs total, y "Venció {fecha}". Chip **slate oscuro**, no rojo                          |
| **Partida**     | Sin franja ni tabla: fechas min/max, duración, importe programado, importe en el rango y conteo de conceptos. Acción **"Ver conceptos ›"** que expande hijos en el Gantt |

**Alineación con las enmiendas de implementación del ADR-004:**

- **E10 — `noIniciado` es ortogonal al estado, no un valor del enum.** "Por iniciar" y "En curso" **no son excluyentes**: un concepto cuyo programa arranca la semana entrante pero que ya tiene volumen capturado muestra **ambos chips** ("Adelantado" + "Inicia 26/07"). La tabla anterior los trataba como estados mutuamente excluyentes; se corrige aquí. `LookaheadCard` debe componer chips, no elegir uno.
- **E11 — la sobre-ejecución anula los estados positivos.** Si el acumulado rebasa lo contratado, "Adelantado" cede a chip de **triángulo ámbar**; `ATRASADO` sobrevive. Vale igual en la carta del lookahead.
- **E14 — "Adelantado" es verde, no azul.** El semáforo de barras se retiró en Fase 2 y liberó la escala rojo/ámbar/verde para los chips.
- **E15 — vocabulario de vencido.** La sábana usa `Venció 30/08 · faltan 54.5 · ejec. 145.5 m³`; la carta de vencido adopta la misma fórmula en vez de "Vencido hace N días", para no tener dos redacciones del mismo hecho.
- **Reutilizar `ChipPrograma.tsx`**, que ya implementa la precedencia de negocio entre estos casos. No reimplementar la lógica de chips dentro de la carta.

**Justificación de los casos límite:**

- **Vencido:** los tres horizontes mostrarían el mismo 100% y la meta diaria dividiría entre días negativos. Se sustituye por lo único accionable. El slate distingue un estado **terminal** de una desviación **recuperable** (rojo = atrasado).
- **Partida:** la distribución de una partida mezcla conceptos con unidades distintas (ton + m³ + pza) y **no es sumable**; solo los agregados en dinero lo son. Una partida no tiene ficha propia, por eso su acción expande en vez de navegar.
- **En curso:** el ejecutado va **bajo** la franja y no dentro, porque la franja reparte lo _programado_ entre horizontes; mezclarlo con avance real sería confundir dos lecturas.

---

### 9. Horizontes fijos anclados al corte

**Decisión:** los tres horizontes son **7, 15 y 30 días contados desde el corte**, no desde hoy, y se recalculan al cambiar de corte. Se etiquetan **"Al {fecha} · N días"**, nunca solo "7 días". Los valores son **acumulados**, declarado explícitamente en el encabezado de la tabla ("Programado acumulado").

**Justificación:** una ventana móvil desde hoy cambia cada mañana — el mismo concepto muestra 42 ton el lunes y 38 el martes — y eso vuelve la cifra **incitable**: no se puede decir a un proveedor "necesito 42 toneladas en la ventana" si la frase caduca al día siguiente, ni comparar entre personas que abren la app en días distintos. El anclaje al corte además usa **el mismo reloj** que el programa, los indicadores, los reportes y las estimaciones; introducir ventanas móviles crearía dos gramáticas temporales en la misma app. Y es lo ortodoxo en Last Planner, donde el lookahead se refresca por ciclo de planeación.

**Alternativa rechazada:** _primera ventana como "resto del corte actual"_ — se propuso para que la ventana más cercana sirviera a reaccionar y no llegara tarde, pero introduce un umbral arbitrario ("¿por qué cambia al quinto día?") y rompe la predictibilidad, que es justo lo que hace valiosa la ventana fija.

**Meta diaria:** `(volumen acumulado del horizonte − ejecutado a hoy) ÷ días restantes hasta esa fecha`. Como cifra única del encabezado corresponde al **horizonte más exigente** (el que impone el ritmo mayor). Es la misma fórmula del _rendimiento requerido_ de la ficha del concepto (ADR-004 E3) aplicada al horizonte en lugar del corte: **un solo helper para ambas superficies**.

**Precisión heredada (ADR-004 E8b):** el volumen programado a cualquier fecha se obtiene con `programadoAFecha`, cuyo contrato exacto ya está fijado — puntos de interpolación = cortes **dentro** de la barra ∪ `{(fecha_inicio − 1 día, 0), (fecha_fin, volumen_total)}`, con P=0 antes del inicio y P=volumen_total desde `fecha_fin`. El lookahead **debe usar esa función tal cual**, no una variante propia: si diverge, los números de la carta contradicen los chips de la sábana en la misma app. Nota relacionada: **E13** corrigió el _rendimiento programado_ a `(valor_fin_tramo − valor_inicio_tramo) / días_del_tramo` — si la carta llegara a mostrar programado vs requerido, esa es la fórmula.

---

### 10. Orden por importe programado dentro del rango

**Decisión:** partidas y conceptos se ordenan por **importe programado dentro del rango seleccionado**, no por importe total del concepto ni por fecha.

**Justificación:** responde "¿dónde está mi dinero en la ventana que estoy planeando?". Ordenar por importe total dejaría que un concepto de $8M que apenas asoma con tres días dentro de la ventana desplace a uno de $1.2M que arranca completo esta semana.

---

### 11. Cero llamadas de red

**Decisión:** la pantalla se computa **íntegramente desde Realm**, incluso con conexión disponible: programa y cortes del bloque `programa` de `avance/base/`; precios unitarios y nombres de partida del árbol de sábana; ejecutado de `AvancesByCatalogResponse`. Ningún worker invalida el programa (ADR-004 D6).

**Dos integraciones obligatorias con la Fase 2 implementada:**

1. **El ejecutado debe respetar la marca de agua (E8).** Los estados "en curso" y "atrasado" del lookahead se calculan contra el ejecutado, y ese valor **no es** el acumulado crudo del snapshot: es el del snapshot más los items de cola que aún no están reflejados (`syncedAt` nulo o posterior a `updatedAt`). `buildSabanaTree` ya recibe `volumenEnCola`; `useLookahead` debe alimentarse de la misma fuente reconciliada, no leer Realm por su cuenta. De lo contrario un concepto recién capturado aparecería "atrasado" en el lookahead y "al día" en la sábana, en la misma sesión.
2. **La fecha viene de `useFechaOperativa()`, nunca de `new Date()`.** Todo el cómputo de horizontes, días faltantes y estado depende de "hoy", y la Fase 2 ya resolvió que esa fecha es estado reactivo (listener de `AppState` + temporizador a medianoche). Dos relojes distintos se contradirían al cruzar la medianoche con la app en segundo plano — el caso real que motivó el hook.

**Transparencia:** badge visible con **versión y fecha de carga** del programa ("Programa v3 · cargado 12 jul") más la invitación a conectarse para verificar si hay versión más reciente. No bloquea ni interrumpe.

**Consecuencia favorable:** el selector de rango (7/15/30) es instantáneo, sin spinners, y la pantalla funciona igual en un sótano sin señal.

---

### 12. Multicatálogo: el lookahead es de obra, el catálogo es una sección

**Decisión:** la pantalla **no tiene selector de catálogo**. Muestra la obra completa, y cuando ésta tiene más de un catálogo con programa vigente, el catálogo aparece como **encabezado de grupo dentro de cada semana**, con su importe programado de ese periodo. Con un solo catálogo, el nivel no se dibuja. El orden por importe (D10) **cruza catálogos**: dentro de una semana compiten todas las partidas por su peso en el rango, sin importar de qué catálogo vengan.

En la vista Gantt aplica el mismo agrupamiento: las líneas resumen de partida se agrupan bajo su encabezado de catálogo.

**Justificación:** lo que arranca la próxima semana **no respeta la frontera del catálogo**. Un selector obliga al usuario a acordarse de revisar los otros catálogos, y lo que no se revisa no se prepara — una pantalla cuyo propósito es anticipar no puede depender de la memoria del usuario. Además el selector añadiría una cuarta fila de controles antes del contenido (pestañas + selector + rangos + badge), y el catálogo pasa de ser un filtro a ser un dato, que es lo que realmente es en esta superficie.

**Diferencia deliberada con la sábana:** ahí el catálogo **sí** es selector, porque la sábana es la vista contractual de un catálogo y su árbol completo no cabe de otra forma. Son dos preguntas distintas: la sábana pregunta "¿cómo va este contrato?"; el lookahead pregunta "¿qué viene en esta obra?".

**Alternativas rechazadas:**

- _Selector bajo las pestañas replicando la mecánica de la sábana:_ patrón conocido y de cero aprendizaje, pero obliga a revisar N veces para saber qué arranca la próxima semana.
- _Selector en el subheader:_ mismo problema de fondo, y desaloja el nombre de obra y el % global que dan contexto.
- _Chip de filtro junto a los rangos:_ buen complemento futuro para acotar en obras grandes, pero como mecanismo principal obliga a etiquetar el catálogo por fila y a abreviar nombres, compitiendo con el nombre de la partida.

**Pendiente de detalle (no bloqueante):** el comportamiento fino del agrupamiento —si los catálogos se pliegan, qué resumen muestran cerrados, y qué porcentaje acompaña a ese resumen— queda para una iteración posterior. La estructura de datos y el criterio de alcance (obra completa) no cambian con esa decisión.

---

### 13. Piso tipográfico escalonado por función

**Decisión:** la carta contextual —y por extensión cualquier componente denso de esta pantalla— usa **dos pisos tipográficos según la función del texto**, no uno solo:

| Función                  | Piso       | Ejemplos                                                                                                 |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------- |
| **Texto que se lee**     | **11 px**  | valores de programa, fechas, frase contextual, aviso al pie, enlaces y targets táctiles, celdas de tabla |
| **Etiqueta de posición** | **9.5 px** | versalitas INICIA / TERMINA / DURACIÓN / META, encabezados de columna                                    |

**Precisión sobre la tabla:** la primera columna se compone a **11 px completa** — fecha y días **del mismo tamaño** ("Al 20 ago · 7 días"), sin jerarquía interna, porque juntos forman una sola etiqueta temporal. Las columnas numéricas (volumen, importe, %) quedan en 12.5 px: son el dato que se lee repetidamente.

**Justificación:** el piso único de 11 px que estableció la Fase 2 en `escala.ts` es correcto para texto, y aplicado a toda la carta la haría crecer ~26% — pero el problema real no es la altura (sigue cabiendo), es que **obliga a abreviar el copy**: "Duración"→"Durac.", "Importe"→"Imp.", "días"→"d", y la meta pierde su unidad. Se gana legibilidad de tipo y se pierde legibilidad de significado. La distinción por función resuelve el conflicto con +11% de altura y **sin abreviar una sola palabra**: las versalitas se leen una vez y después se reconocen por posición, no por lectura; los valores se leen siempre. La diferencia 9.5 vs 12 mantiene además la jerarquía etiqueta/valor, que un piso plano aplana hasta hacer que la sección parezca un formulario.

**Formalización obligatoria:** la regla vive en `escala.ts` como una función aparte —`fsLabel()`, piso 9.5 px, documentada como _"versalitas de etiqueta, nunca texto de lectura"_— **no aplicada con tamaños literales en el componente**. Sin esa formalización, el próximo componente denso volverá a decidirlo por su cuenta y el sistema se fragmenta otra vez, que es el problema que `escala.ts` vino a resolver.

**Alternativa rechazada:** _piso plano de 11 px en todo_ — descrita arriba; su costo real es el copy abreviado, no el espacio.

---

## Guía de implementación

| Pieza                 | Ruta                                                           | Nota                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LookaheadScreen`     | `src/modules/avance/screens/LookaheadScreen.tsx`               | Segmented control + rango + badge                                                                                                                                                                 |
| `LookaheadLista`      | `src/modules/avance/components/LookaheadLista.tsx`             | `SectionList` semana › partida › concepto                                                                                                                                                         |
| `LookaheadGantt`      | `src/modules/avance/components/LookaheadGantt.tsx`             | `View` absolutos; línea de hoy única                                                                                                                                                              |
| `LookaheadCard`       | `src/modules/avance/components/LookaheadCard.tsx`              | Cuatro estados (D8)                                                                                                                                                                               |
| `useLookahead(rango)` | `src/modules/avance/hooks/useLookahead.ts`                     | Estructura común a ambas vistas                                                                                                                                                                   |
| Cálculos              | **`programaCalculos.ts`**                                      | Módulo puro de la Fase 2 (`programadoAFecha`, `estadoPrograma`, `programaNoIniciado`, `programaVencido`). Ahí van los helpers nuevos del lookahead — no en `sabanaTreeBuilder`, que arma el árbol |
| Fechas de calendario  | `diaCivil` (algoritmo de Howard Hinnant)                       | Comparaciones y diferencias en días por contador civil, no por `Date`                                                                                                                             |
| Formato de fechas     | `fechaPrograma.ts` (`fechaCorta`, `fechaConDia`, `fechaLarga`) | "Al 20 ago", "mié 13 ago"                                                                                                                                                                         |
| Chips                 | `ChipPrograma.tsx`                                             | Precedencia de negocio ya resuelta (E10/E11/E14)                                                                                                                                                  |
| Colores               | `coloresAvance.ts`                                             | Fuente única tras el retiro del semáforo (E14)                                                                                                                                                    |
| Tipografía y espacio  | `escala.ts` (`sp`, `fs`, `lh`) + **`fsLabel()` nueva**         | Piso 11 px para texto, 9.5 px para versalitas de etiqueta (D13)                                                                                                                                   |
| Entrada A             | `HoyResumenHeader.tsx`                                         | Fila condicionada a existencia de programa                                                                                                                                                        |
| Entrada B             | header de `SabanaScreen`                                       | Ícono junto a `QueueHeaderButton`; título → "Sábana"                                                                                                                                              |
| Ruta                  | `SabanaNavigator`                                              | `Lookahead` con `rango` opcional por params                                                                                                                                                       |

**Patrones obligatorios heredados:** decimales como `string` en Realm convertidos con `parseNum`; `Array.from()` sobre listas de Realm; objetos Realm nunca en estado React (`toJSON()` — `useSabanaData` ya lo hace sobre `catalog.programa`); componentes de fila memoizados con datos precomputados en el hook; fechas de calendario por `diaCivil` y formato por `fechaPrograma.ts`.

**Gramática de fila vigente (ADR-004 E9):** el "+" por fila **fue retirado** de la sábana — tocar la fila abre la ficha y la captura vive en su CTA. El lookahead hereda el criterio: **una fila, un destino**. En Lista, tocar un concepto abre su ficha; en Gantt, abre la carta contextual. Ninguna fila lleva botón de acción secundario.

**Telemetría:**

| Evento                     | Propiedades                                    |
| -------------------------- | ---------------------------------------------- |
| `lookahead_opened`         | `obra_id`, `origen` (`franja_hoy` \| `header`) |
| `lookahead_vista_cambiada` | `vista` (`lista` \| `gantt`)                   |
| `lookahead_rango_cambiado` | `dias` (7 \| 15 \| 30)                         |
| `lookahead_card_opened`    | `tipo` (`concepto` \| `partida`), `estado`     |

El `origen` de `lookahead_opened` mide directamente cuál de los dos accesos funciona — insumo para retirar el que no se use.

---

## Consecuencias

| Área               | Impacto                                                |
| ------------------ | ------------------------------------------------------ |
| Backend            | **Ninguno** — consume lo definido en ADR-004           |
| Realm              | Sin cambios de esquema                                 |
| Dependencias       | Ninguna nueva; el Gantt no requiere `react-native-svg` |
| `HoyResumenHeader` | Una fila condicional más                               |
| `SabanaScreen`     | Título acortado a "Sábana"; ícono nuevo en header      |
| Componentes nuevos | 4 + 1 hook                                             |
| Offline            | Sin rutas de red nuevas                                |

---

## Deuda técnica y pendientes

1. **Multicatálogo — resuelto en D12** (obra completa, catálogo como sección). Queda pendiente el **detalle de presentación del agrupamiento** —plegado, resumen del catálogo cerrado y qué porcentaje lo acompaña—, que no bloquea la implementación: el alcance de la consulta de `useLookahead` ya está definido.
2. **Vista personalizada de rango:** descartada del MVP (date picker dentro de una carta = cuarto nivel de interacción); puede volver como cuarta fila de la tabla sin alterar el layout.
3. **Umbral de "carga atípica"** para anomalías: no aplica aquí, pero el helper de meta diaria se comparte con la captura (ADR-003 D13.3).
4. **Línea resumen de partida con huecos:** dibuja continuo entre `min(inicio)` y `max(fin)`; segmentar por hijos queda como evolución si el piloto lo pide.
5. **Retiro del acceso menos usado:** con `lookahead_opened.origen` medido, evaluar quitar la fila o el ícono a los dos meses de piloto.

6. **Conflicto tipográfico — resuelto en D13** (piso escalonado 11 / 9.5 px). Queda como tarea concreta **agregar `fsLabel()` a `escala.ts`** antes de componer la carta; implementarla con tamaños literales reabriría la fragmentación que ese módulo vino a cerrar.

7. **Partida sin conceptos hijos (deuda #16 del ADR-004).** El importe de partida se deriva sumando conceptos; una partida programada a precio alzado **sin conceptos hijos** valoriza a cero y quedaría invisible en el orden por importe del lookahead — o peor, aparecería al final como si no importara. El lookahead hereda la deuda; si el caso llega, el orden necesita un criterio alterno para esas filas.

8. **Tests del lookahead junto a `programaCalculos`.** Los helpers nuevos (agrupación semana › partida, ventanas ancladas al corte, meta diaria por horizonte) son **puros** y comparten módulo con `programadoAFecha`, que la Fase 2 dejó señalado como el candidato más claro al primer test del frontend, con espejo en `programa/test_reparto.py`. Conviene que nazcan con test en vez de sumarse a la deuda existente.

9. **`page_size=100` en avances (heredada).** El ejecutado que alimenta los estados "en curso" y "atrasado" del lookahead sale de la misma lista truncada; con catálogos grandes, un concepto podría mostrarse atrasado por falta de datos, no por falta de obra.

---

## Referencias cruzadas con la Fase 2 implementada

Puntos donde este ADR **consume** decisiones ya construidas (`docs/sabana-home-fase2-programa.md`, 2026-08-12):

| Pieza de Fase 2                                       | Uso en el lookahead                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `programaCalculos.programadoAFecha` (E8b)             | Volumen programado a cada horizonte; contrato idéntico al backend |
| `programaCalculos.estadoPrograma` / `programaVencido` | Estados de la carta y de las filas de Lista                       |
| `DatosPrograma.noIniciado` (E10)                      | Chip "Inicia en N días", **ortogonal** al estado                  |
| `ChipPrograma.tsx` (E10/E11/E14)                      | Composición y precedencia de chips                                |
| Marca de agua `syncedAt` / `updatedAt` (E8)           | Ejecutado reconciliado con la cola                                |
| `useFechaOperativa()`                                 | "Hoy" reactivo para horizontes y días faltantes                   |
| `diaCivil`, `fechaPrograma.ts`                        | Aritmética y formato de fechas de calendario                      |
| `coloresAvance.ts` (E14)                              | Colores sin semáforo de contrato                                  |
| Bloque `programa` en `avance/base/` (D6) + Realm v12  | Fuente única, sin esquema nuevo                                   |
| Gramática de fila sin "+" (E9)                        | Una fila, un destino                                              |

Y donde este ADR **no depende** de lo que quedó pendiente: el lookahead **no usa `CurvaChart` ni `FichaObraSheet`** (ambos sin construir por E17), por lo que puede implementarse sin resolver antes esa revisión de producto ni el endpoint de curva de obra.

---

## Ver también

- `docs/adr/ADR-004-sabana-home-fase2-programa.md` — modelo de programa, indicadores, D11 (ausencia de dato), E6 (alcance del lookahead), E8–E18 (enmiendas de implementación)
- `docs/sabana-home-fase2-programa.md` — **implementación real de la Fase 2**: módulos, patrones y deuda que este ADR hereda
- `ADR-003-programa-contractual.md` (repo backend) — `ProgramaConcepto` con fechas exactas, `ProgramaCorte`, distribución vía `avance/base/`
- `docs/ux/ux-spec-01.html` — UX-SPEC-01 Rev I, lámina L-01e
- ADR futuro Fase 3 — tab Semana / Last Planner; el lookahead es su antecedente directo y deberá alinearse con el plan semanal cuando exista
