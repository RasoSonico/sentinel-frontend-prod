import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import type { FilaMaquinaria } from "../filaMaquinaria";
import { useConceptsByCatalog } from "src/hooks/data/query/useMaquinaria";
import { usePendingJornadaQueue } from "src/hooks/maquinaria/usePendingJornadaQueue";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { useSnackbar } from "src/hooks/useSnackbar";
import { useCatalogsByConstruction } from "src/hooks/data/query/useAvance";
import { getJornadasByEstancia } from "src/hooks/data/api/maquinariaApi";
import SearchableDropdown from "src/components/ui/SearchableDropdown";
import { DateUtils } from "src/utils/dateUtils";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  item: FilaMaquinaria | null;
  constructionId: number | undefined;
}

/** Deja pasar dígitos y UN punto decimal; los horómetros marcan décimas. */
const soloLectura = (texto: string): string => {
  const limpio = texto.replace(/[^0-9.]/g, "");
  const [entera, ...resto] = limpio.split(".");
  return resto.length ? `${entera.slice(0, 7)}.${resto.join("").slice(0, 1)}` : entera.slice(0, 7);
};

const numeroDe = (texto: string): number | null => {
  if (!texto || texto === ".") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
};

/** 8 → "8", 8.5 → "8.5". Sin decimal de relleno cuando es redondo. */
const formatoHoras = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * `2026-10-11` → `11 oct`.
 *
 * Por componentes y NO con `new Date(iso)`: ese constructor interpreta la
 * cadena como UTC y en México corre el día hacia atrás. Es el mismo criterio
 * que `fechaPrograma.ts` documenta para la sábana.
 */
const fechaCortaLocal = (iso: string): string => {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d || m < 1 || m > 12) return iso;
  return `${d} ${MESES[m - 1]}`;
};

const ReportarJornadaSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  item,
  constructionId,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["65%", "90%"], []);

  const today = DateUtils.localDateToUTC(new Date());

  const [catalogId, setCatalogId] = useState<number | null>(null);
  const [conceptId, setConceptId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [horometroInicial, setHorometroInicial] = useState("");
  const [horometroFinal, setHorometroFinal] = useState("");
  const [isLoadingYesterday, setIsLoadingYesterday] = useState(false);

  const isTransitoria = item?.tipo_permanencia === "TRANSITORIA";

  const { data: catalogs, isInitialLoading: loadingCatalogs } =
    useCatalogsByConstruction(constructionId);

  const { data: concepts, isInitialLoading: loadingConcepts } =
    useConceptsByCatalog(catalogId);

  const { addToQueue } = usePendingJornadaQueue();
  const isOnline = useNetworkStatus();
  const { showSnackbar } = useSnackbar();

  // Guardar es ahora una escritura local: no hay espera de red que mostrar.
  const isPending = false;

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
      setCatalogId(null);
      setConceptId(null);
      setObservaciones("");
      // Los dos campos arrancan VACÍOS, incluido el inicial, aunque se conozca
      // el cierre anterior. Precargarlo haría fácil no mirar la máquina, y un
      // horómetro que nadie leyó es una copia del día pasado disfrazada de
      // lectura. El cierre anterior se muestra como referencia, no como valor.
      setHorometroInicial("");
      setHorometroFinal("");
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} onPress={onClose} />
    ),
    [onClose],
  );

  const handleRepetirAyer = async () => {
    if (!item?.estancia_id) return;
    setIsLoadingYesterday(true);
    try {
      const jornadas = await getJornadasByEstancia(item.estancia_id, 2);
      const ayer = jornadas.find((j) => j.fecha !== today);
      if (ayer && ayer.catalog) {
        setCatalogId(ayer.catalog);
        if (ayer.concept) setConceptId(ayer.concept);
        if (ayer.observaciones) setObservaciones(ayer.observaciones);
      } else {
        Alert.alert(
          "Sin datos previos",
          "No hay jornada anterior para repetir.",
        );
      }
    } catch {
      Alert.alert("Error", "No se pudo cargar la jornada anterior.");
    } finally {
      setIsLoadingYesterday(false);
    }
  };

  /**
   * **Único camino de salida: la cola.** Ninguna pantalla de maquinaria llama
   * ya al servicio de red directamente — misma regla que el wizard del reporte.
   *
   * Antes esto era un `mutate` contra la red y, sin señal, terminaba en un
   * Alert pidiendo reintentar contra una red que no había. El supervisor que
   * captura en el frente es el mismo que no tiene cobertura.
   */
  const handleGuardar = () => {
    if (!item || !catalogId || constructionId === undefined) return;

    addToQueue({
      estanciaId: isTransitoria ? 0 : item.estancia_id,
      maquinariaId: item.id,
      // Máquina que todavía vive solo en el teléfono: la jornada se cuelga del
      // alta encolada y el worker le pone su `estanciaId` real cuando el
      // servidor responda. Hasta entonces no se puede enviar.
      maquinariaLocalId: item.maquinariaLocalId,
      esTransitoria: isTransitoria,
      fecha: today,
      estado: "TRABAJANDO",
      catalogId,
      conceptId,
      observaciones: observaciones.trim(),
      horometroInicial: horometroInicial || null,
      horometroFinal: horometroFinal || null,
      constructionId,
      maquinariaEtiqueta: `${item.tipo} · ${item.marca} ${item.modelo}`,
    });

    // La bifurcación es información, no decoración: el usuario necesita saber
    // si su jornada ya está donde los demás la ven o si sigue en el teléfono.
    // `isOnline === null` ("todavía no se sabe") cuenta como "guardada aquí":
    // prometer una entrega que no podemos confirmar es el peor fallo posible.
    showSnackbar(
      isOnline === true
        ? "Jornada registrada"
        : "Jornada guardada en el teléfono · se enviará al haber señal",
      "success",
    );
    onClose();
  };

  const catalogOptions = useMemo(
    () => (catalogs ?? []).map((c) => ({ label: c.name, value: c.id })),
    [catalogs],
  );

  const conceptOptions = useMemo(
    () => (concepts ?? []).map((c) => ({ label: c.description, value: c.id })),
    [concepts],
  );

  /**
   * Diagnóstico de las dos lecturas.
   *
   * **Advierte, nunca bloquea.** El supervisor está parado frente a la máquina
   * y el sistema no: si él insiste, él gana. Lo único que no debe pasar es que
   * un dato raro llegue al informe sin que nadie lo haya visto.
   */
  const avisoHorometro = useMemo(() => {
    const ini = numeroDe(horometroInicial);
    const fin = numeroDe(horometroFinal);
    const previo = numeroDe(item?.ultimo_horometro ?? "");

    if (ini !== null && fin !== null) {
      // NO se acota a cero: un final menor no es "cero horas", es un dato que
      // alguien tiene que mirar. Ver `Jornada.horas_maquina` en el backend.
      const horas = fin - ini;
      if (horas < 0) {
        return {
          tono: "error" as const,
          texto:
            "El horómetro final es menor que el inicial. ¿Se reemplazó el equipo o es un dedazo?",
        };
      }
      if (horas > 24) {
        return {
          tono: "error" as const,
          texto: `${formatoHoras(horas)} h en una jornada. Revisa las lecturas.`,
        };
      }
    }

    // El inicial de hoy debería empatar con el último cierre. Cuando no empata
    // hay horas que la obra no vio, y ese hueco es información.
    if (ini !== null && previo !== null && ini !== previo) {
      const hueco = ini - previo;
      const desde = item?.ultimo_horometro_fecha
        ? ` (${fechaCortaLocal(item.ultimo_horometro_fecha)})`
        : "";
      return {
        tono: "alerta" as const,
        texto:
          hueco > 0
            ? `${formatoHoras(hueco)} h sin reportar desde el último cierre${desde}.`
            : `Arranca por debajo del último cierre de ${formatoHoras(previo)} h${desde}.`,
      };
    }

    return null;
  }, [horometroInicial, horometroFinal, item]);

  const horasCalculadas = useMemo(() => {
    const ini = numeroDe(horometroInicial);
    const fin = numeroDe(horometroFinal);
    if (ini === null || fin === null) return null;
    return fin - ini;
  }, [horometroInicial, horometroFinal]);

  const canSave = !!catalogId;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      // Mismo trío que `AdvanceDetailBottomSheet` y `CapturaRapidaSheet`.
      // Sin `adjustResize`, Android desplaza la ventana a cada palabra —el
      // "salto"— y sin `BottomSheetTextInput` el sheet no sabe qué campo tiene
      // el foco, así que no lo sube y el teclado lo tapa.
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Reportar jornada</Text>
            {item && (
              <Text style={styles.machine}>
                {item.tipo} · {item.marca} {item.modelo}
              </Text>
            )}
          </View>
          {!isTransitoria && (
            <TouchableOpacity
              style={styles.repetirBtn}
              onPress={handleRepetirAyer}
              disabled={isLoadingYesterday}
              activeOpacity={0.7}
            >
              {isLoadingYesterday ? (
                <ActivityIndicator
                  size="small"
                  color={DesignTokens.colors.primary[600]}
                />
              ) : (
                <>
                  <Ionicons
                    name="copy-outline"
                    size={14}
                    color={DesignTokens.colors.primary[600]}
                  />
                  <Text style={styles.repetirText}>Repetir ayer</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>Catálogo de trabajo</Text>
        {loadingCatalogs ? (
          <ActivityIndicator color={DesignTokens.colors.primary[500]} />
        ) : (
          <SearchableDropdown
            infoLabel="Catálogo"
            label="Selecciona un catálogo"
            searchLabel="Busca un catálogo"
            items={catalogOptions}
            selected={catalogId ?? ""}
            onSelect={(id) => {
              setCatalogId(id as number);
              setConceptId(null);
            }}
          />
        )}

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
          Concepto (opcional)
        </Text>
        {loadingConcepts ? (
          <ActivityIndicator color={DesignTokens.colors.primary[500]} />
        ) : (
          <SearchableDropdown
            infoLabel="Concepto"
            label="Selecciona un concepto"
            searchLabel="Busca un concepto"
            items={conceptOptions}
            selected={conceptId ?? ""}
            onSelect={(id) => setConceptId(id as number)}
            disabled={conceptOptions.length === 0}
          />
        )}

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
          Horómetro (opcional)
        </Text>

        {item?.ultimo_horometro ? (
          <Text style={styles.referencia}>
            Último cierre · {formatoHoras(Number(item.ultimo_horometro))} h
            {item.ultimo_horometro_fecha
              ? ` (${fechaCortaLocal(item.ultimo_horometro_fecha)})`
              : ""}
          </Text>
        ) : null}

        <View style={styles.horometroFila}>
          <View style={styles.horometroCampo}>
            <Text style={styles.horometroLabel}>Inicial</Text>
            <BottomSheetTextInput
              style={[
                styles.horometroInput,
                avisoHorometro?.tono === "error" && styles.horometroInputError,
                avisoHorometro?.tono === "alerta" && styles.horometroInputAlerta,
              ]}
              value={horometroInicial}
              onChangeText={(t) => setHorometroInicial(soloLectura(t))}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={DesignTokens.colors.neutral[400]}
            />
          </View>

          <Ionicons
            name="arrow-forward"
            size={15}
            color={DesignTokens.colors.neutral[400]}
            style={styles.horometroFlecha}
          />

          <View style={styles.horometroCampo}>
            <Text style={styles.horometroLabel}>Final</Text>
            <BottomSheetTextInput
              style={[
                styles.horometroInput,
                avisoHorometro?.tono === "error" && styles.horometroInputError,
              ]}
              value={horometroFinal}
              onChangeText={(t) => setHorometroFinal(soloLectura(t))}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={DesignTokens.colors.neutral[400]}
            />
          </View>

          <View style={styles.horometroHoras}>
            <Text
              style={[
                styles.horometroHorasNum,
                horasCalculadas === null && styles.horometroHorasVacio,
              ]}
            >
              {horasCalculadas === null ? "—" : formatoHoras(horasCalculadas)}
            </Text>
            <Text style={styles.horometroLabel}>horas</Text>
          </View>
        </View>

        {avisoHorometro ? (
          <View
            style={[
              styles.aviso,
              avisoHorometro.tono === "error"
                ? styles.avisoError
                : styles.avisoAlerta,
            ]}
          >
            <Ionicons
              name="warning-outline"
              size={14}
              color={
                avisoHorometro.tono === "error"
                  ? DesignTokens.colors.error[700]
                  : DesignTokens.colors.warning[700]
              }
            />
            <Text
              style={[
                styles.avisoTexto,
                avisoHorometro.tono === "error"
                  ? styles.avisoTextoError
                  : styles.avisoTextoAlerta,
              ]}
            >
              {avisoHorometro.texto}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
          Observaciones (opcional)
        </Text>
        <BottomSheetTextInput
          style={styles.notesInput}
          placeholder="Describe la actividad realizada..."
          placeholderTextColor={DesignTokens.colors.neutral[400]}
          value={observaciones}
          onChangeText={setObservaciones}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleGuardar}
          disabled={!canSave || isPending}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar jornada</Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  handle: { backgroundColor: DesignTokens.colors.neutral[300] },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
    marginBottom: 2,
  },
  machine: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[500],
  },
  repetirBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: DesignTokens.colors.primary[50],
    borderRadius: DesignTokens.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  repetirText: {
    fontSize: 12,
    color: DesignTokens.colors.primary[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: DesignTokens.colors.neutral[800],
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  referencia: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
    marginTop: 6,
  },
  horometroFila: {
    // `row` y no `flex: 1` en columna: ver la trampa de `flexBasis: 0`
    // documentada en el ADR-006 (tres bugs de layout con una sola causa).
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  horometroCampo: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  horometroLabel: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[500],
    marginBottom: 4,
  },
  horometroInput: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.md,
    paddingHorizontal: 11,
    // 48 de alto: es un campo que se toca con guante, de pie, frente a la
    // máquina. Por debajo de 44 el dedo falla y acierta en el de al lado.
    height: 48,
    fontSize: 17,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
  },
  horometroInputError: {
    borderColor: DesignTokens.colors.error[300],
  },
  horometroInputAlerta: {
    borderColor: DesignTokens.colors.warning[300],
  },
  horometroFlecha: {
    marginBottom: 15,
  },
  horometroHoras: {
    width: 54,
    alignItems: "flex-end",
    marginBottom: 2,
  },
  horometroHorasNum: {
    fontSize: 17,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[900],
    lineHeight: 20,
  },
  horometroHorasVacio: {
    color: DesignTokens.colors.neutral[300],
  },
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderRadius: DesignTokens.borderRadius.base,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  avisoError: {
    backgroundColor: DesignTokens.colors.error[50],
    borderColor: DesignTokens.colors.error[200],
  },
  avisoAlerta: {
    backgroundColor: DesignTokens.colors.warning[50],
    borderColor: DesignTokens.colors.warning[200],
  },
  avisoTexto: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12.5,
    lineHeight: 17,
  },
  avisoTextoError: {
    color: DesignTokens.colors.error[700],
  },
  avisoTextoAlerta: {
    color: DesignTokens.colors.warning[700],
  },
  saveBtn: {
    backgroundColor: DesignTokens.colors.success[600],
    borderRadius: DesignTokens.borderRadius.md,
    padding: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: DesignTokens.colors.neutral[300],
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});

export default ReportarJornadaSheet;
