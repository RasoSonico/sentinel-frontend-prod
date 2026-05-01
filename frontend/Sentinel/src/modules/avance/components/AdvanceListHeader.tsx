import React, { memo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  DateFilter,
  DateRangeFilter,
} from "src/components/ui/filters/DateRangeFilter";
import { StatusFilter } from "../hooks/useAdvanceListData";
import styles from "../styles/AdvanceListScreen.styles";

interface AdvanceListHeaderProps {
  construction: { id: number; name: string } | null;
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } | null;
  loading: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  dateFilter: DateFilter | null;
  onDateFilterChange: (filter: DateFilter | null) => void;
}

const StatusFilterButton: React.FC<{
  label: string;
  value: StatusFilter;
  currentFilter: StatusFilter;
  onPress: (value: StatusFilter) => void;
}> = memo(({ label, value, currentFilter, onPress }) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      currentFilter === value && styles.activeFilterChip,
    ]}
    onPress={() => onPress(value)}
  >
    <Text
      style={[
        styles.filterChipText,
        currentFilter === value && styles.activeFilterChipText,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
));

const AdvanceListHeader: React.FC<AdvanceListHeaderProps> = ({
  construction,
  summary,
  loading,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Summary */}
      {loading ? (
        <View style={styles.summaryLoading}>
          <ActivityIndicator size="small" color="#3498db" />
          <Text style={styles.summaryLoadingText}>Cargando resumen...</Text>
        </View>
      ) : summary ? (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.pending}</Text>
            <Text style={styles.summaryLabel}>Pendientes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.approved}</Text>
            <Text style={styles.summaryLabel}>Aprobados</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.rejected}</Text>
            <Text style={styles.summaryLabel}>Rechazados</Text>
          </View>
        </View>
      ) : null}

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <StatusFilterButton
          label="Todos"
          value="all"
          currentFilter={statusFilter}
          onPress={onStatusFilterChange}
        />
        <StatusFilterButton
          label="Pendientes"
          value="pending"
          currentFilter={statusFilter}
          onPress={onStatusFilterChange}
        />
        <StatusFilterButton
          label="Aprobados"
          value="approved"
          currentFilter={statusFilter}
          onPress={onStatusFilterChange}
        />
        <StatusFilterButton
          label="Rechazados"
          value="rejected"
          currentFilter={statusFilter}
          onPress={onStatusFilterChange}
        />
      </View>

      {/* Date Filter */}
      <View style={styles.dateFilterContainer}>
        <DateRangeFilter value={dateFilter} onChange={onDateFilterChange} />
      </View>
    </View>
  );
};

export default memo(AdvanceListHeader);
