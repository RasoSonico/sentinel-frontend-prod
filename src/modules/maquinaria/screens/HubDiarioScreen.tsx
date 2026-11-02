import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { DesignTokens } from "src/styles/designTokens";
import { MaquinariaStackParamList } from "src/navigation/types";
import { usePendingCapturaQueue } from "src/hooks/maquinaria/usePendingCapturaQueue";
import { useVistasMaquinaria } from "../hooks/useVistasMaquinaria";
import MaquinariaCard from "../components/MaquinariaCard";
import HubResumenHeader from "../components/HubResumenHeader";
import JornadaSheet from "../components/JornadaSheet";
import SalidaObraSheet from "../components/SalidaObraSheet";
import ReconciliacionModal from "../components/ReconciliacionModal";
import IngresoMaquinariaModal from "../components/IngresoMaquinariaModal";
import type { Seccion, VistaMaquina } from "../diaMaquina";
import styles from "../styles/HubDiarioScreen.styles";

type ActiveSheet = "jornada" | "salida" | null;

/** Orden FIJO de las secciones (ADR-009 D8). Una vacía no aparece. */
const SECCIONES: { seccion: Seccion; titulo: string }[] = [
  { seccion: "ATENCION", titulo: "Requiere atención" },
  { seccion: "SIN_TRABAJAR", titulo: "Sin trabajar" },
  { seccion: "TRABAJANDO", titulo: "Trabajando" },
];

interface Bloque {
  seccion: Seccion;
  titulo: string;
  vistas: VistaMaquina[];
}

const HubDiarioScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<MaquinariaStackParamList>>();

  const { hub, vistas, hoy, constructionId, isLoading, refetch } =
    useVistasMaquinaria();
  const { reintentarCaptura, descartarCaptura } = usePendingCapturaQueue();

  // Se guarda la LLAVE de la máquina, nunca la vista ni la fila: la vista se
  // recalcula en cada render con lo que haya en ese momento, así que la hoja
  // ve sus propias capturas al guardarlas y nunca retiene un objeto de Realm
  // que el siguiente refresco del hub invalide.
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [llaveElegida, setLlaveElegida] = useState<string | null>(null);
  const [llaveReconciliacion, setLlaveReconciliacion] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showIngresoModal, setShowIngresoModal] = useState(false);

  const elegida = vistas.find((v) => v.llave === llaveElegida) ?? null;
  const reconciliacion = vistas.find((v) => v.llave === llaveReconciliacion) ?? null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /**
   * Cada hoja avisa al cerrarse —también cuando se cierra porque otra tomó su
   * lugar—, así que solo se apaga si la que se cierra es la activa. Sin esto,
   * pasar de la jornada a "Registrar salida" cerraba las dos.
   *
   * La llave elegida no se limpia: cada hoja se reinicia sola al abrirse, y
   * la llave solo se lee mientras alguna está abierta.
   */
  const cerrarSi = useCallback((hoja: Exclude<ActiveSheet, null>) => {
    setActiveSheet((activa) => (activa === hoja ? null : activa));
  }, []);
  const cerrarJornada = useCallback(() => cerrarSi("jornada"), [cerrarSi]);
  const cerrarSalida = useCallback(() => cerrarSi("salida"), [cerrarSi]);

  /**
   * Rescate de una captura que no se pudo enviar: reintentar o descartar.
   *
   * "Reintentar" devuelve el presupuesto COMPLETO de intentos: que lo pida
   * una persona cambia el significado. Descartarla libera las capturas que
   * esperaban detrás de ella.
   */
  const resolverFallida = useCallback(
    (vista: VistaMaquina) => {
      if (vista.atencion?.motivo !== "FALLIDA") return;
      const { capturaId, mensaje } = vista.atencion;
      const etiqueta = `${vista.maquina.tipo} · ${vista.maquina.marca} ${vista.maquina.modelo}`;
      Alert.alert("No se envió", `${mensaje}\n\n${etiqueta}`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Reintentar", onPress: () => reintentarCaptura(capturaId) },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => descartarCaptura(capturaId),
        },
      ]);
    },
    [reintentarCaptura, descartarCaptura],
  );

  /** Toda la tarjeta es el destino; "Resolver" despacha según el motivo. */
  const onTarjeta = useCallback(
    (vista: VistaMaquina) => {
      if (vista.atencion?.motivo === "FALLIDA") {
        resolverFallida(vista);
        return;
      }
      if (vista.atencion?.motivo === "RECONCILIACION") {
        setLlaveReconciliacion(vista.llave);
        return;
      }
      // El cierre olvidado también va a la hoja: ella sabe pedirlo.
      setLlaveElegida(vista.llave);
      setActiveSheet("jornada");
    },
    [resolverFallida],
  );

  const onRegistrarSalida = useCallback(() => {
    setActiveSheet("salida");
  }, []);

  const bloques: Bloque[] = SECCIONES.map(({ seccion, titulo }) => ({
    seccion,
    titulo,
    vistas: vistas.filter((v) => v.seccion === seccion),
  })).filter((b) => b.vistas.length > 0);

  const reportadas = vistas.filter((v) => v.reportada).length;

  const renderBloque = useCallback(
    ({ item }: { item: Bloque }) => {
      const atencion = item.seccion === "ATENCION";
      return (
        <View>
          <View style={locales.seccionFila}>
            <Text style={locales.seccionTitulo}>{item.titulo}</Text>
            <Text style={locales.seccionCuenta}>{item.vistas.length}</Text>
          </View>
          {/* "Requiere atención" va todo en rojo, empezando por el contorno. */}
          <View style={[locales.grupo, atencion && locales.grupoAtencion]}>
            {item.vistas.map((vista, i) => (
              <MaquinariaCard
                key={vista.llave}
                vista={vista}
                hoy={hoy}
                primera={i === 0}
                onPress={onTarjeta}
              />
            ))}
          </View>
        </View>
      );
    },
    [hoy, onTarjeta],
  );

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

  if (isLoading && !hub && vistas.length === 0) {
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
        data={bloques}
        keyExtractor={(b) => b.seccion}
        renderItem={renderBloque}
        ListHeaderComponent={
          <HubResumenHeader
            fecha={hoy}
            reportadas={reportadas}
            total={vistas.length}
          />
        }
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
        onClose={cerrarJornada}
        vista={elegida}
        hoy={hoy}
        constructionId={constructionId}
        onRegistrarSalida={onRegistrarSalida}
      />

      <SalidaObraSheet
        isVisible={activeSheet === "salida"}
        onClose={cerrarSalida}
        item={elegida}
      />

      <ReconciliacionModal
        isVisible={!!reconciliacion}
        onClose={() => setLlaveReconciliacion(null)}
        item={reconciliacion}
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

const locales = StyleSheet.create({
  // Títulos de sección: un punto más notorios que el resto de rótulos del
  // módulo —son lo que ordena la lectura del hub—, pero sin pasar a ser
  // encabezados: siguen en versalitas pequeñas para no competir con las
  // tarjetas.
  seccionFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  seccionTitulo: {
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#334155",
    fontWeight: DesignTokens.typography.fontWeight.bold,
  },
  seccionCuenta: {
    fontSize: 11.5,
    color: "#334155",
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  // Blanco y con contorno fino: el hub no usa el patrón "cerrado", porque son
  // datos del servidor y no algo que se reabre a editar.
  grupo: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: DesignTokens.colors.background.primary,
  },
  grupoAtencion: { borderWidth: 1.5, borderColor: DesignTokens.colors.error[500] },
});

export default HubDiarioScreen;
