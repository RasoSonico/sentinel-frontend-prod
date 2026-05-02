import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { ObraStackParamList } from "../types";
import { View, Text } from "react-native";
import ObraListScreen from "../../modules/obra/screens/ObraListScreen";
import ObraDetailScreen from "../../modules/obra/screens/ObraDetailScreen";
// Placeholder para pantallas no creadas aún

const ObraCreateScreen = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Obra Create Screen</Text>
  </View>
);
const ObraEditScreen = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Obra Edit Screen</Text>
  </View>
);

const Stack = createStackNavigator<ObraStackParamList>();

export const ObraNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ObrasList"
        component={ObraListScreen}
        options={{ title: "Obras" }}
      />
      <Stack.Screen
        name="ObraDetail"
        component={ObraDetailScreen}
        options={({ route }: any) => ({ title: route.params.title })}
      />
      <Stack.Screen
        name="ObraCreate"
        component={ObraCreateScreen}
        options={{ title: "Nueva Obra" }}
      />
      <Stack.Screen
        name="ObraEdit"
        component={ObraEditScreen}
        options={{ title: "Editar Obra" }}
      />
    </Stack.Navigator>
  );
};
