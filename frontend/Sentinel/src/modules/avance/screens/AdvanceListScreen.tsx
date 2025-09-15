import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useFormattedDate } from "../../../hooks/ui/useDateFormatting";
import ProgramStatusBadge from "../components/ProgramStatusBadge";
import OfflineIndicator from "../components/OfflineIndicator";
import AdvanceDetailBottomSheet from "../components/AdvanceDetailBottomSheet";
import { DateRangeFilter } from "../../../components/ui/filters/DateRangeFilter";
import { useDateRangeFilter } from "../../../hooks/ui/useDateRangeFilter";
import { AvanceStackParamList } from "../../../navigation/types";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import { selectOfflineSync } from "../../../redux/slices/avance/advanceSlice";
import { setCatalogsById } from "../../../redux/slices/avance/avanceFormDataSlice";
import { PhysicalAdvanceResponse } from "../../../types/entities";
import {
  useAssignedConstruction,
  useCatalogsByConstruction,
  useAdvancesByCatalog,
} from "../../../hooks/data/query/useAvanceQueries";
import styles from "../styles/AdvanceListScreen.styles";
import { ColorUtils } from "../../../styles/designTokens";

type AdvanceListScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvancesList"
>;

const AdvanceListScreen: React.FC = () => {
  const navigation = useNavigation<AdvanceListScreenNavigationProp>();
  const dispatch = useAppDispatch();

  // Estados para filtros y UI
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  // Hook para filtro de fecha
  const {
    dateFilter,
    setDateFilter,
    startDate,
    endDate,
    singleDate,
    hasFilter: hasDateFilter,
  } = useDateRangeFilter();

  // Estados para el bottom sheet
  const [selectedAdvance, setSelectedAdvance] =
    useState<PhysicalAdvanceResponse | null>(null);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  // Query para obtener la construcción asignada
  const {
    data: assignedConstruction,
    isLoading: loadingConstruction,
    error: constructionError,
    refetch: refetchConstruction,
  } = useAssignedConstruction();

  // Query para obtener catálogos de la construcción
  const {
    data: catalogs,
    isLoading: loadingCatalogs,
    error: catalogsError,
  } = useCatalogsByConstruction(
    assignedConstruction?.id ? parseInt(assignedConstruction.id) : null
  );

  // Obtener el primer catálogo disponible
  const mainCatalog = catalogs?.[0];

  // Preparar parámetros para query de avances con filtros combinados
  const advanceParams = useMemo(() => {
    const statusParam =
      statusFilter !== "all"
        ? (statusFilter.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED")
        : undefined;

    return {
      catalogId: mainCatalog?.id || null,
      status: statusParam,
      startDate,
      endDate,
      date: singleDate,
      page: 1,
      pageSize: 100,
    };
  }, [mainCatalog?.id, statusFilter, startDate, endDate, singleDate]);

  // Query para obtener avances con información detallada (detailed=true)
  const {
    data: advancesData,
    isLoading: loadingAdvances,
    error: advancesError,
    refetch: refetchAdvances,
  } = useAdvancesByCatalog({
    ...advanceParams,
    detailed: true,
  });

  // Calcular resumen localmente
  const localSummary = useMemo(() => {
    if (!advancesData?.advances) return null;

    const advances = advancesData.advances;
    return {
      total_advances: advances.length,
      pending_advances: advances.filter((a) => a.status === "PENDING").length,
      approved_advances: advances.filter((a) => a.status === "APPROVED").length,
      rejected_advances: advances.filter((a) => a.status === "REJECTED").length,
    };
  }, [advancesData?.advances]);

  // Obtener datos del estado global
  const offlineSyncState = useAppSelector(selectOfflineSync);

  // Effect para poblar el store con catálogos
  useEffect(() => {
    if (catalogs && catalogs.length > 0) {
      dispatch(setCatalogsById(catalogs));
    }
  }, [catalogs, dispatch]);

  // Ya no necesitamos poblar el store con partidas/conceptos
  // La información viene directamente en los avances (detailed=true)

  // Estados para refresh
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Configurar el título de la pantalla
  useEffect(() => {
    if (assignedConstruction) {
      navigation.setOptions({
        title: `Avances: ${assignedConstruction.name}`,
      });
    }
  }, [assignedConstruction, navigation]);

  // Manejar la navegación al formulario de registro de avance
  const handleAddAdvance = () => {
    if (assignedConstruction) {
      navigation.navigate("AvanceRegistration", {
        constructionId: assignedConstruction.id,
        constructionName: assignedConstruction.name,
      });
    } else {
      Alert.alert(
        "Error",
        "No tienes una obra asignada para registrar avances.",
        [{ text: "Entendido", style: "default" }]
      );
    }
  };

  // Refrescar datos usando las queries
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Refrescar todas las queries en paralelo
      await Promise.all([refetchConstruction(), refetchAdvances()]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchConstruction, refetchAdvances]);

  // Cargar más avances (simplificado por ahora)
  const handleLoadMore = useCallback(() => {
    // TODO: Implementar paginación con useInfiniteQuery
    console.log("Load more functionality - to be implemented");
  }, []);

  // Manejar apertura del bottom sheet
  const handleAdvancePress = useCallback((advance: PhysicalAdvanceResponse) => {
    setSelectedAdvance(advance);
    setIsBottomSheetVisible(true);
  }, []);

  // Manejar cierre del bottom sheet
  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
    setSelectedAdvance(null);
  }, []);

  // Manejar actualización de avance
  const handleAdvanceUpdated = useCallback(
    (updatedAdvance: PhysicalAdvanceResponse) => {
      // Invalidar la query para refrescar los datos
      refetchAdvances();
      setSelectedAdvance(updatedAdvance);
    },
    [refetchAdvances]
  );

  // Componente para renderizar un elemento de avance
  const AdvanceItemCard: React.FC<{
    item: PhysicalAdvanceResponse;
  }> = ({ item }) => {
    // ✅ Use formatted date hook for UTC conversion
    const formattedDate = useFormattedDate(item.date, "medium");
    // Verificar que item existe
    if (!item) {
      return null;
    }

    // La información viene directamente en el avance
    const conceptDescription =
      item.concept_description || `Concepto #${item.concept}`;
    const conceptUnit = item.concept_unit || "";
    const partidaName = item.work_item_name || "Partida no disponible";

    return (
      <TouchableOpacity
        style={[
          styles.advanceItem,
          { borderLeftColor: ColorUtils.getStatusBorderColor(item.status) }, // ✅ COLOR DINÁMICO POR ESTADO
        ]}
        onPress={() => handleAdvancePress(item)}
      >
        <View style={styles.advanceHeader}>
          <View style={styles.conceptInfo}>
            <Text style={styles.partidaName}>{partidaName}</Text>
            <Text style={styles.conceptDescription} numberOfLines={2}>
              {conceptDescription}
            </Text>
          </View>

          {/* Estatus de aprobación */}
          <View
            style={[
              styles.statusChip,
              item.status === "APPROVED"
                ? styles.approvedChip
                : item.status === "REJECTED"
                ? styles.rejectedChip
                : styles.pendingChip,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "APPROVED"
                  ? styles.approvedText
                  : item.status === "REJECTED"
                  ? styles.rejectedText
                  : styles.pendingText,
              ]}
            >
              {item.status === "APPROVED"
                ? "Aprobado"
                : item.status === "REJECTED"
                ? "Rechazado"
                : "Pendiente"}
            </Text>
          </View>
        </View>

        <View style={styles.advanceDetails}>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Volumen:</Text>
            <Text style={styles.quantityValue}>
              {item.volume || "0"} {conceptUnit}
            </Text>
          </View>
        </View>

        {/* Comentarios si existen */}
        {item.comments && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Comentarios:</Text>
            <Text style={styles.notesText} numberOfLines={2}>
              {item.comments}
            </Text>
          </View>
        )}

        {/* Sección inferior con badge y fecha */}
        <View style={styles.bottomSection}>
          <View style={styles.programStatusContainer}>
            <ProgramStatusBadge
              status={item.status === "APPROVED" ? "completed" : "onSchedule"}
              compact={true}
            />
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar un elemento de avance
  const renderAdvanceItem = ({ item }: { item: PhysicalAdvanceResponse }) => {
    if (!item) return null;
    return <AdvanceItemCard item={item} />;
  };

  // Renderizar el encabezado con resumen
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {assignedConstruction ? (
        <Text style={styles.constructionName}>{assignedConstruction.name}</Text>
      ) : (
        <Text style={styles.constructionName}>Mis Avances</Text>
      )}

      {loadingAdvances ? (
        <View style={styles.summaryLoading}>
          <ActivityIndicator size="small" color="#3498db" />
          <Text style={styles.summaryLoadingText}>Cargando resumen...</Text>
        </View>
      ) : localSummary ? (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {localSummary.total_advances}
            </Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {localSummary.pending_advances}
            </Text>
            <Text style={styles.summaryLabel}>Pendientes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {localSummary.approved_advances}
            </Text>
            <Text style={styles.summaryLabel}>Aprobados</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {localSummary.rejected_advances}
            </Text>
            <Text style={styles.summaryLabel}>Rechazados</Text>
          </View>
        </View>
      ) : null}

      {/* Filtros de estado */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            statusFilter === "all" && styles.activeFilterChip,
          ]}
          onPress={() => setStatusFilter("all")}
        >
          <Text
            style={[
              styles.filterChipText,
              statusFilter === "all" && styles.activeFilterChipText,
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            statusFilter === "pending" && styles.activeFilterChip,
          ]}
          onPress={() => setStatusFilter("pending")}
        >
          <Text
            style={[
              styles.filterChipText,
              statusFilter === "pending" && styles.activeFilterChipText,
            ]}
          >
            Pendientes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            statusFilter === "approved" && styles.activeFilterChip,
          ]}
          onPress={() => setStatusFilter("approved")}
        >
          <Text
            style={[
              styles.filterChipText,
              statusFilter === "approved" && styles.activeFilterChipText,
            ]}
          >
            Aprobados
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            statusFilter === "rejected" && styles.activeFilterChip,
          ]}
          onPress={() => setStatusFilter("rejected")}
        >
          <Text
            style={[
              styles.filterChipText,
              statusFilter === "rejected" && styles.activeFilterChipText,
            ]}
          >
            Rechazados
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtro de fecha */}
      <View style={styles.dateFilterContainer}>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </View>
    </View>
  );

  // Renderizar el pie de la lista (loader)
  const renderFooter = () => {
    if (!loadingAdvances) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3498db" />
        <Text style={styles.footerLoaderText}>Cargando más avances...</Text>
      </View>
    );
  };

  // Renderizar la vista de lista vacía o error
  const renderEmpty = () => {
    // Si estamos cargando la construcción, mostrar indicador de carga
    if (loadingConstruction) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Cargando construcción...</Text>
        </View>
      );
    }

    // Si hay error al cargar la construcción
    if (constructionError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error al cargar construcción</Text>
          <Text style={styles.errorSubtitle}>
            No se puede obtener la obra asignada
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetchConstruction()}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Si no hay una construcción asignada
    if (!assignedConstruction) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#7f8c8d" />
          <Text style={styles.emptyTitle}>No tienes obras asignadas</Text>
          <Text style={styles.emptyDescription}>
            Contacta con tu administrador para que te asigne una obra
          </Text>
        </View>
      );
    }

    // Si estamos cargando catálogos
    if (loadingCatalogs) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Cargando catálogos...</Text>
        </View>
      );
    }

    // Si hay error al cargar catálogos
    if (catalogsError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error al cargar catálogos</Text>
          <Text style={styles.errorSubtitle}>
            No se pueden obtener los catálogos de la obra
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Si no hay catálogos
    if (!mainCatalog) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-outline" size={64} color="#7f8c8d" />
          <Text style={styles.emptyTitle}>No hay catálogos disponibles</Text>
          <Text style={styles.emptyDescription}>
            Esta obra no tiene catálogos configurados
          </Text>
        </View>
      );
    }

    // Si estamos cargando los avances
    if (loadingAdvances) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Cargando avances...</Text>
        </View>
      );
    }

    // Si hay error al cargar los avances
    if (advancesError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error al cargar avances</Text>
          <Text style={styles.errorSubtitle}>
            No se pueden obtener los avances del catálogo
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Si no hay avances registrados para esta obra
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#bdc3c7" />
        <Text style={styles.emptyTitle}>No hay avances registrados</Text>
        {/* <Text style={styles.emptyDescription}>
          No se encontraron avances para los filtros seleccionados
        </Text> */}
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddAdvance}>
          <Text style={styles.emptyButtonText}>Registrar avance</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Indicador de modo offline */}
      <View style={styles.indicatorContainer}>
        <OfflineIndicator
          isOffline={!offlineSyncState.isOnline}
          pendingCount={offlineSyncState.pendingCount}
          isSyncing={offlineSyncState.isSyncing}
          lastSyncTime={
            offlineSyncState.lastSyncTime
              ? new Date(offlineSyncState.lastSyncTime)
              : null
          }
          onSyncPress={() => {
            // Implementar forzar sincronización
          }}
        />
      </View>

      <FlatList
        data={advancesData?.advances || []}
        renderItem={renderAdvanceItem}
        keyExtractor={(item) =>
          item?.id?.toString() || Math.random().toString()
        }
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
          !advancesData?.advances?.length
            ? styles.emptyListContent
            : styles.listContent
        }
      />

      {/* Bottom Sheet para detalle de avance */}
      <AdvanceDetailBottomSheet
        isVisible={isBottomSheetVisible}
        onClose={handleCloseBottomSheet}
        advance={selectedAdvance}
        onAdvanceUpdated={handleAdvanceUpdated}
      />

      {/* FLOATING ACTION BUTTON - Solo visible cuando NO hay bottom sheet */}
      {!isBottomSheetVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddAdvance}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} style={styles.fabIcon} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default AdvanceListScreen;
