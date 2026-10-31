# ADR-008: Firma — el trazo en el hilo de UI, la geometría en el payload

**Estado:** En implementación en `feat/firma`.
**Fecha:** 2026-10-26
**Autores:** Sergio Cota (producto), sesión de implementación asistida
**Repositorio:** frontend (React Native / Expo). La contraparte es el **ADR-006 del repo backend**, cuyas decisiones se citan como B1–B9.
**Precedentes:** ADR-006 (reporte de actividades) · ADR-007 D12 (la regla del tap, de donde sale el patrón de lógica pura probada en Node).

**Alcance.** La captura de la firma, dónde se da de alta y cómo viaja. **No cambia** el wizard ni la cola offline: se les agrega un campo.

---

## El flujo

1. La persona da de alta su firma **una vez**, en su perfil.
2. A partir de ahí aparece **ya puesta** en cada documento que la requiera.
3. Si no la dio de alta, la dibuja al cerrar, con la opción de guardarla.
4. **Firmar es obligatorio**: sin firma, el botón de guardar no se habilita.

---

## Decisiones

### F1. El trazo se acumula en el hilo de UI, no en estado de React

**Decisión:** los puntos viven en `useSharedValue` de Reanimated y el `d` del `<Path>` se recalcula dentro de worklets. Hacia JS cruza **un aviso por trazo terminado**, para habilitar el botón.

**Por qué:** acumular los puntos en estado y re-renderizar en cada evento de movimiento tira cuadros en Android de gama media —el teléfono del supervisor, no el de quien programa— y el trazo se va quedando atrás del dedo. Es exactamente el síntoma que hace que una firma se sienta "de app" y no de papel.

**Lo que cuesta:** hay dos copias del trazo, una en el hilo de UI para pintar y otra en JS para leerla al confirmar. Es deliberado: la segunda se escribe una vez por trazo, no por punto.

### F2. Dos `<Path>` y no uno

**Decisión:** un camino con los trazos ya cerrados y otro con el que se está dibujando.

**Por qué:** si fuera uno solo habría que rearmar la cadena de **toda** la firma en cada movimiento del dedo. Lo ya trazado no cambia; recalcularlo es trabajo que crece con lo que la persona lleva firmado, justo cuando menos margen hay.

### F3. Sin dependencias nativas nuevas

**Decisión:** `react-native-gesture-handler` + `react-native-reanimated` + `react-native-svg`, los tres ya instalados.

**Por qué:** Skia daría ancho variable por velocidad —lo que de verdad imita la presión de una pluma— pero es una dependencia nativa nueva, un *config plugin* y un build de dev-client, por un refinamiento estético. Con suavizado por curvas y puntas redondas el trazo ya se ve continuo. Queda como deuda, no como omisión.

### F4. El suavizado vive en un módulo puro y probado contra el backend

**Decisión:** `src/modules/firma/trazo.ts` no importa React ni React Native, y se prueba con `bun run test:logica` (`trazo.test.mjs`). Tiene un gemelo en `firma/trazo.py` del backend.

**Por qué:** si el teléfono suavizara de una forma y el PDF de otra, el usuario firmaría una cosa y entregaría otra — y eso no se nota revisando código, se nota cuando alguien compara el documento con lo que firmó. Los casos de prueba del suavizado son **los mismos** en los dos repos a propósito: son el contrato.

> Verificado al implementarlo: para un trazo de 25 puntos, el camino que arma el cliente y el que arma el servidor coinciden **exactamente** — mismos comandos, desviación máxima 0.0.

El mismo patrón que la regla del tap (ADR-007 D12): la lógica que tiene que ser correcta vive donde se puede probar de verdad.

### F5. Pantalla completa, nunca una hoja inferior

**Decisión:** el lienzo se monta en un `Modal` a pantalla completa.

**Por qué:** un `@gorhom/bottom-sheet` compite por el mismo gesto vertical que el trazo y se lo lleva: el usuario intenta firmar y lo que hace es arrastrar la hoja. Es el equivalente en React Native del `touch-action: none` que hace falta en la web, y es el error número uno al montar un lienzo de firma.

El `Modal` monta su propia jerarquía de vistas, fuera del root de gesture-handler de la app, así que lleva su propio `GestureHandlerRootView`. Sin eso el lienzo no recibe un solo gesto en Android.

### F6. Tres ajustes del gesto que se notan en Android

| Ajuste | Qué pasa sin él |
|---|---|
| `minDistance(0)` | El `Pan` espera a que el dedo recorra unos píxeles antes de activarse, y esos píxeles son el principio del trazo: las firmas salen con el arranque cortado |
| `maxPointers(1)` | La palma apoyada en la pantalla abre un segundo trazo |
| `shouldCancelWhenOutside(false)` | Un trazo que roza el borde se aborta a media firma |

Y un cuarto que no es del gesto: la raya guía va **primero en el árbol**, no con `zIndex: -1`. El z-index negativo funciona en iOS y no siempre en Android; el orden del árbol funciona en los dos.

### F7. Los puntos pegados se descartan al capturar

**Decisión:** un punto nuevo solo entra si está a más de 0.25 unidades del anterior, en distancia Manhattan.

**Por qué:** un dedo quieto sobre la pantalla genera decenas de puntos por segundo en el mismo sitio. Llenan la cota de 6 000 del servidor, engordan el payload que sube sin señal y no dibujan nada: 0.25 es menos que el grosor de la pluma, así que nada de lo que se descarta se vería.

Manhattan y no euclidiana porque se evalúa en cada evento de movimiento, en el hilo de UI y entre cuadros. Una raíz cuadrada ahí no se nota en un teléfono nuevo y sí en el que importa.

### F8. La firma viaja **dentro** del reporte, en la cola

**Decisión:** `firmaJson` en `PendingReporteSubmission` (schemaVersion 19). No hay subida aparte.

**Por qué:** firmar es obligatorio para cerrar (B6). Si la firma tuviera que subir a Blob antes —como las fotos—, la falta de señal se convertiría en un bloqueo para cerrar el reporte, justo lo que esta cola existe para evitar. Son unos 4 KB de texto.

**Se guarda siempre, también cuando salió del perfil.** Un reporte capturado el lunes puede sincronizarse el jueves, y para entonces su autor pudo haber borrado la firma de su perfil. Con el trazo dentro, la captura se basta sola. El servidor sabe caer al perfil si el campo no viene, pero eso es la red de seguridad, no el camino.

### F9. La del perfil se copia al borrador, no se resuelve al enviar

**Decisión:** al llegar a la Revisión, si el borrador no tiene firma y el perfil sí, se inserta sola — y se ve.

**Por qué:** dos razones, y las dos bastan por su cuenta. El usuario tiene que **ver qué va a firmar** antes de cerrar: firmar sin ver qué se firma no es firmar. Y por F8, la firma tiene que estar dentro de la captura antes de encolarla.

La inserción corre **una sola vez**. Si corriera también después, le devolvería la del perfil a quien acaba de borrarla para rehacerla.

### F10. La caché de la firma del perfil es larga y no se refresca al montar

**Decisión:** `staleTime` y `gcTime` de un mes; al guardar se escribe el resultado en la caché en vez de invalidar.

**Por qué:** firmar es obligatorio y un reporte se cierra **en obra**. Si esta consulta volviera vacía por falta de red, quien ya dio de alta su firma tendría que volver a dibujarla, o no podría cerrar. La firma solo cambia cuando su dueño la cambia, y eso pasa por la mutación, que actualiza la caché al instante: no hay ninguna otra vía por la que pueda quedar desactualizada.

Invalidar en vez de escribir dispararía una lectura que sin señal falla, y dejaría al usuario viendo el lienzo vacío justo después de haber guardado su firma.

### F11. Dibujar una firma para un reporte no la da de alta en el perfil

**Decisión:** la casilla "guardar en mi perfil" aparece —marcada— solo para quien **no** tiene firma dada de alta. Para quien ya la tiene y la está cambiando para este documento, no aparece.

**Por qué:** guardar una firma en el perfil de alguien sin que lo pida es tomar una decisión que no es nuestra. Y a quien la está cambiando solo para este reporte, cambiarle además la del perfil sería hacer exactamente lo contrario de lo que pidió.

Si el alta en el perfil falla por falta de señal, **el cierre no se cae**: el documento ya tiene su firma y el alta era una comodidad para la próxima vez.

### F12. El alta vive como una fila del menú de Perfil, no como una tarjeta aparte

**Decisión:** "Mi firma" es la primera fila de la tarjeta Configuración, con el mismo markup y los **mismos estilos** que Editar Perfil, Notificaciones y Ayuda y Soporte. Abre una pantalla completa con el detalle: la firma guardada, cambiarla o quitarla.

**Por qué:** una tarjeta propia la hacía parecer otra cosa que el resto del perfil. Dar de alta la firma es configurar una cuenta, y en esta pantalla eso se ve como una fila con su chevron.

La fila usa `styles.menuItem` y `styles.menuItemText` de `PerfilScreen` directamente, no una copia en el módulo de firma: copiarlos sería garantizar que un día dejen de parecerse, que es justo lo que esta decisión corrige.

**El detalle y el lienzo son `Modal`s que se excluyen**, nunca uno dentro de otro. Anidarlos funciona casi siempre y falla en iOS al presentar el segundo mientras el primero todavía se anima.

### F13. Un solo tipo para la geometría

**Decisión:** `FirmaPayload` en `src/types/reporte.d.ts` es un alias de `Geometria`, que vive con el código que dibuja.

**Por qué:** declararlo dos veces es tener dos definiciones de la misma cosa, y la segunda que se quede atrás se descubre cuando una firma sale deformada en un documento ya entregado.

---

## Consecuencias

**Lo que mejora**

- Firmar deja de ser un trámite: para casi todo el mundo es ver su firma ya puesta y cerrar.
- Nada de esto depende de la red.
- El módulo (`src/modules/firma/`) no sabe que existe el reporte: el siguiente documento que requiera firma monta `BloqueDeFirma` y ya.

**Lo que empeora o hay que vigilar**

- **Un reporte ya no se cierra sin firma.** Si el lienzo fallara en algún dispositivo, el usuario queda bloqueado. Es consecuencia directa de B6 y hay que verla en telemetría desde el primer día.
- `schemaVersion` 19. Es aditiva y sin migración de datos, pero es una migración más.
- Los reportes encolados antes de la versión 19 no tienen firma. Al sincronizar, el servidor cae a la del perfil de su autor; si no la tuviera, el envío falla con 400 y queda visible en pendientes. Es lo correcto: mejor visible que entregado sin firmar.

**Lo que no cambia**

- El wizard, sus pasos, la miniatura del documento y la cola: intactos salvo un campo.

---

## Deuda técnica

| # | Qué | Por qué se difiere |
|---|---|---|
| 1 | Ancho variable por velocidad o presión (Skia) | Dependencia nativa nueva y build de dev-client por un refinamiento estético |
| 2 | **La edición de un reporte todavía no existe en el cliente** | El backend ya la acepta y ya exige firma en ella. Cuando se implemente, monta `BloqueDeFirma` igual que la Revisión |
| 3 | Lienzo en horizontal para firmas anchas | Requiere `expo-screen-orientation`, que no está instalado |
| 4 | Persistir el borrador del wizard | Heredada del ADR-006; ahora incluiría la firma |

## Telemetría

- Cuántos usuarios tienen firma de perfil contra cuántos la dibujan cada vez. **Si casi nadie la da de alta, la fila del perfil no se está encontrando** y el flujo no sirvió de nada.
- Cuántos cierres se intentaron sin firma. Es la medida directa del riesgo de B6.
- Tiempo entre el primer toque y el primer punto pintado, en Android de gama baja. Es donde se siente "no fluido".

## Ver también

- `docs/frontend-handoff/firma-handoff.md` (repo backend) — el contrato del payload.
- ADR-006 del backend — por qué se guarda geometría y no una imagen.
- ADR-007 D12 — el patrón de lógica pura probada en Node del que sale F4.
