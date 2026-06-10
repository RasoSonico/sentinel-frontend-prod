import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaStackParamList } from "src/navigation/types";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import { useHubDiarioData } from "../hooks/useHubDiarioData";
import MaquinariaCard from "../components/MaquinariaCard";
import HubResumenHeader, { HubFilter } from "../components/HubResumenHeader";
import SinOperarSheet from "../components/SinOperarSheet";
import ReportarJornadaSheet from "../components/ReportarJornadaSheet";
import SalidaObraSheet from "../components/SalidaObraSheet";
import ReconciliacionModal from "../components/ReconciliacionModal";
import IngresoMaquinariaModal from "../components/IngresoMaquinariaModal";
import styles from "../styles/HubDiarioScreen.styles";

type ActiveSheet = "sinOperar" | "reportar" | "salida" | null;

const HubDiarioScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<MaquinariaStackParamList>>();

  const { hub, constructionId, isLoading, refetch } = useHubDiarioData();

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [selectedItem, setSelectedItem] =
    useState<MaquinariaHubItemRealm | null>(null);
  const [reconciliacionItem, setReconciliacionItem] =
    useState<MaquinariaHubItemRealm | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<HubFilter>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const closeSheet = useCallback(() => {
    setActiveSheet(null);
    setSelectedItem(null);
  }, []);

  const handleReportar = useCallback((item: MaquinariaHubItemRealm) => {
    setSelectedItem(item);
    setActiveSheet("reportar");
  }, []);

  const handleSinOperar = useCallback((item: MaquinariaHubItemRealm) => {
    setSelectedItem(item);
    setActiveSheet("sinOperar");
  }, []);

  const handleSalida = useCallback((item: MaquinariaHubItemRealm) => {
    setSelectedItem(item);
    setActiveSheet("salida");
  }, []);

  const handleReconciliar = useCallback((item: MaquinariaHubItemRealm) => {
    setReconciliacionItem(item);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MaquinariaHubItemRealm }) => (
      <MaquinariaCard
        item={item}
        onReportar={handleReportar}
        onSinOperar={handleSinOperar}
        onSalida={handleSalida}
        onReconciliar={handleReconciliar}
      />
    ),
    [handleReportar, handleSinOperar, handleSalida, handleReconciliar],
  );

  const renderHeader = useCallback(() => {
    if (!hub) return null;
    return (
      <HubResumenHeader
        resumen={{
          total_en_sitio: hub.total_en_sitio,
          reportadas_hoy: hub.reportadas_hoy,
          sin_reportar: hub.sin_reportar,
          sin_operar: hub.sin_operar,
        }}
        fecha={hub.fecha}
        activeFilter={activeFilter}
        onFilterPress={setActiveFilter}
      />
    );
  }, [hub, activeFilter]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="construct-outline"
          size={48}
          color={DesignTokens.colors.neutral[300]}
        />
        <Text style={styles.emptyTitle}>Sin maquinaria en obra</Text>
        <Text style={styles.emptySubtitle}>
          Toca el botón + para registrar la primera máquina
        </Text>
      </View>
    );
  }, [isLoading]);

  const all = hub?.maquinarias ? Array.from(hub.maquinarias) : [];
  const maquinarias = !activeFilter
    ? all
    : activeFilter === "reportadas"
      ? all.filter((m) => !!m.jornada_id)
      : activeFilter === "sin_reportar"
        ? all.filter((m) => !m.jornada_id)
        : all.filter((m) => m.jornada_estado === "SIN_OPERAR");

  if (isLoading && !hub) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={DesignTokens.colors.executive.primary}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={maquinarias}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DesignTokens.colors.executive.primary}
          />
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (!constructionId) return;
            setShowIngresoModal(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ReportarJornadaSheet
        isVisible={activeSheet === "reportar"}
        onClose={closeSheet}
        item={selectedItem}
        constructionId={constructionId}
      />

      <SinOperarSheet
        isVisible={activeSheet === "sinOperar"}
        onClose={closeSheet}
        item={selectedItem}
      />

      <SalidaObraSheet
        isVisible={activeSheet === "salida"}
        onClose={closeSheet}
        item={selectedItem}
      />

      <ReconciliacionModal
        isVisible={!!reconciliacionItem}
        onClose={() => setReconciliacionItem(null)}
        item={reconciliacionItem}
      />

      <IngresoMaquinariaModal
        isVisible={showIngresoModal}
        onClose={() => setShowIngresoModal(false)}
        onNueva={() => {
          setShowIngresoModal(false);
          navigation.navigate("AltaNuevaMaquinaria", {
            constructionId: constructionId!,
          });
        }}
        onReactivar={() => {
          setShowIngresoModal(false);
          navigation.navigate("ReactivarMaquinaria", {
            constructionId: constructionId!,
          });
        }}
      />
    </SafeAreaView>
  );
};

export default HubDiarioScreen;
