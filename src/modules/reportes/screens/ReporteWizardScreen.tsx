import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { telemetry } from "src/services/telemetry";
import { useBorradorStore } from "src/hooks/reportes/useBorradoresDeReporte";
import { useReporteSubmitToQueue } from "src/hooks/reportes/useReporteSubmitToQueue";
import { useSnackbar } from "src/hooks/useSnackbar";

import { useCapturaFotosReporte } from "../hooks/useCapturaFotosReporte";

import { BotonWizard } from "../components/BotonWizard";
import { ModalConfirmarGuardado } from "../components/ModalGuardarReporte";
import { WizardShell } from "../components/WizardShell";
import { WizardStepper } from "../components/WizardStepper";
import { FotoBatchCarousel } from "../components/FotoBatchCarousel";
import { MIN_ACTIVIDADES } from "../constantes";
import { ActividadComposeScreen } from "./ActividadComposeScreen";
import { FotoDetalleScreen } from "./FotoDetalleScreen";
import { ProviderSelectionScreen } from "./ProviderSelectionScreen";
import { ActividadesStep } from "../steps/ActividadesStep";
import { ConclusionStep } from "../steps/ConclusionStep";
import { FotosStep } from "../steps/FotosStep";
import { RevisionStep } from "../steps/RevisionStep";
import type { BloqueEditable } from "../components/DocumentoMiniatura";
import {
  BorradorReporteProvider,
  useBorradorReporte,
} from "../state/BorradorReporteContext";

/**
 * El wizard completo (ADR-006, Decisiones 1–7).
 *
 * **Una sola pantalla con vistas internas, no un stack de rutas.** El requisito
 * que decide esto es de D6: el ✎ de cada bloque de Revisión salta a su editor y
 * **regresa directo a Revisión**, sin recorrer los pasos intermedios. Con un
 * stack habría que estar reescribiendo la pila en cada salto para que el
 * "atrás" del sistema no devolviera al usuario al paso 2 cuando venía del 4.
 * Con una máquina de estados, "de dónde vine" es una variable.
 *
 * Hacia afuera sigue siendo una ruta modal única, como pide el ADR.
 *
 * **Y dejó de ser un wizard (F44).** El ADR lo diseñó como un recorrido lineal
 * de una sentada; el campo mostró otra cosa: se captura a lo largo de toda la
 * jornada, entrando y saliendo de las secciones conforme avanza el trabajo —
 * las actividades de la mañana, las fotos cuando se toman, las observaciones
 * al cerrar—. Así que la cinta se toca para ir a cualquier sección, "Siguiente"
 * dejó de bloquear, y lo que de verdad hace falta para enviar se dice una sola
 * vez, en la Revisión, donde está el botón que lo exige.
 */

type Vista =
  | "proveedores"
  | "paso1"
  | "paso2"
  | "paso3"
  | "paso4"
  | "actividad"
  | "carrusel"
  | "fotoDetalle";

const PASO_POR_VISTA: Partial<Record<Vista, number>> = {
  paso1: 0,
  paso2: 1,
  paso3: 2,
  paso4: 3,
};

/**
 * Las secciones que se recuerdan al salir (F46).
 *
 * Solo estas cuatro. `proveedores` queda fuera porque es el encuadre y ya es
 * el default; las vistas de paso —componer una actividad, la cámara, el visor
 * de una foto— porque reabrir ahí no devuelve al usuario a lo que estaba
 * haciendo: lo deja dentro de una tarea que él ya había cerrado.
 */
const SECCIONES_RECORDADAS: Vista[] = ["paso1", "paso2", "paso3", "paso4"];

const esSeccionRecordada = (v: string): v is Vista =>
  (SECCIONES_RECORDADAS as string[]).includes(v);

interface Props {
  constructionId: number;
  constructionName: string;
  /** Borrador que se captura. Lo decide la lista; aquí solo se obedece. */
  borradorId: string;
  /** Cierra el wizard y vuelve a la zona de reportes. */
  onSalir: () => void;
  /**
   * El reporte quedó encolado. Cierra el wizard y lleva a la lista de la obra.
   *
   * No hay pantalla de resultado: en ese instante el reporte apenas sale del
   * teléfono y no hay nada que ofrecer —no se puede generar ningún archivo
   * hasta que el servidor lo confirme—. El resultado se ve donde vive, en el
   * chip de la fila, que además cambia solo.
   */
  onGuardado: (reporteLocalId: string) => void;
}

export function ReporteWizardScreen(props: Props) {
  return (
    <BorradorReporteProvider
      borradorId={props.borradorId}
      constructionId={props.constructionId}
      constructionName={props.constructionName}
    >
      <Wizard {...props} />
    </BorradorReporteProvider>
  );
}

function Wizard({
  constructionId,
  constructionName,
  borradorId,
  onSalir,
  onGuardado,
}: Props) {
  const { borrador, tieneContenido, cerrarBorrador } = useBorradorReporte();
  const { submitToQueue } = useReporteSubmitToQueue();
  const { descartarBorrador, leerUltimaSeccion, marcarSeccion } =
    useBorradorStore();
  const { showSnackbar } = useSnackbar();
  const captura = useCapturaFotosReporte();
  const { idsUltimaTanda, consumirTanda } = captura;

  /**
   * **Retomar devuelve al usuario donde estaba.**
   *
   * El encuadre se ve idéntico lleno y vacío, así que caer ahí al retomar
   * obliga a preguntarse si el reporte empezó de nuevo. Abrir en las
   * actividades, con las suyas en pantalla, contesta eso sin una sola palabra.
   *
   * Se lee una vez, en el inicializador perezoso: después de esto la sección
   * la manda la navegación, no Realm.
   */
  const [vista, setVista] = useState<Vista>(() => {
    const guardada = leerUltimaSeccion(borradorId);
    return guardada && esSeccionRecordada(guardada) ? guardada : "proveedores";
  });
  /** A dónde vuelve la subpantalla abierta. */
  const [regresarA, setRegresarA] = useState<Vista>("paso1");
  const [actividadId, setActividadId] = useState<string | undefined>();
  const [idsTanda, setIdsTanda] = useState<string[]>([]);
  const [fotoId, setFotoId] = useState<string>("");

  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /**
   * Apunta la sección en cuanto se entra a ella, no al salir del wizard.
   *
   * Salir no siempre pasa por aquí: la tab de Reportes desmonta la ruta, y
   * Android puede matar la app sin avisar. Lo que no se escribió en el momento
   * no se escribe nunca, y este dato existe justamente para esos dos casos.
   *
   * Las vistas de paso se ignoran, así que abrir la cámara desde las fotos
   * deja apuntado "fotos", que es donde el usuario cree que está.
   */
  useEffect(() => {
    if (!esSeccionRecordada(vista)) return;
    marcarSeccion(borradorId, vista);
  }, [vista, borradorId, marcarSeccion]);

  // ── Validación por paso ─────────────────────────────────────────────────

  const fotosSinPie = borrador.fotos.filter(
    (f) => f.pie.trim().length === 0,
  ).length;

  /**
   * Lo que falta para poder enviar, en palabras.
   *
   * **Sustituye a `puedeAvanzar`**, que bloqueaba "Siguiente" sin decir por
   * qué. Bloquear el avance dejó de tener sentido cuando la cinta se volvió
   * navegable —se podía llegar igual tocándola—, y nunca fue el lugar: lo que
   * el servidor exige se exige al enviar, no a media captura.
   *
   * Se dice qué falta y no solo que falta algo, por lo mismo que F38 en el
   * detalle: un botón apagado sin explicación es un callejón sin salida.
   *
   * Las observaciones NO entran: son opcionales, hay jornadas que no las
   * ameritan y el servidor tampoco las pide.
   */
  const faltaParaEnviar = useMemo(() => {
    const faltas: string[] = [];
    if (borrador.actividades.length < MIN_ACTIVIDADES) {
      faltas.push(
        MIN_ACTIVIDADES === 1
          ? "capturar al menos una actividad"
          : `capturar al menos ${MIN_ACTIVIDADES} actividades`,
      );
    }
    if (fotosSinPie > 0) {
      faltas.push(
        fotosSinPie === 1
          ? "el pie de una fotografía"
          : `el pie de ${fotosSinPie} fotografías`,
      );
    }
    // Firmar es obligatorio: un reporte va firmado o no va (ADR-008). El
    // servidor lo exige también; esto evita descubrir el 400 al final.
    if (borrador.firma === null) faltas.push("firmar el reporte");
    return faltas;
  }, [borrador.actividades.length, fotosSinPie, borrador.firma]);

  const completados = useMemo(() => {
    const hechos: number[] = [];
    if (borrador.actividades.length >= MIN_ACTIVIDADES) hechos.push(0);
    if (borrador.fotos.length > 0 && fotosSinPie === 0) hechos.push(1);
    // El paso 3 se marca hecho al REBASARLO, no solo al escribir: dejar la
    // el campo en blanco es una respuesta válida, y una palomita que nunca
    // aparece haría creer que falta algo.
    if (borrador.conclusion.trim().length > 0 || vista === "paso4") {
      hechos.push(2);
    }
    return hechos;
  }, [borrador, fotosSinPie, vista]);

  // Cada tanda capturada abre el carrusel para que sus pies se escriban en el
  // momento. Esperar a la lista sería pedirle al usuario que recuerde después
  // qué era cada foto.
  useEffect(() => {
    if (idsUltimaTanda.length === 0) return;
    setIdsTanda(idsUltimaTanda);
    consumirTanda();
    setVista("carrusel");
  }, [idsUltimaTanda, consumirTanda]);

  // ── Navegación ──────────────────────────────────────────────────────────

  /** El usuario está en un paso al que llegó por el ✎ de Revisión. */
  const editandoDesdeRevision = regresarA === "paso4" && vista !== "paso4";

  const volverARevision = useCallback(() => {
    setRegresarA("paso1");
    setVista("paso4");
  }, []);

  const avanzar = useCallback(() => {
    const orden: Vista[] = ["paso1", "paso2", "paso3", "paso4"];
    const actual = orden.indexOf(vista);
    if (actual === -1 || actual === orden.length - 1) return;
    telemetry.trackEvent("reporte_actividades_step_completed", {
      obra_id: constructionId,
      step: actual + 1,
    });
    setVista(orden[actual + 1]);
  }, [vista, constructionId]);

  const retroceder = useCallback(() => {
    const orden: Vista[] = ["proveedores", "paso1", "paso2", "paso3", "paso4"];
    const actual = orden.indexOf(vista);
    if (actual > 0) setVista(orden[actual - 1]);
  }, [vista]);

  /**
   * Ir a una sección tocando la cinta.
   *
   * **Sale del modo "corrigiendo desde Revisión".** Tocar la cinta es
   * navegación deliberada, no el viaje redondo de una corrección: dejar el pie
   * en "Volver a la revisión" después de eso haría que el botón prometiera un
   * regreso que el usuario ya no pidió.
   */
  const irASeccion = useCallback(
    (indice: number) => {
      const orden: Vista[] = ["paso1", "paso2", "paso3", "paso4"];
      const destino = orden[indice];
      if (!destino || destino === vista) return;
      telemetry.trackEvent("reporte_actividades_seccion_tocada", {
        obra_id: constructionId,
        desde: vista,
        hacia: destino,
      });
      setRegresarA("paso1");
      setVista(destino);
    },
    [vista, constructionId],
  );

  /**
   * Salir ya no destruye nada.
   *
   * Antes el ✕ preguntaba *"¿descartar? se perderá todo lo que hayas
   * capturado"*, porque era verdad: el borrador vivía en memoria. Ahora está
   * en el teléfono, así que preguntar sería ofrecerle al usuario destruir su
   * trabajo cada vez que quiere ir a ver otra cosa — y la respuesta correcta a
   * esa pregunta siempre sería "no".
   *
   * Se avisa en vez de preguntar: el usuario necesita saber que lo suyo quedó
   * guardado y cómo volver. Descartar pasa a ser un acto explícito, desde
   * "Nuevo" en la lista.
   */
  const salir = useCallback(() => {
    if (tieneContenido) {
      showSnackbar(
        "Guardado como borrador. Lo retomas desde Reportes.",
        "info",
      );
    }
    onSalir();
  }, [tieneContenido, showSnackbar, onSalir]);

  /** El ✎ de un bloque de Revisión: abre su editor y recuerda volver aquí. */
  const editarBloque = useCallback((bloque: BloqueEditable) => {
    setRegresarA("paso4");
    switch (bloque) {
      // Participantes y área se capturan en la misma pantalla previa, así que
      // los dos ✎ llevan ahí.
      case "participantes":
      case "area":
        setVista("proveedores");
        break;
      case "actividades":
        setVista("paso1");
        break;
      case "conclusion":
        setVista("paso3");
        break;
      case "evidencia":
        setVista("paso2");
        break;
    }
  }, []);

  /**
   * Sale de un editor abierto desde Revisión. Si el usuario llegó por el
   * recorrido normal, `regresarA` apunta al propio paso y esto no hace nada
   * raro; si llegó por un ✎, lo devuelve a Revisión.
   */
  const volverDeEdicion = useCallback(() => {
    if (regresarA === "paso4") {
      setRegresarA("paso1");
      setVista("paso4");
      return true;
    }
    return false;
  }, [regresarA]);

  // ── Guardado ────────────────────────────────────────────────────────────

  const guardar = useCallback(() => {
    setGuardando(true);
    try {
      const salida = submitToQueue(borrador, {
        constructionId,
        constructionName,
      });
      telemetry.trackEvent("reporte_actividades_saved", {
        obra_id: constructionId,
        actividades_count: borrador.actividades.length,
        fotos_count: borrador.fotos.length,
        contratistas_count: borrador.proveedorIds.length,
        was_offline: !salida.enviado,
      });
      setConfirmando(false);
      /**
       * El borrador se cierra y se borra: su contenido ya es de la cola.
       *
       * **Sin tocar los archivos de las fotos** —`borrarArchivos: false`—:
       * la cola guarda los mismos `localUri` y borrarlos aquí dejaría al
       * reporte recién encolado sin nada que subir.
       *
       * `cerrarBorrador()` va primero y no es simetría: corta el guardado
       * continuo. Sin él, el desmontaje de esta pantalla escribiría de nuevo
       * la fila que acabamos de borrar y el usuario volvería a encontrar, como
       * "reporte en curso", el reporte que acaba de enviar.
       *
       * **Sin `reiniciar()`.** Vaciar el estado antes de salir dejaba la
       * Revisión en blanco detrás del modal que se desvanecía: el usuario veía
       * su reporte borrarse en el instante de guardarlo.
       */
      cerrarBorrador();
      void descartarBorrador(borradorId, { borrarArchivos: false });
      onGuardado(salida.reporteLocalId);
    } finally {
      setGuardando(false);
    }
  }, [
    submitToQueue,
    borrador,
    constructionId,
    constructionName,
    borradorId,
    cerrarBorrador,
    descartarBorrador,
    onGuardado,
  ]);

  // ── Subpantallas ────────────────────────────────────────────────────────

  if (vista === "actividad") {
    return (
      <ActividadComposeScreen
        actividadId={actividadId}
        onCerrar={() => setVista("paso1")}
        onGuardado={() => setVista("paso1")}
      />
    );
  }

  if (vista === "carrusel") {
    return (
      <FotoBatchCarousel
        ids={idsTanda}
        onListo={() => {
          if (!volverDeEdicion()) setVista("paso2");
        }}
        onAgregarOtra={(origen) =>
          origen === "camara" ? captura.tomarFoto() : captura.elegirDeGaleria()
        }
      />
    );
  }

  if (vista === "fotoDetalle") {
    return (
      <FotoDetalleScreen fotoId={fotoId} onCerrar={() => setVista("paso2")} />
    );
  }

  if (vista === "proveedores") {
    return (
      <ProviderSelectionScreen
        constructionId={constructionId}
        constructionName={constructionName}
        onCerrar={salir}
        onContinuar={() => {
          if (!volverDeEdicion()) setVista("paso1");
        }}
      />
    );
  }

  // ── Pasos ───────────────────────────────────────────────────────────────

  const paso = PASO_POR_VISTA[vista] ?? 0;
  const esUltimo = vista === "paso4";

  return (
    <>
      <WizardShell
        titulo={esUltimo ? "Revisión" : "Reporte de actividades"}
        obra={constructionName}
        fechaReporte={borrador.fechaReporte}
        onCerrar={salir}
        cinta={
          <WizardStepper
            actual={paso}
            completados={completados}
            onIr={irASeccion}
          />
        }
        pie={
          <>
            {editandoDesdeRevision ? (
              // Quien vino a corregir un bloque desde Revisión no quiere
              // recorrer los pasos otra vez: vuelve directo a verificar.
              <BotonWizard
                etiqueta="Volver a la revisión"
                onPress={volverARevision}
                ancho
              />
            ) : (
              <>
            <BotonWizard
              etiqueta="Atrás"
              variante="contorno"
              onPress={retroceder}
            />
            {esUltimo ? (
              // "Enviar" y no "Guardar": guardado ya está, en cada cambio
              // (F43). Lo que este botón hace —y lo único que no tiene vuelta
              // atrás— es mandarlo. Llamarlo "Guardar" cuando ya está guardado
              // le quita el nombre a lo que de verdad ocurre aquí.
              <BotonWizard
                etiqueta="Enviar reporte"
                variante="guardar"
                onPress={() => setConfirmando(true)}
                deshabilitado={faltaParaEnviar.length > 0}
              />
            ) : (
              // Sin `deshabilitado`: con la cinta navegable, bloquear el avance
              // solo estorbaba —se llegaba igual tocándola— y lo que el
              // servidor exige se exige al enviar, no a media captura.
              <BotonWizard etiqueta="Siguiente →" onPress={avanzar} />
            )}
              </>
            )}
          </>
        }
      >
        <View style={estilos.contenido}>
          {vista === "paso1" ? (
            <ActividadesStep
              onEditar={(id) => {
                setActividadId(id);
                setVista("actividad");
              }}
            />
          ) : null}

          {vista === "paso2" ? (
            <FotosStep
              onTomarFoto={captura.tomarFoto}
              onElegirDeGaleria={captura.elegirDeGaleria}
              onAbrirDetalle={(id) => {
                setFotoId(id);
                setVista("fotoDetalle");
              }}
              cargando={captura.cargando}
              restantes={captura.restantes}
              lleno={captura.lleno}
            />
          ) : null}

          {vista === "paso3" ? <ConclusionStep /> : null}

          {vista === "paso4" ? (
            <RevisionStep
              onEditarBloque={editarBloque}
              falta={faltaParaEnviar}
            />
          ) : null}
        </View>
      </WizardShell>

      <ModalConfirmarGuardado
        visible={confirmando}
        guardando={guardando}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={guardar}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  contenido: { flex: 1 },
});
