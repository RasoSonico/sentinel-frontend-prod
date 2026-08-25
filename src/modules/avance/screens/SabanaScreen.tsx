import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { useSabanaData } from "../hooks/useSabanaData";
import { useTodaySummary } from "../hooks/useTodaySummary";
import { useProgramaObra } from "../hooks/useProgramaObra";
import {
  buildFlatTree,
  getSearchResults,
  FlatTreeItem,
  SearchResultItem,
} from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { DateUtils } from "src/utils/dateUtils";
import { DateFilter } from "src/components/ui/filters/DateRangeFilter";
import {
  AppTabParamList,
  SabanaStackParamList,
} from "src/navigation/types";
import { telemetry } from "src/services/telemetry";

import SabanaCatalogSelector from "../components/SabanaCatalogSelector";
import SabanaCatalogMetrics from "../components/SabanaCatalogMetrics";
import SabanaTreeItem from "../components/SabanaTreeItem";
import { SabanaConceptNode } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import SabanaSearchResult from "../components/SabanaSearchResult";
import HoyResumenHeader from "../components/HoyResumenHeader";
import QueueHeaderButton from "../components/QueueHeaderButton";
import FotosDelDiaSheet from "../components/FotosDelDiaSheet";
import ConceptoSheet from "../components/ConceptoSheet";
import CapturaRapidaSheet from "../components/CapturaRapidaSheet";

import styles from "../styles/SabanaScreen.styles";
import { DesignTokens } from "src/styles/designTokens";

type Mode = "tree" | "search";
type ListItem =
  | { kind: "tree"; item: FlatTreeItem }
  | { kind: "search"; item: SearchResultItem };

type SabanaHomeNavigationProp = CompositeNavigationProp<
  StackNavigationProp<SabanaStackParamList, "SabanaHome">,
  BottomTabNavigationProp<AppTabParamList>
>;

// Filtro "hoy" (rango UTC del día local) para los destinos de los contadores
const buildTodayFilter = (): DateFilter => {
  const { start, end } = DateUtils.getTodayUTCRange();
  return { type: "range", startDate: start, endDate: end, label: "Hoy" };
};

const SabanaScreen: React.FC = () => {
  const navigation = useNavigation<SabanaHomeNavigationProp>();
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(
    null,
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("tree");
  const [query, setQuery] = useState("");
  const [fotosSheetVisible, setFotosSheetVisible] = useState(false);
  // Copia plana del nodo (no un objeto Realm vivo): el árbol se reconstruye en
  // cada refetch y sostener la referencia original crashearía con
  // "Accessing object which has been invalidated" con el sheet abierto.
  const [conceptoSeleccionado, setConceptoSeleccionado] =
    useState<SabanaConceptNode | null>(null);
  const [fichaVisible, setFichaVisible] = useState(false);
  const [capturaVisible, setCapturaVisible] = useState(false);
  const [origenCaptura, setOrigenCaptura] = useState<"fila" | "ficha">("fila");

  const {
    catalogs,
    effectiveCatalogId,
    tree,
    globalStats,
    isLoading,
    hoy,
    refetch,
  } = useSabanaData(selectedCatalogId);
  const [refrescando, setRefrescando] = useState(false);

  const { constructionId, obraNombre, resumenObra, counts } = useTodaySummary();

  // PROG. de la franja: se calcula en cliente sobre la misma serie que las
  // filas, así franja y sábana no pueden discrepar (ver useProgramaObra).
  const programaObra = useProgramaObra();

  // Nombre del catálogo vigente, para la cejilla de contexto de los sheets.
  // Se usa effectiveCatalogId y no selectedCatalogId: el segundo es null hasta
  // que el usuario elige, mientras el primero ya trae el resuelto por defecto.
  const catalogName = useMemo(
    () => catalogs.find((c) => c.id === effectiveCatalogId)?.name ?? "",
    [catalogs, effectiveCatalogId],
  );

  // Ícono de nube con badge en el header de navegación → cola de sync
  const { pendingCount, failedCount, syncingCount } = usePendingAdvanceQueue();
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <QueueHeaderButton
          pendingCount={pendingCount}
          failedCount={failedCount}
          syncingCount={syncingCount}
          onPress={() => navigation.navigate("PendingSync")}
        />
      ),
    });
  }, [navigation, pendingCount, failedCount, syncingCount]);

  // ── Handlers de la franja Hoy (ADR-003 D2/D5: los contadores NAVEGAN,
  // jamás filtran el árbol in situ) ──────────────────────────────────────────
  const handleAvancesPress = useCallback(() => {
    telemetry.trackEvent("hoy_counter_tapped", { counter: "avances" });
    navigation.navigate("AvancesList", { initialFilter: buildTodayFilter() });
  }, [navigation]);

  const handleFotosPress = useCallback(() => {
    telemetry.trackEvent("hoy_counter_tapped", { counter: "fotos" });
    setFotosSheetVisible(true);
  }, []);

  // Tap en foto de la galería → abrir el avance que la respalda
  const handleOpenAdvanceFromFoto = useCallback(
    (advanceId: number) => {
      setFotosSheetVisible(false);
      navigation.navigate("AvancesList", {
        initialFilter: buildTodayFilter(),
        openAdvanceId: advanceId,
      });
    },
    [navigation],
  );

  const handleIncidenciasPress = useCallback(() => {
    telemetry.trackEvent("hoy_counter_tapped", { counter: "incidencias" });
    navigation.navigate("IncidentsList", { initialFilter: buildTodayFilter() });
  }, [navigation]);

  const handleReporteDiaPress = useCallback(() => {
    if (constructionId === null) return;
    telemetry.trackEvent("reporte_del_dia_tapped", {
      obra_id: constructionId,
    });
    // La misma fecha operativa que usa el árbol, no un `new Date()` propio:
    // eran el mismo día por coincidencia, y al cruzar la medianoche con la app
    // abierta el reporte habría pedido un día distinto del que muestra la
    // sábana.
    navigation.navigate("Reportes", {
      screen: "AdvanceReport",
      params: {
        constructionId: String(constructionId),
        constructionName: obraNombre ?? "",
        dateFrom: hoy,
        dateTo: hoy,
      },
    });
  }, [navigation, constructionId, obraNombre, hoy]);

  const handleIncidenciaPress = useCallback(() => {
    navigation.navigate("IncidentRegistration");
  }, [navigation]);

  const handleToggle = useCallback((nodeKey: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  }, []);

  const handleCatalogSelect = useCallback((id: number) => {
    setSelectedCatalogId(id);
    setQuery("");
    // expandedIds don't need resetting — stale keys are simply ignored by
    // buildFlatTree when the tree changes to a different catalog's nodes.
  }, []);

  // El programa lo escribe el escritorio: NINGUN worker lo invalida, y el
  // paquete solo se refresca en login, reconexion o aqui. Este gesto es la via
  // por la que el usuario trae un programa recien activado sin reiniciar sesion.
  const handleRefresh = useCallback(async () => {
    setRefrescando(true);
    try {
      await refetch();
    } finally {
      setRefrescando(false);
    }
  }, [refetch]);

  const handleModeChange = useCallback((m: Mode) => {
    setMode(m);
    setQuery("");
  }, []);

  const flatItems = useMemo(
    () => buildFlatTree(tree, expandedIds),
    [tree, expandedIds],
  );

  const searchResults = useMemo(
    () => getSearchResults(tree, query),
    [tree, query],
  );

  const listData: ListItem[] = useMemo(() => {
    if (mode === "tree") {
      return flatItems.map((item) => ({ kind: "tree", item }));
    }
    return searchResults.map((item) => ({ kind: "search", item }));
  }, [mode, flatItems, searchResults]);

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.kind === "tree") return item.item.nodeKey;
    return `sr-${item.item.concept.id}`;
  }, []);

  // Gramática de gesto (ADR-004 D12). Los callbacks van memoizados a propósito:
  // las filas están envueltas en `memo` y una sábana grande renderiza cientos.
  const handleOpenFicha = useCallback((concept: SabanaConceptNode) => {
    setConceptoSeleccionado(concept);
    setOrigenCaptura("fila");
    setFichaVisible(true);
  }, []);


  // El camino exploratorio y el rápido convergen: desde la ficha se pasa a la
  // captura con el concepto ya cargado, y el origen queda marcado como "ficha"
  // para poder comparar ambas rutas en telemetría.
  const handleRegistrarDesdeFicha = useCallback((concept: SabanaConceptNode) => {
    setFichaVisible(false);
    setConceptoSeleccionado(concept);
    setOrigenCaptura("ficha");
    setCapturaVisible(true);
  }, []);


  const renderItem: ListRenderItem<ListItem> = useCallback(
    ({ item }) => {
      if (item.kind === "tree") {
        return (
          <SabanaTreeItem
            item={item.item}
            onToggle={handleToggle}
            onOpenFicha={handleOpenFicha}
          />
        );
      }
      return (
        <SabanaSearchResult
          item={item.item}
          onOpenFicha={handleOpenFicha}
        />
      );
    },
    [handleToggle, handleOpenFicha],
  );

  const resultsLabel = useMemo(() => {
    if (mode === "tree") {
      return query ? `Filtrando: "${query}"` : "";
    }
    const count = searchResults.length;
    if (!query) return `${count} conceptos en el catálogo`;
    return `${count} concepto${count !== 1 ? "s" : ""} encontrado${count !== 1 ? "s" : ""}`;
  }, [mode, query, searchResults.length]);

  const ListHeader = useMemo(
    () => (
      <>
        {/* Franja ejecutiva del día (zona oscura, ADR-003 D2/D3); viaja con
            el scroll — al bajar, la sábana toma el 100% de la pantalla */}
        <HoyResumenHeader
          obraNombre={obraNombre}
          resumenObra={resumenObra}
          programaObra={programaObra}
          counts={counts}
          onPressAvances={handleAvancesPress}
          onPressFotos={handleFotosPress}
          onPressIncidencias={handleIncidenciasPress}
          onPressReporteDia={handleReporteDiaPress}
          onPressIncidencia={handleIncidenciaPress}
        />

        {/* Catalog selector — on screen, not in Stack header */}
        <SabanaCatalogSelector
          catalogs={catalogs}
          selectedId={effectiveCatalogId}
          onSelect={handleCatalogSelect}
        />

        {/* Métricas del catálogo activo (la GlobalCard se retiró: el global
            de obra vive en la franja oscura) */}
        <SabanaCatalogMetrics stats={globalStats} />

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "tree" && styles.modeBtnActive]}
            onPress={() => handleModeChange("tree")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="list"
              size={14}
              color={
                mode === "tree"
                  ? DesignTokens.colors.neutral[800]
                  : DesignTokens.colors.neutral[400]
              }
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "tree" && styles.modeBtnTextActive,
              ]}
            >
              Vista jerárquica
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "search" && styles.modeBtnActive]}
            onPress={() => handleModeChange("search")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="search"
              size={14}
              color={
                mode === "search"
                  ? DesignTokens.colors.neutral[800]
                  : DesignTokens.colors.neutral[400]
              }
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "search" && styles.modeBtnTextActive,
              ]}
            >
              Buscar concepto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={DesignTokens.colors.neutral[400]}
            style={{ position: "absolute", left: 11, top: 11, zIndex: 1 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={
              mode === "tree"
                ? "Filtrar en árbol..."
                : "WBS, clave o descripción..."
            }
            placeholderTextColor={DesignTokens.colors.neutral[400]}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              style={{ position: "absolute", right: 10, top: 11, zIndex: 1 }}
            >
              <Ionicons
                name="close"
                size={16}
                color={DesignTokens.colors.neutral[400]}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Results label */}
        {resultsLabel ? (
          <Text style={styles.resultsLabel}>{resultsLabel}</Text>
        ) : null}
      </>
    ),
    [
      programaObra,
      catalogs,
      effectiveCatalogId,
      handleCatalogSelect,
      globalStats,
      mode,
      handleModeChange,
      query,
      resultsLabel,
      obraNombre,
      resumenObra,
      counts,
      handleAvancesPress,
      handleFotosPress,
      handleIncidenciasPress,
      handleReporteDiaPress,
      handleIncidenciaPress,
    ],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator
            size="large"
            color={DesignTokens.colors.primary[500]}
          />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>
            Cargando datos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Sin OfflineIndicator aquí: su contenedor dejaba una franja vacía
          bajo el header y la franja Hoy ya trae banner offline propio */}
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {query
                ? `Sin resultados para "${query}"`
                : "Sin conceptos en este catálogo."}
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={handleRefresh}
            colors={[DesignTokens.colors.primary[600]]}
            tintColor={DesignTokens.colors.primary[600]}
          />
        }
        removeClippedSubviews
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={10}
      />

      {/* Galería de fotos del día (L-01a) — destino del contador Fotos */}
      <FotosDelDiaSheet
        isVisible={fotosSheetVisible}
        onClose={() => setFotosSheetVisible(false)}
        constructionId={constructionId}
        onOpenAdvance={handleOpenAdvanceFromFoto}
      />

      {/* Ficha del concepto (L-02) — destino del tap en la fila */}
      <ConceptoSheet
        isVisible={fichaVisible}
        onClose={() => setFichaVisible(false)}
        concept={conceptoSeleccionado}
        catalogName={catalogName}
        constructionId={constructionId}
        hoy={hoy}
        onRegistrarAvance={handleRegistrarDesdeFicha}
      />

      {/* Captura rápida (L-03) — destino del botón "+" y del CTA de la ficha */}
      <CapturaRapidaSheet
        isVisible={capturaVisible}
        onClose={() => setCapturaVisible(false)}
        concept={conceptoSeleccionado}
        catalogId={effectiveCatalogId}
        catalogName={catalogName}
        constructionId={constructionId}
        origen={origenCaptura}
      />
    </SafeAreaView>
  );
};

export default SabanaScreen;
