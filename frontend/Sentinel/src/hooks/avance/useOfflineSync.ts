import { useState, useEffect, useCallback } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppDispatch } from "../../redux/hooks";

export type SyncItem<T> = {
  id: string;
  data: T;
  createdAt: number;
  syncedAt: number | null;
  syncPending: boolean;
  retryCount: number;
  photos?: string[]; // IDs de fotos relacionadas
};

export interface SyncOperation<T> {
  type: string;
  item: SyncItem<T>;
}

export interface UseOfflineSyncProps<T> {
  syncKey: string; // Clave para AsyncStorage
  syncFunction: (item: T) => Promise<any>; // Función para sincronizar con el servidor
  onSyncComplete?: (results: any[]) => void; // Callback opcional para cuando se completa la sincronización
  maxRetries?: number; // Máximo número de reintentos
  syncInterval?: number; // Intervalo de sincronización en ms
}

/**
 * Hook personalizado para gestionar sincronización offline
 */
export function useOfflineSync<T>({
  syncKey,
  syncFunction,
  onSyncComplete,
  maxRetries = 3,
  syncInterval = 60000, // 60 segundos por defecto
}: UseOfflineSyncProps<T>) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingItems, setPendingItems] = useState<SyncItem<T>[]>([]);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const dispatch = useAppDispatch();

  // Monitorear conectividad
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);

      // Intentar sincronizar cuando recuperemos la conexión
      if (online && !isSyncing && pendingItems.length > 0) {
        syncPendingItems();
      }
    });

    // Cargar datos pendientes al inicializar
    loadPendingItems();

    return () => {
      unsubscribe();
    };
  }, []);

  // Verificar periódicamente si hay elementos para sincronizar
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isOnline && pendingItems.length > 0 && !isSyncing) {
        syncPendingItems();
      }
    }, syncInterval);

    return () => clearInterval(intervalId);
  }, [isOnline, pendingItems, isSyncing, syncInterval]);

  /**
   * Cargar elementos pendientes de sincronización desde AsyncStorage
   */
  const loadPendingItems = async () => {
    try {
      const storedItems = await AsyncStorage.getItem(syncKey);
      if (storedItems) {
        const items = JSON.parse(storedItems) as SyncItem<T>[];
        setPendingItems(items.filter((item) => item.syncPending));
      }
    } catch (error) {
      console.error("Error al cargar elementos pendientes:", error);
    }
  };

  /**
   * Guardar elementos pendientes en AsyncStorage
   */
  const savePendingItems = async (items: SyncItem<T>[]) => {
    try {
      await AsyncStorage.setItem(syncKey, JSON.stringify(items));
      setPendingItems(items.filter((item) => item.syncPending));
    } catch (error) {
      console.error("Error al guardar elementos pendientes:", error);
    }
  };

  /**
   * Añadir un nuevo elemento para sincronización
   */
  const addItemToSync = async (data: T, photos?: string[]): Promise<string> => {
    try {
      // Generar ID único para el elemento
      const itemId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // Crear objeto de sincronización
      const syncItem: SyncItem<T> = {
        id: itemId,
        data,
        createdAt: Date.now(),
        syncedAt: null,
        syncPending: true,
        retryCount: 0,
        photos,
      };

      // Obtener elementos existentes
      const existingItems = await AsyncStorage.getItem(syncKey);
      const items: SyncItem<T>[] = existingItems
        ? JSON.parse(existingItems)
        : [];

      // Añadir nuevo elemento
      const updatedItems = [...items, syncItem];
      await savePendingItems(updatedItems);

      // Intentar sincronizar inmediatamente si estamos online
      if (isOnline && !isSyncing) {
        syncPendingItems();
      }

      return itemId;
    } catch (error) {
      console.error("Error al añadir elemento para sincronización:", error);
      throw error;
    }
  };

  /**
   * Sincronizar elementos pendientes con el servidor
   */
  const syncPendingItems = useCallback(async () => {
    if (isSyncing || pendingItems.length === 0 || !isOnline) {
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      setLastSyncAttempt(Date.now());

      const existingItems = await AsyncStorage.getItem(syncKey);
      let items: SyncItem<T>[] = existingItems ? JSON.parse(existingItems) : [];

      // Filtrar elementos pendientes que no han excedido el número máximo de reintentos
      const itemsToSync = items.filter(
        (item) => item.syncPending && item.retryCount < maxRetries,
      );

      if (itemsToSync.length === 0) {
        setIsSyncing(false);
        return;
      }

      // Resultados de la sincronización
      const syncResults = [];

      // Sincronizar cada elemento pendiente
      for (const item of itemsToSync) {
        try {
          const result = await syncFunction(item.data);

          // Actualizar el estado del elemento (sincronizado)
          items = items.map((i) =>
            i.id === item.id
              ? { ...i, syncPending: false, syncedAt: Date.now() }
              : i,
          );

          syncResults.push({ id: item.id, success: true, result });
        } catch (error) {
          console.error(`Error al sincronizar elemento ${item.id}:`, error);

          // Incrementar contador de reintentos
          items = items.map((i) =>
            i.id === item.id ? { ...i, retryCount: i.retryCount + 1 } : i,
          );

          syncResults.push({
            id: item.id,
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      }

      // Guardar elementos actualizados
      await savePendingItems(items);

      // Llamar al callback si existe
      if (onSyncComplete && syncResults.length > 0) {
        onSyncComplete(syncResults);
      }
    } catch (error) {
      console.error("Error durante la sincronización:", error);
      setSyncError(
        error instanceof Error
          ? error.message
          : "Error desconocido durante la sincronización",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, pendingItems, isOnline, syncFunction, maxRetries]);

  /**
   * Eliminar un elemento de la cola de sincronización
   */
  const removeItemFromSync = async (itemId: string): Promise<boolean> => {
    try {
      const existingItems = await AsyncStorage.getItem(syncKey);
      if (!existingItems) return false;

      const items: SyncItem<T>[] = JSON.parse(existingItems);
      const updatedItems = items.filter((item) => item.id !== itemId);

      await savePendingItems(updatedItems);
      return true;
    } catch (error) {
      console.error("Error al eliminar elemento de sincronización:", error);
      return false;
    }
  };

  /**
   * Forzar un intento de sincronización
   */
  const forceSyncNow = () => {
    if (isOnline && !isSyncing && pendingItems.length > 0) {
      syncPendingItems();
    }
  };

  /**
   * Limpiar todos los elementos pendientes
   */
  const clearPendingItems = async (): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(syncKey);
      setPendingItems([]);
      return true;
    } catch (error) {
      console.error("Error al limpiar elementos pendientes:", error);
      return false;
    }
  };

  return {
    isOnline,
    isSyncing,
    pendingItems,
    lastSyncAttempt,
    syncError,
    addItemToSync,
    removeItemFromSync,
    forceSyncNow,
    clearPendingItems,
  };
}
