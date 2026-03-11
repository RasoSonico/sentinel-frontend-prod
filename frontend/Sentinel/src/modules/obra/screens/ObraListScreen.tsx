import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ObraNavigationProp } from "../../../navigation/types";
import { Construction } from "../../../types/entities";
import { useConstructionsByRole } from "src/hooks/data/query/useObrasQueries";
import { styles } from "./ObraListScreen.styles";

const ObrasListScreen = () => {
  const navigation = useNavigation<ObraNavigationProp>();
  const {
    data: constructions,
    isLoading: isConstructionsLoading,
    isError: isConstructionsError,
    error: constructionsError,
    refetch: refetchConstructions,
  } = useConstructionsByRole();

  const navigateToDetail = (obra: Construction) => {
    navigation.navigate("ObraDetail", {
      obraId: obra.id,
      title: obra.name,
    });
  };

  const renderObraItem = ({ item }: { item: Construction }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigateToDetail(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.start_date).toLocaleDateString()} -
            {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "PLANNING":
        return "#FFB74D";
      case "IN_PROGRESS":
        return "#4CAF50";
      case "COMPLETED":
        return "#2196F3";
      case "SUSPENDED":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "PLANNING":
        return "Planificación";
      case "IN_PROGRESS":
        return "En Progreso";
      case "COMPLETED":
        return "Completada";
      case "SUSPENDED":
        return "Suspendida";
      default:
        return "Desconocido";
    }
  };

  if (isConstructionsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0366d6" />
        <Text style={styles.loadingText}>Cargando obras...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={constructions}
        renderItem={renderObraItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isConstructionsLoading}
            onRefresh={() => refetchConstructions()}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Mis Obras</Text>
            <Text style={styles.subtitle}>
              {constructions?.length}{" "}
              {constructions?.length === 1
                ? "obra asignada"
                : "obras asignadas"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isConstructionsError ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
              <Text style={styles.errorText}>
                {constructionsError?.message}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetchConstructions()}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#9E9E9E" />
              <Text style={styles.emptyText}>No tienes obras asignadas</Text>
            </View>
          )
        }
      />
    </View>
  );
};

export default ObrasListScreen;
