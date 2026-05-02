import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthStackParamList } from "./types";
import LoginScreen from "../modules/auth/screens/LoginScreen";

const RegisterScreen = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Register Screen</Text>
  </View>
);
const ForgotPasswordScreen = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Forgot Password Screen</Text>
  </View>
);

import { View, Text } from "react-native";

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* <Stack.Screen name="Login" component={SimpleLoginScreen} /> */}
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};
