import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
  },
});

// Exportado para que la limpieza por cambio de identidad pueda llamar
// removeClient() (ver src/services/auth/cacheOwner.ts). queryClient.clear()
// solo vacía memoria: el blob persistido se rehidrata al siguiente montaje.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
