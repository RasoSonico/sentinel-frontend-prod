# Telemetría Frontend — Guía de Implementación

**Decisión:** [ADR-002](../adr/ADR-002-frontend-telemetry.md)  
**Stack:** React Native (Expo managed) + `@microsoft/applicationinsights-react-native`

---

## Setup

```bash
npx expo install @microsoft/applicationinsights-react-native
```

Agregar a `.env` y `.env.example`:

```
EXPO_PUBLIC_APPINSIGHTS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Agregar también a EAS secrets y a Azure App Service env vars.

---

## Estructura de archivos

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
        AdvanceRegistrationScreen.tsx  ← trackEvent advance_form_opened (MODIFICAR)
      hooks/
        useSubmitAdvance.ts            ← trackEvent advance_submitted (MODIFICAR)
    incidencia/
      hooks/
        useCreateIncidentMutation.ts   ← trackEvent incident_submitted (MODIFICAR)
    avance/
      screens/
        PendingSyncScreen.tsx          ← trackEvent sync_triggered (MODIFICAR)
```

---

## `src/services/telemetry.ts`

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
        enableAutoRouteTracking: false,
      },
    });

    this.client.loadAppInsights();
    this.client.setAuthenticatedUserContext(userId);
    this.client.addTelemetryInitializer((envelope) => {
      envelope.data = { ...envelope.data, role };
    });

    this.initialized = true;
  }

  trackScreen(screenName: string, properties?: Record<string, string>) {
    this.client?.trackPageView({ name: screenName, properties });
  }

  trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
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

## `src/providers/TelemetryProvider.tsx`

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

## Screen tracking via React Navigation

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

---

## Call sites por evento

### `advance_form_opened` + `advance_submitted`

`form_session_id` — UUID fijo por ciclo de vida del form. Si el usuario sale sin enviar, existe en `advance_form_opened` pero no en `advance_submitted` → abandono exacto, sin ventana de tiempo.

```typescript
// AdvanceRegistrationScreen.tsx
import { useRef, useEffect } from "react";
import { telemetry } from "@/services/telemetry";

export function AdvanceRegistrationScreen() {
  const formSessionId = useRef(crypto.randomUUID()).current;

  useEffect(() => {
    telemetry.trackEvent("advance_form_opened", {
      obra_id: selectedObraId,
      form_session_id: formSessionId,
    });
  }, []);

  const { submit } = useSubmitAdvance({ formSessionId });
}
```

```typescript
// useSubmitAdvance.ts
onSuccess: (data, variables) => {
  telemetry.trackEvent('advance_submitted', {
    obra_id: variables.obraId,
    catalog_id: variables.catalogId,
    has_photos: variables.photos.length > 0,
    photo_count: variables.photos.length,
    was_offline: false,
    form_session_id: variables.formSessionId,
  });
},
onError: (error) => {
  telemetry.trackError(error, { context: 'advance_submitted' });
},
```

### `incident_submitted`

```typescript
// useCreateIncidentMutation.ts
onSuccess: (data, variables) => {
  telemetry.trackEvent('incident_submitted', {
    obra_id: variables.obraId,
    incident_type_id: variables.incidentTypeId,
    classification_id: variables.classificationId,
  });
},
```

### `sync_triggered` + `sync_completed`

```typescript
// PendingSyncScreen.tsx — manual tap
telemetry.trackEvent('sync_triggered', {
  pending_advances: pendingAdvances.length,
  pending_photos: pendingPhotos.length,
  trigger: 'manual',
});

// useAdvanceSyncWorker.ts — onSuccess
telemetry.trackEvent('sync_completed', {
  advances_synced: result.advancesSynced,
  photos_synced: result.photosSynced,
  failures: result.failures,
});
```

### `auth_session_expired`

```typescript
// API interceptor (axios/fetch) — on HTTP 401 response
telemetry.trackEvent('auth_session_expired', {
  endpoint: request.url,
  had_queued_advances: pendingAdvances.length > 0,
});
```

---

## Fuentes de datos por pregunta de negocio

| Pregunta | Query KQL |
| --- | --- |
| ¿Se usa la app? | `pageViews \| summarize dcount(user_Id) by bin(timestamp, 7d)` |
| Pantallas más visitadas | `pageViews \| summarize count() by name \| order by count_ desc` |
| ¿Se registran avances? | `customEvents \| where name == "advance_submitted" \| summarize count() by bin(timestamp, 1d)` |
| Avances por obra | `customEvents \| where name == "advance_submitted" \| summarize count() by tostring(customDimensions.obra_id)` |
| Formularios abandonados | Ver query extendida abajo |
| Uso offline | `customEvents \| where name == "advance_submission_queued" \| summarize count() by bin(timestamp, 1d)` |
| Frecuencia de expiración de sesión | `customEvents \| where name == "auth_session_expired" \| summarize count() by bin(timestamp, 1d)` |
| 401 con avances pendientes | `customEvents \| where name == "auth_session_expired" and tobool(customDimensions.had_queued_advances) == true` |

### Query: Formularios abandonados

```kusto
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

El `leftanti` devuelve solo los `form_opened` que nunca tuvieron un `submitted` con el mismo UUID — independientemente de cuándo o si el usuario volvió a intentarlo.

Para queries adicionales ver [Azure Logs Field Guide](../azure-logs-guide.md).
