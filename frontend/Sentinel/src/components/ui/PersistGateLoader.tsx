import { View, ActivityIndicator, Text } from "react-native";

export const PersistGateLoader = () => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <ActivityIndicator size="large" color="#0366d6" />
    <Text style={{ marginTop: 12, color: "#666" }}>Cargando...</Text>
  </View>
);
