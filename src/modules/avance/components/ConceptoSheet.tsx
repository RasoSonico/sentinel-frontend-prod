import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { useHistorialConcepto } from "../hooks/useHistorialConcepto";
import RecuadroPrograma from "./RecuadroPrograma";
import { estaSobreEjecutado } from "../utils/coloresAvance";
import { SabanaConceptNode } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { telemetry } from "src/services/telemetry";
import { DateUtils } from "src/utils/dateUtils";
import styles from "./styles/ConceptoSheet.styles";

// Cuántas trae el paquete offline (debe coincidir con ULTIMAS_CARGAS_POR_CONCEPTO
// del backend). Si llegan justo estas, puede haber más y se ofrece el historial.
const CARGAS_EN_PAQUETE = 4;

interface Props {
  isVisible: boolean;
  onClose: () => void;
  concept: SabanaConceptNode | null;
  catalogName: string;
  constructionId: number | null;
  /**
   * Fecha operativa `YYYY-MM-DD`. Llega como prop —y no de un hook propio— para
   * que la ficha use LA MISMA con la que se construyó el árbol: si difirieran,
   * el chip de la fila y el recuadro de la ficha podrían contradecirse en el
   * cruce de medianoche.
   */
  hoy: string;
  /** CTA: transiciona a la captura rápida con el concepto precargado */
  onRegistrarAvance: (concept: SabanaConceptNode) => void;
}

interface CargaResumen {
  fecha: string;
  volumen: number;
  tienePhotos: boolean;
  esDeHoy: boolean;
}

/**
 * Ficha del concepto (L-02, ADR-004 D12).
 *
 * Tocar la fila abre esta ficha, y desde aquí se llega a la captura (enmienda
 * E9: se retiró el "+" por fila). Da un lugar donde decidir con contexto antes
 * de capturar, sin salir de la sábana.
 *
 * Trazabilidad SIN RED al abrir: las 4 cargas más recientes viajan dentro del
 * paquete `avance/base/`. El historial completo sí es una llamada, pero solo
 * cuando el usuario la pide — que es cuando él la pidió y hay conexión.
 *
 * El recuadro de tres capas (E3) se monta sobre esta lámina y se rige por D11:
 * sin dato de programa no se renderiza nada, ni siquiera un recuadro vacío.
 */
const ConceptoSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  concept,
  catalogName,
  constructionId,
  hoy,
  onRegistrarAvance,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  // Ambos estados guardan PARA QUÉ concepto aplican, no un booleano suelto: así,
  // al cambiar de concepto, vuelven a cerrado por derivación y no hace falta un
  // efecto que resetee estado (que además el React Compiler marca como
  // antipatrón).
  const [seccionAbiertaPara, setSeccionAbiertaPara] = useState<number | null>(
    null,
  );
  const [expandidoPara, setExpandidoPara] = useState<number | null>(null);

  const seccionAbierta = concept != null && seccionAbiertaPara === concept.id;
  // El historial completo depende de que la sección esté abierta: si no lo
  // estuviera, la consulta seguiría habilitada alimentando una lista que nadie
  // ve.
  const mostrarTodas = seccionAbierta && expandidoPara === concept.id;

  const alternarSeccion = () => {
    if (!concept) return;
    if (seccionAbierta) {
      setSeccionAbiertaPara(null);
      // Cerrar la sección también repliega el historial: al reabrirla debe
      // verse el estado corto, no una lista de cincuenta cargas que el usuario
      // ya no recuerda haber pedido.
      setExpandidoPara(null);
    } else {
      setSeccionAbiertaPara(concept.id);
    }
  };

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
      telemetry.trackEvent("ficha_concepto_opened", {
        obra_id: constructionId ?? 0,
      });
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible, constructionId]);

  // Las 4 cargas más recientes YA vienen en el nodo, dentro del paquete
  // offline: abrir la ficha no dispara ninguna red (D13.1). Antes se leían del
  // cache de avances por catálogo, que se pagina a 100 — en un catálogo grande
  // las cargas de un concepto concreto quedaban fuera del corte y la ficha se
  // veía vacía aunque el concepto tuviera historia.
  const cargasDelPaquete: CargaResumen[] = useMemo(() => {
    if (!concept) return [];
    const hoy = DateUtils.getTodayUTCRange();
    return concept.ultimas_cargas.map((carga) => ({
      fecha: carga.fecha,
      volumen: carga.volumen,
      tienePhotos: carga.tiene_foto,
      esDeHoy: DateUtils.isDateInUTCRange(carga.fecha, hoy.start, hoy.end),
    }));
  }, [concept]);

  // Historial completo: solo si el usuario lo pide explícitamente.
  const historial = useHistorialConcepto(concept?.id, mostrarTodas);

  const cargas: CargaResumen[] = useMemo(() => {
    if (!mostrarTodas || historial.cargas.length === 0) return cargasDelPaquete;
    const hoy = DateUtils.getTodayUTCRange();
    return historial.cargas.map((carga) => ({
      fecha: carga.fecha,
      volumen: carga.volumen,
      tienePhotos: carga.tieneFoto,
      esDeHoy: DateUtils.isDateInUTCRange(carga.fecha, hoy.start, hoy.end),
    }));
  }, [mostrarTodas, historial.cargas, cargasDelPaquete]);

  // NO se retorna null antes del BottomSheet: el sheet debe permanecer montado
  // para que `sheetRef` esté vivo cuando el efecto llama a expand(). Montarlo
  // en el mismo render en que se pide abrir hace que expand() corra antes de
  // que el sheet mida sus snap points, y no abre.
  const pct = concept?.pct ?? 0;
  const restante = concept
    ? concept.quantity - concept.cumulative_volume
    : 0;
  const cejilla = concept
    ? [catalogName, concept.work_item_name, concept.section_name]
        .filter(Boolean)
        .join(" · ")
    : "";

  // Pista en la cabecera plegada. Sin ella el usuario tocaría a ciegas, y la
  // fecha de la última carga es justo el dato que decide si vale la pena abrir:
  // responde "¿hace cuánto no capturo aquí?" sin costar un tap.
  const pistaCargas = (() => {
    const ultima = cargasDelPaquete[0];
    if (!ultima) return "sin registros";
    return ultima.esDeHoy
      ? "última: hoy"
      : `última: ${DateUtils.formatUTCForDisplay(ultima.fecha, "d MMM")}`;
  })();

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["75%"]}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} onPress={onClose} />
      )}
    >
      <BottomSheetScrollView
        style={styles.contenedor}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        {concept && (
          <>
        {/* 1 · Cabecera de contexto — mismo lenguaje que el detalle y la captura */}
        <Text style={styles.cejilla} numberOfLines={2}>
          {cejilla}
          {concept.wbs_code ? ` · ${concept.wbs_code}` : ""}
        </Text>
        <Text style={styles.descripcion}>{concept.description}</Text>

        {/* 2 · Acumulado contra contratado — porcentaje sin recorte (E2) */}
        <View style={styles.bloqueAcumulado}>
          <View style={styles.filaNumeros}>
            <View>
              <Text style={styles.etiqueta}>Ejecutado</Text>
              <Text style={styles.valorGrande}>
                {concept.cumulative_volume.toLocaleString("es-MX", {
                  maximumFractionDigits: 2,
                })}{" "}
                <Text style={styles.unidad}>{concept.unit}</Text>
              </Text>
            </View>
            <View style={styles.alineadoDerecha}>
              <Text style={styles.etiqueta}>Contratado</Text>
              <Text style={styles.valorMedio}>
                {concept.quantity.toLocaleString("es-MX", {
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.barraFondo}>
            <View
              style={[
                styles.barraRelleno,
                // El recorte al 100% vive solo aquí, en el ancho de la barra:
                // el porcentaje que se muestra conserva el valor real (E2).
                { width: `${Math.min(100, pct)}%` },
                pct > 100 ? styles.barraSobreejecutada : null,
              ]}
            />
          </View>

          <View style={styles.filaPie}>
            <Text style={[styles.pct, pct > 100 ? styles.pctSobre : null]}>
              {pct.toFixed(1)}%
            </Text>
            <Text style={styles.restante}>
              {restante >= 0
                ? `restan ${restante.toLocaleString("es-MX", {
                    maximumFractionDigits: 2,
                  })} ${concept.unit}`
                : `${Math.abs(restante).toLocaleString("es-MX", {
                    maximumFractionDigits: 2,
                  })} ${concept.unit} sobre lo contratado`}
            </Text>
          </View>
        </View>

        {/* 3 · Las tres capas del programa (E3). D11: sin programa, nada —
            ni recuadro vacío ni ceros que se leerían como atraso total. */}
        {concept.programa && (
          <RecuadroPrograma
            programa={concept.programa}
            ejecutado={concept.cumulative_volume}
            unidad={concept.unit}
            sobreEjecutado={estaSobreEjecutado(pct)}
            hoy={hoy}
          />
        )}

        {/* 4 · Trazabilidad de cargas, PLEGADA por defecto.
            Es útil pero no es la pregunta con la que se abre la ficha —esa la
            responden el acumulado y el recuadro de programa—, así que ocupar
            media pantalla siempre la volvía ruido. La cabecera lleva la fecha
            de la última carga para que el tap no sea a ciegas. */}
        <TouchableOpacity
          style={styles.cabeceraSeccion}
          onPress={alternarSeccion}
          disabled={cargasDelPaquete.length === 0}
          activeOpacity={0.6}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.tituloSeccion}>Últimas cargas</Text>
          <Text style={styles.pistaSeccion}>{pistaCargas}</Text>
          {/* Sin cargas no hay chevron: el galón ES la promesa de que hay algo
              adentro, y la cabecera ya dice "sin registros". */}
          {cargasDelPaquete.length > 0 && (
            <Ionicons
              name={seccionAbierta ? "chevron-up" : "chevron-down"}
              size={16}
              style={styles.chevronSeccion}
            />
          )}
        </TouchableOpacity>

        {seccionAbierta && cargas.length > 0 && (
          <>
            {cargas.map((carga, indice) => (
              <View
                key={`${carga.fecha}-${indice}`}
                style={[styles.carga, carga.esDeHoy ? styles.cargaHoy : null]}
              >
                <Text
                  style={[
                    styles.cargaFecha,
                    carga.esDeHoy ? styles.cargaFechaHoy : null,
                  ]}
                >
                  {/* Formato del UX-SPEC L-02: "Hoy · 14:22" para el día en
                      curso —la hora importa cuando hay varias cargas hoy— y
                      "Mié 15 jul" para el resto. */}
                  {carga.esDeHoy
                    ? `Hoy · ${DateUtils.formatUTCForDisplay(carga.fecha, "HH:mm")}`
                    : DateUtils.formatUTCForDisplay(carga.fecha, "EEE d MMM")}
                </Text>
                <Text style={styles.cargaVolumen}>
                  +
                  {carga.volumen.toLocaleString("es-MX", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {concept.unit}
                </Text>
                {carga.tienePhotos ? (
                  <Ionicons name="camera" size={14} style={styles.iconoFoto} />
                ) : (
                  <View style={styles.iconoHueco} />
                )}
              </View>
            ))}

            {historial.cargando && (
              <Text style={styles.vacio}>Cargando historial…</Text>
            )}

            {mostrarTodas && historial.sinConexion && (
              <Text style={styles.vacio}>
                El historial completo necesita conexión. Estas son las últimas
                cargas guardadas en el dispositivo.
              </Text>
            )}

            {/* Sin galón: ahora hay uno solo en la ficha, el de la cabecera de
                sección. Dos chevrones anidados harían dudar de cuál cierra qué. */}
            {(mostrarTodas || cargasDelPaquete.length >= CARGAS_EN_PAQUETE) && (
              <TouchableOpacity
                style={styles.verHistorial}
                onPress={() =>
                  setExpandidoPara(mostrarTodas ? null : (concept?.id ?? null))
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.verHistorialTexto}>
                  {mostrarTodas
                    ? "Ver menos"
                    : "Ver historial completo"}
                  {mostrarTodas && historial.total > 0
                    ? ` (${historial.total} cargas)`
                    : ""}
                </Text>
              </TouchableOpacity>
            )}

          </>
        )}

        {/* 5 · CTA — el camino exploratorio y el rápido convergen aquí */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => onRegistrarAvance(concept)}
        >
          <Ionicons name="add-circle-outline" size={20} style={styles.ctaIcono} />
          <Text style={styles.ctaTexto}>Registrar avance</Text>
        </TouchableOpacity>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

export default ConceptoSheet;
