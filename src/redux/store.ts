import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rootReducer } from "./rootReducer";

// Configuración para persistir el estado en almacenamiento local
const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  // Lista blanca o negra de reducers que queremos persistir
  whitelist: ["auth"], // Solo persistimos el estado de autenticación
};

// Crear el reducer persistente
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configuración de la store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorar acciones de redux-persist en las verificaciones de serialización
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Exportamos el persistor para usarlo en App.tsx
export const persistor = persistStore(store);

// Inferimos los tipos para nuestros estados y dispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
