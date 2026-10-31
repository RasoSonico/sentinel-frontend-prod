import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaStackParamList } from "src/navigation/types";
import { useHubDiarioData } from "../hooks/useHubDiarioData";
import MaquinariaCard from "../components/MaquinariaCard";
import HubResumenHeader, { HubFilter } from "../components/HubResumenHeader";
import JornadaSheet from "../components/JornadaSheet";
import SalidaObraSheet from "../components/SalidaObraSheet";
import ReconciliacionModal from "../components/ReconciliacionModal";
import IngresoMaquinariaModal from "../components/IngresoMaquinariaModal";
import { usePendingJornadaQueue } from "src/hooks/maquinaria/usePendingJornadaQueue";
import { usePendingMaquinariaQueue } from "src/hooks/maquinaria/usePendingMaquinariaQueue";
import {
  congelarFila,
  filaDeCola,
  filaDeServidor,
  type FilaMaquinaria,
} from "../filaMaquinaria";
import { PendingJornadaSubmission } from "src/realm/pendingJornada/PendingJornadaSubmission";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import styles from "../styles/HubDiarioScreen.styles";

type ActiveSheet = "jornada" | "salida" | null;

const HubDiarioScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<MaquinariaStackParamList>>();

  const { hub, constructionId, isLoading, refetch } = useHubDiarioData();

  // La cola, para que la tarjeta refleje lo capturado antes de que el servidor
  // lo confirme. Y la señal leída UNA vez aquí: llamarla dentro de la tarjeta
  // serían N suscripciones a NetInfo para el mismo valor.
  const {
    porEstancia,
    porMaquinariaLocal,
    reintentarJornada,
    descartarJornada,
  } = usePendingJornadaQueue();
  const { altasParaLaLista } = usePendingMaquinariaQueue();
  const sinSenal = useNetworkStatus() === false;

  /**
   * Rescate de una jornada fallida: reintentar o descartar.
   *
   * "Reintentar" devuelve el presupuesto COMPLETO de intentos. Que lo pida una
   * persona cambia el significado: sabe algo que el teléfono no, como que el
   * servidor ya se arregló. Mismo criterio que el detalle del reporte.
   */
  const handleResolverCola = useCallback(
    (enCola: PendingJornadaSubmission) => {
      const id = enCola._id;
      const etiqueta = enCola.maquinariaEtiqueta || "esta jornada";
      Alert.alert(
        "No se envió",
        `${enCola.errorMessage ?? "El envío falló."}\n\n${etiqueta}`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Reintentar", onPress: () => reintentarJornada(id) },
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => descartarJornada(id),
          },
        ],
      );
    },
    [reintentarJornada, descartarJornada],
  );

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [selectedItem, setSelectedItem] =
    useState<FilaMaquinaria | null>(null);
  const [reconciliacionItem, setReconciliacionItem] =
    useState<FilaMaquinaria | null>(null);
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

  // `congelarFila` y no la fila tal cual: lo que entra a estado de React
  // sobrevive a refrescos del hub, y un objeto vivo de Realm no. Ver
  // `congelarFila`.
  const handleAbrirJornada = useCallback((item: FilaMaquinaria) => {
    setSelectedItem(congelarFila(item));
    setActiveSheet("jornada");
  }, []);

  const handleSalida = useCallback((item: FilaMaquinaria) => {
    setSelectedItem(congelarFila(item));
    setActiveSheet("salida");
  }, []);

  const handleReconciliar = useCallback((item: FilaMaquinaria) => {
    setReconciliacionItem(congelarFila(item));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FilaMaquinaria }) => (
      <MaquinariaCard
        item={item}
        enCola={
          item.maquinariaLocalId
            ? porMaquinariaLocal.get(item.maquinariaLocalId)
            : porEstancia.get(item.estancia_id)
        }
        sinSenal={sinSenal}
        onAbrirJornada={handleAbrirJornada}
        onSalida={handleSalida}
        onReconciliar={handleReconciliar}
        onResolverCola={handleResolverCola}
      />
    ),
    [
      porEstancia,
      porMaquinariaLocal,
      sinSenal,
      handleAbrirJornada,
      handleSalida,
      handleReconciliar,
      handleResolverCola,
    ],
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

  /**
   * Las del servidor MÁS las que todavía viven en el teléfono.
   *
   * Las locales van primero: son las que acaban de darse de alta y las que el
   * usuario está buscando en ese momento. Si se mezclaran al final de una
   * lista de veinte máquinas, registrar una se sentiría como que no pasó nada.
   */
  /**
   * Una máquina deja de pintarse como local cuando **el servidor ya la trae**,
   * no cuando su POST responde.
   *
   * El alta se marca `done` apenas el servidor contesta, pero el hub tarda un
   * refetch más en incluirla. Soltarla en ese momento la hacía desaparecer de
   * la pantalla y volver un segundo después; esperar a verla en el hub cierra
   * la ventana sin duplicar la fila.
   *
   * `maquinariaId` es nulo mientras el alta no se haya enviado, y ésas siempre
   * se pintan: son justamente las que el servidor no conoce.
   */
  const idsEnElServidor = useMemo(
    () =>
      new Set(
        hub?.maquinarias ? Array.from(hub.maquinarias).map((m) => m.id) : [],
      ),
    [hub],
  );
  const locales = useMemo(
    () =>
      Array.from(altasParaLaLista).filter(
        (alta) =>
          alta.maquinariaId === null || !idsEnElServidor.has(alta.maquinariaId),
      ),
    [altasParaLaLista, idsEnElServidor],
  );

  const all = [
    ...locales.map(filaDeCola),
    ...(hub?.maquinarias ? Array.from(hub.maquinarias).map(filaDeServidor) : []),
  ];
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
        // La llave decide si React ACTUALIZA una fila o la destruye y crea
        // otra. Usar `item.id` tenía dos defectos: todas las máquinas locales
        // valen 0 —dos registradas sin señal compartían llave— y al
        // sincronizar la llave saltaba de 0 al id real, así que la fila se
        // desmontaba y volvía a montar. Eso era el parpadeo.
        //
        // Con el id del servidor en cuanto existe, la fila local y la del hub
        // comparten llave y la transición es una simple actualización.
        keyExtractor={(item) =>
          item.id > 0 ? `m-${item.id}` : `local-${item.maquinariaLocalId}`
        }
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

      <JornadaSheet
        isVisible={activeSheet === "jornada"}
        onClose={closeSheet}
        item={selectedItem}
        constructionId={constructionId}
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
