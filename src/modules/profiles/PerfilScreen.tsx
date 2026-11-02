// src/modules/profile/screens/PerfilScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Card /* , Chip */ } from "react-native-paper";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";

import {
  selectUserName,
  selectUserEmail,
  // selectUser, — del chip de rol (oculto por ahora)
  selectIsContratista,
} from "../../redux/selectors/authSelectors";
import { useAuth } from "../../hooks/useAuth";
import { useBarraDeEstado } from "src/hooks/ui/useBarraDeEstado";
import { DesignTokens } from "../../styles/designTokens";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import { usePendingAdvanceQueue } from "src/hooks/avance/usePendingAdvanceQueue";
import { usePendingReporteQueue } from "src/hooks/reportes/usePendingReporteQueue";
import { usePendingCapturaQueue } from "src/hooks/maquinaria/usePendingCapturaQueue";
import PantallaMiFirma from "src/modules/firma/PantallaMiFirma";
import PantallaDescargarDatos from "src/modules/descargas/PantallaDescargarDatos";
import { formatoPesos, hayMonto } from "src/utils/formatoPesos";
import { duracionObra } from "./duracionObra";

const PerfilScreen = () => {
  const auth = useAuth();
  // La única tab que abre en blanco. Las otras tres llevan encabezado azul y
  // se quedan con el default de la app; aquí los iconos del reloj y la
  // batería tienen que ir oscuros o no se ven. Lo mismo vale para las hojas
  // de firma, que se abren desde aquí y también son blancas.
  useBarraDeEstado("claro");
  const [firmaAbierta, setFirmaAbierta] = useState(false);
  const [descargaAbierta, setDescargaAbierta] = useState(false);
  const { pendingCount, failedCount, syncingCount } = usePendingAdvanceQueue();
  const { totalCount: reportesSinEnviar } = usePendingReporteQueue();
  const { totalCount: jornadasSinEnviar } = usePendingCapturaQueue();
  // Solo lo usaba el chip de rol (oculto por ahora).
  // const user = useAppSelector(selectUser);
  // "Descargar datos" es del contratista: es quien tiene una obra asignada y
  // las tabs donde se capturan reportes y maquinaria.
  const esContratista = useAppSelector(selectIsContratista);
  const userName = useAppSelector(selectUserName) || "Usuario";
  const userEmail = useAppSelector(selectUserEmail) || "usuario@ejemplo.com";

  // Obtener construcción asignada con caché extendido
  const { data: assignedConstruction } = useAssignedConstruction();

  // Generar iniciales para el avatar
  const userInitials = useMemo(() => {
    if (!userName || userName === "Usuario") return "U";
    return userName
      .split(" ")
      .map((name) => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }, [userName]);

  // Rol principal, para el chip del encabezado (oculto por ahora).
  // const primaryRole = useMemo(() => {
  //   if (!user?.roles || user.roles.length === 0) return "Sin rol";
  //   const roleMap = {
  //     CONTRATISTA: "Contratista",
  //     INSPECTOR: "Inspector",
  //     DESARROLLADOR: "Desarrollador",
  //     INVERSIONISTA: "Inversionista",
  //     ADMIN: "Administrador",
  //   };
  //   return roleMap[user.roles[0]] || user.roles[0];
  // }, [user?.roles]);

  // Calcular métricas básicas (mock data por ahora)
  const userStats = useMemo(() => {
    // TODO: Estos datos vendrán de una API optimizada en el futuro
    return {
      totalAdvances: 0, // Será calculado
      photosThisWeek: 0, // Será calculado
      workingSince: new Date(2024, 0, 15), // Será obtenido de la API
    };
  }, []);

  // Capturas que aún no llegaron al servidor. Cerrar sesión NO las borra —
  // el cache se limpia por cambio de identidad, no por logout — pero si otra
  // persona inicia sesión en este dispositivo se pierden. El aviso va aquí
  // porque es el único momento en que quien puede resolverlo (conectarse y
  // sincronizar) todavía puede actuar.
  const unsyncedCount =
    pendingCount +
    failedCount +
    syncingCount +
    reportesSinEnviar +
    jornadasSinEnviar;

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        // auth.logout() calls forceLogout() which clears:
        // SecureStore token, Redux auth state, and React Query cache.
        // redux-persist writes the cleared state to AsyncStorage automatically.
        await auth.logout();
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        Alert.alert("Error", "No se pudo cerrar sesión correctamente");
      }
    };

    if (unsyncedCount > 0) {
      Alert.alert(
        "Tienes capturas sin sincronizar",
        `${unsyncedCount} ${
          unsyncedCount === 1 ? "captura no ha llegado" : "capturas no han llegado"
        } al servidor. Si otra persona inicia sesión en este dispositivo, se ${
          unsyncedCount === 1 ? "perderá" : "perderán"
        }.\n\nConéctate y espera a que sincronicen antes de salir.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Cerrar sesión de todos modos",
            style: "destructive",
            onPress: doLogout,
          },
        ],
        { cancelable: true },
      );
      return;
    }

    Alert.alert(
      "Cerrar Sesión",
      "¿Está seguro que desea cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Cerrar Sesión", onPress: doLogout },
      ],
      { cancelable: true },
    );
  };

  // Datos de la tarjeta "Información de obra", ya listos para pintarse.
  const fechaTexto = (fecha?: string | null) =>
    fecha ? format(parseISO(fecha), "dd MMM yyyy", { locale: es }) : null;
  const fechaInicio = fechaTexto(assignedConstruction?.start_date);
  const fechaFin = fechaTexto(assignedConstruction?.end_date);
  const duracion = duracionObra(
    assignedConstruction?.start_date,
    assignedConstruction?.end_date,
  );
  // "0.00" es el default de la base, no un presupuesto: se dice "No definido".
  const presupuesto = hayMonto(assignedConstruction?.budget)
    ? formatoPesos(assignedConstruction?.budget)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con información del usuario */}
        <View style={styles.header}>
          <Avatar.Text
            size={100}
            label={userInitials}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          {/* Oculto (2-nov): el rol no le dice nada al usuario sobre sí
              mismo. Se conserva por si se vuelve a usar; al reactivarlo,
              descomentar también `Chip` en el import y `primaryRole`.
          <Chip
            mode="outlined"
            style={styles.roleChip}
            textStyle={styles.roleChipText}
          >
            {primaryRole}
          </Chip>
          */}
        </View>

        {/* Obra Asignada */}
        {assignedConstruction && (
          <Card style={styles.constructionCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="business"
                  size={24}
                  color={DesignTokens.colors.primary[600]}
                />
                <Text style={styles.cardTitle}>Información de obra</Text>
              </View>

              <Text style={styles.constructionName}>
                {assignedConstruction.name}
              </Text>

              {/* Ubicación */}
              <View style={styles.infoRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={DesignTokens.colors.neutral[500]}
                />
                <Text style={styles.infoText}>
                  {assignedConstruction.location}, {assignedConstruction.state}
                </Text>
              </View>

              {/* Cliente */}
              {assignedConstruction.client && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={DesignTokens.colors.neutral[500]}
                  />
                  <Text style={styles.infoText}>
                    Cliente: {assignedConstruction.client}
                  </Text>
                </View>
              )}

              {/* Inicio, fin y duración en tres columnas. La duración va en
                  DÍAS NATURALES, extremos incluidos: así se mide el plazo en
                  contrato (ver `duracionObra.ts`).

                  Con `parseISO` y NO con `new Date(...)`: el constructor lee
                  "2026-01-01" como medianoche UTC, que en México todavía es el
                  31 de diciembre — la obra aparecía empezando un día antes, y
                  de otro año. `parseISO` lee una fecha sola como medianoche
                  LOCAL. */}
              <View style={styles.fechasFila}>
                <View style={styles.fechaColumna}>
                  <Text style={styles.detailLabel}>Inicio</Text>
                  {fechaInicio ? (
                    <Text style={styles.detailValue}>{fechaInicio}</Text>
                  ) : (
                    <Text style={styles.noDefinido}>No definido</Text>
                  )}
                </View>
                <View style={[styles.fechaColumna, styles.columnaSeparada]}>
                  <Text style={styles.detailLabel}>Fin</Text>
                  {fechaFin ? (
                    <Text style={styles.detailValue}>{fechaFin}</Text>
                  ) : (
                    <Text style={styles.noDefinido}>No definido</Text>
                  )}
                </View>
                <View style={[styles.fechaColumna, styles.columnaSeparada]}>
                  <Text style={styles.detailLabel}>Duración</Text>
                  {duracion ? (
                    <Text style={styles.detailValue}>{duracion}</Text>
                  ) : (
                    <Text style={styles.noDefinido}>No definido</Text>
                  )}
                </View>
              </View>

              {/* Presupuesto en su propio renglón, COMPLETO y exacto
                  (UX-SPEC-05, opción A). Antes iba en una tercera columna,
                  dividido entre un millón ("$1284.57 M"): no cabía el monto y
                  la abreviatura no decía cuánto era.

                  Si no cabe junto a la etiqueta, el `flexWrap` lo baja al
                  renglón siguiente, alineado a la derecha. Nunca se recorta,
                  se abrevia ni se achica la letra. */}
              <View style={styles.presupuestoBloque}>
                <View style={styles.presupuestoFila}>
                  <Text style={[styles.detailLabel, styles.sinMargen]}>
                    Presupuesto
                  </Text>
                  {presupuesto ? (
                    <View style={styles.montoCaja}>
                      <Text style={styles.monto} numberOfLines={1}>
                        {presupuesto}
                      </Text>
                      <Text style={styles.moneda}>MXN</Text>
                    </View>
                  ) : (
                    <Text style={[styles.noDefinido, styles.alFinal]}>
                      No definido
                    </Text>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Métricas de Actividad - COMENTADO POR AHORA */}
        {/* 
        <Card style={styles.statsCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Ionicons 
                name="stats-chart" 
                size={24} 
                color={DesignTokens.colors.advance} 
              />
              <Text style={styles.cardTitle}>Mi Actividad</Text>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userStats.totalAdvances}</Text>
                <Text style={styles.statLabel}>Avances</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userStats.photosThisWeek}</Text>
                <Text style={styles.statLabel}>Fotos esta semana</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {format(userStats.workingSince, "MMM yyyy", { locale: es })}
                </Text>
                <Text style={styles.statLabel}>Trabajando desde</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        */}

        {/* Opciones de Cuenta */}
        <Card style={styles.menuCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Configuración</Text>

            {/* Va primera: usa `styles.menuItem` y `styles.menuItemText`
                a propósito, los mismos de sus hermanas. Copiarlos a un
                componente aparte sería garantizar que un día dejen de
                parecerse. */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setFirmaAbierta(true)}
            >
              <Ionicons
                name="create-outline"
                size={24}
                color={DesignTokens.colors.neutral[600]}
              />
              <Text style={styles.menuItemText}>Mi firma</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={DesignTokens.colors.neutral[400]}
              />
            </TouchableOpacity>

            {esContratista && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setDescargaAbierta(true)}
              >
                <Ionicons
                  name="download-outline"
                  size={24}
                  color={DesignTokens.colors.neutral[600]}
                />
                <Text style={styles.menuItemText}>Descargar datos</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={DesignTokens.colors.neutral[400]}
                />
              </TouchableOpacity>
            )}

            {/* Ocultas mientras no tengan a dónde llevar (2-nov): una fila
                que no responde al tocarla parece rota. Se conservan para
                cuando existan sus pantallas; al reactivarlas, darles su
                `onPress`.

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons
                name="person-outline"
                size={24}
                color={DesignTokens.colors.neutral[600]}
              />
              <Text style={styles.menuItemText}>Editar Perfil</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={DesignTokens.colors.neutral[400]}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={DesignTokens.colors.neutral[600]}
              />
              <Text style={styles.menuItemText}>Notificaciones</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={DesignTokens.colors.neutral[400]}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons
                name="help-circle-outline"
                size={24}
                color={DesignTokens.colors.neutral[600]}
              />
              <Text style={styles.menuItemText}>Ayuda y Soporte</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={DesignTokens.colors.neutral[400]}
              />
            </TouchableOpacity>
            */}
          </Card.Content>
        </Card>

        {/* Botón de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>SENTINEL v1.0.0</Text>
      </ScrollView>

      <PantallaMiFirma
        visible={firmaAbierta}
        onCerrar={() => setFirmaAbierta(false)}
      />
      <PantallaDescargarDatos
        visible={descargaAbierta}
        onCerrar={() => setDescargaAbierta(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  scrollContent: {
    paddingBottom: DesignTokens.spacing.xl,
  },
  header: {
    alignItems: "center",
    paddingTop: DesignTokens.spacing["4xl"],
    paddingHorizontal: DesignTokens.spacing["2xl"],
    paddingBottom: DesignTokens.spacing["2xl"],
    backgroundColor: DesignTokens.colors.background.primary,
    marginBottom: DesignTokens.spacing.lg,
  },
  avatar: {
    backgroundColor: DesignTokens.colors.executive.primary,
    marginBottom: DesignTokens.spacing.md,
  },
  avatarLabel: {
    fontSize: DesignTokens.typography.fontSize["2xl"],
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.background.primary,
  },
  userName: {
    fontSize: DesignTokens.typography.fontSize["2xl"],
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    marginBottom: DesignTokens.spacing.xs,
    // El encabezado ya centra la caja; esto centra cada renglón cuando un
    // nombre largo se parte en dos.
    textAlign: "center",
  },
  userEmail: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[600],
    marginBottom: DesignTokens.spacing.sm,
  },
  roleChip: {
    borderColor: DesignTokens.colors.executive.primary,
  },
  roleChipText: {
    color: DesignTokens.colors.executive.primary,
    fontSize: DesignTokens.typography.fontSize.sm,
  },
  constructionCard: {
    marginHorizontal: DesignTokens.spacing.lg,
    marginBottom: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.md,
    ...DesignTokens.shadows.base,
  },
  statsCard: {
    marginHorizontal: DesignTokens.spacing.lg,
    marginBottom: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.md,
    ...DesignTokens.shadows.base,
  },
  menuCard: {
    marginHorizontal: DesignTokens.spacing.lg,
    marginBottom: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.md,
    ...DesignTokens.shadows.base,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing.md,
  },
  cardTitle: {
    fontSize: DesignTokens.typography.fontSize.lg,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[900],
    marginLeft: DesignTokens.spacing.sm,
  },
  constructionName: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.neutral[800],
    marginBottom: DesignTokens.spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing.xs,
  },
  infoText: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[600],
    marginLeft: DesignTokens.spacing.xs,
  },
  fechasFila: {
    flexDirection: "row",
    marginTop: DesignTokens.spacing.md,
    paddingTop: DesignTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  fechaColumna: {
    flex: 1,
  },
  columnaSeparada: {
    borderLeftWidth: 1,
    borderLeftColor: DesignTokens.colors.neutral[200],
    paddingLeft: DesignTokens.spacing.md,
  },
  presupuestoBloque: {
    marginTop: DesignTokens.spacing.md,
    paddingTop: DesignTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  presupuestoFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  sinMargen: {
    marginBottom: 0,
  },
  // El monto y "MXN" en su propia caja: un `Text` anidado no admite margen.
  // `marginLeft: "auto"` lo mantiene a la derecha también cuando baja de
  // renglón.
  montoCaja: {
    flexDirection: "row",
    alignItems: "baseline",
    marginLeft: "auto",
  },
  monto: {
    fontSize: 17,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    fontVariant: ["tabular-nums"],
  },
  moneda: {
    fontSize: 11,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[500],
    marginLeft: 4,
    letterSpacing: 0.4,
  },
  noDefinido: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.medium,
    color: DesignTokens.colors.neutral[400],
  },
  alFinal: {
    marginLeft: "auto",
  },
  detailLabel: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.medium,
    marginBottom: DesignTokens.spacing.xs,
  },
  detailValue: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[800],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.advance,
  },
  statLabel: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[600],
    textAlign: "center",
    marginTop: DesignTokens.spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: DesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  menuItemText: {
    flex: 1,
    marginLeft: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[800],
  },
  logoutButton: {
    backgroundColor: DesignTokens.colors.error[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: DesignTokens.spacing.lg,
    marginTop: DesignTokens.spacing.xl,
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.md,
    ...DesignTokens.shadows.sm,
  },
  logoutText: {
    color: DesignTokens.colors.background.primary,
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    marginLeft: DesignTokens.spacing.sm,
  },
  versionText: {
    textAlign: "center",
    color: DesignTokens.colors.neutral[400],
    fontSize: DesignTokens.typography.fontSize.sm,
    marginTop: DesignTokens.spacing.xl,
  },
});

export default PerfilScreen;
