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
  Animated,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { AvanceStackParamList } from "src/navigation/types";
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

import styles from "../styles/AdvanceListScreen.styles";

type AdvanceListScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvancesList"
>;

interface QueueHeaderButtonProps {
  pendingCount: number;
  failedCount: number;
  syncingCount: number;
  onPress: () => void;
}

const QueueHeaderButton: React.FC<QueueHeaderButtonProps> = ({
  pendingCount,
  failedCount,
  syncingCount,
  onPress,
}) => {
  const totalCount = pendingCount + failedCount + syncingCount;
  const hasErrors = failedCount > 0;
  const isSyncing = syncingCount > 0;

  const iconName = isSyncing
    ? "sync"
    : hasErrors
      ? "alert-circle"
      : "cloud-upload-outline";

  const badgeColor = hasErrors
    ? "#e74c3c"
    : isSyncing || pendingCount > 0
      ? "#f39c12"
      : undefined;

  return (
    <TouchableOpacity onPress={onPress} style={queueButtonStyles.container}>
      <Ionicons name={iconName} size={22} color="#fff" />
      {totalCount > 0 && (
        <View
          style={[queueButtonStyles.badge, { backgroundColor: badgeColor }]}
        >
          <Text style={queueButtonStyles.badgeText}>
            {totalCount > 99 ? "99+" : String(totalCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const queueButtonStyles = StyleSheet.create({
  container: {
    marginRight: 12,
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});

const AdvanceListScreen: React.FC = () => {
  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnimation = React.useRef(new Animated.Value(0)).current;

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

  const toggleFab = useCallback(() => {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      overshootClamping: true,
    }).start();
    setFabOpen((prev) => !prev);
  }, [fabOpen, fabAnimation]);

  const handleNavigateReport = useCallback(() => {
    toggleFab();
    navigation.navigate("ReportSelection");
  }, [toggleFab, navigation]);

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

      {/* Speed Dial FAB */}
      {!isBottomSheetVisible && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          {/* Mini FAB — Reporte */}
          <Animated.View
            style={[
              styles.miniFabRow,
              {
                opacity: fabAnimation,
                transform: [
                  {
                    translateY: fabAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -64],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={fabOpen ? "auto" : "none"}
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
          >
            <View style={styles.miniFabLabel}>
              <Text style={styles.miniFabLabelText}>Reportes</Text>
            </View>
            <TouchableOpacity
              style={styles.miniFab}
              onPress={handleNavigateReport}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mini FAB — Avance */}
          <Animated.View
            style={[
              styles.miniFabRow,
              {
                opacity: fabAnimation,
                transform: [
                  {
                    translateY: fabAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -128],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={fabOpen ? "auto" : "none"}
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
          >
            <View style={styles.miniFabLabel}>
              <Text style={styles.miniFabLabelText}>Avance</Text>
            </View>
            <TouchableOpacity
              style={styles.miniFab}
              onPress={() => {
                toggleFab();
                handleAddAdvance();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="trending-up" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          {/* Main FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={toggleFab}
            activeOpacity={0.8}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: fabAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "45deg"],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="add" size={24} style={styles.fabIcon} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AdvanceListScreen;
