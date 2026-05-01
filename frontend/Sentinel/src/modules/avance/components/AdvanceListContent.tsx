import React, { useState, useCallback } from "react";
import {
  FlatList,
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

import { AvanceStackParamList } from "src/navigation/types";
import { PhysicalAdvanceResponse } from "src/types/entities";

import { useAdvanceListData, StatusFilter } from "../hooks/useAdvanceListData";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { useDateRangeFilter } from "src/hooks/ui/useDateRangeFilter";

import AdvanceItemCard from "./AdvanceItemCard";
import AdvanceListHeader from "./AdvanceListHeader";
import AdvanceListEmptyState from "./AdvanceListEmptyState";
import AdvanceDetailBottomSheet from "./AdvanceDetailBottomSheet";
import OfflineIndicator from "./OfflineIndicator";

import styles from "../styles/AdvanceListScreen.styles";

type AdvanceListScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvancesList"
>;

interface AdvanceListContentProps {
  constructionId: number;
  constructionName: string;
}

const AdvanceListContent: React.FC<AdvanceListContentProps> = ({
  constructionId,
  constructionName,
}) => {
  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Hooks
  const navigation = useNavigation<AdvanceListScreenNavigationProp>();

  const { dateFilter, setDateFilter, startDate, endDate, singleDate } =
    useDateRangeFilter();

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
    constructionId,
    constructionName,
    statusFilter,
    startDate,
    endDate,
    singleDate,
  });

  // Bottom sheet hook
  const {
    selectedAdvance,
    isVisible: isBottomSheetVisible,
    openBottomSheet,
    closeBottomSheet,
    setSelectedAdvance,
  } = useBottomSheet();

  // Handlers
  const handleAddAdvance = useCallback(() => {
    navigation.navigate("AvanceRegistration", {
      constructionId: String(constructionId),
      constructionName,
    });
  }, [constructionId, constructionName, navigation]);

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
      refetchAdvances();
      setSelectedAdvance(updatedAdvance);
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
    <View style={styles.container}>
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

      {/* Floating Action Button */}
      {!isBottomSheetVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddAdvance}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} style={styles.fabIcon} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AdvanceListContent;
