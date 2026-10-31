import { createRef } from "react";
import { NavigationContainerRef, StackActions } from "@react-navigation/native";
import { ReportesStackParamList, RootStackParamList } from "./types";

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

/**
 * Navega a una pantalla del stack de Reportes desde FUERA del árbol de
 * navegación.
 *
 * Existe por el aviso de "Reporte enviado · ABRIR": lo emite el worker de
 * sincronización, que vive en un provider y no tiene `useNavigation`. El
 * aviso puede salir con el usuario en cualquier tab —la cola sigue corriendo
 * esté donde esté—, así que la navegación tiene que entrar por la raíz y
 * bajar: App → tab Reportes → pantalla.
 */
export function navigateReportes<
  RouteName extends keyof ReportesStackParamList,
>(screen: RouteName, params?: ReportesStackParamList[RouteName]) {
  if (!navigationRef.current) return;
  navigationRef.current.navigate("App", {
    screen: "Reportes",
    params: { screen, params },
  } as never);
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
