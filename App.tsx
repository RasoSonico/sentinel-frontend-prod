import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { store, persistor } from "./src/redux/store";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { ModalProvider } from "src/modules/modals/ModalContext";
import {
  FONDO_POR_DEFECTO,
  TONO_POR_DEFECTO,
} from "src/hooks/ui/useBarraDeEstado";
import RealmProvider from "src/providers/RealmProvider";
import QueryProvider from "src/providers/QueryProvider";
import { PersistGateLoader } from "src/components/ui/PersistGateLoader";
import { SnackbarProvider } from "src/providers/SnackbarProvider";
import { SyncWorkerProvider } from "src/providers/SyncWorkerProvider";
import { TelemetryProvider } from "src/providers/TelemetryProvider";

/**
 * SENTINEL se ve igual con el teléfono en claro que en oscuro.
 *
 * `PaperProvider` SIN tema sigue al sistema: lee `Appearance` y, en oscuro,
 * cambia solo las piezas de Paper —`Card`, `Avatar`, `Chip`— a superficies
 * negras. El resto de la app pinta sus colores a mano desde `DesignTokens`,
 * que son claros y fijos. El resultado era una tarjeta negra con letras
 * oscuras encima: ilegible, y solo en las pantallas que usan Paper. Perfil era
 * la más visible.
 *
 * Mientras no haya una paleta oscura de verdad —que es diseñar la app otra
 * vez, no invertir colores—, un solo modo bien hecho es mejor que dos a
 * medias. Esto fija ESE modo.
 *
 * La app ya se declara clara en `app.config.ts` (`userInterfaceStyle`), pero
 * eso solo manda en una build nativa, y en Android ni eso sin `expo-system-ui`.
 * Aquí se fija en JavaScript, que es donde Paper lo lee.
 *
 * Por lo mismo la barra de estado no va en `auto`, que es seguir al sistema:
 * la barra continúa **el encabezado de cada pantalla**, no el tema del
 * teléfono. Aquí va el default —azul marino con iconos claros, porque así
 * abre casi toda la app: el login, los tres stacks con encabezado y el
 * armazón del wizard—. Las pantallas claras lo invierten con
 * `useBarraDeEstado`, que explica el mecanismo completo.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <RealmProvider>
          <Provider store={store}>
            <PersistGate loading={<PersistGateLoader />} persistor={persistor}>
              <PaperProvider theme={MD3LightTheme}>
                <TelemetryProvider>
                  <SnackbarProvider>
                    <SyncWorkerProvider>
                      <SafeAreaProvider>
                        <BottomSheetModalProvider>
                          <ModalProvider>
                            <StatusBar
                              style={TONO_POR_DEFECTO}
                              backgroundColor={FONDO_POR_DEFECTO}
                            />
                            <RootNavigator />
                          </ModalProvider>
                        </BottomSheetModalProvider>
                      </SafeAreaProvider>
                    </SyncWorkerProvider>
                  </SnackbarProvider>
                </TelemetryProvider>
              </PaperProvider>
            </PersistGate>
          </Provider>
        </RealmProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
