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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { format } from "date-fns";

import { useSabanaData } from "../hooks/useSabanaData";
import { useTodaySummary } from "../hooks/useTodaySummary";
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

import OfflineIndicator from "../components/OfflineIndicator";
import SabanaCatalogSelector from "../components/SabanaCatalogSelector";
import SabanaCatalogMetrics from "../components/SabanaCatalogMetrics";
import SabanaTreeItem from "../components/SabanaTreeItem";
import SabanaSearchResult from "../components/SabanaSearchResult";
import HoyResumenHeader from "../components/HoyResumenHeader";
import QueueHeaderButton from "../components/QueueHeaderButton";

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

  const { catalogs, effectiveCatalogId, tree, globalStats, isLoading } =
    useSabanaData(selectedCatalogId);

  const { constructionId, obraNombre, resumenObra, counts } = useTodaySummary();

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

  // Fallback aprobado del ADR mientras la galería llega en el siguiente
  // paquete: navegar al historial de hoy
  const handleFotosPress = useCallback(() => {
    telemetry.trackEvent("hoy_counter_tapped", { counter: "fotos" });
    navigation.navigate("AvancesList", { initialFilter: buildTodayFilter() });
  }, [navigation]);

  const handleIncidenciasPress = useCallback(() => {
    telemetry.trackEvent("hoy_counter_tapped", { counter: "incidencias" });
    navigation.navigate("IncidentsList", { initialFilter: buildTodayFilter() });
  }, [navigation]);

  const handleReporteDiaPress = useCallback(() => {
    if (constructionId === null) return;
    telemetry.trackEvent("reporte_del_dia_tapped", {
      obra_id: constructionId,
    });
    const hoy = format(new Date(), "yyyy-MM-dd");
    navigation.navigate("Reportes", {
      screen: "AdvanceReport",
      params: {
        constructionId: String(constructionId),
        constructionName: obraNombre ?? "",
        dateFrom: hoy,
        dateTo: hoy,
      },
    });
  }, [navigation, constructionId, obraNombre]);

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

  const renderItem: ListRenderItem<ListItem> = useCallback(
    ({ item }) => {
      if (item.kind === "tree") {
        return <SabanaTreeItem item={item.item} onToggle={handleToggle} />;
      }
      return <SabanaSearchResult item={item.item} />;
    },
    [handleToggle],
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
      <View style={styles.indicatorContainer}>
        <OfflineIndicator />
      </View>

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
        removeClippedSubviews
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={10}
      />
    </SafeAreaView>
  );
};

export default SabanaScreen;
