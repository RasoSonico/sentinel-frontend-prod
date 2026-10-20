# Pruebas de frontend — estado, plan y protocolo

**Propósito:** este documento sirve dos cosas. (1) Deja asentado qué se puede
probar hoy y qué no. (2) Es el encargo completo para una sesión dedicada a
montar pruebas automatizadas de frontend: qué montar, qué probar primero y
cómo reportar el resultado.

---

## 1. Qué tenemos hoy

**Automatizado: nada.** No hay `jest`, ni script de pruebas, ni un solo
archivo `.test.*` en el repositorio. Verificado el 20-oct-2026.

Lo que sí tenemos, y conviene no subestimar:

| Herramienta | Qué atrapa | Qué NO atrapa |
|---|---|---|
| `npx tsc --noEmit` | Contratos rotos entre capas: si el servidor cambia una forma y los tipos la siguen, falla | Que el tipo declarado no sea el que el servidor manda de verdad |
| `npm run lint` | Hooks mal usados, imports muertos, variables sin usar | Comportamiento |
| Suite del backend (391) | Todo el contrato del servidor | Lo que el teléfono hace con la respuesta |
| Pruebas en dispositivo | Todo lo demás | Regresiones: solo se prueba lo que uno se acuerda de probar |

**La línea base actual de `tsc` son 14 errores preexistentes.** Cualquier
cambio debe dejarla en 14, no en 15. No están arreglados porque viven en
código que nadie tocó en meses; arreglarlos es deuda aparte.

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
3. **Un Realm en memoria** para las pruebas de cola. Realm soporta
   `inMemory: true`; **no** mockear Realm: la mitad de los defectos han sido
   del comportamiento real de Realm (escrituras que fallan, objetos vivos que
   cambian bajo el código), y un mock los esconde por construcción.
4. **Mock del cliente HTTP**, no de los hooks. Probar contra respuestas
   falsas del servidor —incluidas las feas: 500, 408, respuesta perdida— es
   justamente el escenario que la cola existe para resolver.

**Lo que NO hay que montar:** pruebas de snapshot. No dicen nada sobre
comportamiento y se vuelven ruido que la gente aprende a regenerar sin mirar.

### 3.2 Qué probar, en orden de valor

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

### 3.3 Cómo reportar

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
| — | — | — | — | — |

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
- **Metro cachea su mapa de módulos en disco** y sobrevive a reinicios
  normales. Cuando se agrega un directorio nuevo hay que arrancar con
  `npx expo start -c`. No es probable, pero cuesta media hora cada vez que
  pasa.
