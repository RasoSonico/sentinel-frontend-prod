import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { uuid } from "expo-modules-core";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { useAdvanceSubmitToQueue } from "src/hooks/avance/useAdvanceSubmitToQueue";
import { useAdvanceLocation } from "src/hooks/avance/useAdvanceLocation";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { usePhotoCapture } from "src/hooks/avance/usePhotoCapture";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { useSnackbar } from "src/hooks/useSnackbar";
import { SabanaConceptNode } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { telemetry } from "src/services/telemetry";
import { sanitizarVolumen } from "../utils/sanitizarVolumen";
import styles from "./styles/CapturaRapidaSheet.styles";

const num = (valor: string): number => {
  const n = parseFloat(valor.replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const fmt = (n: number): string =>
  n.toLocaleString("es-MX", { maximumFractionDigits: 2 });

interface Props {
  isVisible: boolean;
  onClose: () => void;
  concept: SabanaConceptNode | null;
  catalogId: number | null;
  catalogName: string;
  constructionId: number | null;
  /** Telemetría: por dónde llegó el usuario */
  origen: "fila" | "ficha";
}

/**
 * Captura rápida (L-03, ADR-004 D13).
 *
 * Elimina la cascada catálogo→partida→concepto reutilizando ÍNTEGRAMENTE el
 * motor del formulario clásico. No introduce NINGUNA ruta de red propia:
 * apertura desde cache, envío por `submitToQueue` → cola Realm → worker.
 * Duplicar ese pipeline rompería el conteo del Hoy y la atomicidad de
 * `completeAdvanceSyncAtomic`.
 *
 * Protección contra el error de dedo, en tres capas y sin modal universal
 * (D13.3): vista previa permanente de la consecuencia, confirmación
 * condicionada solo por sobre-ejecución, y "Deshacer" post-registro.
 */
const CapturaRapidaSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  concept,
  catalogId,
  catalogName,
  constructionId,
  origen,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const [cantidad, setCantidad] = useState("");
  const [notas, setNotas] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [formSessionId, setFormSessionId] = useState<string>("");

  const { submitToQueue, isAdding } = useAdvanceSubmitToQueue();
  const { removeFromQueueWithPhotos } = usePendingAdvanceQueue();
  const { photos, takePhoto, pickImage, removePhoto, clearPhotos } =
    usePhotoCapture({});
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();
  useAdvanceLocation();

  useEffect(() => {
    if (isVisible) {
      // Sesión propia por apertura: habilita el join
      // captura_rapida_opened ↔ advance_submission_queued y con él la medición
      // de abandono en la ruta rápida.
      const sesion = uuid.v4();
      setFormSessionId(sesion);
      setCantidad("");
      setNotas("");
      setConfirmando(false);
      clearPhotos();
      sheetRef.current?.expand();
      telemetry.trackEvent("captura_rapida_opened", {
        obra_id: constructionId ?? 0,
        origen,
      });
    } else {
      sheetRef.current?.close();
    }
    // clearPhotos es estable (useCallback en el hook); se omite a propósito
    // para no reiniciar el formulario en cada render del padre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, constructionId, origen]);

  const volumen = num(cantidad);

  const previa = useMemo(() => {
    if (!concept) return null;
    const nuevoAcumulado = concept.cumulative_volume + volumen;
    const pct =
      concept.quantity > 0 ? (nuevoAcumulado / concept.quantity) * 100 : 0;
    return {
      nuevoAcumulado,
      pct,
      // Contra el PROGRAMA, no contra el contrato: cuánto seguiría faltando (o
      // sobrando, si sale negativo) respecto a lo exigido a hoy.
      faltaParaPrograma: concept.programa
        ? concept.programa.programado - nuevoAcumulado
        : 0,
      // Anomalía objetiva y sin calibrar: el volumen empuja el acumulado por
      // encima de lo contratado. El umbral estadístico de "carga atípica"
      // queda para cuando la trazabilidad acumule historia.
      sobreejecuta: nuevoAcumulado > concept.quantity,
    };
  }, [concept, volumen]);

  const restante = concept
    ? concept.quantity - concept.cumulative_volume
    : 0;

  const puedeEnviar = volumen > 0 && !isAdding;

  const registrar = useCallback(async () => {
    if (!concept || !catalogId || !constructionId || !previa) return;

    // La sobre-ejecución NO bloquea: es información real de obra (E2). Solo
    // exige un segundo toque deliberado.
    if (previa.sobreejecuta && !confirmando) {
      setConfirmando(true);
      return;
    }

    const localId = await submitToQueue(
      { concept: concept.id, quantity: cantidad, notes: notas },
      {
        catalogId,
        catalogName,
        workItemId: concept.work_item_id,
        workItemName: concept.work_item_name,
        conceptDescription: concept.description,
        constructionId,
      },
      photos,
      formSessionId,
    );

    // Tercera capa: antes del sync, deshacer es retirar el item de la cola.
    // Después del sync, la edición inline del detalle ya cubre el caso.
    showSnackbar(`Avance de ${fmt(volumen)} ${concept.unit} registrado`, "success", {
      label: "Deshacer",
      onPress: () => {
        removeFromQueueWithPhotos(localId);
        showSnackbar("Avance descartado", "info");
      },
    });

    onClose();
  }, [
    concept, catalogId, constructionId, previa, confirmando, cantidad, notas,
    catalogName, photos, formSessionId, submitToQueue, showSnackbar,
    removeFromQueueWithPhotos, onClose, volumen,
  ]);

  // Igual que en ConceptoSheet: el sheet permanece montado para que el ref
  // esté vivo cuando el efecto pide expand().
  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["85%"]}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} onPress={onClose} />
      )}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        style={styles.contenedor}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {concept && (
          <>
        {/* 1 · Concepto precargado */}
        <Text style={styles.cejilla} numberOfLines={2}>
          {[catalogName, concept.work_item_name, concept.section_name]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text style={styles.descripcion}>{concept.description}</Text>

        <View style={styles.filaContexto}>
          <Text style={styles.contextoNumeros}>
            {fmt(concept.cumulative_volume)} / {fmt(concept.quantity)}{" "}
            {concept.unit}
          </Text>
          {restante > 0 && (
            <Text style={styles.restante}>
              restan {fmt(restante)} {concept.unit}
            </Text>
          )}
        </View>

        {/* 2 · Cantidad con vista previa de consecuencia en vivo */}
        <Text style={styles.etiquetaCampo}>Cantidad ejecutada</Text>
        <View style={styles.filaCantidad}>
          <BottomSheetTextInput
            style={styles.input}
            value={cantidad}
            onChangeText={(t) => {
              // 4 decimales: la precisión real del sistema (`Decimal(14,4)`).
              // El saneado también convierte la coma del teclado en español,
              // que antes se descartaba y convertía "12,5" en "125".
              setCantidad(sanitizarVolumen(t, 4));
              setConfirmando(false); // cambiar el número reabre la decisión
            }}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <View style={styles.chipUnidad}>
            <Text style={styles.chipUnidadTexto}>{concept.unit}</Text>
          </View>
        </View>

        {previa && volumen > 0 && (
          <Text style={styles.previa}>
            Nuevo acumulado:{" "}
            <Text style={styles.previaFuerte}>
              {fmt(previa.nuevoAcumulado)} / {fmt(concept.quantity)} (
              {previa.pct.toFixed(1)}%)
            </Text>
          </Text>
        )}

        {/* Segunda vara, bajo la primera (D11): dónde queda la captura contra
            el PROGRAMA, no contra el contrato. Sin programa no se renderiza —
            un "0.0 programado" se leería como que no había nada que hacer. */}
        {previa && volumen > 0 && concept.programa && (
          <Text style={styles.vsPrograma}>
            {previa.faltaParaPrograma > 0 ? (
              <>
                Aún{" "}
                <Text style={styles.vsProgramaFuerte}>
                  {fmt(previa.faltaParaPrograma)} {concept.unit}
                </Text>{" "}
                por debajo de lo programado a hoy (
                {fmt(concept.programa.programado)})
              </>
            ) : (
              <>
                Con esto alcanzas lo programado a hoy (
                {fmt(concept.programa.programado)}
                {previa.faltaParaPrograma < 0 ? (
                  <>
                    ), con{" "}
                    <Text style={styles.vsProgramaFuerte}>
                      {fmt(-previa.faltaParaPrograma)} {concept.unit}
                    </Text>{" "}
                    de margen
                  </>
                ) : (
                  ")"
                )}
              </>
            )}
          </Text>
        )}

        {previa?.sobreejecuta && (
          <View style={styles.alerta}>
            <Ionicons name="warning-outline" size={18} style={styles.alertaIcono} />
            <Text style={styles.alertaTexto}>
              Este volumen deja el acumulado en {fmt(previa.nuevoAcumulado)}{" "}
              {concept.unit}, por encima de los {fmt(concept.quantity)}{" "}
              contratados.
            </Text>
          </View>
        )}

        {/* 3 · Evidencia fotográfica, en el mismo paso */}
        <Text style={styles.etiquetaCampo}>Evidencia</Text>
        <View style={styles.filaFotos}>
          <TouchableOpacity style={styles.botonFoto} onPress={takePhoto}>
            <Ionicons name="camera" size={20} style={styles.botonFotoIcono} />
            <Text style={styles.botonFotoTexto}>Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonFoto} onPress={pickImage}>
            <Ionicons name="images" size={20} style={styles.botonFotoIcono} />
            <Text style={styles.botonFotoTexto}>Galería</Text>
          </TouchableOpacity>
        </View>

        {/* Miniaturas: la evidencia se verifica viéndola. Un contador dice
            "3 fotos" pero no si son del frente correcto, y el error de haber
            disparado a los zapatos solo se descubre después de sincronizar.
            Cada una se quita por separado —el contador solo podía retirar la
            última, así que borrar la primera obligaba a tirar las tres. */}
        {photos.length > 0 && (
          <View style={styles.filaMiniaturas}>
            {photos.map((foto) => (
              <View key={foto.id} style={styles.miniaturaWrap}>
                <Image source={{ uri: foto.uri }} style={styles.miniatura} />
                <TouchableOpacity
                  style={styles.quitarMiniatura}
                  onPress={() => removePhoto(foto.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    style={styles.quitarMiniaturaIcono}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.etiquetaCampo}>Notas (opcional)</Text>
        <BottomSheetTextInput
          style={styles.inputNotas}
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones del frente"
          multiline
        />

        {/* 5 · Aviso de guardado offline */}
        {!isOnline && (
          <View style={styles.avisoOffline}>
            <Ionicons name="cloud-offline-outline" size={16} style={styles.avisoIcono} />
            <Text style={styles.avisoTexto}>
              Sin conexión: se guardará y se enviará solo cuando haya señal.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.cta,
            confirmando ? styles.ctaConfirmar : null,
            !puedeEnviar ? styles.ctaDeshabilitado : null,
          ]}
          onPress={registrar}
          disabled={!puedeEnviar}
        >
          <Text style={styles.ctaTexto}>
            {confirmando
              ? `Confirmar y registrar ${fmt(volumen)} ${concept.unit}`
              : "Registrar avance"}
          </Text>
        </TouchableOpacity>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

export default CapturaRapidaSheet;
