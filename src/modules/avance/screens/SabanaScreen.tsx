import React, { useState, useCallback, useMemo } from "react";
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

import { useSabanaData } from "../hooks/useSabanaData";
import {
  buildFlatTree,
  getSearchResults,
  FlatTreeItem,
  SearchResultItem,
} from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";

import OfflineIndicator from "../components/OfflineIndicator";
import SabanaCatalogSelector from "../components/SabanaCatalogSelector";
import SabanaGlobalCard from "../components/SabanaGlobalCard";
import SabanaTreeItem from "../components/SabanaTreeItem";
import SabanaSearchResult from "../components/SabanaSearchResult";

import styles from "../styles/SabanaScreen.styles";
import { DesignTokens } from "src/styles/designTokens";

type Mode = "tree" | "search";
type ListItem =
  | { kind: "tree"; item: FlatTreeItem }
  | { kind: "search"; item: SearchResultItem };

const SabanaScreen: React.FC = () => {
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(
    null,
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("tree");
  const [query, setQuery] = useState("");

  const { catalogs, effectiveCatalogId, tree, globalStats, isLoading } =
    useSabanaData(selectedCatalogId);

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
        {/* Catalog selector — on screen, not in Stack header */}
        <SabanaCatalogSelector
          catalogs={catalogs}
          selectedId={effectiveCatalogId}
          onSelect={handleCatalogSelect}
        />

        {/* Global progress card */}
        <SabanaGlobalCard stats={globalStats} />

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
