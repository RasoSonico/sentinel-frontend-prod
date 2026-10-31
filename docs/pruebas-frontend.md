# Pruebas de frontend — estado, plan y protocolo

**Propósito:** este documento sirve dos cosas. (1) Deja asentado qué se puede
probar hoy y qué no. (2) Es el encargo completo para una sesión dedicada a
montar pruebas automatizadas de frontend: qué montar, qué probar primero y
cómo reportar el resultado.

---

## 1. Qué tenemos hoy

**Lógica pura: sí, desde el 20-oct-2026.** `npm run test:logica` corre con el
runner que Node 22 ya trae — sin jest, sin testing-library, sin instalar nada.
Cubre módulos sin React ni React Native.

**Componentes: todavía no.** Montar `jest-expo` + `@testing-library/react-native`
está **bloqueado por el entorno**, no por decisión: el proyecto no tiene
lockfile, así que npm re-resuelve el árbol completo en cada intento, y en esa
resolución aparece un paquete publicado con protocolo `catalog:` que npm no
sabe leer (`EUNSUPPORTEDPROTOCOL`). Los `--dry-run` individuales pasan; el
install real falla. Resolverlo pasa por fijar un lockfile primero.

Lo que sí tenemos, y conviene no subestimar:

| Herramienta | Qué atrapa | Qué NO atrapa |
|---|---|---|
| `npx tsc --noEmit` | Contratos rotos entre capas: si el servidor cambia una forma y los tipos la siguen, falla | Que el tipo declarado no sea el que el servidor manda de verdad |
| `npm run lint` | Hooks mal usados, imports muertos, variables sin usar | Comportamiento |
| Suite del backend (509) | Todo el contrato del servidor | Lo que el teléfono hace con la respuesta |
| Pruebas en dispositivo | Todo lo demás | Regresiones: solo se prueba lo que uno se acuerda de probar |

**La línea base actual de `tsc` son 20 errores preexistentes** (medida el
26-oct-2026 en `feat/firma`). Cualquier cambio debe dejarla donde estaba, no
una más. El número se **vuelve a medir**, no se cree: ya estuvo desactualizado
una vez, y una línea base vieja hace creer que uno rompió seis cosas que no
tocó. No están arreglados porque viven en código que nadie tocó en meses;
arreglarlos es deuda aparte.

### El hueco que esto deja

Los defectos más caros de este proyecto **no los habría atrapado ninguna de
las herramientas de arriba.** Todos pasaron `tsc`, todos pasaron lint, y dos
de ellos pasaron pruebas de backend en verde:

1. **El horómetro viajaba como número y el teléfono lo esperaba como texto.**
   El supervisor reportaba una jornada, la tarjeta se ponía en azul "Por
   enviar", y al siguiente refresco **volvía a "Sin reportar hoy"** — sobre
   algo que ya se había enviado. El backend tenía pruebas y pasaban, porque
   miraban los objetos de Python y no el JSON que de verdad sale por el cable.

2. **La tarjeta perdía su estado en la ventana entre que el envío responde y
   el servidor refleja la jornada.** Mismo síntoma, causa distinta, y durante
   un rato se confundieron.

3. **Todas las máquinas dadas de alta sin señal compartían el mismo
   identificador de estancia.** Si el supervisor registraba dos máquinas sin
   cobertura y le reportaba jornada a cada una, **las dos jornadas aparecían
   en la misma tarjeta.** Se atrapó leyendo código, no probando.

Ese es el tipo de cosa que las pruebas tienen que cubrir. No "¿el componente
renderiza?".

---

## 2. Qué se puede probar sin montar nada

Mientras no haya andamiaje, el protocolo de verificación es:

1. `npx tsc --noEmit` → debe quedar en **14 errores**.
2. `npm run lint` sobre los archivos tocados → limpio.
3. **Pruebas en dispositivo** siguiendo los guiones de la §5.

Es suficiente para cambios pequeños y contenidos. Deja de serlo en cuanto el
cambio toca colas, caché o sincronización, que es donde han estado todos los
defectos.

---

## 3. Encargo para la sesión de pruebas

### 3.1 Qué montar

Mínimo viable, en este orden:

1. **`jest` con `jest-expo`** (el preset que ya entiende el runtime de Expo
   SDK 53 y React Native 0.79). Agregar el script `"test": "jest"`.
2. **`@testing-library/react-native`** para los componentes.
3. **Un Realm en memoria** (`inMemory: true`) para las pruebas de cola.
   **Nunca un mock** — ver §3.2.
4. **Mock del cliente HTTP**, no de los hooks. Probar contra respuestas
   falsas del servidor —incluidas las feas: 500, 408, respuesta perdida— es
   justamente el escenario que la cola existe para resolver.

**Lo que NO hay que montar:** pruebas de snapshot. No dicen nada sobre
comportamiento y se vuelven ruido que la gente aprende a regenerar sin mirar.

### 3.2 Regla dura: Realm NO se mockea

**Usar siempre un Realm real en memoria.** Esto no es preferencia de estilo;
es la lección de los defectos que de verdad han costado tiempo en este
proyecto. Un mock de Realm es un diccionario que siempre funciona, y los tres
defectos de abajo existen precisamente **porque Realm no siempre funciona**:

| Lo que pasó | Lo que un mock habría hecho |
|---|---|
| El servidor mandó un número donde el esquema declaraba texto. **Realm rechazó la escritura entera** y la pantalla se quedó con datos viejos, en silencio | Guardarlo feliz. La prueba pasa, el teléfono se rompe |
| El código iteraba una lista de Realm capturada en un render anterior; lo que acababa de cambiar no estaba ahí | Devolver el objeto actualizado. El defecto es *imposible* de reproducir con un mock |
| Una escritura falló a media operación y dejó la pantalla sin cola **ni** datos frescos | Nunca fallar |

En corto: **el valor de estas pruebas está en que Realm valide los tipos y
falle de verdad.** Si se mockea, lo único que queda probado es que el código
llama a las funciones que el programador creía que llamaba.

Lo mismo aplica a la red: mockear el cliente HTTP está bien —y es necesario—
pero **las respuestas falsas tienen que incluir las feas.** Una cola que solo
se prueba contra 200 no está probada.

### 3.3 Qué probar, en orden de valor

Esta lista sale de defectos reales, no de cobertura teórica. El orden importa.

**Prioridad 1 — Las colas offline.** Es donde han estado todos los defectos
caros y donde una regresión significa **perder trabajo capturado en campo**.

- Lo que se captura sin señal sobrevive a cerrar y reabrir la app.
- Un envío que falla con 500 se reintenta; uno que falla con 400 **no** —
  reintentar un dato inválido gasta intentos contra un problema que no se va
  a arreglar solo.
- Un reintento no crea un duplicado (la clave se acuña al encolar).
- Un elemento que quedó "enviándose" cuando la app murió vuelve a "pendiente"
  al arrancar, y no se queda encallado para siempre.
- **El encadenamiento del alta:** una máquina registrada sin señal recibe
  jornadas; al sincronizar, el alta va primero y las jornadas heredan el
  identificador real. Dos máquinas locales distintas **no** comparten
  tarjeta.
- Descartar un alta descarta también las jornadas que colgaban de ella.

**Prioridad 2 — El contrato con el servidor.** Lo que `tsc` no puede ver.

- Para cada endpoint que se cachea, una prueba que tome una **respuesta real
  capturada del servidor** y verifique que se escribe en Realm sin tirar. Si
  el servidor cambia un número por un texto, esto lo atrapa; los tipos no.
- La forma de guardarlas: un archivo de respuestas de ejemplo que se
  regenere contra el backend cuando el contrato cambie.

**Prioridad 3 — La regla del tap (D12 del ADR-007).** Un toque sobre un botón
tiene que ejecutar ese botón aunque la pantalla se esté recomponiendo debajo
del dedo. El síntoma cuando se rompe es que **la app se siente pesada y hay
que tocar dos veces**. Prueba de aceptación: *con un elemento abierto y el
teclado visible, un solo toque sobre cualquier botón visible ejecuta ese
botón.*

**Prioridad 4 — Lógica pura ya aislada.** Barata y estable:
`programaCalculos.ts`, `fechaPrograma.ts`, `filaMaquinaria.ts`,
`sabanaTreeBuilder.ts`. Fechas por componentes y no con `Date` —
`new Date("YYYY-MM-DD")` corre el día en México— es exactamente el tipo de
cosa que una prueba fija para siempre.

**Lo que no vale la pena hoy:** navegación, estilos, que un componente
"renderice". Cuesta mantenimiento y no ha fallado nunca.

### 3.4 Cómo reportar

Al cerrar la sesión, actualizar la §4 de **este** documento con una tabla:

| Fecha | Qué se probó | Pruebas | Resultado | Hallazgos |
|---|---|---|---|---|

Y para cada defecto que las pruebas encuentren, registrar en §5:
**qué hace el usuario → qué ve → cuál es la causa.** En ese orden. Un
hallazgo descrito solo en términos técnicos no le permite a Sergio decidir si
importa.

---

## 4. Bitácora de pruebas

*(vacía — la llena la sesión de pruebas)*

| Fecha | Qué se probó | Pruebas | Resultado | Hallazgos |
|---|---|---|---|---|
| 20-oct-2026 | Regla del tap (`reglaDelTap.ts`) | 14 | 14 ✓ | 1 defecto real, ver abajo |

### 20-oct-2026 · Regla del tap

**Por qué.** Dos síntomas reportados en dispositivo que ninguna herramienta
estática veía: *"la actividad no sale a la primera"* y *"parece que primero hay
que registrar el horómetro para que salga la actividad"*.

**Cómo.** La lógica se extrajo a una máquina de estados pura y se probó contra
**todos los órdenes plausibles** en que React Native puede entregar `onPress`,
`onFocus` y `onTouchEnd` — que no están garantizados y cambian entre
superficies. La exigencia es que el resultado sea el mismo en todos.

**Qué encontró.** Un orden que no se había considerado: cuando el `onFocus` de
un campo llega **antes** que la captura del contenedor, el contenedor borraba
la marca de "este gesto ya abrió algo", agendaba un cierre y apagaba el
elemento que se acababa de abrir, un cuadro después.

Eso explica los **dos** síntomas con una sola causa: el segundo intento
funcionaba porque, al compactarse el primer bloque, ya no quedaba nada abierto
que cerrar — no porque hiciera falta el horómetro.

**Corregido.** La marca se consume al TERMINAR el toque, no al empezarlo. Una
prueba más atrapó que el *helper* de las pruebas abría sin un gesto alrededor,
cosa que en el teléfono no pasa nunca.

---

## 5. Guiones de prueba en dispositivo

Mientras no haya automatización, esto es la red de seguridad. Cada guión está
escrito como **lo que hace el usuario y lo que debe ver**.

### Maquinaria — captura sin señal

| # | El usuario hace | Debe ver |
|---|---|---|
| 1 | Con señal, reporta una jornada | La tarjeta pasa a "Trabajando" y se queda así tras refrescar |
| 2 | **Sin señal**, reporta una jornada | Tarjeta azul "Por enviar · Trabajando". **No** debe volver a "Sin reportar hoy" |
| 3 | Recupera señal | La tarjeta pasa a "Trabajando" sin que él toque nada |
| 4 | **Sin señal**, registra una máquina nueva | Aparece en la lista, arriba, marcada como pendiente |
| 5 | **Sin señal**, le reporta jornada a esa máquina nueva | La jornada queda en esa tarjeta, no en otra |
| 6 | **Sin señal**, registra DOS máquinas y le reporta a cada una | Cada jornada en **su** tarjeta. Este es el defecto del identificador compartido |
| 7 | Recupera señal con un alta y su jornada pendientes | Las dos suben, en ese orden, y la tarjeta queda normal |
| 8 | Mata la app con cosas en la cola y vuelve a abrir | Sigue todo ahí, y empieza a subir al haber señal |

### Maquinaria — el sheet

| # | El usuario hace | Debe ver |
|---|---|---|
| 9 | Escribe en Observaciones con el teclado abierto | El campo **no** queda tapado y la pantalla no brinca en cada palabra |
| 10 | Captura solo el horómetro de la mañana | Se guarda; las horas quedan en blanco, no en cero |
| 11 | Captura un cierre menor que la apertura | Se guarda, con aviso. **No** se bloquea |

### Reporte de actividades

| # | El usuario hace | Debe ver |
|---|---|---|
| 12 | Completa el wizard sin señal | Queda guardado y marcado por enviar |
| 13 | Recupera señal | Sube el reporte y después sus fotos |
| 14 | Un envío falla definitivamente | Un aviso que le ofrece reintentar o descartar, no un callejón sin salida |

### Reporte de actividades — después de guardar (ADR-006 F32–F40)

Este bloque cubre el tramo que va de "Guardar reporte" a poder generar el
archivo. **El guión 32 es el importante**: es el defecto de fondo que esta
revisión corrige, y es el único que solo aparece si uno se queda mirando la
pantalla mientras sincroniza.

| # | El usuario hace | Debe ver |
|---|---|---|
| 30 | Con señal, guarda un reporte con 3 fotos | Aterriza en REPORTES DE LA OBRA. **Ningún modal de resultado.** Su fila arriba, con tinte de llegada que se desvanece en ~2.5 s, chip "Enviando" y el aviso "Reporte guardado · enviando" |
| 31 | Mira la transición al salir del wizard | **No** alcanza a ver la Revisión vacía detrás |
| 32 | Abre el detalle desde la lista mientras dice "Enviando" y **se queda ahí** | Termina con la vista previa completa y los botones encendidos. En ningún momento: pantalla en blanco, recuadro gris en vez de foto, "0 actividades · 0 fotos", ni botones apagados |
| 33 | Espera sin tocar nada tras guardar con señal | El chip pasa solo a "Disponible" y sale "Reporte enviado · ABRIR". ABRIR abre el detalle con los botones encendidos, y generar funciona |
| 34 | Guarda en modo avión | Fila arriba con "Por enviar" y un aviso que **no se va solo** hasta tocar "OK" |
| 35 | Con ese reporte en cola, abre su detalle sin señal | Línea ámbar "Por enviar", vista previa completa con las fotos del teléfono, y una frase en lugar de los botones |
| 36 | Quita el modo avión con ese detalle abierto | La línea pasa a "Enviando", luego a "Faltan N fotos por subir", y al final desaparece y salen los botones |
| 37 | Guarda antes de que la app sepa si hay red | Chip "Enviando" y línea "Enviando", **nunca** "Por enviar" |
| 38 | Vuelve de dos días sin señal con tres reportes en cola | "3 reportes enviados · ABRIR", y ABRIR lleva a la **lista**, no a un detalle |
| 39 | Está en Sábana cuando su reporte queda disponible | El aviso sale ahí mismo y ABRIR lo lleva a Reportes |
| 40 | Otra persona de la obra guarda su reporte | A él **no** le llega ningún aviso: lo ve abriendo la lista |
| 41 | Abre el reporte de otra persona sin señal, aún no disponible | La línea dice qué falta en el servidor. **Nunca** "se enviará solo al recuperarla": no está en su teléfono |
| 42 | Guarda después de las 18:00 hora de CDMX | La fecha del reporte, en la lista y en el detalle, es la del día local |
| 43 | Tiene "reducir movimiento" encendido y guarda | El tinte de llegada se quita de golpe, sin desvanecerse |
| 44 | Guarda, espera a que se quite el resaltado, cambia de tab y vuelve | La fila **no** se vuelve a resaltar y el aviso **no** vuelve a salir |
| 45 | Genera un Excel de un reporte propio ya enviado | El evento sube con `es_autor: true` (el de otra persona, `false`) |

### La franja de sincronización (ADR-006 F41)

La regla que se está probando: **"N pendientes de sincronizar" + el botón
Sincronizar significa que hay trabajo parado y nadie lo está intentando.**
Mientras la app esté trabajando debe decir "Sincronizando…" y **no** ofrecer el
botón.

El guión 49 toca avances a propósito: `OfflineIndicator` es compartido y el
cambio de red también los alcanza.

| # | El usuario hace | Debe ver |
|---|---|---|
| 46 | Guarda un reporte con fotos, con señal, y mira la franja de arriba | **"Sincronizando…" sin interrupción** hasta que sube la última foto. En ningún momento "1 pendiente de sincronizar" ni el botón Sincronizar mientras algo esté subiendo |
| 47 | Pierde señal a media subida de fotos y la recupera | Al recuperarla vuelve a "Sincronizando…" solo. El botón Sincronizar solo aparece mientras nada se intenta |
| 48 | Fuerza un fallo de envío transitorio (señal débil, 5xx) | Durante el backoff **no** se pone roja diciendo "1 fallido". Rojo solo cuando se agotan los intentos, y entonces el chip de la fila dice "No se envió" |
| 49 | Abre la app en frío —Reportes y la lista de avances— con la cola vacía | **Ninguna franja.** Antes parpadeaba "Modo sin conexión" en rojo mientras NetInfo contestaba |
| 50 | Abre la app en frío con cosas en la cola | Entra directo a "Sincronizando…", sin el parpadeo rojo previo |
| 51 | Pone el modo avión | "Modo sin conexión" en rojo, **igual que antes**: un `false` confirmado no cambió de comportamiento |

### Firma

**El guión más importante de este bloque es el 17.** La fluidez del trazo no la
puede probar nada automatizado: no hay dedo en Node ni en el CI. Y es la mitad
de lo que hace que una firma se sienta firma.

| # | El usuario hace | Debe ver |
|---|---|---|
| 17 | Firma en **Android de gama baja** | La línea sale pegada al dedo, sin retraso visible, y sin vértices en los trazos rápidos |
| 18 | Empieza el trazo y lo levanta enseguida | El arranque **no** está cortado: el primer punto entra (`minDistance(0)`) |
| 19 | Apoya la palma mientras firma | Un solo trazo, no dos (`maxPointers(1)`) |
| 20 | Hace un trazo que roza el borde del recuadro | El trazo **no** se corta a media firma |
| 21 | Deja el dedo quieto tres segundos sobre el lienzo | No se acumula una mancha ni se agota la cota de puntos |
| 22 | Da un toque suelto | Sale un punto visible, no nada |
| 23 | Da de alta su firma en el perfil y abre un reporte nuevo | En la Revisión aparece **ya puesta**, sin que la dibuje |
| 24 | Borra su firma del perfil | Los reportes ya generados siguen saliendo **con** su firma |
| 25 | **Sin señal**, cierra un reporte teniendo firma de perfil | Se cierra: la firma sirve desde caché, no desde la red |
| 26 | **Sin señal y sin firma de perfil**, cierra un reporte | Puede dibujarla ahí mismo y cerrar |
| 27 | Llega a la Revisión sin firma de ningún tipo | El botón de guardar está apagado, y se enciende al firmar |
| 28 | Firma, toca "Cambiar", y cancela el lienzo | Conserva la firma anterior, no se queda sin ninguna |
| 29 | Actualiza la app con un reporte ya encolado de antes | Si tiene firma de perfil sube solo; si no, falla con aviso y sube al dar de alta su firma y reintentar |

### Al cambiar de usuario

| # | El usuario hace | Debe ver |
|---|---|---|
| 15 | Cierra sesión con cosas en la cola | Un aviso de que hay trabajo sin enviar antes de salir |
| 16 | Entra otra persona en el mismo teléfono | **Nada** de la obra anterior |

---

## 6. Deuda relacionada

- **14 errores de `tsc` preexistentes.** Viven en código viejo
  (`useGoogleAuth`, `useSabanaData`, `ModalRenderer`, varios `React` como UMD
  global). Arreglarlos es trabajo aparte, pero mientras sigan ahí nadie puede
  usar "tsc limpio" como criterio.
- **Subir el campo enfocado por encima del teclado: intentado dos veces,
  retirado las dos.** Queda el diagnóstico por si se retoma, porque las dos
  causas están identificadas y ninguna es la obvia:

  1. **Los avisos de teclado de Android hay que amortiguarlos.** `keyboardDidShow`
     y `keyboardDidHide` se emiten en pares espurios cuando un campo
     multilínea crece y la ventana se redimensiona. Escucharlos crudos dispara
     un desplazamiento **por tecla** y la hoja salta. `useTecladoVisible` ya
     amortigua; cualquier consumidor nuevo debe partir de ahí y no de los
     eventos.
  2. **`onLayout` da la posición relativa al PADRE INMEDIATO, no al contenido
     del scroll.** Medir bloques anidados y usar esa `y` como destino manda el
     scroll a un sitio equivocado por el desfase de los contenedores de en
     medio. Hace falta medir contra el nodo del scroll (`measureLayout`).

  El primer intento además desplazaba al recibir el FOCO, con el dedo todavía
  abajo: eso movía el layout a media pulsación y el press-out aterrizaba en
  otro elemento. El disparador tiene que ser el teclado ya asentado.

- **Guardar un objeto vivo de Realm en estado de React.** Las filas que vienen
  del caché son objetos de Realm, no copias. Guardarlas en `useState` para
  abrir una hoja o un modal parece inocente, pero al siguiente refresco el
  caché se reescribe con `UpdateMode.Modified`, los objetos embebidos
  anteriores **se borran**, y lo que quedó apuntándolos revienta con
  *"Accessing object which has been invalidated or deleted"* — o con *"Cannot
  access realm that has been closed"* si además el provider se reinició—. La
  pantalla se queda en gris. **Copia plana antes de guardar** (ver
  `congelarFila`). Es el caso real que motiva la §3.2.

- **`layout` de Reanimated sobre una vista que contiene campos de texto.**
  `LinearTransition` anima **cualquier** cambio de tamaño del nodo que lo
  lleva. Un campo multilínea crece al escribir, así que cada tecla dispara la
  animación del bloque completo: la pantalla se mueve y vuelve en
  milisegundos, se ven "sombras", y el usuario no alcanza a leer lo que
  teclea. Con el teclado en `adjustResize` encima, se duplica. **Para plegar
  un bloque hay que animar entrada y salida de subárboles, no el tamaño del
  mismo nodo.**

- **El `onPress` de un hijo corre ANTES que el `onTouchEnd` del padre.**
  Cualquier lógica de "cerrar lo abierto al soltar" montada en un contenedor
  tiene que saber si el gesto ya abrió algo, o deshace la intención que acaba
  de expresarse. Es lo que hacía que una tarjeta compacta se abriera y se
  cerrara de inmediato. Ver `useCierreDiferido`.

- **Metro cachea su mapa de módulos en disco** y sobrevive a reinicios
  normales. Cuando se agrega un directorio nuevo hay que arrancar con
  `npx expo start -c`. No es probable, pero cuesta media hora cada vez que
  pasa.
