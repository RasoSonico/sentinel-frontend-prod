import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { store, persistor } from "./src/redux/store";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { ModalProvider } from "src/modules/modals/ModalContext";
import RealmProvider from "src/providers/RealmProvider";
import QueryProvider from "src/providers/QueryProvider";
import { PersistGateLoader } from "src/components/ui/PersistGateLoader";
import { SnackbarProvider } from "src/providers/SnackbarProvider";
import { SyncWorkerProvider } from "src/providers/SyncWorkerProvider";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <RealmProvider>
          <Provider store={store}>
            <PersistGate loading={<PersistGateLoader />} persistor={persistor}>
              <PaperProvider>
                <SnackbarProvider>
                  <SyncWorkerProvider>
                    <SafeAreaProvider>
                      <BottomSheetModalProvider>
                        <ModalProvider>
                          <StatusBar style="auto" />
                          <RootNavigator />
                        </ModalProvider>
                      </BottomSheetModalProvider>
                    </SafeAreaProvider>
                  </SyncWorkerProvider>
                </SnackbarProvider>
              </PaperProvider>
            </PersistGate>
          </Provider>
        </RealmProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
