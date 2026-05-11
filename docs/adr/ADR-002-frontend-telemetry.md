# ADR-002: Telemetría en el Frontend React Native (Sentinel)

**Status:** Accepted
**Fecha:** 2026-04-25  
**Decisores:** Gio (consultor), Sergio Cota (PM/dev), Director (stakeholder)  
**Depende de:** ADR-001 (Azure Application Insights como backend de telemetría)  
**Ver costos:** [Sección Costos en ADR-001](./ADR-001-telemetry-adoption.md#costos)

---

## Contexto

ADR-001 define que el backend Django emitirá telemetría a Azure Application Insights.  
Este ADR define cómo hacer lo mismo desde el **frontend React Native (Expo managed workflow)**.

El frontend tiene 9 pantallas activas y 6 placeholders. Solo el rol CONTRATISTA hace
acciones de negocio reales (registrar avances, incidencias). Los demás roles ven vistas
esqueleto. La app es offline-first (Realm + TanStack Query).

**Preguntas que el frontend debe responder que el backend NO puede:**

| Pregunta                                                | Por qué backend no alcanza                 |
| ------------------------------------------------------- | ------------------------------------------ |
| ¿El usuario abrió el formulario pero no lo envió?       | Backend solo ve el POST exitoso            |
| ¿Cuántas fotos adjunta un contratista por avance?       | Backend ve el bulk-upload, no la intención |
| ¿El usuario usa filtros en la lista de incidencias?     | Filtrado es client-side, no toca API       |
| ¿Cuánto tiempo pasan en el formulario de avance?        | El backend no tiene ese dato               |
| ¿Cuántas veces ven la pantalla de Cola sin sincronizar? | Interacción sin API call                   |
| ¿El usuario cambia de obra antes de registrar?          | Drop-down local, no API call               |

---

## Decisión

**Usar `@microsoft/applicationinsights-react-native` apuntando al mismo recurso App Insights de ADR-001.**

Un singleton `TelemetryService` expone `trackEvent()` y `trackScreen()`.  
React Navigation dispara `trackScreen()` automáticamente via `onStateChange` — sin tocar ningún screen component.  
Se agregan `trackEvent()` calls en 7 puntos de negocio.

---

## Opciones Consideradas

### Opción A: `@microsoft/applicationinsights-react-native` ✅ RECOMENDADA

SDK oficial de Microsoft para React Native. Compatible con Expo managed workflow (no requiere módulos nativos). Usa `fetch` internamente.

| Dimensión           | Evaluación                                                     |
| ------------------- | -------------------------------------------------------------- |
| Costo               | **$0** — mismo recurso App Insights de ADR-001                 |
| Compatibilidad Expo | **Sí** — pure JS, sin módulos nativos                          |
| Azure unificado     | **Sí** — mismo portal, misma query en Power BI                 |
| API familiar        | **Sí** — `trackEvent()`, `trackPageView()`, `trackException()` |
| Mantenimiento       | **Bajo** — patrón repetible que Sergio puede copiar            |
| Tiempo (Gio)        | **2–3 hrs**                                                    |

**Pros:**

- Backend + frontend en un solo App Insights → Power BI ve todo junto
- Captura automática de excepciones JS no manejadas
- Queue interno: retiene eventos si no hay conexión, envía en batch al reconectar
- `user_id` ya viene del JWT de Azure AD → correlación directa con backend

**Cons:**

- Paquete de Microsoft, relativamente pesado (~150KB gzipped)
- Expo managed: sin acceso a Device ID nativo (usar UUID generado en primer launch)

---

### Opción B: Wrapper casero sobre App Insights REST API

POST directo a `https://dc.services.visualstudio.com/v2/track` con fetch.  
~60 líneas de código, cero dependencias extra.

| Dimensión    | Evaluación                                                 |
| ------------ | ---------------------------------------------------------- |
| Costo        | $0                                                         |
| Control      | Total                                                      |
| Tiempo (Gio) | 3–4 hrs (incluye queue offline, retry)                     |
| Riesgo       | Medio — hay que reimplementar batch, retry, error handling |

**Cons:** Reinventa la rueda. El SDK oficial ya tiene batch, retry, offline queue. No merece la pena.

---

### Opción C: Firebase Analytics (Google)

SDK maduro, Expo plugin disponible, gratuito.

| Dimensión            | Evaluación                                      |
| -------------------- | ----------------------------------------------- |
| Ecosistema           | Google, no Azure                                |
| Power BI integration | No nativa — necesita BigQuery export + conector |
| Complejidad total    | Alta — dos vendors, dos portales                |

**Descartado:** El objetivo es que Sergio pueda construir dashboards en Power BI sin fricción. Firebase requiere salida a BigQuery y conector adicional.

---

## Eventos de Negocio a Instrumentar (7 puntos)

| Evento                      | Dónde                                 | Propiedades                                                                                                                          |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `advance_form_opened`       | `AdvanceRegistrationScreen` mount     | `obra_id`, `role`, `form_session_id` (UUID generado en mount)                                                                        |
| `advance_submitted`         | `useSubmitAdvance` onSuccess          | `obra_id`, `catalog_id`, `has_photos: bool`, `photo_count: int`, `was_offline: bool`, `form_session_id` (mismo UUID del form_opened) |
| `advance_submission_queued` | `useSubmitAdvance` onOfflineQueue     | `obra_id`, `queue_size: int`                                                                                                         |
| `incident_submitted`        | `useCreateIncidentMutation` onSuccess | `obra_id`, `incident_type_id`, `classification_id`                                                                                   |
| `sync_triggered`            | `PendingSyncScreen` manual tap        | `pending_advances: int`, `pending_photos: int`, `trigger: 'manual' \| 'auto'`                                                        |
| `sync_completed`            | `useAdvanceSyncWorker` onSuccess      | `advances_synced: int`, `photos_synced: int`, `failures: int`                                                                        |
| `auth_session_expired`      | API interceptor on HTTP 401           | `endpoint: string`, `had_queued_advances: bool`                                                                                      |

`form_session_id` — UUID generado en mount del formulario. Enlaza `advance_form_opened` con `advance_submitted` para detectar abandonos exactos (sin ventana de tiempo).

---

## Privacidad y Seguridad

- **No enviar PII**: solo `user_id` (UUID de Azure AD), no email ni nombre
- **No enviar contenido de formularios**: solo metadata (obra_id, count, booleans)
- **`EXPO_PUBLIC_APPINSIGHTS_KEY`** es la Instrumentation Key, semi-pública por diseño (mecanismo de ingesta, no de lectura). Aceptable en cliente.
- Datos almacenados en Azure Mexico Central (mismo datacenter que el backend)

---

## Costos

Frontend usa el **mismo recurso App Insights de ADR-001** — sin costo adicional.

| Concepto                                          | Costo mensual (MXN)          | Nota                                   |
| ------------------------------------------------- | ---------------------------- | -------------------------------------- |
| SDK `@microsoft/applicationinsights-react-native` | **$0**                       | Open source, MIT                       |
| Ingesta de eventos frontend                       | **$0**                       | Comparte cuota de 5 GB/mes con backend |
| Incremento estimado de ingesta (frontend)         | +~20–30% del volumen backend | Sigue bajo el free tier                |

Ver proyección completa en [ADR-001 § Costos](./ADR-001-telemetry-adoption.md#costos).

---

## Consecuencias

**Se vuelve posible:**

- Detectar si contratistas abren el formulario pero no completan (funnel de conversión)
- Saber qué pantallas NO se usan (confirmar que INSPECTOR/INVERSIONISTA views son esqueleto en producción)
- Correlacionar eventos frontend + backend en App Insights por `user_Id` y timestamp

**Se vuelve más complejo:**

- El bundle del app crece ~150KB (aceptable para este tipo de app)
- `EXPO_PUBLIC_APPINSIGHTS_KEY` debe estar en `.env` local y en EAS build secrets

**Para revisar en el futuro:**

- Agregar tracking de errores de red (red offline, timeouts) para diagnosticar fallos de sync
- Considerar sampling (1 de cada N eventos) si el volumen crece y supera el free tier de App Insights

---

## Resumen ejecutivo (para el Director)

> Vamos a agregar monitoreo también a la aplicación del celular. Cada vez que un trabajador abre una pantalla, registra un avance, o sube una foto, quedará un registro anónimo en el mismo sistema de monitoreo de Microsoft Azure. Esto permite ver no solo cuántos avances se registraron, sino también si los trabajadores empezaron a llenar el formulario y lo dejaron a medias — algo que el servidor solo no puede detectar. Sergio puede construir estos reportes en Power BI por su cuenta.

---

## Ver también

- [Implementación frontend](../implementation/telemetry-frontend.md) — código TypeScript, estructura de archivos, call sites
- [ADR-001](./ADR-001-telemetry-adoption.md) — decisión de backend, costos completos
- [Azure Logs Field Guide](../azure-logs-guide.md) — KQL queries, Power BI setup, arquitectura Azure Monitor
