import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * `true` mientras el teclado está arriba.
 *
 * Sirve para ceder espacio: una barra fija al pie de una hoja compite con el
 * área de escritura justo cuando el usuario más la necesita. Replegarla
 * mientras se teclea y devolverla al cerrar el teclado pone cada cosa donde
 * hace falta.
 *
 * **Se escucha el teclado y no el foco.** Un campo puede tener el foco sin
 * teclado visible —un lector externo, un teclado físico— y lo que estorba es
 * el teclado, no el foco.
 *
 * `Will` en iOS y `Did` en Android: iOS avisa antes de animar, así que la
 * barra se repliega a la vez que el teclado sube en vez de dar un salto al
 * final. Android no emite los `Will` de forma confiable.
 */
export function useTecladoVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const abre = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const cierra = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    let bajando: ReturnType<typeof setTimeout> | null = null;
    const cancelarBajada = () => {
      if (bajando !== null) {
        clearTimeout(bajando);
        bajando = null;
      }
    };

    const subeSub = Keyboard.addListener(abre, () => {
      // Subir es inmediato: ceder el espacio tarde se nota.
      cancelarBajada();
      setVisible(true);
    });

    const bajaSub = Keyboard.addListener(cierra, () => {
      // Bajar espera un instante, y si vuelve a subir en ese lapso no pasó
      // nada.
      //
      // **En Android con `adjustResize` estos eventos son ruidosos.** Cuando
      // un campo multilínea crece, la ventana se redimensiona y el sistema
      // puede emitir un `hide` seguido de un `show` sin que el teclado se haya
      // ido. Reaccionar a cada evento suelto hacía que lo que depende de esto
      // se desmontara y volviera a montar con cada letra: la hoja "temblaba".
      cancelarBajada();
      bajando = setTimeout(() => {
        bajando = null;
        setVisible(false);
      }, 180);
    });

    return () => {
      cancelarBajada();
      subeSub.remove();
      bajaSub.remove();
    };
  }, []);

  return visible;
}
