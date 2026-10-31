# ADR-006: Reporte de Actividades Diario — Selección de proveedores, wizard de captura y zona de consulta

**Estado:** Implementado — captura completa verificada en dispositivo, incluido el flujo offline. Las decisiones que cambiaron al implementar están en **Enmiendas**; donde una enmienda dice *corrige*, el texto de esa decisión ya no describe el sistema.
**Fecha:** 2026-08-31
**Autores:** Sergio Cota (producto/desarrollo), sesión de diseño UX/arquitectura asistida
**Referencia visual:** `docs/ux/ux-spec-02.html` (UX-SPEC-02 FINAL — flujo completo, P-00, pasos 1–4, zona de reportes, geometría del documento). Archivos de trabajo del diseño iterativo: `ux-spec-02b`–`02h` (histórico; el spec final los sustituye como referencia de construcción).
**Repositorio:** sentinel-frontend-prod. Los cambios de backend son alcance del **ADR-004 del repo backend** (`ADR-004-reporte-de-actividades.md`); aquí se listan como dependencias.
**Precedentes:** ADR-003 (Fase 1) — la tab Reportes de primer nivel que este ADR llena nace ahí (Decisión 1). ADR-005 — patrones de módulo y `escala.ts`.

**Alcance.** Este ADR cubre exclusivamente el reporte de actividades diario: la pantalla de selección de proveedores, el wizard de captura de 4 pasos, el guardado offline-first y la zona de consulta (lista de la obra y detalle de solo lectura con generación de entregables). **No toca** la sábana, el programa contractual, la tab Semana ni el módulo de maquinaria. La tabla de avances (`AdvanceReportScreen` → `excel_service`) queda intacta.

---

## Contexto

El reporte de actividades diario es el formato **UIN-TOP-F-002** que la supervisión entrega al cliente todos los días. Hoy se produce fuera de SENTINEL: el supervisor captura en libreta durante la jornada y por la noche recaptura en el machote de Excel, pegando fotos a mano. Es exactamente el trabajo nocturno que la telemetría de ADR-003 identificó como causa de abandono (hora promedio de captura 17:37), pero con un agravante: aquí el producto final es un documento con formato controlado por el cliente, no una tabla de datos.

Esto lo hace distinto de todo lo que la app genera hoy. La tabla de avances es un reporte **bajo demanda y sin registro**: se pide un rango, se pinta, se descarga, y no queda nada. El reporte de actividades es un **registro compartido**: se captura una vez, queda en el historial de la obra, y cualquier miembro puede consultarlo y regenerar su entregable cuantas veces necesite. Es el primer artefacto de SENTINEL que se comporta como documento y no como consulta.

El tab Reportes existe desde la Fase 1 pero está a medio construir: `ReportSelectionScreen` es una pantalla presentacional con dos cards estáticas —"Tabla de Avances" activa y "Reporte Fotográfico" marcada `available: false` desde su nacimiento— y **ninguna superficie de historial, lista o detalle**. La zona se construyó priorizando velocidad sobre coherencia: usa tokens crudos sin `escala.ts`, y el título del header del stack está hardcodeado a `25/28`, fuera de la escala tipográfica.

**Restricciones:**

- **Un solo desarrollador.** Cada pieza nueva se apoya en un patrón ya probado en producción: la cola offline de avances, el pipeline de fotos por SAS, el transporte de archivos de `reportService`. No se inventan mecanismos.
- **Offline-first no negociable.** La captura completa —actividades, fotos, pies, conclusión— debe funcionar sin señal. La conexión solo hace falta para generar el archivo, que es un acto posterior y voluntario.
- **El formato del documento es del cliente.** El machote define rejilla, tipografías y proporciones de foto. La app se adapta al papel, no al revés: el límite de 50 caracteres del pie de foto no es una decisión de interfaz, es el ancho impreso de 312 pt traducido a la pantalla.
- **Android e iOS en paridad.** Todo comportamiento debe ser idéntico en ambas plataformas; donde el default difiere (teclado, menús contextuales), se resuelve con configuración explícita o componente propio.
- **Cero re-entrenamiento.** El lenguaje visual existente —cards, chips, sheets, tokens— se conserva; el usuario reconoce la app que ya usa.

---

## Decisiones

### 1. La selección de proveedores (P-00) es una pantalla previa, no un paso del wizard

**Decisión:** Tocar la card "Reporte de actividades" abre **P-00 "Define a los contratistas"** antes del wizard. Una sola pantalla con dos grupos apilados:

- **CONTRATISTAS** — todos los `Proveedor` activos de la obra con `tipo=CONTRATISTA`, en filas de selección múltiple. **Ninguna viene preseleccionada.** El **check de selección va a la derecha** de la fila (nombre a la izquierda, círculo de palomita a la derecha); la fila entera es el área tocable.
- **SUPERVISIÓN** — fila fija, no interactiva: **URBA Ingeniería**, con etiqueta "Fija".

Mínimo **1 contratista**; el botón del pie "Comenzar a llenar el reporte" nace apagado con la pista "Selecciona al menos un contratista" y despierta con la primera selección. Contador de seleccionados en la etiqueta de grupo ("2 de 4"). La pantalla reutiliza el armazón del wizard (header navy con ✕, subheader oscuro con obra + fecha de solo lectura) para leerse como el primer cuarto del mismo flujo, no como un trámite aparte.

**Justificación:**

- Los participantes cambian por tramo y por día, así que no pueden derivarse de la obra ni fijarse en configuración: son un dato de captura. Pero tampoco pertenecen al wizard: son el **encuadre** del reporte, no su contenido, y meterlos como quinto paso habría alargado un flujo ya cerrado y validado.
- **Nada preseleccionado** porque marcar a quienes sí participaron es una tarea de recuerdo (el usuario ya sabe la respuesta y solo la registra), mientras que auditar una lista llena buscando ausentes es una tarea de verificación: obliga a leer cada renglón y decidir sobre él, incluidos los que no cambian. Con rosters de cuatro o cinco proveedores, la segunda es más lenta y más propensa a dejar pasar un ausente.
- **El check a la derecha** deja el borde izquierdo libre para que el nombre —la información que el usuario escanea— arranque en la misma vertical en todas las filas.

**Alternativas rechazadas:**

- _Todos preseleccionados_ (propuesta inicial de la sesión de diseño, rechazada por el autor): optimiza el caso "participaron todos", que no es el dominante, y convierte cada reporte en una auditoría de la lista completa.
- _Selección dentro del paso 4 (Revisión):_ pondría un campo de captura en la pantalla que existe para verificar, y obligaría a llegar al final para descubrir que falta un dato del encuadre.
- _Proveedores derivados de la obra sin selección:_ imprimiría participantes que no estuvieron, que es precisamente lo que el documento no puede hacer — es evidencia contractual.
- _Recordar la última selección como preselección:_ buena candidata, pero necesita evidencia de uso real para saber si el roster diario es estable. Queda como deuda #1.

---

### 2. Wizard R-01: lineal, cuatro pasos, fecha de solo lectura

**Decisión:** `Actividades → Fotos → Conclusión → Revisión`, sin ramificaciones ni pasos opcionales. Header navy con ✕ (confirmación nativa si hay trabajo sin guardar). Subheader oscuro con obra + **fecha del reporte de solo lectura**. Stepper de 4 puntos etiquetados (versalitas 9.5, palomita cyan al completar, punto activo navy, línea de progreso). Pie: **el paso 1 muestra "Atrás" —que regresa a P-00 conservando la selección— y "Siguiente →"**; los pasos 2–4 muestran Atrás + Siguiente.

Gramática de color para todo el módulo: **cyan `primary[500]`** = acento del módulo (agregar, progreso, palomitas, chips); **navy** = navegación y zona ejecutiva; **verde** exclusivamente para "Guardar reporte"; **rojo** solo eliminar/alerta; **ámbar** solo avisos bloqueantes.

**Justificación:**

- El documento tiene cuatro bloques fijos y el usuario los llena en ese orden natural. Un formulario de scroll único habría escondido el progreso y dificultado la validación por bloque.
- **La fecha es de solo lectura y equivale al día de captura**: es presión de diseño hacia la captura en campo. Un selector de fecha legitimaría "lo lleno el domingo por los cinco días", que es el hábito que el producto existe para romper.
- El verde reservado a un solo botón en todo el módulo hace que ese botón sea inconfundible; si el verde se usara también para "Siguiente", el gesto de guardar perdería su peso.

**Alternativas rechazadas:**

- _Fecha editable:_ rechazada arriba; se reconsideraría solo con evidencia de un caso legítimo (captura del día siguiente por falla del dispositivo).
- _Pasos opcionales saltables:_ el documento no admite bloques vacíos salvo las fotos, y eso se resuelve permitiendo cero fotos dentro del paso, no saltándolo.

**Enmienda respecto al diseño previo a P-00:** la decisión original establecía que el paso 1 no llevaba "Atrás" —no había nada antes que él—. Con P-00 delante, el Atrás es necesario: sin él, equivocarse en la selección y notarlo en el paso 1 obligaría a llegar hasta Revisión o a descartar todo con ✕.

---

### 3. Paso 1 · Actividades: lista + composición en pantalla propia; el numeral no es dato

**Decisión:** Lista blanca agrupada (numeral gris + texto + chevron; la fila entera edita). La entrada de creación es un **bloque punteado T3**: pastilla cyan con el número que tomará la actividad + "Escribir la primera/siguiente actividad" + ＋. La composición ocurre en pantalla propia con "Guardar" en el header y **"Guardar y escribir la siguiente"** solo al crear (no al editar). Eliminar vive dentro de la composición (rojo, confirmación nativa). Mínimo 1 actividad para avanzar.

**El numeral es posición calculada y nunca se guarda:** se persiste `orden`, y la renumeración tras eliminar o reordenar es silenciosa.

**Justificación:**

- Las actividades reales son párrafos largos (referencias normativas, descripciones de maniobra): un input inline en la lista habría quedado ilegible. Pantalla propia da el espacio que el texto necesita.
- **"Guardar y escribir la siguiente"** ataca el patrón de uso dominante: el supervisor no escribe una actividad, escribe la lista del día de corrido. Sin ese botón, cada actividad cuesta dos toques de navegación extra.
- **El numeral como presentación** evita la clase entera de bugs de numeración duplicada o con huecos tras un borrado. La pastilla del bloque de creación anticipa el número que tomará, que es la señal de continuidad de la lista.

**Alternativas rechazadas:**

- _Edición inline en la fila:_ ver arriba, no cabe el texto real.
- _Guardar el numeral impreso:_ obligaría a renumerar N filas en cada borrado, con riesgo de estados inconsistentes en cola offline.

---

### 4. Paso 2 · Fotos: opcionales, pie obligatorio de 50 caracteres, carrusel de tanda

**Decisión:** Copy: "Agrega tus fotografías con pie de foto. Máximo 6." **0–6 fotos, opcionales; pie obligatorio por foto, tope duro de 50 caracteres** con contador. Lista compacta (miniatura de 62 px + pie + chevron); detalle de foto con imagen grande y "Quitar foto". Sección "AGREGAR FOTOS" con **dos bloques punteados permanentes** [📷 Cámara] [🖼 Galería]; ambos se apagan a las 6 con "máximo alcanzado".

**Carrusel de tanda** (tras elegir N imágenes de golpe): contador + "Descartar esta foto" a la izquierda; **chips numerados tocables** a la derecha (cyan = con pie, gris = sin, anillo navy = actual). Pie ← Anterior / Siguiente foto →; en la última foto, **"＋ Agregar otra"** abre el **menú anclado** (Cámara/Galería, hacia arriba, ancho del botón, punta de conexión, muestra el cupo restante cuando quedan ≤2; el teclado se oculta antes de medir). El "Guardar" del header se habilita solo con la tanda completa; si falta un pie, franja ámbar "Falta el pie de la foto N · Ir ›". **Nada se descarta automáticamente por falta de pie**; ✕ confirma descartar la tanda entera.

**Justificación:**

- **El tope de 50 caracteres viene del papel, no de la interfaz:** es el ancho impreso de 312 pt medido con Carlito (Decisión 7 del ADR-004 backend). Un pie más largo se cortaría o desbordaría el bloque de foto. El tope duro con contador es honesto: el usuario ve el límite mientras escribe, en vez de descubrir el corte en el PDF.
- **El pie es obligatorio** porque una foto sin descripción no es evidencia; el cliente la recibe sin saber qué está viendo. Pero **la foto nunca se descarta** por eso: descartar trabajo del usuario para forzar una regla es desproporcionado, así que el bloqueo vive en el botón de guardar y el aviso lleva directo a la foto que falta.
- **El carrusel existe porque la galería devuelve tandas.** Sin él, elegir seis fotos obligaría a seis viajes a un detalle individual. Los chips tocables convierten la corrección de una foto puntual en un toque.
- **Los dos bloques de origen son permanentes** (no un FAB ni un menú): en campo el usuario alterna entre tomar foto y elegir de galería, y ambos deben estar a un toque sin descubrimiento.

**Alternativas rechazadas:**

- _Pie opcional:_ produce entregables donde la evidencia no dice nada.
- _Descartar automáticamente fotos sin pie al salir:_ destruye trabajo del usuario por una regla de formato.
- _Menú contextual nativo para el origen:_ iOS y Android lo dibujan distinto y se perdería el ancho-del-botón y la punta de conexión; de ahí el componente propio (Decisión 10.5).
- _Más de 6 fotos:_ el machote define la rejilla de evidencia; más fotos requerirían decidir paginación de anexos, fuera de alcance.

---

### 5. Paso 3 · Conclusión: el paso es el campo

**Decisión:** Sin subpantalla, **sin límite de caracteres**, obligatoria. Campo auto-expandible con tope de ~6 renglones y scroll interno (patrón WhatsApp). **El teclado cubre el pie de navegación** en lugar de empujarlo hacia arriba.

**Justificación:**

- La conclusión es un texto único: darle una pantalla propia con navegación de entrada y salida sería ceremonia sin contenido.
- **Sin límite** porque, a diferencia del pie de foto, la conclusión fluye en el documento con el motor de cursor: crece las filas que necesite sin romper nada (Decisión 7 del ADR-004 backend).
- **El teclado cubriendo el pie** mantiene la máxima superficie de texto visible mientras se escribe; empujar el pie hacia arriba robaría dos renglones justo cuando más se necesitan. En iOS es el comportamiento natural; Android requiere `softwareKeyboardLayoutMode: "pan"` en `app.json` (el default `resize` hace exactamente lo contrario).

**Alternativas rechazadas:**

- _Conclusión opcional:_ el documento la exige; un entregable sin conclusión no cierra el día.
- _Plantillas o texto sugerido:_ sembraría lenguaje genérico en un documento que es declaración de la supervisión.

---

### 6. Paso 4 · Revisión: "Documento en Miniatura", un componente con dos modos

**Decisión:** La revisión dibuja el documento **como se imprimirá**: cajetín con el roster de **PARTICIPANTES**, ACTIVIDADES SUPERVISADAS, CONCLUSIÓN y rejilla de EVIDENCIA. El ✎ por bloque (y las filas tocables como atajo) salta al editor correspondiente y **regresa directo a Revisión**, sin recorrer pasos; el ✎ de PARTICIPANTES abre la propia P-00 y regresa igual. **⇅ Ordenar** entra a un **modo** con asas ≡ y botón "Listo": el único lugar donde se reordenan fotos, y el pie viaja con su foto.

El mismo componente alimenta el detalle de solo lectura de la zona de consulta (Decisión 8) con las affordances de edición retiradas: **un componente, `mode: "edit" | "read"`**.

**Justificación:**

- Revisar una lista de campos no es revisar un documento. Mostrar la forma final permite detectar lo que realmente falla en el entregable: un pie que no corresponde, una actividad fuera de orden, evidencia incompleta.
- **El regreso directo a Revisión** respeta el modelo mental de la corrección: quien viene a verificar quiere arreglar y volver a verificar, no reiniciar el recorrido.
- **Reordenar como modo y no como gesto siempre activo** evita arrastres accidentales durante la lectura, que en una pantalla de verificación serían especialmente costosos.
- **Un componente con dos modos** garantiza que lo que el autor revisó y lo que la obra consulta sean literalmente la misma pieza; dos componentes derivarían con el tiempo.

**Alternativas rechazadas:**

- _Resumen en forma de lista de campos:_ más fácil de construir, pero no permite juzgar el entregable.
- _Reordenar con drag siempre activo:_ arrastres accidentales en una pantalla de lectura.
- _Componente de detalle independiente:_ duplicaría el mantenimiento de la pieza más visible del módulo.

---

### 7. Guardado: verde, modal de finalidad, y bifurcación por señal

**Decisión:** "**Guardar reporte**" (verde) abre un modal de confirmación cuyo copy declara la finalidad: el reporte no es editable en la app después de guardarse, y "El Excel se genera después de guardar". Al confirmar, el resultado bifurca:

- **Con señal:** "Guardado y enviado" + primaria "Generar Excel".
- **Sin señal:** "Guardado en el teléfono" + chip "Por enviar" + "Ir a mis reportes".

La persistencia replica la cola de avances: `PendingReporteSubmission` (Realm, `client_id` UUID, estados pending/syncing/done/failed) y `PendingReportePhotoSubmission` ligada por `reporteLocalId` (estados pending → waiting → syncing → uploaded → done). Un worker dedicado sigue la forma de `useAdvanceSyncWorker`/`PhotoSyncWorker`: POST del reporte (idempotente por `client_id` en el body) → cierre atómico en Realm → SAS por foto → `uploadToAzureBlob()` → confirmación. El borrador local muere al 201; **los reportes encolados existen solo en el dispositivo de su autor** hasta que el servidor los tiene.

**Justificación:**

- **El modal está justificado por la finalidad, no por cortesía.** Es la única confirmación del módulo, y existe porque después de guardar no hay vuelta atrás dentro de la app. Si algún día se implementa edición post-guardado, **el modal se retira** — queda escrito para que nadie lo conserve por inercia.
- **La bifurcación es información, no decoración:** el usuario necesita saber si su reporte ya está donde los demás lo verán o si sigue esperando señal. Ocultarlo produciría la peor falla posible: creer que se entregó algo que sigue en el teléfono.
- **Reutilizar la cola de avances** en lugar de escribir una propia mantiene un solo modelo mental de sincronización en toda la app, y hereda el trabajo ya hecho de atomicidad y recuperación de crash.

**Alternativas rechazadas:**

- _Guardar sin modal:_ el carácter irreversible lo amerita; es la excepción, no la regla del módulo.
- _Generar el Excel en el dispositivo:_ sería un tercer pintor del formato (además de Excel y PDF de servidor) que habría que mantener en paridad; ver Decisión 1 del ADR-004 backend.
- _Cola propia con mecánica distinta:_ dos modelos de sincronización en la misma app, para un solo desarrollador.

---

### 8. Zona de Reportes: CREAR arriba, REPORTES DE LA OBRA abajo, detalle de solo lectura

**Decisión:** `ReportSelectionScreen` se reconstruye en dos secciones nombradas:

- **CREAR** — card "Reporte de actividades" (que **toma el lugar de "Reporte Fotográfico"**) y "Tabla de avances" (flujo existente intacto, con tile de tinte navy para distinguir el reporte con registro del reporte bajo demanda).
- **REPORTES DE LA OBRA** — la lista de consulta: fusión de la **cola local del autor** ("Por enviar", arriba) con la **lista del servidor** (React Query, pull-to-refresh). Fila: "Actividades · {ddd dd mmm}", autor, conteos, chip de estado, chevron. Estado vacío contemplado. La info card de compartir se muda al detalle.

**Detalle** = Documento en Miniatura en modo lectura; el subheader oscuro encabeza con "Reportado por" + fecha/hora y la obra debajo. Acciones **"Generar Excel"** (navy sólido, primaria) y **"Generar PDF"** (navy contorno), **repetibles y para todos los miembros de la obra**. Flujo por toque: spinner en el botón → `GET /archivo` → escritura a caché → `Sharing.shareAsync`, el patrón exacto de transporte de `reportService`. En estado "Por enviar": botones apagados + franja ámbar con la razón; si el servidor responde 409 (fotos aún subiéndose), se muestra la misma explicación ámbar.

**Los reportes de terceros no se cachean en Realm**: el caché persistido de React Query es suficiente.

**Justificación:**

- Si el producto promete que toda la obra puede consultar el reporte, tiene que existir el lugar donde consultarlo: la lista es la contraparte obligatoria de esa promesa, no un extra.
- **"Reporte de actividades" sustituye a "Reporte Fotográfico"** porque cumple mejor esa promesa: no es un álbum de fotos, es un entregable con su evidencia dentro. Mantener ambas cards ofrecería dos caminos para lo mismo.
- **Navy y no verde en los botones de generar:** generar recupera un archivo de un registro que ya existe; no es captura. El verde sigue significando "estás creando algo" en todo el módulo.
- **Sin Realm para reportes ajenos:** el detalle es JSON de unos KB y las fotos son thumbnails por SAS; meter el historial completo de la obra a Realm implicaría esquema y sincronización nuevos para cubrir un caso —consultar reportes ajenos sin señal, sin haber abierto nunca la app con señal— que hoy no justifica el costo. Es aditivo si el campo lo pide (deuda #2).

**Alternativas rechazadas:**

- _Lista solo de reportes propios:_ contradice el requisito de consulta universal.
- _Generar solo para el autor:_ el entregable lo necesita quien lo va a enviar al cliente, que no siempre es quien capturó.
- _Filtros y búsqueda desde el MVP:_ sin volumen que los justifique; la lista descendente por fecha basta (deuda #3).

---

### 9. Pipeline de fotos: se reutilizan las constantes existentes del cliente

**Decisión:** Las fotos se suben **redimensionadas a 1920 px de lado largo, JPEG q85** — las mismas constantes que el módulo de avances ya aplica. Adicionalmente, las capturas de cámara vía `expo-image-picker` se guardan en la galería del dispositivo con `expo-media-library`.

**Justificación:**

- Un solo pipeline de redimensión en la app; inventar una constante distinta para este módulo habría creado dos comportamientos que mantener.
- La calidad origen **nunca ha llegado al Blob** (el módulo de avances ya redimensiona antes de subir), así que esto no introduce una pérdida nueva. Para el caso de uso real de compartir por WhatsApp, la app recomprime por debajo de este tamaño de todos modos.
- **Guardar a galería** cubre el escenario "quiero mi foto original" a costo de red cero: `expo-image-picker` no la guarda por default, y el usuario asume que sí.

**Alternativas rechazadas:**

- _Subir además el original al servidor:_ duplica el upload en red de obra por un caso (peritaje, zoom legal) que no ha aparecido; se reconsidera si aparece.
- _Constante propia del módulo (1600 px):_ ganancia marginal a cambio de dos pipelines.

---

### 10. Estandarización de la zona (deuda que se paga con este módulo)

**Decisión:** Se corrige, en la misma pasada de implementación:

1. Título del header del stack: `25/28` hardcodeado → `fontSize["2xl"]` (24) vía `fs()`; verificar los navigators hermanos para que la corrección quede pareja.
2. Toda pantalla nueva usa `escala.ts` (`fs()/sp()/lh()`) desde el primer archivo; los estilos de tokens crudos de `ReportSelectionScreen` migran durante la reconstrucción.
3. Etiquetas de sección siguiendo el patrón de la sábana (xs, semibold, uppercase, letterSpacing); muere "Categorías disponibles".
4. El borde izquierdo de 4 px permanece **reservado** a las cards de `AdvanceListScreen`; las filas de reportes no lo usan.
5. El menú anclado se entrega como **componente propio** (`Modal` transparente + `measureInWindow`), nunca menús contextuales nativos.
6. Android: `includeFontPadding: false` + `textAlignVertical` donde haya centrado vertical (patrón existente de los chips de filtro).
7. Sombras solo vía `DesignTokens.shadows.*` (empareja `shadowOpacity` de iOS con `elevation` de Android).
8. Drag del modo ordenar con `react-native-gesture-handler` (ya es dependencia por navegación).
9. Safe areas: pie de botones y barra de tabs respetan insets inferiores; heredado de la navegación actual.

**Justificación:** la zona se construyó priorizando velocidad, y el módulo nuevo la duplica en superficie. Pagar la estandarización ahora cuesta minutos dentro de una reconstrucción que ya va a ocurrir; hacerlo después significa tocar dos veces los mismos archivos. Los puntos 5 y 6 no son cosmética: son las dos fuentes conocidas de divergencia visible entre plataformas.

**Alternativa rechazada:** _diferir la estandarización a un PR de limpieza posterior_ — históricamente ese PR no llega, y mientras tanto el módulo nuevo hereda y multiplica el problema.

---

## Inventario de infraestructura

### Se reutiliza tal cual

| Pieza                                  | Ubicación                                                                           | Uso en este módulo                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Motor de cola offline (Realm, atómico) | `usePendingAdvanceQueue`, `useAdvanceSyncWorker`                                    | Patrón replicado para reportes y sus fotos (D7)       |
| Cola de fotos y sus estados            | `PendingPhotoSubmission`, `usePendingPhotoQueue`                                    | Espejo `PendingReportePhotoSubmission` (D7)           |
| Subida directa a Blob                  | `uploadToAzureBlob()` (`photoService.ts`)                                           | Sin cambios; solo cambia el endpoint que emite el SAS |
| Captura y selección de imágenes        | `usePhotoCapture`                                                                   | Paso 2 (D4)                                           |
| Transporte de archivos generados       | `reportService.ts` (arraybuffer → base64 → `cacheDirectory` → `Sharing.shareAsync`) | Botones Generar del detalle (D8)                      |
| Tokens y sombras                       | `DesignTokens`                                                                      | Todo el módulo (D10.7)                                |
| Escala tipográfica                     | `escala.ts` (`fs()/sp()/lh()`)                                                      | Todo el módulo (D10.2)                                |
| Badge de cola en header                | `QueueHeaderButton`                                                                 | Header de la zona de reportes (D8)                    |
| Gestos                                 | `react-native-gesture-handler`                                                      | Modo ordenar (D6, D10.8)                              |

### Se adapta

| Pieza                                    | Cambio                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReportSelectionScreen`                  | Reconstruida: secciones CREAR + REPORTES DE LA OBRA; card de actividades sustituye a "Reporte Fotográfico"; migración a `escala.ts` (D8, D10) |
| `ReportesNavigator`                      | Gana rutas: P-00, wizard (stack modal), detalle de reporte                                                                                    |
| Header del stack de Reportes             | `fontSize["2xl"]` vía `fs()` (D10.1)                                                                                                          |
| `app.json`                               | `softwareKeyboardLayoutMode: "pan"` en Android (D5)                                                                                           |
| `AdvanceReportScreen` / tabla de avances | **Sin cambios** — se documenta explícitamente para que nadie la toque                                                                         |

### Se crea

| Componente                                                  | Patrón base                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `ProviderSelectionScreen` (P-00)                            | Armazón del wizard + filas de selección múltiple                    |
| `ReporteWizardNavigator` (stack modal)                      | Patrones de stack existentes                                        |
| `ActividadesStep` + `ActividadComposeScreen`                | Pantalla de composición sobre patrones de formulario existentes     |
| `FotosStep` + `FotoBatchCarousel`                           | `usePhotoCapture` + lista compacta                                  |
| `AnchoredMenu`                                              | Componente propio: `Modal` transparente + `measureInWindow` (D10.5) |
| `ConclusionStep`                                            | Input auto-expandible                                               |
| `DocumentoMiniatura` (`mode: edit \| read`)                 | Nuevo — compartido por paso 4 y detalle (D6)                        |
| `ReporteDetailScreen`                                       | `DocumentoMiniatura` en modo lectura + acciones de generación       |
| `PendingReporteSubmission`, `PendingReportePhotoSubmission` | Espejo de las clases Realm de avances                               |
| `useReporteSubmitToQueue`, `useReporteSyncWorker`           | Espejo de los hooks/worker de avances                               |
| `reporteService.ts`                                         | Patrón de `reportService.ts` + endpoints nuevos                     |

---

## Dependencias de backend

Este ADR no implementa backend. Lo siguiente debe existir para que el módulo funcione completo; el alcance y las decisiones viven en **`ADR-004-reporte-de-actividades.md`** del repo backend:

1. **Modelos** `ReporteActividades`, `ActividadReporte`, `FotoReporte`, `ReporteProveedor` y `Proveedor` (Decisión 2 backend) — incluida la idempotencia por `client_id` en el body, que D7 asume.
2. **Supervisión hardcodeada** "URBA Ingeniería" escrita en el POST (Decisión 3 backend) — D1 la muestra fija confiando en eso.
3. **Endpoints gemelos de fotos** (SAS + confirmación) con el segmento `rep{reporte_id}` en el nombre del blob (Decisiones 4 y 5 backend) — D7 y D9 dependen de ellos.
4. **Endpoints de lista y detalle** con URLs de thumbnails por SAS de lectura (Decisión 6 backend) — sin ellos, D8 no puede pintar la lista ni las miniaturas del detalle.
5. **Endpoint de archivo** `?formato=xlsx|pdf` que pinta bajo demanda (Decisiones 1 y 7 backend) — es lo que los botones Generar de D8 consumen.
6. **Política 409** cuando hay fotos declaradas sin subir (Decisión 8 backend) — D8 la traduce a la franja ámbar.
7. **Permisos** `IsAuthenticated` + membresía de obra en toda la superficie nueva (Decisión 6 backend).

---

## Métricas de éxito (instrumentación de este módulo)

El módulo existe para eliminar la recaptura nocturna del machote. Su evaluación usa la telemetría existente más estos eventos nuevos:

| Evento nuevo                         | Dónde                              | Propiedades                                                                        |
| ------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------- |
| `reporte_actividades_started`        | Mount de `ProviderSelectionScreen` | `obra_id`                                                                          |
| `reporte_actividades_step_completed` | Al avanzar de paso                 | `obra_id`, `step` (1–4)                                                            |
| `reporte_actividades_saved`          | Confirmación del modal (D7)        | `obra_id`, `actividades_count`, `fotos_count`, `contratistas_count`, `was_offline` |
| `reporte_archivo_generated`          | Toque exitoso de Generar (D8)      | `obra_id`, `reporte_id`, `formato`, `es_autor`                                     |
| `reporte_detail_opened`              | Mount de `ReporteDetailScreen`     | `obra_id`, `es_autor`                                                              |

Indicadores a observar:

- **Hora de captura del reporte** — el indicador central: si sigue concentrada después de las 18:00, el reporte se está llenando de noche como el machote y el problema no se movió.
- **Abandono por paso** (join `started` ↔ `step_completed` ↔ `saved`): dónde se cae el flujo. El paso 2 es el sospechoso natural por el costo de los pies de foto.
- **Proporción de generaciones por no-autores** (`es_autor: false`): mide si la consulta universal se usa de verdad o si el entregable sigue circulando por WhatsApp desde un solo teléfono.
- **Reportes guardados offline** (`was_offline: true`): valida que la captura en campo ocurre sin señal, que es la premisa del diseño.

---

## Consecuencias

| Área             | Impacto                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Zona Reportes    | Deja de ser presentacional: gana lista, detalle y wizard; se estandariza a `escala.ts`                      |
| Navegación       | `ReportesNavigator` gana P-00, stack modal del wizard y detalle                                             |
| Realm            | Bump **aditivo**: dos clases nuevas (reporte + fotos de reporte); el motor de cola de avances queda intacto |
| React Query      | Dos queries nuevas (lista y detalle por obra) con caché persistido; sin invalidación cruzada con avances    |
| Fotos            | Mismo pipeline y constantes; se agrega guardado a galería en capturas de cámara                             |
| Backend          | 7 dependencias (ver §Dependencias de backend); sin ellas el módulo captura pero no entrega                  |
| Telemetría       | 5 eventos nuevos                                                                                            |
| `app.json`       | `softwareKeyboardLayoutMode: "pan"` — cambio de configuración nativa, requiere rebuild                      |
| Dependencias     | `expo-media-library` si no está presente (módulo nativo → coordinar con el rebuild anterior)                |
| Usuario          | Cero re-entrenamiento en lenguaje visual; flujo nuevo pero con componentes reconocibles                     |
| Tabla de avances | **Cero cambios** — flujo y servicio intactos                                                                |

---

## Enmiendas (2026-10-12, al cerrar la implementación)

Decisiones tomadas al bajar el ADR a código. Sustituyen o precisan lo indicado en cada caso. Donde una enmienda dice **corrige**, el texto original de la decisión citada **ya no describe el sistema**. La contraparte de backend está en las enmiendas B1–B33 del ADR-004.

### Arquitectura de la captura

- **F1 — El wizard es UNA pantalla con máquina de estados interna, no un stack de rutas (corrige §2).** Lo obliga §6: el ✎ de cada bloque de Revisión debe regresar **directo a Revisión**. Con un stack habría que reescribir la pila en cada salto para que el "atrás" del sistema no devolviera al paso 2 a quien venía del 4. Hacia afuera sigue siendo una ruta modal única, con **`gestureEnabled: false`**: el gesto de arrastrar hacia abajo descartaría la captura sin pasar por la confirmación del ✕.

- **F2 — El borrador vive en memoria (React context + `useReducer`), no en Realm.** La cola es para lo declarado terminado; un borrador a medias tiene otro ciclo de vida y meterlo ahí obligaría a decidir cuándo se limpia uno abandonado. **Precio aceptado y hoy revisado — ver deuda técnica #1:** si Android mata la app con el wizard abierto, la captura se pierde.

- **F3 — `fechaReporte` se congela al abrir el wizard** y deliberadamente **no** usa `useFechaOperativa`. Ese hook existe para que el programado avance con el reloj; aquí el efecto sería el contrario — empezar a las 23:58 y guardar a las 00:02 cambiaría la fecha debajo del usuario, sobre un campo que la interfaz presenta como de solo lectura.

- **F4 — `ReportSelectionScreen` se movió** de `src/modules/avance/screens/` a `src/modules/reportes/screens/`. Vivía en el módulo equivocado desde la Fase 1.

### P-00 y el roster

- **F5 — La supervisión ya no es constante: la elige el usuario (corrige §1).** §1 la describe como "Supervisión hardcodeada, Decisión 3 backend". Se eliminó en dos pasos —primero pasó a salir del roster escrita por el servidor, después a ser seleccionable— y **eran dos constantes espejo**: `SUPERVISION_NOMBRE` en el backend y `SUPERVISION_FIJA` en `src/modules/reportes/constantes.ts`. Quitar solo la del backend habría dejado la app enseñando "URBA INGENIERÍA" en una obra supervisada por alguien más.

  **P-00 bloquea el botón de continuar sin las tres cosas** (contratista, supervisión y área) porque el servidor rechaza las tres con 400. Se bloquea ahí y no al guardar: descubrirlo tras llenar cuatro pasos dejaría el reporte atorado en la cola por un dato que el usuario ya no puede corregir desde el teléfono. El borrador ganó `supervisores: Proveedor[]`, poblado en P-00, para que la Revisión pinte el documento completo sin volver a la red.

- **F6 — P-00 rediseñada (enmienda al UX-SPEC-02 §2 y §6).** Cards → **filas de texto con separador fino**; círculo de palomita → **checkbox cuadrado a la derecha** (la convención: círculo = exclusivo, cuadrado = múltiple, y con dos grupos multi y una elección única en la misma pantalla la distinción carga significado); tres grupos apilados (Contratistas, Supervisión, Área); desaparece la pastilla "Fija". `FlatList` → `ScrollView`, porque con tres grupos una lista sobre un solo arreglo ya no encajaba.

- **F7 — El endpoint del roster cambió de URL.** `GET /api/reportes/proveedores/` → **`GET /api/proveedores/?construction_id=N`**, por la mudanza de app del backend (B2). Respuesta idéntica. En el cliente es `API_CONFIG.endpoints.proveedores.lista`. `getProveedores` **sigue en `reporteService.ts`** porque hoy el reporte es su único consumidor; cuando haya otro se muda a un servicio propio.

- **F8 — El roster sobrevive sin señal, y antes no (corrige §1).** P-00 era una **dependencia de red dura**: sin ella el wizard era inalcanzable. Dos defectos apilados:

  - **La pantalla miraba `isError` ANTES que `data`.** React Query deja `isError` en `true` cuando falla un refetch de fondo, pero `data` conserva lo último traído. La copia estaba en el caché, a un `if` de distancia, y la pantalla la tiraba.
  - **`gcTime` por defecto (5 min).** El caché se persiste en AsyncStorage, pero el recolector borra de memoria toda consulta sin observadores pasado el `gcTime`, y el blob persistido se regraba sin ella. Salir del módulo diez minutos bastaba para quedarse sin copia.

  **Arreglos:** `gcTime: 30 días` (el roster pesa unas filas y su alternativa es no poder capturar), **`networkMode: "offlineFirst"`** (con `online`, React Query ni intenta si su detector cree que no hay red — y ese detector se equivoca justo en redes de obra), `retry: 1`, y la pantalla **prefiere la copia sobre el error**, con un aviso discreto que dice de qué día es. Decir la fecha no es adorno: si el administrador dio de alta un contratista esa mañana, el usuario necesita saber que su lista es de antes para no buscar en vano al que falta.

  **Precalentado:** `ReportSelectionScreen` monta `useProveedores(obraId)` sin usar el resultado. Es la pantalla por la que se pasa obligatoriamente para llegar al wizard y normalmente se visita con señal, así que deja la copia lista.

  **Se quedó en React Query y no se movió a Realm** —el patrón de los cachés grandes de la app— porque `cacheOwner` ya borra el caché persistido al cambiar de identidad. Llevarlo a Realm obligaría a recablear ese borrado, que es la garantía de dispositivo compartido.

  **Límite inherente que queda:** una obra que nunca se abrió con señal no tiene roster que ofrecer. La pantalla lo dice con esas palabras en vez de "no se pudo cargar".

- **F9 — Verificado: el wizard no tiene NINGUNA otra llamada de red.** `useProveedores` en P-00 era la única; del paso 1 en adelante todo es memoria y cola. **El flujo completo de captura funciona sin señal**, confirmado en dispositivo.

### Campos y pasos

- **F10 — El ÁREA es campo del reporte y se captura en P-00.** `TextChoices` espejadas en `src/modules/reportes/constantes.ts` (`AREAS` + `etiquetaDeArea`), sin valor por default. `DocumentoMiniatura` gana el bloque ÁREA con su ✎, que **abre P-00 igual que el de participantes** — los dos datos se capturan en la misma pantalla previa.

- **F11 — El paso 3 ya no bloquea: la conclusión es opcional, y se rotula OBSERVACIONES (corrige §5).** §5 dice "el paso es el campo" y lo trata como obligatorio. Hay jornadas que no la ameritan. La etiqueta dice "opcional" y la miniatura muestra *"Sin conclusión · no se imprimirá esta sección"* **en gris y no en ámbar**: el ámbar es para lo que sí bloquea el guardado, y confundirlos entrena a ignorarlo.

  El renombrado a "Observaciones" es **solo de rótulo**: el campo sigue siendo `conclusion` en el borrador, la cola y la API. Sitios tocados: `ConclusionStep` (rótulo, placeholder y docstring), `DocumentoMiniatura`, `PASOS` del `WizardStepper` ("Concl." → "Observ.") y la descripción de la card. **El archivo no se renombró**, por la misma razón; el desfase entre el nombre interno y el visible quedó escrito en el docstring para que no se lea como descuido.

- **F12 — §9 estaba equivocado sobre las constantes de foto (corrige §9).** Dice que se reescalan a "1920 px, q85 — las mismas constantes que el módulo de avances ya aplica". El cliente real (`usePhotoCapture.optimizeImage`) usaba **1200 px, q70**; los 1920/q85 solo existían en `docs/azure_photo_blob.md` del backend, nunca implementados. Importa porque el bloque de foto se imprime a 4.5": 1200 px ≈ 267 DPI, 1920 ≈ 427.

  **Decisión: parametrizar el ancho** (`anchoMaximo`, con `ANCHO_FOTO_AVANCE = 1200` de default y `ANCHO_FOTO_REPORTE = 1920`). Avances no cambia; sigue habiendo un solo pipeline, que era lo que §9 quería proteger.

- **F13 — El acento del módulo es `primary[500]` (el token), no el cyan `#0891b2` del UX-SPEC.** El ADR nombra el token y el principio de cero re-entrenamiento manda conservar el lenguaje visual existente. Si se quiere el cyan literal del mockup, es un token nuevo.

### Componentes compartidos

- **F14 — `BottomSheetMenu` es HERMANO de `AnchoredMenu`, no una variante suya** — desvío deliberado del render, que pedía "un solo mecanismo, dos presentaciones". `AnchoredMenu` existe para tener el ancho exacto del botón que lo abrió, la punta que lo conecta y apertura hacia arriba; nada de eso aplica a siete opciones que deben caber completas. Parametrizarlo habría costado cuatro condicionales para dos layouts sin una sola medida en común. Lo que se comparte es la **disciplina de overlay** (`Modal` transparente, telón que cierra al tocar fuera, `onRequestClose`), que son diez líneas y no justifican una abstracción.

- **F15 — `OfflineIndicator` subió a `src/components/common/`** (con su archivo de estilos) cuando Reportes lo necesitó. Es un componente puro —solo depende de `useNetworkStatus` y de sus props— y dejarlo en Avances habría obligado a que Reportes importara de otro módulo. Mismo criterio que movió `es_miembro_de_obra` a `obra/permissions.py` en el backend. Consumidores actualizados: `AdvanceListScreen` y `OfflineIndicatorConnected`.

  Reportes lo cablea con `IndicadorSincronizacion`, que toma los conteos de la cola y **`syncNow` del contexto de `SyncWorkerProvider`, NO montando `useReporteSyncWorker`** — eso crearía un segundo worker sobre la misma cola, con dos ciclos pisándose. **Antes de esto Reportes no tenía ningún feedback de estado offline**: el usuario capturaba sin señal sin que nada se lo confirmara.

### Cola, sincronización y estado

- **F16 — Realm 12 → 13 → 14.** 13 agregó `PendingReporteSubmission` y `PendingReportePhotoSubmission`; 14 agregó `area` (default `""`) y `supervisionJson` (default `"[]"`, nombres de la supervisión para pintar la miniatura sin red). Ambas aditivas, ninguna clase existente modificada; la rama de migración va vacía **con comentario**, para que se lea como omisión deliberada y no como olvido.

  Un reporte encolado antes de la 14 queda con `area: ""` y el servidor lo rechaza con 400. **Es correcto**: se capturó bajo un contrato que ya no existe, y el usuario lo ve como fallido con reintento en vez de recibir un documento sin área.

- **F17 — El reporte sincronizado se marca `done`, no se borra (corrige §7).** El ADR dice que "el borrador local muere al 201". Dos razones para cambiarlo: **(a)** el `reporteId` que guarda el `done` es lo ÚNICO que traduce el id local que conoce la interfaz al id de servidor que necesita el endpoint de archivo — sin él, "Generar Excel" justo después de guardar no tiene a qué apuntar; **(b)** borrarlo al sincronizar hacía que la fila desapareciera de la lista y reapareciera con el refetch.

  Se purga después de que la lista lo refleje, igual que el ciclo `done` de las fotos. La fusión de listas **deduplica por `reporteId`**: la copia local se descarta en cuanto el servidor la devuelve, así el número antes y después del refetch es el mismo.

- **F18 — El chip contesta UNA pregunta binaria: ¿ya lo puedo generar?** Estados: **"Por enviar"** (sin señal), **"Enviando"** (con señal) y **"Disponible"**, más los de fallo.

  Arrancó como una observación de campo —el chip decía "Enviado" y al entrar el detalle mostraba "Fotografías en camino"—. La primera versión agregó un estado intermedio "Subiendo N fotos" y **el autor lo rechazó con mejor argumento**: *"No quiere saber si ya casi o si le faltan solo las fotos. Necesita saber sí o no. Si falta subir fotos o falta subir texto, en cualquiera de los dos casos no puede generar reporte."*

  **Vale como criterio general del producto: un estado intermedio que el usuario no puede accionar solo agrega un paso de traducción hacia la misma conclusión.** Lo que importa es que **"Disponible" signifique disponible**. La distinción que sí se conservó es *nada se está intentando* contra *algo está ocurriendo ahora*, porque al usuario en obra le cambia cuándo volver a mirar.

  La fila expone `disponible: boolean` (el veredicto), no `fotosPendientes` (el motivo). Dato desde las dos fuentes: del servidor por `fotos_pendientes` (B29), y de la cola contando fotos con `status !== "done"` por reporte **con un mapa previo**, no filtrando dentro del `map` (evita el cuadrático). `useNetworkStatus` se lee **una vez** en la pantalla y baja por prop a cada chip — llamarlo dentro de la fila serían N suscripciones a NetInfo para el mismo valor.

- **F19 — Rescate de la cola, que no existía.** `retryItem` y `removeFromQueueWithPhotos` estaban escritos y **ninguna pantalla los llamaba**: avances tiene su `PendingSyncScreen`, reportes se quedó sin equivalente. Ahora el detalle de un reporte fallido muestra franja roja con el motivo real (`errorMessage`, que se guardaba y nunca se enseñaba) y dos botones: **Reintentar** y **Descartar**.

  "Reintentar" devuelve el **presupuesto completo** de intentos: que lo pida una persona cambia el significado — sabe algo que el teléfono no, como que el servidor ya se arregló. **No se llama al worker desde la pantalla**; basta con devolver el reporte a `pending` y el worker del provider reacciona al cambio de `pendingCount`.

- **F20 — Reintento con criterio: 4xx contra 5xx.** El worker gastaba los tres intentos ante cualquier error. Un 4xx no se arregla reintentando —el servidor entendió y rechazó— pero un 5xx o un corte sí. Con el 500 del despliegue, los tres intentos se quemaron en siete segundos contra un servidor que minutos después habría funcionado: **una falla pasajera se volvió pérdida permanente**. Se clasifica por `ApiError.status`; 408 y 429 cuentan como transitorios porque significan "vuelve a intentar".

  Un fallo permanente "agota" los intentos **subiendo `retryCount` al tope**, en vez de agregar una bandera al esquema de Realm: *no quedan intentos* es literalmente lo que significa, y evita dos fuentes de verdad que puedan contradecirse.

- **F21 — Dos contadores fuera del módulo se quedaban cortos** y se extendieron: el aviso de cola pendiente al cerrar sesión en `PerfilScreen` (contaba solo avances) y la telemetría `cache_wiped_identity_change` (le faltaba `pending_reportes`). El wipe en sí ya cubría las clases nuevas porque usa `deleteAll()`.

- **F22 — Telemetría del módulo:** `reporte_actividades_started`, `reporte_actividades_step_completed`, `reporte_actividades_queued`, `reporte_actividades_saved`, `reporte_sync_completed`. Faltan `reporte_archivo_generated` y `reporte_detail_opened`.

### Edición

- **F23 — El frontend de edición queda DIFERIDO.** El backend ya acepta PATCH del autor (B23). La idea para cuando toque: reutilizar la sección de Revisión, donde cada bloque ya tiene su ✎ y ya rutea. El camino es cargar un reporte del servidor en el borrador y que la cola distinga alta de edición.

### Bugs de dispositivo y sus causas reales

Se dejan escritos porque las causas son estructurales y se van a repetir.

- **F24 — La foto se quedaba en `waiting` indefinidamente, y NO era la red.** Dos defectos enganchados en `useReporteSyncWorker`: **(a)** el lazo de fotos iteraba el snapshot capturado por el `useCallback`, donde las fotos del reporte recién enviado todavía tenían `fotoRemotaId === null` —el id lo entrega el 201— así que el filtro las excluía y el lazo recorría una lista **vacía**; un comentario afirmaba que se releían de Realm y era falso. **(b)** el `useEffect` que dispara el ciclo se sale si `enCursoRef.current`, y **un ref no provoca render**, así que el disparo perdido no se recuperaba nunca.

  **Arreglo:** `leerTrabajoPendiente()` —lectura fresca de Realm— en los dos lazos, más un `pulso` (estado) que reprograma al cerrar el ciclo **solo si el ciclo avanzó**, para no girar en vacío contra un fallo permanente.

  **Método que lo encontró:** una simulación en Node del ciclo real —refs, deps del efecto, renders de Realm— con red perfecta. Si con red perfecta la foto no sube, no es la red. El bug era invisible leyendo el código porque el comentario decía lo contrario de lo que hacía.

- **F25 — `useNetworkStatus` devolvía `null` y todo lo trataba como "sin red".** `null` significa *todavía no se sabe*, y `!isOnline` lo colapsa con `false`. Se agregó siembra explícita con `NetInfo.fetch()` junto al listener, y el worker de reportes pasó a `isOnline === false`.

  **La asimetría que justifica la decisión:** el costo de intentar sin conexión es una petición que falla y se reintenta; el de no intentar creyendo que no hay red es una cola trabada indefinidamente. Ante la duda, se intenta. Nota: NetInfo resuelve `isInternetReachable` sondeando un host propio, y en red de obra o corporativa puede dar `false` con la API respondiendo bien — por eso se compara contra `false` y no contra `true`.

  **Ver deuda técnica #2:** los workers de avances siguen con `!isOnline`.

- **F26 — Tres bugs de layout con UNA causa: `flex: 1` implica `flexBasis: 0`.** En un contenedor **en columna y de alto automático**, el hijo aporta cero al alto reservado y luego se dibuja con su `minHeight`, desbordando. Afectaba a `BotonWizard.ancho` (P-00 y el modal de guardado) y a `navegarContenedor` del carrusel. Arreglos: `flexGrow: 1` en el botón (base `auto`) y `flexDirection: "row"` en el envoltorio. **`flexible: { flex: 1 }` se conservó**: en pies EN FILA la base 0 es justo lo que reparte el ancho en partes iguales.

- **F27 — `formatUTCForDisplay(iso, "time")` imprimía `17898862237377`.** El segundo argumento es un **patrón de date-fns**, no un nombre de modo: `t` es marca de tiempo en segundos, `i` día ISO, `m` minuto, `e` día local. Corregido a `"HH:mm"`.

- **F28 — Off-by-one en el conteo de reintentos, heredado del código original.** `markAsFailed` incrementa `retryCount` y `item` es un objeto **vivo** de Realm, así que el `item.retryCount + 1 < item.maxRetries` que seguía contaba el intento dos veces: el reporte se detenía en `retryCount = 2` con `maxRetries = 3` y **nunca satisfacía `>= maxRetries`**. El chip decía "Reintentando" para siempre sobre algo que ya no reintentaba nada.

- **F29 — Las actividades que "se borraban" eran un bug de lectura, no de escritura.** El detalle de un reporte en cola pasaba `actividades: []`, `conclusion: ""` y `fotos: []`, con un comentario diciendo que el contenido "vive en la cola serializado" — vivía ahí y **no lo leía**. La miniatura decía "Sin actividades capturadas" mientras el recuento de abajo mostraba "4 actividades · 3 fotos", y el usuario concluía que la app le había borrado el trabajo. Ahora lee `actividadesJson` y `conclusion` de la cola, y las fotos de `PendingReportePhotoSubmission`, que es la que guarda el `localUri`.

- **F30 — El chequeo de red DENTRO de los lazos del worker nunca hizo nada.** `isOnline` es un valor capturado por el closure: no cambia a media vuelta. TypeScript lo delató al acotarlo a `true | null`. Se quitó; queda solo `montadoRef.current`.

- **F31 — La clave del formato es `UIN-RP-F-002`, no `UIN-TOP-F-002` (corrige §1 y todas las menciones).** Confirmada por Sergio el 23-oct-2026; cierra la pregunta abierta 12 del ADR-004 backend, que la tenía pendiente entre `UIN-TOP-F-002` y `UIN-SUP-F-010`. La hipótesis de entonces iba bien encaminada —al volverse el área un campo, el formato dejó de ser el de Topografía— pero el código que quedó no es el de Supervisión sino uno de reporte, sin área.

    `FORMATO_CODIGO` vive en `src/modules/reportes/constantesDocumento.ts` y lo consumen la miniatura del detalle y el paso de revisión. **Se pudo cambiar sin más porque todavía no hay reportes entregados**: el backend compone el folio al leer (`FORMATO_CODIGO` + día + consecutivo de obra), así que la clave vieja no sobrevive en ningún documento en manos de nadie. El día que los haya, el cambio deja de ser gratis.

    `docs/ux/ux-spec-02.html` conserva la clave vieja a propósito: es el registro de un diseño fechado, no documentación viva.

---

## Enmiendas (2026-10-30, después de guardar)

Revisión del tramo final del flujo: lo que pasa desde "Guardar reporte" hasta que el usuario puede generar el archivo. Origen: observación de campo del autor, un video del flujo con señal (30-oct) y dos diagnósticos independientes del código (`main` @6cb9c1d) que llegaron a la misma causa. Referencia visual: `docs/ux/reportes-despues-de-guardar.html` (UX-SPEC-02, Enmienda A).

Donde una enmienda dice **corrige**, el texto original de la decisión citada **ya no describe el sistema**.

### Lo que se observó

Con señal, guardando un reporte con una foto, el video muestra en 15 segundos:

1. Modal **"Guardado y enviado"** con "Generar Excel" e "Ir a mis reportes". El reporte apenas había entrado a la cola: `enviado` se calculaba como `isOnline === true` al encolar.
2. Al cerrarse el modal, por un instante, **el wizard vaciado** detrás ("Sin actividades capturadas", "Sin área seleccionada").
3. "Ir a mis reportes" **no lleva a la lista**: reemplaza la ruta por el detalle del reporte, identificado por su **id local**. "Generar Excel" ejecuta la misma función.
4. Detalle con franja ámbar fija *"Enviando · Sigue en este teléfono; se enviará al recuperar la señal"*, aunque había señal.
5. Al responder el POST, la pantalla cambia a los datos del servidor: **pantalla en blanco con indicador**, y las fotos que aún suben pasan de la imagen local a un **recuadro gris con nube** (la miniatura remota vale `null`).
6. Al terminar las fotos, el worker purga la copia local. **El id local deja de resolver**: la pantalla vuelve a la rama "en cola" con `enCola` vacío. Desaparece la vista previa, el pie dice **"0 actividades · 0 fotos"**, los botones quedan apagados para siempre. En el mismo instante aparece el aviso "Reporte enviado".
7. Desde la lista, el mismo reporte ya dice "Disponible" y su detalle funciona, porque ahí se abre por id de servidor.

El caos no tenía una sola causa: un defecto de identidad (6), textos fijos que no corresponden al estado (1, 4), dos franjas ámbar con el mismo título y distinto significado (4, 5), y una promesa del diseño original que la implementación no podía cumplir (1, 3).

### Destino y resultado

- **F32 — Se retira el modal de resultado; la confirmación lleva directo a la lista de la obra (corrige §7).** "Guardar reporte" en el modal de confirmación encola el reporte y lleva a **REPORTES DE LA OBRA**. El modal de confirmación (finalidad del guardado) se conserva sin cambios.

  **Implementación: no hay ruta nueva.** El wizard es una ruta modal de este mismo stack y `ReportSelection` es su raíz, así que la lista ya está montada debajo: llegar a ella es `navigate("ReportSelection", { recienGuardado })`, que vuelve a la ruta existente y la saca de la pila. Eso conserva la razón original del `replace` —que el "atrás" del sistema no devuelva a un borrador ya enviado— sin apilar nada.

  **Justificación:**
  - El §7 original prometía, con señal, "Guardado y enviado" + "Generar Excel". **El error estaba en el diseño, no en la implementación:** en ese instante el reporte apenas sale del teléfono y no se puede generar nada. Ningún texto puede decir "enviado" antes de que el servidor lo confirme.
  - Con señal, un reporte con 4–6 fotos queda disponible en menos de un minuto; sin señal, no se puede generar hasta recuperarla. En ninguno de los dos casos tiene sentido que el usuario espere en una pantalla.
  - La lista ya resuelve el problema: funde cola y servidor, y su chip contesta la única pregunta que importa (F18) y cambia solo.
  - El modal de resultado existía para elegir entre "Generar Excel" e "Ir a mis reportes". Sin la primera opción, ya no hay nada que elegir: un segundo modal solo repetiría lo que la lista dice mejor, a cambio de un toque en cada guardado.

  **Alternativas rechazadas:**
  - _Modal de resultado con una sola salida honesta ("Ir a mis reportes")_: correcta, pero cuesta un toque en cada guardado para llegar al mismo lugar. Se dibujó y se comparó (Enmienda A del UX-SPEC-02).
  - _Quedarse en el detalle esperando para generar_: sin señal no hay nada que esperar; con señal, la espera es corta pero la pantalla no puede ofrecer nada útil mientras dura.
  - _Mantener "Generar Excel" en el resultado_: promete algo que en ese momento nunca se puede cumplir.

- **F33 — Al llegar a la lista: fila resaltada y aviso según la señal.**
  - La fila del reporte recién guardado aparece **arriba** y lleva un **resaltado de llegada**: un tinte de fondo que se mantiene ~1.5 s y se desvanece en ~1 s, hasta quedar igual a las demás.
  - **Con señal:** aviso breve, que se va solo: *"Reporte guardado · enviando"*.
  - **Sin señal:** aviso que **no se va solo** (`duration: Number.POSITIVE_INFINITY`), con acción **"OK"**: *"Guardado en el teléfono. Se enviará solo al recuperar la señal."* Un solo texto, tipo `info`, con la forma actual del `SnackbarProvider`.

  **Justificación:** el modal de resultado se retira, pero su información más importante —que el reporte sigue en el teléfono— no puede retirarse con él. Ocultarlo produciría la peor falla posible del módulo: creer que se entregó algo que no salió (razón original del §7). Un aviso de cuatro segundos se puede no ver; por eso el de sin señal espera a que el usuario lo descarte, y el chip "Por enviar" queda en la primera fila hasta que se envía.

  **Por qué sin título ni tipo `warning`:** lo que evita creer que el reporte salió ya está cubierto por tres cosas —el aviso no se va hasta que el usuario lo descarta, el texto lo dice, y el chip "Por enviar" se queda en la fila—. Un título en negritas repetiría el mismo mensaje y obligaría a cambiar la forma de un componente que usa toda la app. El ámbar se queda como lenguaje exclusivo del chip "Por enviar".

  **Alternativas rechazadas (aviso):** _aviso sin señal con duración normal_ (se pierde); _franja fija en la lista_ (ruido permanente para un estado que el chip ya comunica); _agregar título opcional y tipo `warning` al `SnackbarProvider`_ (cambiar un componente compartido para decir lo mismo).

  **Resaltado de llegada — reglas:**
  - **Fondo y nada más.** Sin contorno, sin sombra, sin halo, sin borde lateral de color.
  - **El tinte no puede coincidir** con el fondo del patrón "cerrado" (`cerrado.fondo` #F8FAFC, `cerrado.fondoControl` #F1F5F9) ni con el fondo de ningún chip de estado. Se usa el tono más claro de la familia primaria, publicado como token propio: **`DesignTokens.colors.llegada` = `#EBF4FF`** (= `primary[50]`). Verificado contra los chips vivos —`warning[100]` #FEF3C7 para "Por enviar"/"Enviando", `success[50]` #ECFDF5 para "Disponible", `error[50]` #FEF2F2 para los de fallo—: no coincide con ninguno.
  - **No comunica estado.** El estado lo dice el chip; el resaltado solo dice "este es el tuyo". Por eso no depende del color: la señal principal es la posición (arriba), y el tinte la refuerza.
  - **Una sola vez por llegada.** No reaparece al volver a la lista ni al cambiar el chip.
  - **No bloquea.** La fila se puede tocar mientras está resaltada.
  - **Movimiento reducido:** sin desvanecimiento; el tinte se retira de golpe al cumplirse el mismo tiempo total (~2.5 s). Se consulta `AccessibilityInfo.isReduceMotionEnabled()`.
  - **La marca se consume al leerla.** Viaja como parámetro de ruta y la lista la limpia en cuanto la lee (`setParams` a `undefined`): los parámetros persisten mientras la pantalla siga en la pila y, sin limpiarla, la fila se resaltaría otra vez cada vez que el usuario regresa a la tab.
  - **El resaltado sobrevive al cambio de identidad de la fila.** A media animación el servidor devuelve el reporte y la lista descarta la copia local: la fila deja de ser `local:<uuid>` y pasa a ser `srv:<id>`. El resaltado se busca por las dos, así que no se corta.

  **Qué cuenta como "sin señal" al llegar:** solo `isOnline === false`. `null` ("todavía no se sabe", F25) toma el camino **con señal**, igual que el chip de la lista. `useReporteSubmitToQueue` devolvía `enviado: isOnline === true`, que mandaba `null` al camino sin señal: el aviso decía "se queda en el teléfono" sobre una fila que ya decía "Enviando". Pasa a `isOnline !== false`. **Cambia también una métrica viva:** `was_offline` de `reporte_actividades_saved` usaba `!isOnline` y contaba los `null` como offline; con el mismo criterio ahora solo cuenta un `false` explícito, así que la serie no es comparable de un lado a otro de esta fecha.

  **Por qué no el patrón "cerrado":** ADR-007 D11 significa *"esto ya quedó en esta pantalla; tócalo para cambiarlo"* y se declara exclusivo. Una fila recién guardada ni está completa en esta pantalla ni se reabre con un toque, y su regla 1 reserva explícitamente el estado de envío a otro lenguaje. Usarlo aquí le daría a D11 un segundo significado y el usuario dejaría de poder leerlo con certeza en cualquiera de los dos lugares.

  **Alternativas rechazadas (resaltado):** _patrón "cerrado"_ (contradice D11); _enmendar D11 para que también signifique "recién ocurrido"_ (rompe la exclusividad que lo hace legible); _etiqueta de texto "Nuevo"_ (compite con el chip, único texto de estado de la fila); _contorno o halo_ (lenguaje de selección y de foco).

- **F34 — "Reporte enviado · ABRIR" cuando el reporte queda DISPONIBLE, no cuando responde el POST.** El aviso de éxito se dispara cuando el reporte **y todas sus fotos** están en el servidor: el mismo momento en que el chip pasa a "Disponible".
  - **Uno solo:** "Reporte enviado", y **ABRIR** lleva a su detalle **por id de servidor**, con los botones encendidos.
  - **Varios a la vez** (se vuelve de días sin señal): "N reportes enviados", y **ABRIR** lleva a la lista. Elegir uno por el usuario sería adivinar.
  - **Sale esté el usuario donde esté**, incluso capturando otro reporte, y ABRIR navega entrando por la raíz: App → tab Reportes → pantalla. Es un aviso; abrirlo o no es decisión suya.
  - **Solo en el teléfono que guardó el reporte.** El worker recorre únicamente la cola de este dispositivo, y un reporte encolado existe solo ahí (§7). Si tres personas de la misma obra guardan su reporte el mismo día, cada teléfono avisa de lo suyo; los demás se enteran abriendo la lista. El aviso es el acuse de recibo del propio envío, no una notificación de obra.

  **Justificación:** antes "Reporte enviado" aparecía al 201 del POST, cuando todavía no se podía generar —en el video coincide con la pantalla rota—. Es el único momento en que la app puede decirle al usuario "ya puedes generar" sin que lo esté buscando, y debe coincidir con que de verdad pueda.

  **Implementación — por qué no bastaba contar envíos.** El ciclo del worker avisaba con `reportesEnviados > 0`, es decir reportes enviados **en ese ciclo**. Las fotos de un reporte pueden cerrar dos ciclos después, y en ese ciclo no se envía ningún reporte: con el disparador nuevo colgado de ese contador, **ese reporte no avisaría nunca** — y es justo el caso de volver de un rato sin señal. El ciclo acumula ahora los reportes que **movió** (enviados, o con alguna foto subida) y al final pregunta cuáles quedaron completos. Esa pregunta va **antes de purgar**, porque la purga borra las filas que hay que leer.

  La navegación desde el worker no necesitó infraestructura nueva: `navigationRef` ya existía y está enganchado al `NavigationContainer` en `RootNavigator`.

### Detalle de un reporte en camino

- **F35 — La pantalla de detalle no depende de la cola, ni para saber qué reporte muestra ni para saber qué pintar (precisa F17).**

  **Requisito:** en cuanto el id local resuelve a un id de servidor, la pantalla conserva ese id durante toda su vida, y ninguna purga puede volver a dejarla sin identidad. Mientras carga el detalle del servidor sigue mostrando la vista previa local: **nunca una pantalla en blanco**.

  F17 conservó el `done` justamente porque su `reporteId` es lo único que traduce el id local al de servidor. La purga posterior, correcta para la lista, rompía esa traducción para cualquier pantalla que siguiera abierta con el id local. Es el defecto que deja la pantalla muerta (paso 6).

  **Se resolvió en tres piezas, porque el defecto eran tres.**

  1. **La identidad se fija en la ruta.** En cuanto se conoce el id de servidor se escribe en los parámetros (`setParams`), que no dependen de Realm.
  2. **La purga espera a las fotos.** `removeDoneReportes` borraba todo `done`, incluso con fotos subiendo. Ahora solo purga los que ya no tienen ninguna fila de foto. No duplica nada en pantalla: la lista descarta la copia local en cuanto el servidor devuelve ese `reporteId`. Esto es además lo que hace posible el disparador de F34.
  3. **La pantalla se queda con una copia congelada de lo que ya mostró.** Fijar el id evita perder la identidad, pero no el contenido: la vista previa se lee **viva** de Realm, y la purga se la lleva igual. La copia se toma la primera vez que se lee la cola y se conserva hasta que la del servidor esté completa.

  **La opción (b) que se había evaluado —que la purga conserve una marca mínima `localId → reporteId`— se descarta.** Protege un caso que no existe: después de la purga, la fila de la lista viene del servidor y lleva `reporteId` con `localId` nulo, así que nadie llega con un id local muerto salvo una pantalla que ya estaba abierta, y eso lo cubre (1). Mantenerla costaría una clase de Realm y una migración para nada.

  Este defecto **no desaparecía con F32**: la lista también abre reportes en cola por id local, y la pantalla moría igual si el reporte sincronizaba mientras se miraba.

- **F36 — Una sola línea de estado en el detalle, calculada del estado real (corrige §8).** Sustituye a las dos franjas ámbar tituladas "Enviando" —la de "sigue en este teléfono" y la de "algunas fotografías siguen subiendo"—, que se veían iguales y decían cosas distintas, así que parecían una sola que nunca se iba.

  | Estado | Línea | Estilo |
  | --- | --- | --- |
  | Sin señal, nada se intenta | **Por enviar** · "Sin señal. Se enviará solo al recuperarla." | Ámbar: pide atención, no ha salido del teléfono |
  | Falta el reporte | **Enviando** · "Enviando el reporte." | Neutro, con indicador de actividad |
  | Faltan fotos | **Enviando** · "Faltan N fotos por subir." | Neutro, con indicador de actividad |
  | Disponible | *(sin línea)* | — |
  | Falló | Se conserva la franja de error y el rescate de F19 | Error |

  **`isOnline === null` ("todavía no se sabe", F25) cuenta como "Enviando"**, no como "Por enviar". Es la misma regla del chip de la lista; si el detalle la aplicara distinto, la lista y el detalle dirían cosas diferentes del mismo reporte.

  **"Por enviar" solo para un reporte de este teléfono.** Un reporte ajeno visto sin señal no está esperando mi red para salir: decirle al usuario "se enviará solo al recuperarla" sobre el reporte de otra persona es falso. Para esos la línea dice qué falta en el servidor.

  **Si no está disponible, siempre hay línea.** Queda una ventana —entre que la última foto cierra y el detalle del servidor se refresca— en la que ninguna condición específica aplica. Ahí cae a "Enviando el reporte" en vez de a nada: una pantalla sin línea y sin botones sería otra vez el callejón sin salida.

  **Excepción acotada a F18, deliberada.** F18 fijó que el chip contesta una pregunta binaria y expone el veredicto, no el motivo. Eso **sigue valiendo para el chip de la lista**, que no cambia. En el detalle el usuario ya abrió el reporte y está mirando una espera; decirle qué falta es lo que la vuelve comprensible. Se dice **qué falta**, no un porcentaje ni un avance.

  **Alternativa rechazada:** _barra de progreso de fotos_ — es el estado intermedio que F18 descartó.

- **F37 — Las fotos nunca retroceden.** Mientras este teléfono conserve el archivo (`PendingReportePhotoSubmission.localUri`), se muestra ese, con una marca **"☁ subiendo"** en la esquina. La miniatura del servidor solo lo reemplaza cuando ya existe.

  **Justificación:** pasar de la foto real a un recuadro gris se lee como "se borró" —la misma conclusión que F29 corrigió para las actividades—.

  **Por qué se puede:** el backend crea las filas de foto desde el 201, así que el detalle del servidor declara **todas** las fotos con su id y su pie desde el primer momento; lo único que falta es `thumbnail_url`, que vale `null` hasta que los bytes llegan. La unión local↔servidor es por `fotoRemotaId`. La copia congelada de F35 cubre la ventana en que la purga ya soltó el archivo local y el refetch aún no llega.

- **F38 — Sin botones muertos.** Mientras el reporte no se puede generar, en lugar de "Generar Excel" y "Generar PDF" apagados va una frase que dice qué falta: *"El Excel y el PDF se podrán generar cuando el reporte llegue al servidor."* (falta el reporte) o *"…en cuanto terminen de subir las fotos."* Al quedar disponible, los botones aparecen ahí mismo, sin salir de la pantalla.

  **Justificación:** dos botones apagados sin explicación son un callejón sin salida —el usuario no sabe si está roto, si le falta un permiso o si solo tiene que esperar—.

### Defectos encontrados al revisar

- **F39 — Dos defectos de la salida del wizard.**

  1. **El wizard se vaciaba a la vista del usuario.** El borrador se reiniciaba antes de navegar y, durante el desvanecimiento del modal, se veía la Revisión en blanco. **No hacía falta reiniciarlo:** el borrador vive en el `useReducer` de `BorradorReporteProvider`, que envuelve la pantalla y muere con la ruta modal al cerrarse. Esa llamada pagaba un costo visual por algo que el desmontaje hace solo.
  2. **`fechaReporte` se calculaba con `new Date().toISOString().slice(0, 10)`** en `ReporteWizardRoute`: fecha UTC, que después de las 18:00 en CDMX es el día siguiente. No faltaba una regla —las Precauciones de este mismo ADR ya lo prohíben y citan la Decisión 9 del ADR-003—; faltaba aplicarla. Con F32 esa ruta se retira y la fecha de la lista y del detalle sale de la cola o del servidor. Era la única instancia viva del patrón en `src/`.

- **F40 — `esAutor` se calculaba mal en la lista.** `ReportSelectionScreen` abría el detalle con `esAutor: fila.porEnviar`: el usuario dejaba de ser autor de su reporte en cuanto se enviaba. Hoy solo alimenta `reporte_archivo_generated`, así que **`es_autor` venía `false` para todo archivo generado de un reporte ya entregado**: la métrica está sesgada desde que existe.

  - **Corrección:** se calcula en `useReportesDeObra`, no en la pantalla, porque la respuesta depende de dos fuentes —la cola y la lista del servidor— y tenía que ser la misma en las dos. Un reporte en cola es del autor por definición; uno del servidor, si `reportado_por` es el usuario de la sesión.
  - **Los ids coinciden:** `/api/usuarios/me/` devuelve `"id": str(user.id)` —la PK de Django, no el `oid` de Azure— y `reportado_por` es esa misma PK como número. Se compara en texto.
  - **ABRIR (F34)** pasa `esAutor: true`: el worker solo procesa la cola del propio teléfono, así que quien guardó es quien mira.
  - **Datos históricos:** los eventos `reporte_archivo_generated` anteriores al 30-oct-2026 no sirven para separar autor de no autor.

### La franja de sincronización (31-oct)

- **F41 — La franja de estado decía lo contrario de lo que estaba pasando (precisa F15).** Encontrado probando el flujo nuevo: al guardar con señal, la franja de REPORTES DE LA OBRA decía "Sincronizando…" un segundo y luego **"1 pendiente de sincronizar" con el botón Sincronizar** —durante toda la subida de fotos, que es el tramo largo y justo cuando la app más está trabajando—.

  **La regla de producto, que es lo que estaba roto:** "N pendientes de sincronizar" + el botón significa **hay trabajo parado y nadie lo está intentando; te toca a ti**. Es para lo que se construyó el componente en Avances, donde `isSyncing` sale de una bandera global del ciclo. Reportes lo había cableado a `syncingCount > 0`, que cuenta filas de `PendingReporteSubmission` con `status === "syncing"` —un estado que solo existe mientras el POST del reporte está en vuelo—. Las fotos son otra cola y subirlas nunca devuelve el reporte a `syncing`, así que el ciclo entero de fotos se pintaba como cola detenida.

  Tres correcciones:

  1. **"Sincronizando" es que el ciclo esté corriendo**, no que una fila esté en `syncing`. `SyncWorkerProvider` publica `isReporteSyncing` —solo el worker de reportes, separado del `isSyncing` que une los cuatro, que habría dicho "Sincronizando" en Reportes cuando lo que sincroniza es maquinaria—. Esa bandera cubre el ciclo completo: POST **y** fotos. El botón Sincronizar vuelve a aparecer solo cuando de verdad no hay nada intentándose.
  2. **"Fallido" es que se agotaron los intentos.** Entre reintentos el worker deja el reporte en `failed` mientras espera su backoff (1 / 2 / 4 s), y la franja se ponía roja diciendo "1 fallido" **sin ofrecer ninguna acción** sobre algo que se iba a reintentar solo. Pintar un estado de paso como veredicto. Ahora la franja hace el mismo corte que el chip de la fila: "Reintentando" mientras queden intentos, "No se envió" cuando no.
  3. **`isOnline === false` es lo único que significa "sin red" (corrige `OfflineIndicator`).** La franja leía `!isOnline`, y `!null` es `true`: durante el instante entre montarse y la respuesta de NetInfo afirmaba "Modo sin conexión" en rojo, **incluso con la cola vacía**, porque ese mismo `null` también le impedía salirse por el retorno temprano. Es el defecto de la deuda abierta #2, en el componente en vez de en el worker.

  **Alcance:** (3) toca un componente **compartido**, así que también cambia la lista de avances y el formulario de captura de avance —que tenían el mismo parpadeo rojo—. Las otras dos son solo de Reportes.

  **El precio de (3), aceptado:** si NetInfo nunca resuelve, `isOnline` se queda en `null` y la franja ya no declarará el modo sin conexión; mostrará los pendientes y el botón, y los intentos fallarán. Es la misma asimetría que eligió F25 para el worker: intentar sin red cuesta una petición fallida, no intentar creyendo que no hay cuesta una cola trabada. Lo contrario —lo que había— era una franja que contradecía a la cola que en ese mismo momento sí estaba intentando.

### Deuda técnica derivada

- **La franja roja de "detenido" no ofrece salida.** Cuando un reporte agota sus intentos, la franja lo anuncia sin ningún botón: `OfflineIndicator` solo pinta "Ver cola" si recibe `onViewQueuePress`, y Reportes no tiene una pantalla de cola —el rescate (Reintentar / Descartar) vive en el detalle, al que se llega tocando la fila—. Funciona, pero la franja queda como un cartel muerto.
- **Un reporte `done` con una foto fallida permanente conserva su fila en la cola.** Con la purga condicionada a las fotos (F35), una foto que agota sus intentos deja al reporte en Realm indefinidamente. No es una fuga nueva —esa foto ya se quedaba— y el usuario puede descartar desde el detalle, pero no hay limpieza automática.
- **Telemetría del cierre nuevo.** Faltan `reporte_abrir_desde_aviso` y `reporte_detalle_abierto_en_camino`, y sigue abierta la deuda de `reporte_detail_opened`; conviene resolverlas juntas.

**Resueltas al construir (no son deuda):**

- *Tipo de advertencia en el `SnackbarProvider`*: no hace falta. El aviso sin señal es un solo texto tipo `info` (F33).
- *Duración persistente del aviso sin señal*: react-native-paper 5.14.5 trata `duration === Number.POSITIVE_INFINITY` como "no se va solo". Se pasa ese valor.
- *Navegación de "ABRIR" desde el worker*: `navigationRef` ya existía y está enganchado al `NavigationContainer`.

---

## Deuda técnica

Estado al 2026-10-12, ordenada por riesgo. Las que cerraron se conservan tachadas para que no se vuelvan a abrir.

### Pagada

- ~~**`AnchoredMenu` como componente compartido.**~~ Vive en `src/components/common/`, junto a `BottomSheetMenu` (F14).
- ~~**Deuda #12 heredada del ADR-003 (limpieza de caché al cambiar de identidad).**~~ Pagada en la Fase 2: identidad por el claim `oid`, `deleteAll()` de Realm y `removeClient()` del caché persistido. Los contadores de ese wipe se extendieron para cubrir reportes (F21).

### Abierta

1. **El borrador del wizard no se persiste — riesgo medio, decidido a corregir.** Vive en memoria (F2). La ventana de pérdida va desde que se abre el wizard hasta que se toca "Enviar"; una vez en la cola, está en Realm y sobrevive a todo. **Pero esa ventana es la más larga del flujo y contiene todo el trabajo del usuario**: actividades escritas, fotos encuadradas, observaciones. Si Android mata la app —llamada, cámara, memoria baja— se pierde entero.

   El caso que lo decidió, planteado por el autor: *terminó el informe y por X o Y no lo pudo enviar para que se fuera a la cola.* Trabajo completo, cero recuperable. **Decidido: se persiste.** Falta elegir si se guarda en cada cambio o con rebote, y qué ocurre al reabrir la app con un borrador a medias.

2. **`useAdvanceSyncWorker` y `usePhotoSyncWorker` siguen con `!isOnline` — riesgo medio.** F25 arregló el worker de reportes y sembró `useNetworkStatus`, pero los de avances conservan el defecto: `null` ("todavía no se sabe") se colapsa con `false` ("no hay red"), así que **el worker se duerme durante la ventana de incertidumbre**. F41.3 pagó la mitad visible —la franja ya no dice "Modo sin conexión" mientras no se sabe—, pero **los dos workers de avances siguen dormidos en esa ventana**: ahora sin cartel que lo delate.

   La siembra con `NetInfo.fetch()` redujo esa ventana de potencialmente infinita a un viaje redondo. **Pero si en algún dispositivo ese `fetch()` falla o se cuelga, `isOnline` se queda en `null` y los dos workers de avances no despiertan nunca.** El arreglo es una línea por guarda (`isOnline === false`); lo que cuesta es volver a verificar el sync de avances y fotos completo, que es camino de producción.

3. **`ReordenarFotos` funciona pero no está optimizado.** El drag con gesture-handler + reanimated se escribió sin poder probarlo en dispositivo; verificado después. Pendiente de pulido, no de corrección.

4. **No hay forma de apuntar la app a un backend local.** `src/services/api/config.ts` tiene el `baseURL` **hardcodeado** al App Service de Azure: el dispositivo siempre pega a producción, aun en dev build. `API_URL` se calcula desde `expoConfig.extra.apiUrl` y **nunca se usa** — variable muerta; `getApiUrl()` de `app.config.ts` devuelve URLs de plantilla. **Diferido por decisión del autor:** hoy no hay infraestructura para un backend local. Cuando la haya, la pieza a desenterrar ya está escrita.

5. **`app.config.ts` pierde bloques enteros de `app.json` por spread superficial.** Mismo defecto que el comentario ya escrito sobre `extra`, repetido en `android`, `ios` y `web`. Verificado con `expo config --type public` (SDK 53): se pierden `android.intentFilters`, `android.edgeToEdgeEnabled`, `ios.associatedDomains` y `web.bundler`. **`app.config.ts` manda** — lo que retorna su función es la config final.

   **El arreglo es un deep merge por clave**, no un spread de nivel raíz. **No es gratis:** `edgeToEdgeEnabled: true` nunca ha estado activo, y restaurarlo lo enciende por primera vez, corriendo el contenido detrás de las barras del sistema **en toda la app** — cambio visual global que pide su propia pasada de QA en dispositivo. **Los links no reviven con el arreglo**: el backend no sirve `apple-app-site-association` ni `assetlinks.json` en `/.well-known/`, así que universal links y App Links quedan inertes hasta que esos archivos existan. **El login NO depende de nada de esto**: `expo-auth-session` redirige por el scheme `sentinel://`, declarado a nivel raíz, que sí sobrevive al spread.

   Recomendación registrada: deep merge con edge-to-edge apagado ahora, y encenderlo como tarea propia.

6. **`getProveedores` sigue en `reporteService.ts`.** El roster ya no es un hecho del reporte (F7). Hoy el reporte es su único consumidor; cuando haya otro, se muda a un servicio propio.

7. **Falta `reporte_detail_opened`**, y con el cierre nuevo (F34) faltan también `reporte_abrir_desde_aviso` y `reporte_detalle_abierto_en_camino`. Conviene resolverlas juntas. `reporte_archivo_generated` ya existe —y desde F40 su `es_autor` es confiable—.

8. **Preselección por última selección en P-00.** Si la telemetría muestra que el roster diario es estable, recordar la última selección ahorraría toques. Requiere evidencia antes de construirse.

9. **Caché en Realm del historial de la obra.** Los reportes de terceros solo se consultan con señal, o desde el caché de React Query si ya se visitaron. Si aparece el caso de consulta 100 % offline, es aditivo — pero implica esquema y sincronización nuevos.

10. **Búsqueda y filtros en REPORTES DE LA OBRA.** La lista es descendente por fecha, sin filtros. Reevaluar cuando una obra acumule suficientes reportes para que el scroll estorbe.

11. **Verificación de headers de navigators hermanos** (§10.1). La corrección tipográfica se aplica a Reportes; queda pendiente confirmar que los demás stacks quedaron consistentes.

12. **Piezas que requieren rebuild nativo**, pendientes de la siguiente compilación: `softwareKeyboardLayoutMode: "pan"` (§5) y `expo-media-library`.

13. **Un reporte `done` con una foto fallida permanente conserva su fila en la cola — riesgo bajo.** La purga del reporte está condicionada a que no le queden fotos (F35), así que una foto que agota sus intentos lo deja en Realm indefinidamente. No es una fuga nueva —esa foto ya se quedaba— y el usuario puede descartar desde el detalle, pero no hay limpieza automática.

14. **`was_offline` de `reporte_actividades_saved` cambia de significado el 30-oct-2026** (F33). Antes contaba `isOnline === null` como offline; ahora solo un `false` explícito. La serie no es comparable de un lado a otro de esa fecha.

---

## Guía de implementación

Orden sugerido, con validación entre etapas: **(1)** clases Realm y worker de sincronización → **(2)** P-00 y wizard (captura completa offline, sin backend) → **(3)** zona de reportes y detalle → **(4)** botones de generación, una vez que el endpoint de archivo del backend responda.

### Mapa de archivos por decisión

| Decisión              | Archivo(s)                                                                                 | Cambio                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| D1 · P-00             | `src/modules/reportes/screens/ProviderSelectionScreen.tsx`                                 | Nueva; consume lista de proveedores de la obra                                                   |
| D2 · Wizard           | `src/modules/reportes/navigation/ReporteWizardNavigator.tsx`                               | Nuevo stack modal con los 4 pasos                                                                |
| D2 · Color y armazón  | `src/modules/reportes/components/WizardShell.tsx`, `WizardStepper.tsx`                     | Nuevos; header + subheader + stepper compartidos por P-00 y pasos                                |
| D3 · Actividades      | `.../steps/ActividadesStep.tsx`, `.../screens/ActividadComposeScreen.tsx`                  | Nuevas                                                                                           |
| D4 · Fotos            | `.../steps/FotosStep.tsx`, `.../components/FotoBatchCarousel.tsx`                          | Nuevas; `usePhotoCapture` reutilizado                                                            |
| D4 · Menú anclado     | `src/components/common/AnchoredMenu.tsx`                                                   | Nuevo componente compartido (`Modal` + `measureInWindow`)                                        |
| D5 · Conclusión       | `.../steps/ConclusionStep.tsx` + `app.json`                                                | Nueva; `softwareKeyboardLayoutMode: "pan"` en la config de Android                               |
| D6 · Miniatura        | `.../components/DocumentoMiniatura.tsx`                                                    | Nuevo; prop `mode: "edit" \| "read"` desde el primer commit                                      |
| D7 · Cola             | `src/realm/pendingReporte/PendingReporteSubmission.ts`, `PendingReportePhotoSubmission.ts` | Nuevas clases; alta en `SENTINEL_SCHEMA` + bump de `schemaVersion` con rama en `handleMigration` |
| D7 · Worker           | `src/hooks/reportes/useReporteSubmitToQueue.ts`, `useReporteSyncWorker.ts`                 | Espejo de los de avances                                                                         |
| D8 · Zona             | `src/modules/avance/screens/ReportSelectionScreen.tsx`                                     | Reconstrucción de la pantalla (secciones CREAR + REPORTES DE LA OBRA)                            |
| D8 · Detalle          | `src/modules/reportes/screens/ReporteDetailScreen.tsx`                                     | Nueva                                                                                            |
| D8 · Servicio         | `src/modules/reportes/services/reporteService.ts`                                          | Nuevo; transporte copiado de `reportService.ts`                                                  |
| D9 · Fotos            | Servicio de fotos del módulo                                                               | Constantes de redimensión existentes + `expo-media-library` al capturar                          |
| D10 · Estandarización | `ReportesNavigator`, `ReportSelectionScreen`                                               | `fontSize["2xl"]` en el header; migración a `escala.ts`                                          |

#### Enmiendas del 30-oct (después de guardar)

| Enmienda | Archivo(s) | Cambio |
| --- | --- | --- |
| F32 · Sin modal de resultado | `components/ModalGuardarReporte.tsx`, `screens/ReporteWizardScreen.tsx`, `screens/ReporteWizardRoute.tsx` | Se borra `ModalResultadoGuardado`; el wizard expone un solo `onGuardado`; la ruta navega a `ReportSelection` |
| F33 · Llegada a la lista | `navigation/types.ts`, `screens/ReportSelectionScreen.tsx`, `hooks/ui/useResaltadoDeLlegada.ts`, `styles/designTokens.ts`, `hooks/reportes/useReporteSubmitToQueue.ts` | Parámetro `recienGuardado`; componente `Fila` con tinte animado; token `llegada`; `enviado: isOnline !== false` |
| F34 · Aviso al quedar disponible | `hooks/reportes/useReporteSyncWorker.ts`, `hooks/reportes/usePendingReporteQueue.ts`, `navigation/NavigationService.ts` | Conjunto de reportes tocados por el ciclo + `leerReportesDisponibles`; `navigateReportes` |
| F35 · Identidad y copia | `screens/ReporteDetailScreen.tsx`, `hooks/reportes/usePendingReporteQueue.ts` | `setParams` del id de servidor; copia congelada de la vista previa; `removeDoneReportes` espera a las fotos |
| F36 · Línea de estado | `screens/ReporteDetailScreen.tsx` | `LineaDeEstado` sustituye a `FranjaAmbar`; estado calculado |
| F37 · Fotos | `components/DocumentoMiniatura.tsx`, `screens/ReporteDetailScreen.tsx` | `FotoMiniatura.subiendo` + marca sobre la imagen; unión local↔servidor por `fotoRemotaId` |
| F38 · Sin botones muertos | `screens/ReporteDetailScreen.tsx` | Frase de espera en lugar de los botones apagados |
| F40 · `esAutor` | `hooks/reportes/useReportesDeObra.ts`, `screens/ReportSelectionScreen.tsx` | `esAutor` se calcula en el hook y baja a la ruta |
| F41 · Franja de sincronización | `components/IndicadorSincronizacion.tsx`, `providers/SyncWorkerProvider.tsx`, `components/common/OfflineIndicator.tsx` | `isReporteSyncing` publicado y cableado; "fallido" = intentos agotados; `isOnline === false` en lugar de `!isOnline` |

### Precauciones

- **El bump de esquema Realm es aditivo** (clases nuevas, ninguna modificada): sigue el patrón E1 del ADR-003 — declarar `SENTINEL_SCHEMA` a nivel de módulo, nunca inline, y agregar rama en `handleMigration`.
- **`DocumentoMiniatura` nace con los dos modos.** Construirlo primero solo para el wizard y "generalizarlo después" es la vía conocida a dos componentes divergentes.
- **El `client_id` se genera al encolar, no al enviar** — es lo que hace la idempotencia real ante reintentos y dobles toques.
- **Nunca abrir rutas de red propias desde los pasos del wizard.** Toda escritura pasa por la cola, misma regla que D13.1 del ADR-004 (Fase 2) fijó para la captura rápida.
- **Fechas siempre con `DateUtils`**, nunca `toISOString().split("T")[0]` — el patrón de bugs UTC de la Decisión 9 del ADR-003 aplica al `fecha_reporte`, que es precisamente un dato de día local capturado a las 17:00+. **Esta precaución ya estaba escrita cuando se cometió el bug que corrige F39.2**: no basta con enunciarla.
- **La cola solo se purga cuando ya no hace falta.** Una fila `done` de `PendingReporteSubmission` es lo único que traduce el id local al de servidor y lo único que sabe cuándo un reporte queda disponible: no se borra mientras le queden fotos (F35). Cualquier purga nueva tiene que preguntarse qué pantalla abierta depende de lo que está borrando.
- **Una pantalla no deriva de la cola lo que la cola va a borrar.** Si lo necesita después de la purga, se queda con su propia copia (F35).

---

## Ver también

- `docs/ux/ux-spec-02.html` — UX-SPEC-02 FINAL: el flujo, las láminas de cada pantalla y la geometría del documento
- `docs/ux/reportes-despues-de-guardar.html` — UX-SPEC-02, Enmienda A: el tramo de después de guardar (F32–F40)
- `docs/adr/ADR-007-maquinaria-jornada-sheet.md` — D11, patrón "cerrado"; F33 deliberadamente NO lo usa
- `ADR-004-reporte-de-actividades.md` (repo backend) — persistencia, endpoints, motor de generación y política 409; contraparte directa de este ADR
- `be-spec-01-datos-y-generacion.html` — modelo entidad-relación y motor de paginación dibujados
- `docs/adr/ADR-003-sabana-home-fase1.md` — Decisión 1 (la tab Reportes que este módulo llena), Decisión 9 (patrón de bugs UTC), deuda #12 (caché tras logout)
- `docs/adr/ADR-004-sabana-home-fase2-programa.md` — D13.1 (prohibición de rutas de red propias en superficies de captura), patrón E1 de bump aditivo de Realm
- `docs/azure_photo_blob.md` — estructura de blobs, SAS y límites del pipeline de fotos existente
- ADR futuro: Fase 3 (tab Semana / Last Planner — plano de producción)
