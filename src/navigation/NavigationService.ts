import { createRef } from "react";
import { NavigationContainerRef, StackActions } from "@react-navigation/native";
import { RootStackParamList } from "./types";

// Creamos una referencia a la navegación
export const navigationRef =
  createRef<NavigationContainerRef<RootStackParamList>>();

// Función para navegar a una pantalla
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.current) {
    (navigationRef.current.navigate as any)(name, params);
  }
}

// Función para reemplazar la pantalla actual
export function replace<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.current) {
    navigationRef.current.dispatch(StackActions.replace(name, params));
  }
}

// Función para volver atrás
export function goBack() {
  if (navigationRef.current && navigationRef.current.canGoBack()) {
    navigationRef.current.goBack();
  }
}

// Función para reiniciar la navegación (útil en logout)
export function resetRoot() {
  if (navigationRef.current) {
    navigationRef.current.resetRoot({
      index: 0,
      routes: [{ name: "Auth" }],
    });
  }
}
