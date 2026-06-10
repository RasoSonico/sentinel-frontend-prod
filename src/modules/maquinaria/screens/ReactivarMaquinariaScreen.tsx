import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaStackParamList } from "src/navigation/types";
import {
  useMaquinariasList,
  useCreateEstancia,
  useHubDiario,
} from "src/hooks/data/query/useMaquinaria";
import DateInput from "src/components/ui/DateInput";
import { DateUtils } from "src/utils/dateUtils";
import { MaquinariaItem } from "src/types/maquinaria";

type RouteProps = RouteProp<MaquinariaStackParamList, "ReactivarMaquinaria">;

const PROPIETARIO_LABELS: Record<string, string> = {
  PROPIA: "Propia",
  RENTADA: "Rentada",
  SUBCONTRATISTA: "Subcontrato",
};

const ReactivarMaquinariaScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { constructionId } = route.params;

  const { data: allMaquinarias, isLoading } =
    useMaquinariasList(constructionId);
  const { data: hub } = useHubDiario(constructionId);
  const createEstancia = useCreateEstancia();

  const [search, setSearch] = useState("");
  const [reactivatingItem, setReactivatingItem] =
    useState<MaquinariaItem | null>(null);
  const [fechaIngreso, setFechaIngreso] = useState(
    DateUtils.localDateToUTC(new Date()),
  );

  const activeIds = useMemo(() => {
    if (!hub) return new Set<number>();
    return new Set(Array.from(hub.maquinarias).map((m) => m.id));
  }, [hub]);

  const available = useMemo(() => {
    const list = (allMaquinarias ?? []).filter((m) => !activeIds.has(m.id));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (m) =>
        m.tipo_nombre.toLowerCase().includes(q) ||
        m.marca.toLowerCase().includes(q) ||
        m.modelo.toLowerCase().includes(q),
    );
  }, [allMaquinarias, activeIds, search]);

  const handleReactivar = useCallback(() => {
    if (!reactivatingItem) return;
    createEstancia.mutate(
      { maquinaria: reactivatingItem.id, fecha_ingreso: fechaIngreso },
      {
        onSuccess: () => {
          setReactivatingItem(null);
          navigation.goBack();
        },
        onError: (error: Error) => {
          Alert.alert(
            "Error",
            error.message ?? "No se pudo reactivar. Intenta de nuevo.",
          );
        },
      },
    );
  }, [reactivatingItem, fechaIngreso, createEstancia, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: MaquinariaItem }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setReactivatingItem(item);
          setFechaIngreso(DateUtils.localDateToUTC(new Date()));
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>
            {item.tipo_nombre} · {item.marca}
          </Text>
          <Text style={styles.cardSubtitle}>{item.modelo}</Text>
        </View>
        <View style={styles.cardRight}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {PROPIETARIO_LABELS[item.propietario_tipo] ??
                item.propietario_tipo}
            </Text>
          </View>
          <Ionicons
            name="refresh-circle"
            size={22}
            color={DesignTokens.colors.primary[500]}
          />
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.searchBar}>
        <Ionicons
          name="search-outline"
          size={18}
          color={DesignTokens.colors.neutral[400]}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por tipo, marca o modelo..."
          placeholderTextColor={DesignTokens.colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={DesignTokens.colors.neutral[400]}
            />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={DesignTokens.colors.executive.primary}
          />
        </View>
      ) : (
        <FlatList
          data={available}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="archive-outline"
                size={40}
                color={DesignTokens.colors.neutral[300]}
              />
              <Text style={styles.emptyText}>
                {search ? "Sin resultados" : "Sin maquinaria en el historial"}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!reactivatingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setReactivatingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reactivar en obra</Text>
            {reactivatingItem && (
              <Text style={styles.modalMachine}>
                {reactivatingItem.tipo_nombre} · {reactivatingItem.marca}{" "}
                {reactivatingItem.modelo}
              </Text>
            )}
            <Text style={styles.modalLabel}>Fecha de ingreso</Text>
            <DateInput value={fechaIngreso} onChange={setFechaIngreso} />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReactivatingItem(null)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reactivarBtn}
                onPress={handleReactivar}
                disabled={createEstancia.isPending}
                activeOpacity={0.8}
              >
                {createEstancia.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.reactivarText}>Reactivar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: DesignTokens.colors.background.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: DesignTokens.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...DesignTokens.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: DesignTokens.colors.neutral[800],
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 14,
    marginBottom: 8,
    ...DesignTokens.shadows.sm,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
  },
  cardSubtitle: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: DesignTokens.colors.neutral[100],
    borderRadius: DesignTokens.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[600],
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.borderRadius.lg,
    padding: 24,
    width: "100%",
    ...DesignTokens.shadows.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[800],
    marginBottom: 4,
  },
  modalMachine: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[500],
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[600],
  },
  reactivarBtn: {
    flex: 2,
    padding: 12,
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: DesignTokens.colors.primary[600],
    alignItems: "center",
  },
  reactivarText: {
    fontSize: 14,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#fff",
  },
});

export default ReactivarMaquinariaScreen;
