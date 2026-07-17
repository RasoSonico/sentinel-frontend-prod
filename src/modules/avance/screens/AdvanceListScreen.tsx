import React, { useState, useCallback, useEffect, useMemo, memo } from "react";
import {
  SectionList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  View,
  ActivityIndicator,
  Text,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

import { SabanaStackParamList } from "src/navigation/types";
import { PhysicalAdvanceResponse } from "src/types/entities";

import { useAdvanceListData, StatusFilter } from "../hooks/useAdvanceListData";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { useDateRangeFilter } from "src/hooks/ui/useDateRangeFilter";
import {
  useRelativeDate,
  useCustomFormattedDate,
} from "src/hooks/ui/useDateFormatting";
import { DateUtils } from "src/utils/dateUtils";

import AdvanceItemCard from "../components/AdvanceItemCard";
import AdvanceListHeader from "../components/AdvanceListHeader";
import AdvanceListEmptyState from "../components/AdvanceListEmptyState";
import AdvanceDetailBottomSheet from "../components/AdvanceDetailBottomSheet";
import OfflineIndicator from "../components/OfflineIndicator";
import QueueHeaderButton from "../components/QueueHeaderButton";

import styles from "../styles/AdvanceListScreen.styles";

type AdvanceListScreenNavigationProp = StackNavigationProp<
  SabanaStackParamList,
  "AvancesList"
>;

type AdvanceListScreenRouteProp = RouteProp<SabanaStackParamList, "AvancesList">;

interface DaySection {
  key: string;
  date: string;
  data: PhysicalAdvanceResponse[];
}

// Título de sección por día local: "Hoy · jueves 16 de julio", "Ayer · …",
// o la fecha completa capitalizada (ADR-003 D6; fechas vía DateUtils, D9)
const DaySectionHeader = memo(({ date }: { date: string }) => {
  const relative = useRelativeDate(date);
  const full = useCustomFormattedDate(date, "EEEE d 'de' MMMM");
  const label =
    relative === "Hoy" || relative === "Ayer"
      ? `${relative} · ${full}`
      : full.charAt(0).toUpperCase() + full.slice(1);
  return <Text style={styles.sectionHeader}>{label}</Text>;
});
DaySectionHeader.displayName = "DaySectionHeader";

const AdvanceListScreen: React.FC = () => {
  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Hooks
  const navigation = useNavigation<AdvanceListScreenNavigationProp>();
  const route = useRoute<AdvanceListScreenRouteProp>();

  // Filtro inicial por ruta: los contadores de la franja Hoy llegan con el
  // rango de hoy (ADR-003 D5)
  const {
    dateFilter,
    setDateFilter,
    startDate,
    endDate,
    singleDate,
  } = useDateRangeFilter(route.params?.initialFilter ?? null);

  const {
    assignedConstruction,
    mainCatalog,
    advances,
    summary,
    loadingConstruction,
    loadingCatalogs,
    loadingAdvances,
    constructionError,
    catalogsError,
    advancesError,
    refetchConstruction,
    refetchAdvances,
  } = useAdvanceListData({
    statusFilter,
    startDate,
    endDate,
    singleDate,
  });

  // Queue hook for the header button
  const { pendingCount, failedCount, syncingCount } = usePendingAdvanceQueue();

  // Bottom sheet hook
  const {
    selectedAdvance,
    isVisible: isBottomSheetVisible,
    openBottomSheet,
    closeBottomSheet,
    setSelectedAdvance,
  } = useBottomSheet();

  // Agrupación por día local — el día es la unidad de memoria del contratista
  // (ADR-003 D6). `advances` ya viene ordenado descendente.
  const sections = useMemo<DaySection[]>(() => {
    const map = new Map<string, DaySection>();
    for (const advance of advances) {
      let key: string;
      try {
        key = format(DateUtils.parseUTCDate(advance.date), "yyyy-MM-dd");
      } catch {
        key = advance.date || "unknown";
      }
      const existing = map.get(key);
      if (existing) {
        existing.data.push(advance);
      } else {
        map.set(key, { key, date: advance.date, data: [advance] });
      }
    }
    return Array.from(map.values());
  }, [advances]);

  // Abrir un avance específico al llegar desde la galería de fotos del día
  const openAdvanceId = route.params?.openAdvanceId;
  useEffect(() => {
    if (!openAdvanceId) return;
    const target = advances.find((a) => a.id === openAdvanceId);
    if (target) {
      openBottomSheet(target);
      navigation.setParams({ openAdvanceId: undefined });
    }
  }, [openAdvanceId, advances, openBottomSheet, navigation]);

  // Set header title and queue button
  useEffect(() => {
    navigation.setOptions({
      title: "Avances",
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

  // Handlers
  const handleAddAdvance = useCallback(() => {
    if (assignedConstruction) {
      navigation.navigate("AvanceRegistration", {
        constructionId: assignedConstruction.id,
        constructionName: assignedConstruction.name,
      });
    } else {
      Alert.alert(
        "Error",
        "No tienes una obra asignada para registrar avances.",
        [{ text: "Entendido", style: "default" }],
      );
    }
  }, [assignedConstruction, navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchConstruction(), refetchAdvances()]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchConstruction, refetchAdvances]);

  const handleAdvanceUpdated = useCallback(
    (updatedAdvance: PhysicalAdvanceResponse) => {
      setSelectedAdvance((prev) => {
        if (!prev) return updatedAdvance;
        const newVolume = parseFloat(updatedAdvance.volume) || 0;
        const unitPrice = parseFloat(prev.concept_unit_price || "0");
        return {
          ...prev,
          ...updatedAdvance,
          total_amount:
            unitPrice > 0
              ? (newVolume * unitPrice).toFixed(2)
              : prev.total_amount,
        };
      });
      refetchAdvances();
    },
    [refetchAdvances, setSelectedAdvance],
  );

  const handleLoadMore = useCallback(() => {
    // TODO: Implement pagination with useInfiniteQuery
  }, []);

  // Render functions
  const renderItem = useCallback(
    ({ item }: { item: PhysicalAdvanceResponse }) => (
      <AdvanceItemCard item={item} onPress={openBottomSheet} />
    ),
    [openBottomSheet],
  );

  const renderHeader = useCallback(
    () => (
      <AdvanceListHeader
        construction={assignedConstruction}
        summary={summary}
        loading={loadingAdvances}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />
    ),
    [
      assignedConstruction,
      summary,
      loadingAdvances,
      statusFilter,
      dateFilter,
      setDateFilter,
    ],
  );

  const renderFooter = useCallback(() => {
    if (!loadingAdvances) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3498db" />
        <Text style={styles.footerLoaderText}>Cargando más avances...</Text>
      </View>
    );
  }, [loadingAdvances]);

  const renderEmpty = useCallback(
    () => (
      <AdvanceListEmptyState
        loadingConstruction={loadingConstruction}
        constructionError={constructionError}
        construction={assignedConstruction}
        loadingCatalogs={loadingCatalogs}
        catalogsError={catalogsError}
        hasCatalogs={!!mainCatalog}
        loadingAdvances={loadingAdvances}
        advancesError={advancesError}
        onRetryConstruction={refetchConstruction}
        onRetry={handleRefresh}
        onAddAdvance={handleAddAdvance}
      />
    ),
    [
      loadingConstruction,
      constructionError,
      assignedConstruction,
      loadingCatalogs,
      catalogsError,
      mainCatalog,
      loadingAdvances,
      advancesError,
      refetchConstruction,
      handleRefresh,
      handleAddAdvance,
    ],
  );

  const keyExtractor = useCallback(
    (item: PhysicalAdvanceResponse) =>
      item?.id?.toString() || Math.random().toString(),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline Indicator */}
      <View style={styles.indicatorContainer}>
        <OfflineIndicator />
      </View>

      {/* Main List — SectionList agrupada por día local (ADR-003 D6) */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <DaySectionHeader date={(section as DaySection).date} />
        )}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#3498db"]}
            tintColor="#3498db"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        contentContainerStyle={
          advances.length === 0 ? styles.emptyListContent : styles.listContent
        }
      />

      {/* Bottom Sheet for Advance Details */}
      <AdvanceDetailBottomSheet
        isVisible={isBottomSheetVisible}
        onClose={closeBottomSheet}
        advance={selectedAdvance}
        onAdvanceUpdated={handleAdvanceUpdated}
      />

      {/* FAB simple (ADR-003 D6): el speed dial murió — "Reporte" ya es tab
          de primer nivel; "+" va directo al formulario clásico de registro */}
      {!isBottomSheetVisible && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddAdvance}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} style={styles.fabIcon} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AdvanceListScreen;
