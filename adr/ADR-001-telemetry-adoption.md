# ADR-001: Instrumentación de Telemetría para Adopción de Sentinel

**Status:** Proposed  
**Fecha:** 2026-04-25  
**Decisores:** Gio (consultor), Sergio Cota (PM/dev), Director (stakeholder)

---

## Contexto

Sentinel es una app móvil (React Native/Expo) con backend Django en Azure App Service (Mexico Central).  
Usuarios registran **avances** de obra, **incidencias**, y gestionan **obras** desde el campo.

**No existe telemetría actualmente.**

Sergio y su Director necesitan respuestas a:

| Pregunta                      | Métrica necesaria                                            |
| ----------------------------- | ------------------------------------------------------------ |
| ¿Se está usando la app?       | Usuarios activos por día/semana                              |
| ¿Se registran avances?        | Conteo de avances creados por periodo                        |
| ¿Cuántos avances por obra?    | Avances agrupados por `obra_id`                              |
| ¿Qué % de la app se usa?      | Endpoints/pantallas con tráfico real                         |
| ¿Qué funcionalidad NO se usa? | Endpoints sin tráfico (Inspector, Inversionista, Cronograma) |

**Restricciones:**

- Implementación mínima — Sergio debe poder mantener y extender solo
- Stack ya vive en Azure → preferir servicios Azure nativos
- Sergio puede construir dashboards en Power BI por su cuenta

---

## Decisión

**Usar Azure Application Insights como backend de telemetría, instrumentado desde Django via middleware + 4 custom events.**

Gio implementa la capa de instrumentación (20%). Sergio construye dashboards en Power BI (80%) siguiendo la ley de pareto.

---

## Opciones Consideradas

### Opción A: Azure Application Insights ✅ RECOMENDADA

Agregar `opencensus-ext-django` al backend Django. Auto-instrumenta cada request HTTP. Agregar custom events en 4 puntos clave del código.

| Dimensión                | Evaluación                                                      |
| ------------------------ | --------------------------------------------------------------- |
| Costo                    | **~$0/mes** — 5 GB/mes gratis (Sentinel no alcanza ese volumen) |
| Complejidad de impl.     | **Baja** — 3 archivos a tocar, 1 recurso Azure nuevo            |
| Mantenimiento por Sergio | **Bajo** — solo agregar `track_event(...)` donde quiera         |
| Power BI integration     | **Nativa** — conector directo a App Insights o Log Analytics    |
| Tiempo estimado (Gio)    | **2–3 hrs**                                                     |

**Pros:**

- Ya están en Azure → mismo portal, mismo billing, misma cuenta
- Auto-captura: cada llamada API queda registrada (endpoint, user_id via header, status code, latency)
- Sin servidor adicional, sin base de datos extra
- Power BI puede conectar directo a Log Analytics workspace
- Escalable sin cambio de arquitectura

**Cons:**

- Requiere crear recurso nuevo en Azure Portal (15 min)
- Events custom requieren pequeñas modificaciones en vistas Django

---

### Opción B: Tabla `audit_log` en PostgreSQL existente

Agregar app Django que loggee eventos de negocio a la misma DB PostgreSQL.

| Dimensión                | Evaluación                                             |
| ------------------------ | ------------------------------------------------------ |
| Costo                    | **$0** — usa DB existente                              |
| Complejidad de impl.     | **Media** — nueva app Django, signals, modelo de datos |
| Mantenimiento por Sergio | **Alto** — necesita escribir queries SQL para reportes |
| Power BI integration     | **Posible** — conexión directa a PostgreSQL            |
| Tiempo estimado (Gio)    | **3–5 hrs**                                            |

**Pros:** Cero costo adicional, datos en su propia DB

**Cons:**

- Crece la DB de producción con datos de telemetría
- Sin herramientas de análisis nativas (necesita queries manuales o Power BI complejo)
- Más trabajo de implementación por beneficio equivalente

---

### Opción C: Mixpanel / Amplitude (SaaS externo)

Servicio de product analytics de terceros, SDK para React Native y Python.

| Dimensión                | Evaluación                                        |
| ------------------------ | ------------------------------------------------- |
| Costo                    | **$0–$28 USD/mes** (free tier limitado)           |
| Complejidad de impl.     | **Baja en frontend, media en backend**            |
| Mantenimiento por Sergio | **Medio** — dashboard propio, pero vendor lock-in |
| Power BI integration     | **No nativa** — requiere export o API             |

**Cons:** Nuevo vendor fuera de Azure, costo futuro si escala, datos salen de México/Azure.

---

## Análisis de Trade-offs

App Insights gana porque:

1. **Costo = $0** para el volumen de Sentinel (decenas a cientos de usuarios, no millones)
2. **Ecosistema Azure unificado** — mismo portal donde vive el backend y el storage
3. **Auto-instrumentación de HTTP** cubre el 80% de las preguntas sin código extra
4. **Power BI ya tiene conector nativo** a Log Analytics → Sergio puede construir solo

---

## Qué se instrumenta (API surface de Sentinel)

### Auto-capturado por middleware (sin código extra):

```
GET  /api/obra/constructions/my_constructions/  → obras abiertas por usuario
GET  /api/avance/physical/                       → lista de avances consultada
GET  /api/incidencias/incidents/                 → incidencias consultadas
GET  /api/cronograma/                            → cronograma consultado
GET  /api/usuarios/me/                           → sesión activa (usuario identificado)
```

### Custom events:

| Evento                 | Vista Django                       | Propósito                            |
| ---------------------- | ---------------------------------- | ------------------------------------ |
| `avance_created`       | `avance/views.py` POST             | Conteo de avances por obra y usuario |
| `incidencia_created`   | `incidencias/views.py` POST        | Uso del módulo de incidencias        |
| `photos_uploaded`      | `avance/views.py` bulk-upload      | Adopción de flujo con fotos          |
| `user_session_started` | `usuarios/views.py` me/ primer hit | Usuarios activos únicos              |

Cada evento lleva: `user_id`, `obra_id`, `role`, `timestamp`.

---

## Plan de Implementación

### Lo que hace Gio

**Paso 1 — Recurso Azure**

1. Azure Portal → "Application Insights" → Crear recurso
2. Región: Mexico Central (misma que App Service)
3. Copiar `INSTRUMENTATION_KEY`

**Paso 2 — Dependencias backend**

```bash
pip install opencensus-ext-django opencensus-ext-azure
```

Agregar a `requirements.txt`.

**Paso 3 — Django settings **

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

**Paso 4 — Custom events en 4 vistas **

```python
# Ejemplo: avance/views.py
from opencensus.ext.azure.log_exporter import AzureLogHandler
import logging

logger = logging.getLogger(__name__)
logger.addHandler(AzureLogHandler(
    connection_string='InstrumentationKey=TU_KEY_AQUI'
))

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

Repetir patrón en: `incidencias/views.py`, bulk-upload view, `usuarios/views.py`.

**Paso 5 — Verificación **

- Registrar 1 avance en staging
- Confirmar evento aparece en App Insights → "Search" → Custom Events
- Documentar instrucciones Power BI para Sergio

---

### Lo que hace Sergio

**Power BI Desktop (gratis) conectado a App Insights:**

1. Power BI Desktop → Get Data → Azure → Azure Application Insights
2. Autenticar con cuenta Azure
3. Queries disponibles inmediatamente:

**Dashboard sugerido (Sergio construye):**

| Visual                                      | Query base                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Usuarios activos por semana                 | `requests \| summarize dcount(user_Id) by bin(timestamp, 7d)`                                                   |
| Avances registrados por obra                | `customEvents \| where name == "avance_created" \| summarize count() by tostring(customDimensions.obra_id)`     |
| Endpoints sin tráfico (funciones no usadas) | `requests \| summarize count() by name \| order by count_ asc`                                                  |
| Tasa de éxito de sync offline               | `requests \| where url contains "avance" \| summarize success_rate = avg(toint(success)) by bin(timestamp, 1d)` |

---

## Preguntas respondidas → Fuente de datos

| Pregunta                        | Fuente en App Insights                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| ¿Se usa la app?                 | `requests` table → `user_Id` únicos por semana                                                 |
| ¿Se registran avances?          | `customEvents where name == "avance_created"`                                                  |
| ¿Cuántos avances por obra?      | Custom event `avance_created` con dimensión `obra_id`                                          |
| ¿Qué % de funcionalidad se usa? | `requests` agrupados por `name` (endpoint)                                                     |
| ¿Qué NO se usa?                 | Endpoints con 0 o muy pocas llamadas: `/api/cronograma/`, pantallas de Inspector/Inversionista |

---

## Consecuencias

**Se vuelve más fácil:**

- Sergio puede ver en tiempo real si los workers de campo están usando la app
- Director puede ver por obra cuántos avances se han registrado (KPI concreto)
- Identificar si funcionalidades como Incidencias o Cronograma necesitan más adopción o training

**Se vuelve más complejo:**

- El backend Django tiene una dependencia nueva (`opencensus`)
- La `INSTRUMENTATION_KEY` debe manejarse como secreto (variable de entorno en Azure App Service)

**Para revisar en el futuro:**

- Si el volumen supera 5 GB/mes → revisar pricing (improbable en esta etapa)
- Agregar tracking desde el frontend React Native para eventos offline (avances en cola pendiente)
- Considerar alertas automáticas si cae el número de avances registrados por N días

---

## Resumen ejecutivo (para el Director)

> Vamos a agregar un sistema de monitoreo al backend de Sentinel que registra automáticamente cada vez que un trabajador usa la app: cuándo inicia sesión, qué obra abre, si registra un avance o una incidencia. Los datos se almacenan en Microsoft Azure (donde ya vive la app) y Sergio puede conectarlos a Power BI para hacer reportes visuales. Sergio construye los dashboards de seguimiento por su cuenta.

---

## Action Items

- [ ] **Gio** — Crear recurso App Insights en Azure Portal
- [ ] **Gio** — Instalar `opencensus-ext-django`, configurar middleware en `settings.py`
- [ ] **Gio** — Implementar 4 custom events en vistas Django (`avance`, `incidencia`, `photos`, `session`)
- [ ] **Gio** — Validar eventos en App Insights, documentar pasos Power BI
- [ ] **Sergio** — Crear dashboard en Power BI Desktop con las 4 queries base
- [ ] **Sergio** — Compartir dashboard con Director vía Power BI Service (free tier)
