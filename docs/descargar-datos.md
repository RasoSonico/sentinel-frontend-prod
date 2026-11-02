# Descargar datos (Perfil)

**Fecha:** 2026-11-02 · **Backend:** `GET /api/tablas/excel/` (repo backend, app `tablas`)

## Lo que ve y hace el usuario

1. En **Perfil**, el contratista ve la fila **"Descargar datos"**, debajo de "Mi firma". Los demás roles no la ven.
2. Al tocarla se abre una pantalla completa con:
   - **Obra**: la obra activa, solo lectura.
   - **Periodo**: el selector de fechas de la app, abierto en **"Este mes"**. Acepta los atajos ("Hoy", "Últimos 7 días", "Este mes"…) o un rango libre.
   - **Qué incluir**: "Actividades de reportes" y "Maquinaria", ambas marcadas.
   - Botón **"Descargar Excel"**.
3. Al tocar el botón se descarga el archivo y se abre la **hoja de compartir del sistema**. Ahí el usuario lo guarda en Archivos, lo manda por WhatsApp o correo, o lo abre en Excel. Si algo falla, aparece un mensaje en la parte de abajo.

El botón se apaga, con la razón encima, cuando:
- **No hay señal**: "Necesitas conexión para descargar." El archivo se arma en el servidor.
- No hay obra asignada, falta el periodo, el periodo pasa de un año, o no hay ninguna tabla marcada.

## Qué trae el Excel

Un archivo `Datos_{obra}_{desde}_al_{hasta}.xlsx`, **sin formato**: encabezados en la primera fila y datos debajo, con fechas como fechas y cifras como números, listo para filtrar, sumar o pegar en otro formato. Trae **toda la obra**, no solo lo que capturó el usuario.

| Hoja | Una fila por… | Columnas |
|---|---|---|
| Información | dato de la descarga | Obra, Desde, Hasta, Tablas incluidas, Descargado por, Descargado el, Nota |
| Actividades | actividad escrita en un reporte diario | ID, Fecha, Folio, Área, Actividad, Contratistas, Registró, Observaciones |
| Maquinaria por turno | turno de horómetro (o día sin turno) | ID, Fecha, Máquina, Marca, Modelo, Propiedad, Estado, Motivo, Horómetro inicial, Horómetro final, Total horas, Registró inicial, Registró final, Observaciones |
| Actividades de maquinaria | actividad de una máquina | ID, Fecha, Máquina, Marca, Modelo, Actividad, Clave WBS, Unidad, Horas estimadas, Registró |

**El diccionario de datos completo** —qué significa cada columna, de dónde sale, cuándo viene vacía y qué valores puede tener— está en el repo backend: `docs/tablas.md`. Es la referencia; esta tabla solo resume.

Lo que más se pregunta:
- **ID** es un contador de la hoja (1, 2, 3…), no un dato del sistema.
- **Sumar "Total horas"** en "Maquinaria por turno" da las horas del día sin duplicar nada: un día con dos turnos son dos filas.
- Un **turno nocturno** lleva la fecha del día en que empezó.
- **Estado "Sin reportar"**: se leyó el horómetro pero nadie dijo si la máquina trabajó.
- **Contratistas** no incluye a la supervisión.
- Las dos hojas de maquinaria se cruzan por **Fecha + Máquina + Marca + Modelo**.

## Capa técnica

| Archivo | Qué hace |
|---|---|
| `src/modules/profiles/PerfilScreen.tsx` | La fila, visible con `selectIsContratista`. Abre la pantalla como `Modal`, igual que "Mi firma" |
| `src/modules/descargas/PantallaDescargarDatos.tsx` | Obra (`useAssignedConstruction`), periodo (`DateRangeFilter`), casillas, botón, avisos, telemetría |
| `src/modules/descargas/periodo.ts` | Convierte el valor del selector en los días que pide el servidor (ver abajo). Probado en `periodo.test.mjs` |
| `src/modules/descargas/descargaDatosService.ts` | La descarga. Mismo transporte que `reporteArchivoService.ts`: arraybuffer → base64 → `cacheDirectory` → `Sharing.shareAsync` |
| `src/services/api/config.ts` | `endpoints.tablas.excel` |

**Por qué existe `periodo.ts`.** `DateRangeFilter` se hizo para filtrar instantes: entrega el rango como el primer y el último segundo de los días elegidos, en UTC. La descarga pide **días de calendario**. Si se cortara la cadena ISO en la "T", el último día de octubre en el centro del país saldría como el 1 de noviembre, porque esa hora en UTC ya es el día siguiente. Por eso se lee el instante en la hora del teléfono y se toma su fecha local.

**Errores.** El servidor responde 400 (periodo o tablas inválidos) y 404 (obra ajena o inexistente) con `{"detail": "..."}`; ese texto es el que ve el usuario.

**Telemetría.** `trackScreen("DescargarDatos")` al abrir, y `datos_descargados` con `obra_id`, `tablas` y `dias` al terminar la descarga. El servidor registra su propio `datos_descargados` con las filas por hoja.

## Limitaciones conocidas

- Sin señal no se puede descargar.
- Un 401 en esta descarga no dispara el refresco de sesión; es la misma limitación de `reporteArchivoService` (`validateStatus: () => true`).
- Dos máquinas idénticas (mismo tipo, marca y modelo) no se distinguen al cruzar las hojas de maquinaria.
