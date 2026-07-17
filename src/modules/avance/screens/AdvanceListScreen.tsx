import React, { useState, useCallback, useEffect } from "react";
import {
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  View,
  ActivityIndicator,
  Text,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { SabanaStackParamList } from "src/navigation/types";
import { PhysicalAdvanceResponse } from "src/types/entities";

import { useAdvanceListData, StatusFilter } from "../hooks/useAdvanceListData";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { useDateRangeFilter } from "src/hooks/ui/useDateRangeFilter";

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

const AdvanceListScreen: React.FC = () => {
  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Hooks
  const navigation = useNavigation<AdvanceListScreenNavigationProp>();

  const {
    dateFilter,
    setDateFilter,
    startDate: startDateStr,
    endDate: endDateStr,
    singleDate: singleDateStr,
  } = useDateRangeFilter();

  // useAdvanceListData expects Date objects — convert from the string values
  // returned by useDateRangeFilter
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;
  const singleDate = singleDateStr ? new Date(singleDateStr) : undefined;

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

      {/* Main List */}
      <FlatList
        data={advances}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
