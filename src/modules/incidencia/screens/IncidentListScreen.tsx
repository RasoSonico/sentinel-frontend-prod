import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
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
import { DateRangeFilter } from "../../../components/ui/filters/DateRangeFilter";
import { useDateRangeFilter } from "../../../hooks/ui/useDateRangeFilter";
import { DateUtils } from "../../../utils/dateUtils";
import FilterChip from "../../../components/ui/FilterChip";
import FilterGroup from "../../../components/ui/FilterGroup";
import ActiveFiltersBadge from "../../../components/ui/ActiveFiltersBadge";
import { IncidenciaStackParamList } from "../../../navigation/types";
import { Incident } from "../../../types/incidencia";
import {
  useIncidentsQuery,
  useIncidentTypesQuery,
  useIncidentClassificationsQuery,
} from "../../../hooks/data/query/useIncidenciaQueries";
import { useAppDispatch } from "../../../redux/hooks";
import {
  setTypesById,
  setClassificationsById,
} from "../../../redux/slices/incidencia/incidenciaFormDataSlice";
import IncidentCard from "../components/IncidentCard";
import styles from "../styles/IncidentListScreen.styles";
import { DesignTokens } from "../../../styles/designTokens";

type IncidentListScreenNavigationProp = StackNavigationProp<
  IncidenciaStackParamList,
  "IncidentsList"
>;

const IncidentListScreen: React.FC = () => {
  const navigation = useNavigation<IncidentListScreenNavigationProp>();
  const dispatch = useAppDispatch();

  // Estados para filtros y UI
  const [typeFilter, setTypeFilter] = useState<"all" | number>("all");
  const [classificationFilter, setClassificationFilter] = useState<
    "all" | number
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

  const [refreshing, setRefreshing] = useState(false);

  // Query para obtener tipos de incidencia
  const {
    data: incidentTypes,
    isLoading: loadingTypes,
    error: typesError,
    refetch: refetchTypes,
  } = useIncidentTypesQuery();

  // Query para obtener clasificaciones de incidencia
  const {
    data: incidentClassifications,
    isLoading: loadingClassifications,
    error: classificationsError,
    refetch: refetchClassifications,
  } = useIncidentClassificationsQuery();

  // Query para obtener TODAS las incidencias (filtrado completamente local)
  const {
    data: allIncidentsData,
    isLoading: loadingIncidents,
    error: incidentsError,
    refetch: refetchIncidents,
  } = useIncidentsQuery({
    page: 1,
    page_size: 100, // Obtener muchos registros para filtrado local
    ordering: "-date",
  });

  // Filtrado local completo (backend no filtra)
  const incidentsData = useMemo(() => {
    if (!allIncidentsData?.incidents) return null;

    let filteredIncidents = allIncidentsData.incidents;

    // Filtrar por tipo
    if (typeFilter !== "all") {
      filteredIncidents = filteredIncidents.filter(
        (incident) => incident.type === typeFilter
      );
    }

    // Filtrar por clasificación
    if (classificationFilter !== "all") {
      filteredIncidents = filteredIncidents.filter(
        (incident) => incident.clasification === classificationFilter
      );
    }

    // ✅ Filtrar por fecha usando comparación de timestamps completos (timezone-aware)
    if (startDate || endDate || singleDate) {
      filteredIncidents = filteredIncidents.filter((incident) => {
        try {
          // Usar el timestamp completo del incident para comparación correcta
          const incidentTimestamp = incident.date; // "2025-09-12T23:46:00Z"
          
          // Si hay fecha específica, comparar las fechas (legacy support - shouldn't happen with current filter)
          if (singleDate) {
            const incidentDateOnly = incident.date.split('T')[0];
            return incidentDateOnly === singleDate;
          }

          // ✅ Comparar timestamps completos para mantener lógica timezone-aware
          let isInRange = true;

          if (startDate) {
            isInRange = isInRange && DateUtils.compareUTCDates(incidentTimestamp, startDate) >= 0;
          }

          if (endDate) {
            isInRange = isInRange && DateUtils.compareUTCDates(incidentTimestamp, endDate) <= 0;
          }

          return isInRange;
        } catch (error) {
          console.warn('🚨 Error filtering incident by date:', { incident: incident.date, error });
          return true; // Include in case of error
        }
      });
    }

    return {
      incidents: filteredIncidents,
      count: filteredIncidents.length,
    };
  }, [
    allIncidentsData?.incidents,
    typeFilter,
    classificationFilter,
    startDate,
    endDate,
    singleDate,
  ]);

  // Calcular resumen localmente
  const localSummary = useMemo(() => {
    if (!incidentsData?.incidents) return null;

    const incidents = incidentsData.incidents;
    return {
      total_incidents: incidents.length,
      by_type: incidents.reduce((acc, incident) => {
        const typeName =
          incidentTypes?.find((t) => t.id === incident.type)?.name ||
          "Desconocido";
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_classification: incidents.reduce((acc, incident) => {
        const classificationName =
          incidentClassifications?.find((c) => c.id === incident.clasification)
            ?.name || "Desconocido";
        acc[classificationName] = (acc[classificationName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [incidentsData?.incidents, incidentTypes, incidentClassifications]);

  // Effect para poblar el store con catálogos (mantener compatibilidad con forms)
  useEffect(() => {
    if (incidentTypes && incidentTypes.length > 0) {
      dispatch(setTypesById(incidentTypes));
    }
  }, [incidentTypes, dispatch]);

  useEffect(() => {
    if (incidentClassifications && incidentClassifications.length > 0) {
      dispatch(setClassificationsById(incidentClassifications));
    }
  }, [incidentClassifications, dispatch]);

  // Refrescar datos usando las queries
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Refrescar todas las queries en paralelo
      await Promise.all([
        refetchTypes(),
        refetchClassifications(),
        refetchIncidents(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTypes, refetchClassifications, refetchIncidents]);

  // Cargar más incidencias (simplificado por ahora)
  const handleLoadMore = useCallback(() => {
    // TODO: Implementar paginación con useInfiniteQuery
    console.log("Load more functionality - to be implemented");
  }, []);

  // Función para manejar cambio de filtro de tipo
  const handleTypeFilterChange = useCallback((value: "all" | number) => {
    setTypeFilter(value);
  }, []);

  // Función para manejar cambio de filtro de clasificación
  const handleClassificationFilterChange = useCallback(
    (value: "all" | number) => {
      setClassificationFilter(value);
    },
    []
  );

  // Función para navegar al detalle de incidencia
  const handleIncidentPress = useCallback(
    (incident: Incident) => {
      navigation.navigate("IncidentDetail", { incident });
    },
    [navigation]
  );

  // Función para navegar a registro de nueva incidencia
  const handleNewIncident = useCallback(() => {
    navigation.navigate("IncidentRegistration");
  }, [navigation]);

  // Función para limpiar todos los filtros
  const handleClearAllFilters = useCallback(() => {
    setTypeFilter("all");
    setClassificationFilter("all");
  }, []);

  // Render del item de la lista
  const renderIncidentItem = useCallback(
    ({ item }: { item: Incident }) => (
      <IncidentCard incident={item} onPress={handleIncidentPress} />
    ),
    [handleIncidentPress]
  );

  // Render del footer de la lista (loading más items)
  const renderFooter = useCallback(() => {
    if (!loadingIncidents) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator
          size="small"
          color={DesignTokens.colors.primary[500]}
        />
        <Text style={styles.footerLoaderText}>Cargando más incidencias...</Text>
      </View>
    );
  }, [loadingIncidents]);

  // Memoizar chips de filtro de tipos
  const typeFilterChips = useMemo(() => {
    if (!incidentTypes) return [];
    return incidentTypes.map((type) => ({
      id: type.id,
      name: type.name,
      isActive: typeFilter === type.id,
    }));
  }, [incidentTypes, typeFilter]);

  // Memoizar chips de filtro de clasificaciones
  const classificationFilterChips = useMemo(() => {
    if (!incidentClassifications) return [];
    return incidentClassifications.map((classification) => ({
      id: classification.id,
      name: classification.name,
      isActive: classificationFilter === classification.id,
    }));
  }, [incidentClassifications, classificationFilter]);

  // Render del header con resumen y filtros optimizado
  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Incidencias</Text>

        {/* Resumen de estadísticas */}
        {loadingIncidents ? (
          <View style={styles.summaryLoading}>
            <ActivityIndicator
              size="small"
              color={DesignTokens.colors.primary[500]}
            />
            <Text style={styles.summaryLoadingText}>Cargando resumen...</Text>
          </View>
        ) : localSummary ? (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {localSummary.total_incidents}
              </Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Object.keys(localSummary.by_type).length}
              </Text>
              <Text style={styles.summaryLabel}>Tipos</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Object.keys(localSummary.by_classification).length}
              </Text>
              <Text style={styles.summaryLabel}>Clasificaciones</Text>
            </View>
          </View>
        ) : null}

        {/* Filtros de clasificación */}
        <FilterGroup title="Clasificación" showClearButton={false}>
          <FilterChip
            id="all"
            name="Todas"
            isActive={classificationFilter === "all"}
            onPress={handleClassificationFilterChange}
          />
          {classificationFilterChips.map((chip) => (
            <FilterChip
              key={chip.id}
              id={chip.id}
              name={chip.name}
              isActive={chip.isActive}
              onPress={handleClassificationFilterChange}
              variant="classification"
            />
          ))}
        </FilterGroup>

        {/* Filtros de tipo */}
        <FilterGroup
          title="Tipo"
          showClearButton={true}
          onClear={handleClearAllFilters}
          clearButtonText="Limpiar filtros"
        >
          <FilterChip
            id="all"
            name="Todos"
            isActive={typeFilter === "all"}
            onPress={handleTypeFilterChange}
          />
          {typeFilterChips.map((chip) => (
            <FilterChip
              key={chip.id}
              id={chip.id}
              name={chip.name}
              isActive={chip.isActive}
              onPress={handleTypeFilterChange}
              variant="type"
            />
          ))}
        </FilterGroup>

        {/* Filtro de fecha */}
        <View style={styles.dateFilterContainer}>
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        </View>

        {/* Badge de filtros activos */}
        <ActiveFiltersBadge
          typeFilter={typeFilter}
          classificationFilter={classificationFilter}
          incidentTypes={incidentTypes}
          incidentClassifications={incidentClassifications}
          style={styles.activeFiltersBadgeContainer}
        />
      </View>
    ),
    [
      loadingIncidents,
      localSummary,
      typeFilter,
      classificationFilter,
      typeFilterChips,
      classificationFilterChips,
      dateFilter,
      setDateFilter,
      handleTypeFilterChange,
      handleClassificationFilterChange,
      handleClearAllFilters,
      incidentTypes,
      incidentClassifications,
    ]
  );

  // Renderizar la vista de lista vacía o error
  const renderEmpty = () => {
    // Si estamos cargando tipos o clasificaciones
    if (loadingTypes || loadingClassifications) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator
            size="large"
            color={DesignTokens.colors.primary[500]}
          />
          <Text style={styles.loadingText}>Cargando catálogos...</Text>
        </View>
      );
    }

    // Si hay error al cargar tipos o clasificaciones
    if (typesError || classificationsError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error al cargar catálogos</Text>
          <Text style={styles.errorSubtitle}>
            No se pueden obtener los tipos o clasificaciones
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Si estamos cargando las incidencias
    if (loadingIncidents) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator
            size="large"
            color={DesignTokens.colors.primary[500]}
          />
          <Text style={styles.loadingText}>Cargando incidencias...</Text>
        </View>
      );
    }

    // Si hay error al cargar las incidencias
    if (incidentsError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error al cargar incidencias</Text>
          <Text style={styles.errorSubtitle}>
            No se pueden obtener las incidencias
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Si no hay incidencias registradas
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#bdc3c7" />
        <Text style={styles.emptyTitle}>No hay incidencias registradas</Text>
        {/* <Text style={styles.emptyDescription}>
          No se encontraron incidencias para los filtros seleccionados
        </Text> */}
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleNewIncident}
        >
          <Text style={styles.emptyButtonText}>Registrar incidencia</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={incidentsData?.incidents || []}
        renderItem={renderIncidentItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[DesignTokens.colors.primary[500]]}
            tintColor={DesignTokens.colors.primary[500]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          !incidentsData?.incidents?.length
            ? styles.emptyListContent
            : styles.listContent
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewIncident}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} style={styles.fabIcon} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default IncidentListScreen;
