# Telemetría Backend — Guía de Implementación

**Decisión:** [ADR-001](../adr/ADR-001-telemetry-adoption.md)  
**Stack:** Django + Azure Application Insights (`opencensus-ext-django`)

---

## Paso 1 — Crear recurso App Insights en Azure Portal

1. Azure Portal → "Application Insights" → Crear recurso
2. Región: **Mexico Central** (misma que App Service)
3. Copiar `INSTRUMENTATION_KEY` (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
4. App Insights → Usage and estimated costs → Data retention → **365 days**

---

## Paso 2 — Dependencias

```bash
pip install opencensus-ext-django opencensus-ext-azure
```

Agregar a `requirements.txt`.

---

## Paso 3 — Django settings

```python
# settings.py

OPENCENSUS = {
    'TRACE': {
        'SAMPLER': 'opencensus.trace.samplers.AlwaysOnSampler()',
        'EXPORTER': '''opencensus.ext.azure.trace_exporter.AzureExporter(
            connection_string="InstrumentationKey=TU_KEY_AQUI"
        )''',
    }
}

MIDDLEWARE = [
    'opencensus.ext.django.middleware.OpencensusMiddleware',
    # ...resto de middleware existente
]
```

`INSTRUMENTATION_KEY` debe ser variable de entorno en Azure App Service, no hardcodeada.

---

## Paso 4 — Custom events en 4 vistas

Patrón base — agregar en cada vista que emita un evento:

```python
from opencensus.ext.azure.log_exporter import AzureLogHandler
import logging

logger = logging.getLogger(__name__)
logger.addHandler(AzureLogHandler(
    connection_string='InstrumentationKey=TU_KEY_AQUI'
))
```

**`avance/views.py`:**

```python
class AvanceCreateView(CreateAPIView):
    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info(
            'avance_created',
            extra={
                'custom_dimensions': {
                    'user_id': str(self.request.user.id),
                    'obra_id': str(instance.obra_id),
                    'role': self.request.user.role,
                }
            }
        )
```

Repetir patrón en:

- `incidencias/views.py` → evento `incidencia_created`
- `avance/views.py` bulk-upload → evento `photos_uploaded`
- `usuarios/views.py` me/ → evento `user_session_started`

---

## Paso 5 — Verificación

1. Registrar 1 avance en staging
2. App Insights → Search → Custom Events → confirmar evento `avance_created`
3. Verificar que `user_id` y `obra_id` aparecen en `customDimensions`

---

## Power BI — Setup para Sergio

**Conectar Power BI Desktop a App Insights:**

1. Power BI Desktop → Get Data → Azure → **Azure Application Insights**
2. Autenticar con cuenta Azure de Sergio
3. Queries disponibles inmediatamente en el editor de consultas

**Dashboard sugerido — 4 páginas base:**

| Visual                                      | Query KQL base                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Usuarios activos por semana                 | `requests \| summarize dcount(user_Id) by bin(timestamp, 7d)`                                                   |
| Avances registrados por obra                | `customEvents \| where name == "avance_created" \| summarize count() by tostring(customDimensions.obra_id)`     |
| Endpoints sin tráfico (funciones no usadas) | `requests \| summarize count() by name \| order by count_ asc`                                                  |
| Tasa de éxito de sync offline               | `requests \| where url contains "avance" \| summarize success_rate = avg(toint(success)) by bin(timestamp, 1d)` |

Para queries adicionales ver [Azure Logs Field Guide](../azure-logs-guide.md).

---

## Fuentes de datos por pregunta de negocio

| Pregunta                        | Fuente en App Insights                                                            |
| ------------------------------- | --------------------------------------------------------------------------------- |
| ¿Se usa la app?                 | `requests` → `user_Id` únicos por semana                                          |
| ¿Se registran avances?          | `customEvents where name == "avance_created"`                                     |
| ¿Cuántos avances por obra?      | Custom event `avance_created` con dimensión `obra_id`                             |
| ¿Qué % de funcionalidad se usa? | `requests` agrupados por `name` (endpoint)                                        |
| ¿Qué NO se usa?                 | Endpoints con 0 o muy pocas llamadas: `/api/cronograma/`, Inspector/Inversionista |
