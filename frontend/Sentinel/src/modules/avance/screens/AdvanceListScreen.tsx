import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { AvanceStackParamList } from "src/navigation/types";
import { useAssignedConstruction } from "src/hooks/data/query/useAvance";
import { DesignTokens } from "src/styles/designTokens";

import ConstructionSelectorHeader from "../components/ConstructionSelectorHeader";
import ConstructionDropdown from "../components/ConstructionDropdown";
import AdvanceListContent from "../components/AdvanceListContent";

import baseStyles from "../styles/AdvanceListScreen.styles";

type AdvanceListScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvancesList"
>;

const AdvanceListScreen: React.FC = () => {
  const navigation = useNavigation<AdvanceListScreenNavigationProp>();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const {
    constructions,
    selectedConstruction,
    setSelectedConstruction,
    isInitialLoading,
    hasOfflineData,
  } = useAssignedConstruction();

  // Update screen title based on selection
  useEffect(() => {
    // Always show generic title - construction selector header shows name for multi-construction case
    navigation.setOptions({
      title: "Avances",
    });
  }, [navigation]);

  // Loading state
  if (isInitialLoading && !hasOfflineData) {
    return (
      <SafeAreaView style={baseStyles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color={DesignTokens.colors.primary[500]}
          />
          <Text style={styles.loadingText}>Cargando obras asignadas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No constructions assigned
  if (constructions.length === 0) {
    return (
      <SafeAreaView style={baseStyles.container}>
        <View style={styles.centerContainer}>
          <Ionicons
            name="business-outline"
            size={64}
            color={DesignTokens.colors.neutral[400]}
          />
          <Text style={styles.emptyTitle}>Sin obras asignadas</Text>
          <Text style={styles.emptyDescription}>
            No tienes obras asignadas actualmente. Contacta al administrador
            para que te asigne una obra.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={baseStyles.container}>
      <ConstructionSelectorHeader
        selectedConstruction={selectedConstruction}
        constructionCount={constructions.length}
        isExpanded={isPickerVisible}
        onPress={() => setIsPickerVisible(!isPickerVisible)}
      />
      <ConstructionDropdown
        isVisible={isPickerVisible}
        constructions={constructions}
        selectedConstructionId={selectedConstruction?.id ?? null}
        onSelect={setSelectedConstruction}
        onClose={() => setIsPickerVisible(false)}
      />
      {selectedConstruction && (
        <AdvanceListContent
          constructionId={Number(selectedConstruction.id)}
          constructionName={selectedConstruction.name}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: DesignTokens.spacing["3xl"],
  },
  loadingText: {
    marginTop: DesignTokens.spacing.lg,
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.fontSize.xl,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[700],
    marginTop: DesignTokens.spacing.lg,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: DesignTokens.typography.fontSize.base,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    marginTop: DesignTokens.spacing.sm,
    lineHeight: DesignTokens.typography.fontSize.base * 1.5,
    maxWidth: 280,
  },
});

export default AdvanceListScreen;
