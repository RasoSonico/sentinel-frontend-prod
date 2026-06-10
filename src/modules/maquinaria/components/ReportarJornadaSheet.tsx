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
  TextInput,
  ActivityIndicator,
} from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import {
  useCreateJornada,
  useCreateJornadaTransitoria,
  useConceptsByCatalog,
} from "src/hooks/data/query/useMaquinaria";
import { useCatalogsByConstruction } from "src/hooks/data/query/useAvance";
import { getJornadasByEstancia } from "src/hooks/data/api/maquinariaApi";
import SearchableDropdown from "src/components/ui/SearchableDropdown";
import { DateUtils } from "src/utils/dateUtils";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  item: MaquinariaHubItemRealm | null;
  constructionId: number | undefined;
}

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
  const [isLoadingYesterday, setIsLoadingYesterday] = useState(false);

  const isTransitoria = item?.tipo_permanencia === "TRANSITORIA";

  const { data: catalogs, isInitialLoading: loadingCatalogs } =
    useCatalogsByConstruction(constructionId);

  const { data: concepts, isInitialLoading: loadingConcepts } =
    useConceptsByCatalog(catalogId);

  const createJornada = useCreateJornada();
  const createTransitoria = useCreateJornadaTransitoria();

  const isPending = createJornada.isPending || createTransitoria.isPending;

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
      setCatalogId(null);
      setConceptId(null);
      setObservaciones("");
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

  const handleGuardar = () => {
    if (!item || !catalogId) return;

    if (isTransitoria) {
      createTransitoria.mutate(
        {
          maquinaria_id: item.id,
          catalog_id: catalogId,
          concept_id: conceptId ?? undefined,
          fecha: today,
          observaciones: observaciones.trim() || undefined,
        },
        {
          onSuccess: () => onClose(),
          onError: (error: Error) => {
            Alert.alert(
              "Error",
              error.message ?? "No se pudo registrar. Intenta de nuevo.",
            );
          },
        },
      );
    } else {
      createJornada.mutate(
        {
          estancia: item.estancia_id,
          fecha: today,
          estado: "TRABAJANDO",
          catalog: catalogId,
          concept: conceptId ?? undefined,
          observaciones: observaciones.trim() || undefined,
        },
        {
          onSuccess: () => onClose(),
          onError: (error: Error) => {
            Alert.alert(
              "Error",
              error.message ?? "No se pudo registrar. Intenta de nuevo.",
            );
          },
        },
      );
    }
  };

  const catalogOptions = useMemo(
    () => (catalogs ?? []).map((c) => ({ label: c.name, value: c.id })),
    [catalogs],
  );

  const conceptOptions = useMemo(
    () => (concepts ?? []).map((c) => ({ label: c.description, value: c.id })),
    [concepts],
  );

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
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
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
          Observaciones (opcional)
        </Text>
        <TextInput
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
