import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { MaquinariaStackParamList } from "src/navigation/types";
import { DesignTokens } from "src/styles/designTokens";
import AltaMaquinariaForm from "../forms/AltaMaquinariaForm";

type RouteProps = RouteProp<MaquinariaStackParamList, "AltaNuevaMaquinaria">;

const AltaNuevaMaquinariaScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { constructionId } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AltaMaquinariaForm
          constructionId={constructionId}
          onSuccess={() => navigation.goBack()}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
});

export default AltaNuevaMaquinariaScreen;
