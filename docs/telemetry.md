# Telemetría — Sentinel Frontend

**Decisión:** [ADR-002](./adr/ADR-002-frontend-telemetry.md)  
**Stack:** React Native (Expo managed) + `@microsoft/applicationinsights-react-native`

---

## Cómo funciona

Hay **dos mecanismos** que alimentan App Insights desde el frontend:

### 1. Screen tracking automático (`pageViews` table)

`RootNavigator` escucha `onStateChange` de React Navigation y llama `telemetry.trackScreen()` en cada cambio de pantalla. Sin código extra en los screen components.

Captura:
- Nombre de la pantalla (`name`)
- Timestamp
- `user_Id` (vía `setAuthenticatedUserContext`)
- `role` y `env` (vía telemetryInitializer — ver abajo)

### 2. Eventos de negocio (`customEvents` table)

Llamadas manuales a `telemetry.trackEvent()` en hooks y screens. Capturan contexto que el backend no puede ver: formularios abiertos pero no enviados, comportamiento offline, sincronizaciones manuales.

### Dimensiones globales (telemetryInitializer)

Cada envelope — eventos, pantallas y excepciones — recibe automáticamente:

| Dimensión | Valor | Propósito |
|-----------|-------|-----------|
| `role` | Rol del usuario autenticado | Segmentar por tipo de usuario |
| `env` | `"dev"` en Expo Go / `__DEV__`, `"prod"` en build de producción | Filtrar tráfico de desarrollo en KQL |

`env` usa el global `__DEV__` de React Native — `true` en Expo Go y simulador, `false` en builds de EAS. El bundler elimina la rama muerta en producción.

---

## Variables de entorno

| Variable | Descripción | Local | EAS / Azure App Service |
|----------|-------------|-------|--------------------------|
| `EXPO_PUBLIC_APPINSIGHTS_KEY` | Instrumentation Key de App Insights | En `.env` | EAS Secrets + App Service Configuration |

La Instrumentation Key es semi-pública por diseño (mecanismo de ingesta, no de lectura). Es aceptable en el bundle del cliente.

Si la variable no está definida, el SDK se inicializa con key vacía y descarta los eventos silenciosamente. No rompe nada en local sin conexión configurada.

---

## Eventos instrumentados

| Evento | Dónde | Propiedades |
|--------|-------|-------------|
| `advance_form_opened` | `AdvanceRegistrationScreen` mount | `obra_id`, `role`, `form_session_id` |
| `advance_submission_queued` | `useAdvanceSubmitToQueue` — avance guardado en cola Realm | `obra_id`, `queue_size`, `form_session_id` |
| `advance_submitted` | `useAdvanceSyncWorker` — avance sincronizado con el backend | `obra_id`, `catalog_id`, `has_photos`, `photo_count`, `was_offline` |
| `incident_submitted` | `useIncidenciaQueries` — mutación exitosa | `incident_type_id`, `classification_id` |
| `sync_triggered` | `PendingSyncScreen` — tap manual en botón sync | `pending_advances`, `pending_photos`, `trigger` |
| `sync_completed` | `useAdvanceSyncWorker` — ciclo de sync terminado | `advances_synced`, `photos_synced`, `failures` |
| `auth_session_expired` | `apiClient` — refresh fallido o segundo 401 | `endpoint`, `had_queued_advances` |
| `hoy_counter_tapped` | `SabanaScreen` — tap en contador de la franja Hoy (ADR-003) | `counter` (`avances` \| `fotos` \| `incidencias`) |
| `reporte_del_dia_tapped` | `SabanaScreen` — botón "Reporte del día" de la franja Hoy (ADR-003) | `obra_id` |

### Notas sobre el estado actual

- **`advance_submitted`** se dispara en tiempo de sincronización (no en submit). `was_offline` siempre es `true`. `form_session_id` no está disponible en el worker — el join con `advance_form_opened` para detectar abandonos solo aplica a `advance_submission_queued`.
- **`incident_submitted`** no incluye `obra_id` todavía — el hook no tiene ese contexto disponible.
- **`sync_completed`** tiene `photos_synced: 0` fijo — la sincronización de fotos aún no está instrumentada.
- **`auth_session_expired`** tiene `had_queued_advances: false` fijo — la consulta a Realm para conteo de pendientes no está conectada.

---

## Agregar un nuevo evento

```typescript
import { telemetry } from "@/services/telemetry";

// En cualquier hook o screen, después de la operación:
telemetry.trackEvent("nombre_evento", {
  obra_id: constructionId,
  alguna_prop: valor,
});
```

`role` y `env` se agregan automáticamente a todos los eventos via telemetryInitializer. No hace falta incluirlos en el call site.

Si el SDK todavía no está inicializado (antes del login), el evento se encola en memoria y se envía automáticamente al hacer `init()`.

---

## KQL Queries

Filtrar solo producción en cualquier query:

```kql
| where customDimensions.env == "prod"
```

### Pantallas más visitadas

```kql
pageViews
| where customDimensions.env == "prod"
| where timestamp > ago(30d)
| summarize count() by name
| order by count_ desc
```

### Usuarios activos

```kql
pageViews
| where customDimensions.env == "prod"
| where timestamp > ago(30d)
| summarize usuarios_activos = dcount(user_Id) by bin(timestamp, 7d)
| order by timestamp desc
```

### Avances registrados por obra

```kql
customEvents
| where name == "advance_submitted"
| where customDimensions.env == "prod"
| where timestamp > ago(30d)
| summarize avances = count() by obra_id = tostring(customDimensions.obra_id)
| order by avances desc
```

### Formularios abandonados

`form_session_id` enlaza `advance_form_opened` con `advance_submission_queued`. Un `form_session_id` que aparece en `opened` pero no en `queued` es un abandono exacto.

```kql
let opened = customEvents
    | where name == "advance_form_opened"
    | where customDimensions.env == "prod"
    | extend form_session_id = tostring(customDimensions.form_session_id)
    | extend obra_id = tostring(customDimensions.obra_id);

let queued = customEvents
    | where name == "advance_submission_queued"
    | where customDimensions.env == "prod"
    | extend form_session_id = tostring(customDimensions.form_session_id);

opened
| join kind=leftanti queued on form_session_id
| summarize abandoned_count = count() by bin(timestamp, 1d), obra_id
| order by timestamp desc
```

### Uso offline (avances encolados)

```kql
customEvents
| where name == "advance_submission_queued"
| where customDimensions.env == "prod"
| where timestamp > ago(30d)
| summarize count() by bin(timestamp, 1d)
| order by timestamp desc
```

### Sincronizaciones manuales vs automáticas

```kql
customEvents
| where name == "sync_triggered"
| where customDimensions.env == "prod"
| where timestamp > ago(30d)
| summarize count() by trigger = tostring(customDimensions.trigger), bin(timestamp, 7d)
```

### Fallos de sincronización

```kql
customEvents
| where name == "sync_completed"
| where customDimensions.env == "prod"
| where toint(customDimensions.failures) > 0
| project timestamp, advances_synced = toint(customDimensions.advances_synced), failures = toint(customDimensions.failures)
| order by timestamp desc
```

### Expiración de sesión con avances pendientes

```kql
customEvents
| where name == "auth_session_expired"
| where customDimensions.env == "prod"
| where tobool(customDimensions.had_queued_advances) == true
| summarize count() by bin(timestamp, 1d)
```

### Dev vs prod (volumen comparativo)

```kql
customEvents
| where timestamp > ago(1d)
| summarize count() by env = tostring(customDimensions.env), bin(timestamp, 1h)
| order by timestamp desc
```

---

## Diferencia clave: `pageViews` vs `customEvents` vs `exceptions`

| | `pageViews` | `customEvents` | `exceptions` |
|-|------------|----------------|--------------|
| **Quién lo llena** | `telemetry.trackScreen()` vía `onStateChange` | `telemetry.trackEvent()` en hooks/screens | `telemetry.trackError()` en catch blocks |
| **Qué contiene** | Cada cambio de pantalla | Eventos de negocio con contexto | Errores JS capturados |
| **Para qué sirve** | Navegación, pantallas no usadas, sesiones | KPIs: avances, sync, funnel de formularios | Diagnóstico de errores en producción |
| **Código necesario** | Ninguno (automático vía navigator) | `trackEvent('nombre', props)` | `trackError(error, props)` |

---

## Notas de implementación

- `src/services/telemetry.ts` — singleton `TelemetryService` con cola interna pre-init
- `src/providers/TelemetryProvider.tsx` — llama `telemetry.init(userId, role)` al autenticarse
- `src/navigation/RootNavigator.tsx` — `onStateChange` → `trackScreen()`
- La cola pre-init retiene eventos que llegan antes del login (ej. si un screen monta antes de que `TelemetryProvider` inicialice el SDK) y los envía al hacer `init()`
- Logs de consola activos solo en `__DEV__` — sin overhead en producción
- Backend y frontend comparten el mismo recurso App Insights → correlación por `user_Id` y timestamp en una sola query KQL
