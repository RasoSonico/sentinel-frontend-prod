# ADR-002: Telemetría en el Frontend React Native (Sentinel)

**Status:** Proposed  
**Fecha:** 2026-04-25  
**Decisores:** Gio (consultor), Sergio Cota (PM/dev), Director (stakeholder)  
**Depende de:** ADR-001 (Azure Application Insights como backend de telemetría)  
**Ver costos:** [`docs/cost-estimate-telemetry.md`](../docs/cost-estimate-telemetry.md)

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

Un singleton `TelemetryService` en `src/services/telemetry.ts` expone `trackEvent()` y `trackScreen()`.  
React Navigation dispara `trackScreen()` automáticamente via `onStateChange`.  
Se agregan `trackEvent()` calls en 6 mutations de negocio.

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

## Arquitectura de la Solución

### Estructura de archivos

```
src/
  services/
    telemetry.ts          ← singleton TelemetryService  (NUEVO)
  providers/
    TelemetryProvider.tsx ← inicializa SDK en app startup (NUEVO)
  navigation/
    AppNavigator.tsx      ← agregar onStateChange → trackScreen() (MODIFICAR)
  modules/
    avance/
      screens/
        AdvanceRegistrationScreen.tsx  ← trackEvent avance_form_opened/submitted (MODIFICAR)
      hooks/
        useSubmitAdvance.ts            ← trackEvent avance_submitted (MODIFICAR)
    incidencia/
      hooks/
        useCreateIncidentMutation.ts   ← trackEvent incidencia_submitted (MODIFICAR)
    avance/
      screens/
        PendingSyncScreen.tsx          ← trackEvent sync_triggered (MODIFICAR)
```

---

### `src/services/telemetry.ts`

```typescript
import { ApplicationInsights } from "@microsoft/applicationinsights-react-native";

const INSTRUMENTATION_KEY = process.env.EXPO_PUBLIC_APPINSIGHTS_KEY ?? "";

class TelemetryService {
  private client: ApplicationInsights;
  private initialized = false;

  init(userId: string, role: string) {
    if (this.initialized) return;

    this.client = new ApplicationInsights({
      config: {
        instrumentationKey: INSTRUMENTATION_KEY,
        disableAjaxTracking: false,
        disableFetchTracking: false,
        enableAutoRouteTracking: false, // manejamos manualmente con React Navigation
      },
    });

    this.client.loadAppInsights();
    this.client.setAuthenticatedUserContext(userId);
    this.client.addTelemetryInitializer((envelope) => {
      envelope.data = {
        ...envelope.data,
        role,
      };
    });

    this.initialized = true;
  }

  trackScreen(screenName: string, properties?: Record<string, string>) {
    this.client?.trackPageView({ name: screenName, properties });
  }

  trackEvent(
    name: string,
    properties?: Record<string, string | number | boolean>,
  ) {
    this.client?.trackEvent({ name }, properties);
  }

  trackError(error: Error, properties?: Record<string, string>) {
    this.client?.trackException({ exception: error, properties });
  }

  flush() {
    this.client?.flush();
  }
}

export const telemetry = new TelemetryService();
```

---

### `src/providers/TelemetryProvider.tsx`

```typescript
import { useEffect } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { telemetry } from '@/services/telemetry';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    if (user?.id && user?.role) {
      telemetry.init(user.id, user.role);
    }
  }, [user?.id, user?.role]);

  return <>{children}</>;
}
```

Envolver `<TelemetryProvider>` dentro de `<AuthProvider>` en `App.tsx`, después de que el usuario esté autenticado.

---

### Screen tracking via React Navigation

```typescript
// AppNavigator.tsx
import { telemetry } from '@/services/telemetry';

const getActiveRouteName = (state: NavigationState): string => {
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
};

// En NavigationContainer:
<NavigationContainer
  onStateChange={(state) => {
    if (!state) return;
    const screen = getActiveRouteName(state);
    telemetry.trackScreen(screen);
  }}
>
```

Esto captura **automáticamente** cada cambio de pantalla sin tocar ningún screen component.

---

## Eventos de Negocio a Instrumentar (6 puntos)

### Eventos y dónde van

| Evento                      | Dónde                                 | Propiedades                                                                                                                          |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `advance_form_opened`       | `AdvanceRegistrationScreen` mount     | `obra_id`, `role`, `form_session_id` (UUID generado en mount)                                                                        |
| `advance_submitted`         | `useSubmitAdvance` onSuccess          | `obra_id`, `catalog_id`, `has_photos: bool`, `photo_count: int`, `was_offline: bool`, `form_session_id` (mismo UUID del form_opened) |
| `advance_submission_queued` | `useSubmitAdvance` onOfflineQueue     | `obra_id`, `queue_size: int`                                                                                                         |
| `incident_submitted`        | `useCreateIncidentMutation` onSuccess | `obra_id`, `incident_type_id`, `classification_id`                                                                                   |
| `sync_triggered`            | `PendingSyncScreen` manual tap        | `pending_advances: int`, `pending_photos: int`, `trigger: 'manual' \| 'auto'`                                                        |
| `sync_completed`            | `useAdvanceSyncWorker` onSuccess      | `advances_synced: int`, `photos_synced: int`, `failures: int`                                                                        |
| `auth_session_expired`      | API interceptor on HTTP 401           | `endpoint: string`, `had_queued_advances: bool`                                                                                      |

### Ejemplo de implementación

**`AdvanceRegistrationScreen.tsx` — generar `form_session_id` en mount:**

```typescript
import { useRef } from "react";
import { v4 as uuid } from "uuid"; // expo-crypto o crypto.randomUUID() en RN 0.73+
import { telemetry } from "@/services/telemetry";

export function AdvanceRegistrationScreen() {
  // UUID fijo para el ciclo de vida de este form: si se envía, aparece en ambos eventos.
  // Si el usuario sale sin enviar, solo existe en advance_form_opened → es un abandono.
  const formSessionId = useRef(crypto.randomUUID()).current;

  useEffect(() => {
    telemetry.trackEvent("advance_form_opened", {
      obra_id: selectedObraId,
      form_session_id: formSessionId,
    });
  }, []);

  // Pasar formSessionId al hook de submit:
  const { submit } = useSubmitAdvance({ formSessionId });
  // ...
}
```

**`useSubmitAdvance.ts` — propagar `form_session_id`:**

```typescript
onSuccess: (data, variables) => {
  telemetry.trackEvent('advance_submitted', {
    obra_id: variables.obraId,
    catalog_id: variables.catalogId,
    has_photos: variables.photos.length > 0,
    photo_count: variables.photos.length,
    was_offline: false,
    form_session_id: variables.formSessionId, // ← mismo UUID del mount
  });
},
onError: (error) => {
  telemetry.trackError(error, { context: 'advance_submitted' });
},
```

---

## Mapeo: Pregunta → Fuente de datos en App Insights

| Pregunta                   | Query KQL                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ¿Se usa la app?            | `pageViews \| summarize dcount(user_Id) by bin(timestamp, 7d)`                                                 |
| Pantallas más visitadas    | `pageViews \| summarize count() by name \| order by count_ desc`                                               |
| ¿Se registran avances?     | `customEvents \| where name == "advance_submitted" \| summarize count() by bin(timestamp, 1d)`                 |
| Avances por obra           | `customEvents \| where name == "advance_submitted" \| summarize count() by tostring(customDimensions.obra_id)` |
| Formularios abandonados    | Ver query extendida abajo — join exacto por `form_session_id`                                                  |
| % app usada (por pantalla) | `pageViews \| summarize count() by name` — pantallas con 0 = no usadas                                         |
| Uso offline                | `customEvents \| where name == "advance_submission_queued" \| summarize count() by bin(timestamp, 1d)`         |
| Tasa de sync exitoso       | `customEvents \| where name in ("sync_triggered","sync_completed") \| ...`                                     |
| Frecuencia de expiración   | `customEvents \| where name == "auth_session_expired" \| summarize count() by bin(timestamp, 1d)`              |
| 401 con avances pendientes | `customEvents \| where name == "auth_session_expired" and tobool(customDimensions.had_queued_advances) == true` |

### Query extendida: Formularios abandonados

```kusto
// form_session_id enlaza advance_form_opened con advance_submitted exactamente.
// No hay ventana de tiempo: si el UUID nunca aparece en submitted = abandono real.
let opened = customEvents
    | where name == "advance_form_opened"
    | extend form_session_id = tostring(customDimensions.form_session_id)
    | extend obra_id = tostring(customDimensions.obra_id);

let submitted = customEvents
    | where name == "advance_submitted"
    | extend form_session_id = tostring(customDimensions.form_session_id);

opened
| join kind=leftanti submitted on form_session_id
| summarize abandoned_count = count() by bin(timestamp, 1d), obra_id
| order by timestamp desc
```

**Por qué esto es correcto:** el `form_session_id` es un UUID generado en el `useRef` del mount del formulario. Si el usuario envía, ese mismo UUID va en `advance_submitted`. El `leftanti` devuelve solo los `form_opened` que nunca tuvieron un `submitted` con el mismo ID — independientemente de cuándo o si el usuario volvió a intentarlo.

---

## Lo que hace Gio (2–3 hrs)

1. **Instalar paquete** — `npx expo install @microsoft/applicationinsights-react-native`
2. **Crear `TelemetryService`** — singleton en `src/services/telemetry.ts`
3. **Crear `TelemetryProvider`** — wrapper que inicializa con user data
4. **Integrar en AppNavigator** — `onStateChange` → `trackScreen()`
5. **7 `trackEvent()` calls** — en hooks/mutations listados arriba + interceptor HTTP para 401
6. **Variables de entorno** — agregar `EXPO_PUBLIC_APPINSIGHTS_KEY` a `.env` y a Azure App Service config
7. **Verificación** — correr app en simulador, confirmar eventos en App Insights Live Metrics

---

## Lo que hace Sergio

- Power BI Desktop: misma conexión App Insights de ADR-001 ya incluye datos frontend
- Agregar nuevas páginas al dashboard existente con las queries de la tabla anterior
- Para agregar nuevos eventos: copiar patrón `telemetry.trackEvent('nombre', { props })` donde necesite

---

## Privacidad y Seguridad

- **No enviar PII**: solo `user_id` (UUID de Azure AD), no email ni nombre
- **No enviar contenido de formularios**: solo metadata (obra_id, count, booleans)
- **`EXPO_PUBLIC_APPINSIGHTS_KEY`** es la Instrumentation Key, que es semi-pública por diseño de App Insights (es el mecanismo de ingesta, no de lectura). Aceptable en cliente.
- Datos almacenados en Azure Mexico Central (mismo datacenter que el backend)

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

## Action Items

- [ ] **Gio** — `npx expo install @microsoft/applicationinsights-react-native`
- [ ] **Gio** — Crear `src/services/telemetry.ts` (TelemetryService singleton)
- [ ] **Gio** — Crear `src/providers/TelemetryProvider.tsx`
- [ ] **Gio** — Modificar `AppNavigator.tsx` — screen tracking via `onStateChange`
- [ ] **Gio** — Agregar 7 `trackEvent()` calls en hooks/screens listados + interceptor HTTP para 401
- [ ] **Gio** — Agregar `EXPO_PUBLIC_APPINSIGHTS_KEY` a `.env.example` y documentar
- [ ] **Sergio** — Agregar key a EAS secrets / Azure App Service env vars
- [ ] **Sergio** — Extender dashboard Power BI con queries frontend (tabla de mapeo en este ADR)
