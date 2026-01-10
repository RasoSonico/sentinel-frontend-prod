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
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";

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
    // mutations: {
    //   networkMode: "offlineFirst", // queue + resume when back online
    //   retry: 3,
    //   retryDelay: (a) => Math.min(60_000, 1000 * 2 ** a), // exp backoff, cap 60s
    // },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// App focus from AppState
// function onAppStateChange(status: AppStateStatus) {
//   focusManager.setFocused(status === "active");
// }

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // const isOnline = useNetworkStatus();

  // useEffect(() => {
  //   if (isOnline) {
  //     console.log("QueryProvider: Online - resuming paused mutations");
  //     queryClient.resumePausedMutations();
  //   }
  // }, [isOnline]);
  //
  // useEffect(() => {
  //   const sub = AppState.addEventListener("change", onAppStateChange);
  //   return () => sub.remove();
  // }, []);
  //
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        // maxAge: 7 * DAY_IN_MS, // drop cache older than 7 days
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => {
            console.group("Dehydrate Query Check");
            console.log(
              "Dehydrating query:",
              q.queryKey,
              q.state.data !== undefined,
            );
            const meta = q.meta as
              | { persist?: boolean; sensitive?: boolean }
              | undefined;
            console.log("meta:", meta);
            // Skip persisting queries marked as sensitive
            // if (meta?.sensitive === true) return false;
            // Opt-in via meta.persist === false if you want to skip a single query
            // if (meta?.persist === false) return false;
            // All other queries are persisted
            console.log("Persisting query");
            console.groupEnd();
            return true;
          },
          // Persist mutations so they survive app restarts
          // shouldDehydrateMutation: (m) => {
          //   const meta = (m.meta ?? {}) as any;
          //   console.group("Dehydrate Mutation Check");
          //   console.log("Dehydrating mutation:", meta);
          //   alert(`Dehydrating mutation: ${JSON.stringify(meta)}`);
          //   console.groupEnd();
          //
          //   return meta?.persist === false ? false : true;
          // },
        },
        // Force cache invalidation when you ship breaking changes:
        // buster: "app-1.0.0", // bump this string on breaking releases
      }}
    >
      {children}
    </PersistQueryClientProvider>
   );
}
