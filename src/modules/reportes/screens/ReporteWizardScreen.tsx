import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { telemetry } from "src/services/telemetry";
import { useReporteSubmitToQueue } from "src/hooks/reportes/useReporteSubmitToQueue";

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

interface Props {
  constructionId: number;
  constructionName: string;
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
    <BorradorReporteProvider>
      <Wizard {...props} />
    </BorradorReporteProvider>
  );
}

function Wizard({
  constructionId,
  constructionName,
  onSalir,
  onGuardado,
}: Props) {
  const { borrador, tieneTrabajoSinGuardar, reiniciar } = useBorradorReporte();
  const { submitToQueue } = useReporteSubmitToQueue();
  const captura = useCapturaFotosReporte();
  const { idsUltimaTanda, consumirTanda } = captura;

  const [vista, setVista] = useState<Vista>("proveedores");
  /** A dónde vuelve la subpantalla abierta. */
  const [regresarA, setRegresarA] = useState<Vista>("paso1");
  const [actividadId, setActividadId] = useState<string | undefined>();
  const [idsTanda, setIdsTanda] = useState<string[]>([]);
  const [fotoId, setFotoId] = useState<string>("");

  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // ── Validación por paso ─────────────────────────────────────────────────

  const fotosSinPie = borrador.fotos.filter(
    (f) => f.pie.trim().length === 0,
  ).length;

  const puedeAvanzar = useMemo(() => {
    switch (vista) {
      case "paso1":
        return borrador.actividades.length >= MIN_ACTIVIDADES;
      case "paso2":
        // Las fotos son opcionales; lo que no se admite es una foto sin pie.
        return fotosSinPie === 0;
      case "paso3":
        // Las observaciones son opcionales: hay jornadas que no ameritan ninguna
        // (retroalimentación de Coordinadores). El servidor tampoco la exige.
        return true;
      default:
        return true;
    }
  }, [vista, borrador, fotosSinPie]);

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

  const salirConfirmando = useCallback(() => {
    if (!tieneTrabajoSinGuardar) {
      reiniciar();
      onSalir();
      return;
    }
    Alert.alert(
      "Descartar el reporte",
      "Se perderá todo lo que hayas capturado.",
      [
        { text: "Seguir aquí", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            reiniciar();
            onSalir();
          },
        },
      ],
    );
  }, [tieneTrabajoSinGuardar, reiniciar, onSalir]);

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
       * **Sin `reiniciar()` aquí.** Vaciar el borrador antes de salir dejaba
       * la Revisión en blanco —"Sin actividades capturadas", "Sin área
       * seleccionada"— justo detrás del modal que se desvanecía: el usuario
       * veía su reporte borrarse en el instante de guardarlo.
       *
       * No hace falta: el borrador vive en el `useReducer` de
       * `BorradorReporteProvider`, que envuelve esta pantalla y muere con la
       * ruta modal al cerrarse. Reiniciar aquí era pagar el costo visual de
       * algo que el desmontaje hace solo.
       */
      onGuardado(salida.reporteLocalId);
    } finally {
      setGuardando(false);
    }
  }, [submitToQueue, borrador, constructionId, constructionName, onGuardado]);

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
        onCerrar={salirConfirmando}
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
        onCerrar={salirConfirmando}
        cinta={<WizardStepper actual={paso} completados={completados} />}
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
              <BotonWizard
                etiqueta="Guardar reporte"
                variante="guardar"
                onPress={() => setConfirmando(true)}
                deshabilitado={
                  borrador.actividades.length < MIN_ACTIVIDADES ||
                  fotosSinPie > 0 ||
                  // Firmar es obligatorio: un reporte va firmado o no va
                  // (ADR-006 del backend, decisión 6). El servidor lo exige
                  // también; esto evita que el usuario descubra el 400 cuando
                  // ya creía haber cerrado.
                  borrador.firma === null
                }
              />
            ) : (
              <BotonWizard
                etiqueta="Siguiente →"
                onPress={avanzar}
                deshabilitado={!puedeAvanzar}
              />
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
            <RevisionStep onEditarBloque={editarBloque} />
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
