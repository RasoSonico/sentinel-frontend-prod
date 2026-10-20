# Reporte de Actividades Diario — Módulo de captura y consulta

**Creation Date:** 2026-08-31
**Last Updated:** 2026-10-12
**Status:** Completed — captura completa verificada en dispositivo, incluido el flujo offline. Edición desde la app diferida (ver §4).

> Documento de implementación. Las decisiones y su razonamiento viven en
> `docs/adr/ADR-006-reporte-de-actividades.md` (frontend) y
> `docs/ADR/ADR-004-reporte-de-actividades.md` (backend, otro repo).
> Ambos llevan una sección **Enmiendas** con lo que cambió al implementar.
> Referencia visual: `docs/ux/ux-spec-02.html`.

---

## 1. Business & Experience Context (Product / UX)

El reporte de actividades diario es el entregable con el que la supervisión acredita, día con día, qué se hizo en la obra. Se imprime contra un formato controlado por el cliente (**UIN-TOP-F-002**) y se entrega en Excel o PDF.

Antes de este módulo se capturaba a mano, fuera de la app. Lo que cambia:

- **Se captura en campo, donde ocurre el trabajo**, no de regreso en la oficina.
- **Funciona sin señal de punta a punta.** Es el requisito duro: las obras no tienen cobertura confiable y la captura no puede depender de ella. Verificado en dispositivo: se genera un reporte completo sin red.
- **El registro es la fuente de verdad; los archivos son efímeros.** El mismo reporte, generado hoy o en seis meses, por su autor o por otro miembro de la obra, produce el mismo documento.
- **Hay historial de ediciones.** Cada cambio guarda un snapshot completo de lo que el documento decía en ese momento.

### El flujo del usuario

```
Zona de Reportes ──> P-00 Encuadre ──> Wizard (4 pasos) ──> Revisión ──> Guardar
       │             contratistas         actividades        documento      │
       │             supervisión          fotos              en miniatura   │
       │             área                 observaciones      editable       │
       │                                                                     ▼
       └─────────────── lista de la obra  <────────────────────  cola offline
                        chip de estado                            (Realm)
                        detalle + generar Excel/PDF
```

### Dos reglas de producto que vale la pena no perder

**El chip contesta una sola pregunta binaria: ¿ya lo puedo generar?** Estados: "Por enviar" (sin señal), "Enviando" (con señal) y "Disponible". Un estado intermedio como *"subiendo 2 fotos"* se descartó a propósito: el usuario no puede accionarlo — le falte texto o le falten fotos, la respuesta a "¿ya lo bajo?" es la misma — y solo agrega un paso de traducción hacia la misma conclusión. Lo que importa es que **"Disponible" signifique disponible**.

**La fidelidad al machote es de contenido y ubicación, no una réplica exacta.** Lo que en el machote son malas prácticas de captura a mano —un solo pie para dos fotos, puntuación inconsistente entre rótulos hermanos, celdas combinadas en unas filas y no en otras— se sustituyó por la práctica correcta.

---

## 2. Architecture & Data (The Bridge)

### Endpoints & Services Used

| Endpoint | Método | Para qué | Servicio |
| --- | --- | --- | --- |
| `/api/proveedores/?construction_id=N` | GET | Roster de la obra (P-00) | `reporteService.getProveedores` |
| `/api/reportes/actividades/` | GET | Lista de la obra | `reporteService` |
| `/api/reportes/actividades/` | POST | Alta (idempotente por `client_id`) | `reporteService` |
| `/api/reportes/actividades/{id}/` | GET | Detalle | `reporteService` |
| `/api/reportes/actividades/{id}/` | PATCH | Edición — **solo el autor** | *(sin consumir aún)* |
| `/api/reportes/actividades/{id}/archivo` | GET | Excel o PDF | `reporteArchivoService` |
| `/api/reportes/fotos/upload/` | POST | SAS de escritura | `reporteService` |
| `/api/reportes/fotos/confirm-upload/` | POST | Confirmación + thumbnail | `reporteService` |

**El wizard no abre ninguna ruta de red.** `useProveedores` en P-00 es la única consulta del flujo de captura, y sirve desde caché cuando no hay señal. Del paso 1 en adelante todo es memoria y cola.

### Main Data Models

**Cola offline (Realm, `schemaVersion` 14):**

```
PendingReporteSubmission
  _id, clientId, constructionId, fechaReporte, area
  actividadesJson, conclusion, proveedorIds, supervisionJson
  status: pending | syncing | done | failed
  reporteId        ← id de servidor; lo entrega el 201
  retryCount, maxRetries, errorMessage, createdAt

PendingReportePhotoSubmission
  _id, reporteLocalId, orden, pie, filename, localUri
  fotoRemotaId     ← también del 201
  status: waiting | uploading | done | failed
```

**Borrador del wizard:** `BorradorReporteContext` (React context + `useReducer`). **En memoria, no en Realm** — ver deuda #1 del ADR-006.

### Interaction Flow (Diagram)

```
P-00 ──[contratistas + supervisión + área]──> borrador (memoria)
                                                   │
  pasos 1-3 escriben el borrador ──────────────────┤
                                                   │
  paso 4 Revisión: DocumentoMiniatura con ✎ por bloque
                   (cada ✎ regresa DIRECTO a Revisión)
                                                   │
  "Enviar" ──> useReporteSubmitToQueue ──> Realm (pending)
                   client_id acuñado AQUÍ          │
                                                   ▼
                         useReporteSyncWorker (del SyncWorkerProvider)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            POST reporte                      subir fotos por SAS
            (201 → reporteId)                 (→ confirm-upload)
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                          status = done, fotos done
                                    ▼
                    la lista lo refleja → se purga la copia local
```

**El `client_id` se acuña al encolar, no al enviar.** Es lo que hace idempotente al POST: un reintento de red devuelve lo ya guardado e **ignora el payload nuevo**, porque aceptarlo convertiría un reintento en una edición silenciosa de un registro que se declara inmutable.

---

## 3. Technical Implementation Details

### Reusable Components

**Promovidos a `src/components/common/` por este módulo:**

- **`AnchoredMenu`** — menú con el ancho exacto del botón que lo abrió, punta de conexión y apertura hacia arriba.
- **`BottomSheetMenu`** — **hermano**, no variante. Siete opciones que deben caber completas no comparten una sola medida con lo anterior; parametrizar habría costado cuatro condicionales para dos layouts distintos. Lo que comparten es la disciplina de overlay (`Modal` transparente, telón que cierra al tocar fuera, `onRequestClose`): diez líneas que no justifican una abstracción.
- **`OfflineIndicator`** — **mudado** desde `modules/avance/components/`. Es un componente puro, y dejarlo en Avances habría obligado a que Reportes importara de otro módulo.

**Propios del módulo:**

- `DocumentoMiniatura` — el documento como lo verá el cliente, con dos modos: solo lectura (detalle) y editable por bloque (paso 4).
- `WizardShell` / `WizardStepper` / `BotonWizard`
- `FotoBatchCarousel` / `ReordenarFotos`
- `IndicadorSincronizacion` — cableado del `OfflineIndicator` con los conteos de la cola.

### State Management

Tres capas, deliberadamente separadas:

| Capa | Qué guarda | Dónde |
| --- | --- | --- |
| **Borrador** | La captura en curso | Context + reducer (memoria) |
| **Cola** | Lo declarado terminado | Realm |
| **Servidor** | El historial de la obra | React Query |

`useReportesDeObra` **funde la cola con el servidor y deduplica por `reporteId`**: la copia local se descarta en cuanto el servidor la devuelve, así el número de filas antes y después del refetch es el mismo.

**`syncNow` siempre sale del contexto de `SyncWorkerProvider`.** Montar `useReporteSyncWorker` en una pantalla crearía un **segundo worker** sobre la misma cola, con dos ciclos pisándose.

### Design Patterns & Key Decisions

**El roster sobrevive sin señal.** `useProveedores` usa `gcTime: 30 días` y `networkMode: "offlineFirst"`, y la pantalla **prefiere la copia sobre el error** — React Query deja `isError` en `true` cuando falla un refetch de fondo, pero `data` conserva lo último traído. Con el `gcTime` por defecto, salir del módulo diez minutos bastaba para quedarse sin copia. `ReportSelectionScreen` monta la consulta sin usar su resultado, para dejar la copia lista antes de que el usuario llegue a P-00 en obra.

**`null` no es "sin red".** `useNetworkStatus` devuelve `true | false | null`, donde `null` es *todavía no se sabe*. Se compara contra `false`, nunca con `!`. La asimetría manda: el costo de intentar sin conexión es una petición que falla y se reintenta; el de no intentar creyendo que no hay red es **una cola trabada indefinidamente**. Por lo mismo, `isInternetReachable` se compara contra `false` y no contra `true` — NetInfo lo resuelve sondeando un host propio, y en red de obra esa sonda puede fallar con la API respondiendo bien.

**Reintentos con criterio.** Un 4xx no se arregla reintentando; un 5xx o un corte sí. Se clasifica por `ApiError.status`, con 408 y 429 como transitorios. Sin esto, los tres intentos se queman en siete segundos contra un servidor que minutos después habría funcionado — y una falla pasajera se vuelve pérdida permanente.

**La cola se puede rescatar.** Un reporte fallido muestra el motivo real y ofrece **Reintentar** (devuelve el presupuesto completo de intentos: que lo pida una persona significa que sabe algo que el teléfono no) o **Descartar**. La pantalla no llama al worker; devuelve el reporte a `pending` y el worker del provider reacciona.

**Un solo pipeline de fotos, con el ancho parametrizado.** `ANCHO_FOTO_AVANCE = 1200` y `ANCHO_FOTO_REPORTE = 1920`. Importa porque el bloque de foto se imprime a 4.5": 1200 px ≈ 267 DPI, 1920 ≈ 427.

### New Environment Variables

Ninguna. El módulo no agrega configuración.

---

## 4. Technical Debt & TODOs

La lista viva, con su razonamiento, está en **`docs/adr/ADR-006-reporte-de-actividades.md` § Deuda técnica**. Lo que bloquea o arriesga:

1. **El borrador no se persiste.** Decidido a corregir. La ventana de pérdida va desde que se abre el wizard hasta que se toca "Enviar" — que es la parte más larga del flujo y la que contiene todo el trabajo del usuario.
2. **`useAdvanceSyncWorker` y `usePhotoSyncWorker` siguen con `!isOnline`.** El defecto que se corrigió aquí sigue vivo en avances; la siembra de `useNetworkStatus` lo mitiga pero no lo cierra.
3. **La edición desde la app está diferida.** El backend ya acepta PATCH del autor. El camino previsto: reutilizar la sección de Revisión, donde cada bloque ya tiene su ✎ y ya rutea.
4. **`ReordenarFotos` funciona pero no está optimizado.**
5. **`getProveedores` sigue en `reporteService.ts`** aunque el roster ya no sea un hecho del reporte.
6. **Faltan `reporte_archivo_generated` y `reporte_detail_opened`** en telemetría.
7. **Piezas pendientes de rebuild nativo**: `softwareKeyboardLayoutMode: "pan"` y `expo-media-library`.

---

## Ver también

- `docs/adr/ADR-006-reporte-de-actividades.md` — decisiones del cliente y sus enmiendas
- `docs/ADR/ADR-004-reporte-de-actividades.md` (repo backend) — persistencia, permisos, versionado y motor de generación
- `docs/auditoria-autenticacion.md` (repo backend) — el flujo de autenticación que este módulo consume
- `docs/ux/ux-spec-02.html` — flujo completo y geometría del documento
- `docs/silent-token-refresh.md` — refresh silencioso y distinción entre fallo de credenciales y fallo de red
- `docs/sabana-home-fase2-programa.md` — la fase anterior, de donde salen `escala.ts` y los patrones de módulo
