import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import {
  PersistedClient,
  PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { DAY_IN_MS } from "src/utils/dateUtils";
import { AppState, AppStateStatus } from "react-native";

const DISPLAY_DEHYDRATION_LOGS = true;
const DISPLAY_NETWORK_LOGS = false;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Aggressive offline-friendly defaults:
      networkMode: "offlineFirst", // don’t error just because you’re offline
      staleTime: 7 * DAY_IN_MS, // data is fresh for 7 days
      gcTime: 7 * DAY_IN_MS, // keep cached data for 7 days
      retry: 2,
      refetchOnReconnect: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false, // RN doesn't have a "window", we'll manage focus below
    },
    mutations: {
      networkMode: "offlineFirst", // queue + resume when back online
      retry: 3,
      retryDelay: (a) => Math.min(60_000, 1000 * 2 ** a), // exp backoff, cap 60s
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "rq-cache-v1", // bump this when your API shape changes
  throttleTime: 1000, // avoid frequent writes
  serialize: (data) => {
    if (DISPLAY_DEHYDRATION_LOGS) {
      console.group("Persisting React Query data");
      console.log(
        "Persisting data:",
        data.clientState.queries.map((q) => q.queryKey)
      );
      console.groupEnd();
    }
    return JSON.stringify(data);
  },
  deserialize: (stringified) => {
    const data = JSON.parse(stringified) as PersistedClient;
    if (DISPLAY_DEHYDRATION_LOGS) {
      console.group("Hydrating React Query data");
      console.log(
        "Hydrating data:",
        data.clientState.queries.map((q) => q.queryKey)
      );
      console.groupEnd();
    }
    return data;
  },
});

// Bridge RN lifecycle -> React Query
// Online status from NetInfo
onlineManager.setEventListener((setOnline) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = Boolean(state.isConnected);
    DISPLAY_NETWORK_LOGS && console.log("NetInfo changed:", isConnected);
    setOnline(isConnected);

    if (isConnected) {
      DISPLAY_NETWORK_LOGS &&
        console.log("Network restored - resuming mutations");
      queryClient.resumePausedMutations();
    }
  });

  return () => unsubscribe();
});

// App focus from AppState
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * DAY_IN_MS, // drop cache older than 7 days
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => {
            DISPLAY_DEHYDRATION_LOGS && console.group("Dehydrate Query Check");
            DISPLAY_DEHYDRATION_LOGS &&
              console.log(
                "Dehydrating query:",
                q.queryKey,
                q.state.data !== undefined
              );
            const meta = q.meta as
              | { persist?: boolean; sensitive?: boolean }
              | undefined;
            DISPLAY_DEHYDRATION_LOGS && console.log("meta:", meta);
            // Skip persisting queries marked as sensitive
            if (meta?.sensitive === true) return false;
            // Opt-in via meta.persist === false if you want to skip a single query
            if (meta?.persist === false) return false;
            // All other queries are persisted
            DISPLAY_DEHYDRATION_LOGS && console.log("Persisting query");
            DISPLAY_DEHYDRATION_LOGS && console.groupEnd();
            return true;
          },
          // Persist mutations so they survive app restarts
          shouldDehydrateMutation: (m) => {
            const meta = (m.meta ?? {}) as any;
            if (DISPLAY_DEHYDRATION_LOGS) {
              console.group("Dehydrate Mutation Check");
              console.log("Dehydrating mutation:", meta);
              console.groupEnd();
            }

            return meta?.persist === false ? false : true;
          },
        },
        // Force cache invalidation when you ship breaking changes:
        buster: "app-1.0.0", // bump this string on breaking releases
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PersistQueryClientProvider>
  );
}
