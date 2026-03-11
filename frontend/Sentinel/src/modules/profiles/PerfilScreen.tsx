// src/modules/profile/screens/PerfilScreen.tsx
import React, { useMemo } from "react";
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
import { Avatar, Card, Chip } from "react-native-paper";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { logout } from "../../redux/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  selectUserName,
  selectUserEmail,
  selectUser,
} from "../../redux/selectors/authSelectors";
import { useAuth } from "../../hooks/useAuth";
import { DesignTokens } from "../../styles/designTokens";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";

const PerfilScreen = () => {
  const dispatch = useAppDispatch();
  const auth = useAuth();
  const user = useAppSelector(selectUser);
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

  // Obtener rol principal
  const primaryRole = useMemo(() => {
    if (!user?.roles || user.roles.length === 0) return "Sin rol";
    const roleMap = {
      CONTRATISTA: "Contratista",
      INSPECTOR: "Inspector",
      DESARROLLADOR: "Desarrollador",
      INVERSIONISTA: "Inversionista",
      ADMIN: "Administrador",
    };
    return roleMap[user.roles[0]] || user.roles[0];
  }, [user?.roles]);

  // Calcular métricas básicas (mock data por ahora)
  const userStats = useMemo(() => {
    // TODO: Estos datos vendrán de una API optimizada en el futuro
    return {
      totalAdvances: 0, // Será calculado
      photosThisWeek: 0, // Será calculado
      workingSince: new Date(2024, 0, 15), // Será obtenido de la API
    };
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Está seguro que desea cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Sí, Cerrar Sesión",
          onPress: async () => {
            try {
              console.log("Cerrando sesión...");

              // Limpiamos AsyncStorage completamente para pruebas
              await AsyncStorage.clear();

              // Llamamos al logout de auth (si existe)
              await auth.logout();

              // Disparamos la acción de logout en Redux
              dispatch(logout());

              console.log("Sesión cerrada correctamente");
            } catch (error) {
              console.error("Error al cerrar sesión:", error);
              Alert.alert("Error", "No se pudo cerrar sesión correctamente");
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

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
          <Chip
            mode="outlined"
            style={styles.roleChip}
            textStyle={styles.roleChipText}
          >
            {primaryRole}
          </Chip>
        </View>

        {/* Obra Asignada */}
        {assignedConstruction && (
          <Card style={styles.constructionCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="business"
                  size={24}
                  color={DesignTokens.colors.construction}
                />
                <Text style={styles.cardTitle}>Obra Activa</Text>
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

              {/* Fechas y Presupuesto */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Inicio</Text>
                  <Text style={styles.detailValue}>
                    {assignedConstruction.start_date
                      ? format(
                          new Date(assignedConstruction.start_date),
                          "dd MMM yyyy",
                          { locale: es },
                        )
                      : "No definido"}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Fin</Text>
                  <Text style={styles.detailValue}>
                    {assignedConstruction.end_date
                      ? format(
                          new Date(assignedConstruction.end_date),
                          "dd MMM yyyy",
                          { locale: es },
                        )
                      : "No definido"}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Presupuesto</Text>
                  <Text style={styles.detailValue}>
                    {assignedConstruction.budget
                      ? `$${(
                          parseFloat(assignedConstruction.budget) / 1000000
                        ).toFixed(2)} M`
                      : "No definido"}
                  </Text>
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
          </Card.Content>
        </Card>

        {/* Botón de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>SENTINEL v1.0.0</Text>
      </ScrollView>
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
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: DesignTokens.spacing.md,
    paddingTop: DesignTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
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
    textAlign: "center",
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
