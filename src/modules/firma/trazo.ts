/**
 * La geometría de una firma, pura: sin React y sin React Native.
 *
 * **Esto tiene un gemelo en el servidor** (`firma/trazo.py`) y los dos tienen
 * que dibujar lo mismo. Si el teléfono suavizara de una forma y el PDF de
 * otra, el usuario firmaría una cosa y entregaría otra — y una firma que no se
 * parece a lo que se trazó no es una firma. Por eso el suavizado vive aquí,
 * separado del componente, y se prueba contra los mismos casos
 * (`trazo.test.mjs`, `bun run test:logica`).
 *
 * Las cotas también son las del servidor. Duplicarlas no es ideal, pero la
 * alternativa —descubrir en el 400 que la firma era inválida— se descubriría
 * al cerrar el reporte, que es el peor momento posible.
 */

export type Punto = readonly [number, number];
export type Trazo = Punto[];

export interface Geometria {
  /** Ancho del lienzo donde se trazó, en sus propias unidades. */
  ancho: number;
  /** Alto del lienzo donde se trazó. */
  alto: number;
  /** Un trazo por toque continuo: baja el dedo, mueve, levanta. */
  trazos: Trazo[];
}

// Las mismas de `firma/trazo.py`. Si cambian allá, cambian aquí.
export const MAX_TRAZOS = 64;
export const MAX_PUNTOS_POR_TRAZO = 2000;
export const MAX_PUNTOS = 6000;

/**
 * Distancia mínima entre dos puntos guardados, en unidades del lienzo.
 *
 * Sin esto, un dedo quieto sobre la pantalla genera decenas de puntos por
 * segundo en el mismo sitio: llenan la cota de 6 000, engordan el payload que
 * sube sin señal y no aportan nada al trazo. Un cuarto de punto es menos que
 * el grosor de la pluma, así que nada de lo que se descarta se vería.
 */
export const MINIMA_SEPARACION = 0.25;

/** Grosor de la pluma relativo al lado mayor. El mismo número que el servidor. */
export const GROSOR_RELATIVO = 0.007;

export function grosorDePluma(ancho: number, alto: number): number {
  return Math.max(ancho, alto) * GROSOR_RELATIVO;
}

/**
 * ¿Vale la pena guardar este punto después del anterior?
 *
 * Distancia Manhattan y no euclidiana: se evalúa en cada evento de movimiento,
 * en el hilo de UI y entre cuadros. Una raíz cuadrada ahí no se nota en un
 * teléfono nuevo y sí en el que tiene el supervisor.
 */
export function vaLejos(anterior: Punto | undefined, x: number, y: number): boolean {
  'worklet';
  if (!anterior) return true;
  return (
    Math.abs(x - anterior[0]) + Math.abs(y - anterior[1]) >= MINIMA_SEPARACION
  );
}

/**
 * El trazo como camino SVG, suavizado.
 *
 * **El truco, que es el mismo del servidor:** cada punto capturado se usa como
 * *control* de una curva cuadrática que termina en el punto medio del par
 * siguiente. La curva pasa suave por donde el dedo cambió de dirección en vez
 * de hacer un vértice. Unir los puntos con rectas —que es lo que hace casi
 * todo el mundo— deja picos visibles justo en los trazos rápidos, que es donde
 * una firma los tiene.
 *
 * Lleva `'worklet'` porque se arma en el hilo de UI mientras el dedo se mueve:
 * si cruzara a JS en cada punto, el trazo se quedaría atrás del dedo en los
 * teléfonos que importan.
 */
export function caminoDeTrazo(trazo: Trazo): string {
  'worklet';
  const n = trazo.length;
  if (n === 0) return '';

  // Un toque suelto —el punto sobre la i— no es un camino: trazarlo no
  // pintaría nada. Se dibuja como un arco cerrado de radio mínimo.
  if (n === 1) {
    const [x, y] = trazo[0];
    return `M ${x} ${y} l 0.01 0`;
  }
  if (n === 2) {
    return `M ${trazo[0][0]} ${trazo[0][1]} L ${trazo[1][0]} ${trazo[1][1]}`;
  }

  let d = `M ${trazo[0][0]} ${trazo[0][1]}`;
  for (let i = 1; i < n - 1; i++) {
    const [cx, cy] = trazo[i];
    const [sx, sy] = trazo[i + 1];
    d += ` Q ${cx} ${cy} ${(cx + sx) / 2} ${(cy + sy) / 2}`;
  }
  d += ` L ${trazo[n - 1][0]} ${trazo[n - 1][1]}`;
  return d;
}

/** Todos los trazos en un solo camino. Un `<Path>` y no N. */
export function caminoCompleto(trazos: Trazo[]): string {
  'worklet';
  let d = '';
  for (let i = 0; i < trazos.length; i++) {
    d += (i ? ' ' : '') + caminoDeTrazo(trazos[i]);
  }
  return d;
}

export interface Problema {
  /** Mensaje listo para enseñar. */
  mensaje: string;
}

/**
 * Las mismas cotas que el servidor, aplicadas antes de mandar.
 *
 * Devuelve `null` si está bien. Se comprueba aquí porque el 400 del servidor
 * llegaría al cerrar el reporte, que es el peor momento para enterarse.
 */
export function problemaDe(geometria: Geometria): Problema | null {
  const { ancho, alto, trazos } = geometria;

  if (!(ancho > 0) || !(alto > 0)) {
    return { mensaje: 'El lienzo de la firma no midió nada.' };
  }
  if (!trazos.length) {
    return { mensaje: 'Traza tu firma para continuar.' };
  }
  if (trazos.length > MAX_TRAZOS) {
    return { mensaje: `Una firma no puede tener más de ${MAX_TRAZOS} trazos.` };
  }

  let total = 0;
  for (const trazo of trazos) {
    if (!trazo.length) {
      return { mensaje: 'Hay un trazo sin puntos.' };
    }
    if (trazo.length > MAX_PUNTOS_POR_TRAZO) {
      return {
        mensaje: `Un trazo no puede tener más de ${MAX_PUNTOS_POR_TRAZO} puntos.`,
      };
    }
    total += trazo.length;
    for (const [x, y] of trazo) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return { mensaje: 'La firma tiene puntos inválidos.' };
      }
      if (x < 0 || x > ancho || y < 0 || y > alto) {
        return { mensaje: 'La firma salió del área de captura.' };
      }
    }
  }
  if (total > MAX_PUNTOS) {
    return { mensaje: `La firma no puede pasar de ${MAX_PUNTOS} puntos.` };
  }
  return null;
}

/**
 * Recorta los puntos a la caja y redondea a dos decimales.
 *
 * El recorte importa: un gesto que sale del lienzo por un píxel entrega una
 * coordenada negativa, el servidor la rechaza entera y el usuario ve "la firma
 * salió del área" sin haber hecho nada raro. Dos decimales porque la pluma
 * mide cuatro unidades: lo que se descarta es ruido que solo engorda el
 * payload que sube sin señal.
 */
export function aPayload(geometria: Geometria): Geometria {
  const { ancho, alto } = geometria;
  const recorta = (v: number, tope: number) =>
    Math.round(Math.min(Math.max(v, 0), tope) * 100) / 100;

  return {
    ancho: Math.round(ancho * 100) / 100,
    alto: Math.round(alto * 100) / 100,
    trazos: geometria.trazos
      .filter((t) => t.length > 0)
      .map((t) => t.map(([x, y]) => [recorta(x, ancho), recorta(y, alto)] as Punto)),
  };
}

/** Caja de la TINTA, no la del lienzo: `[x0, y0, x1, y1]`. */
export function limites(trazos: Trazo[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const trazo of trazos) {
    for (const [x, y] of trazo) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x0 === Infinity) return [0, 0, 0, 0];
  return [x0, y0, x1, y1];
}

/**
 * La firma llevada a otra caja: recorta a la tinta, conserva proporción,
 * centra. Es lo que permite enseñar una firma guardada en una vista chica —la
 * tarjeta del perfil, el paso de cierre— del tamaño que le toque.
 *
 * Replica `encajar` del servidor, incluidas las salvaguardas del trazo recto.
 */
export function encajar(
  geometria: Geometria,
  caja: { x: number; y: number; ancho: number; alto: number }
): { trazos: Trazo[]; escala: number } {
  const [x0, y0, x1, y1] = limites(geometria.trazos);

  let tintaAncho = x1 - x0;
  let tintaAlto = y1 - y0;
  if (tintaAncho <= 0 && tintaAlto <= 0) {
    tintaAncho = tintaAlto =
      Math.max(geometria.ancho, geometria.alto) * GROSOR_RELATIVO;
  } else if (tintaAncho <= 0) {
    tintaAncho = tintaAlto * 0.02;
  } else if (tintaAlto <= 0) {
    tintaAlto = tintaAncho * 0.02;
  }

  const escala = Math.min(caja.ancho / tintaAncho, caja.alto / tintaAlto);
  const dx = caja.x + (caja.ancho - tintaAncho * escala) / 2 - x0 * escala;
  const dy = caja.y + (caja.alto - tintaAlto * escala) / 2 - y0 * escala;

  return {
    trazos: geometria.trazos.map((t) =>
      t.map(([x, y]) => [x * escala + dx, y * escala + dy] as Punto)
    ),
    escala,
  };
}
