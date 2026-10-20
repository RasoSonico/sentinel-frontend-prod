import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

/**
 * Estado de red, en tres valores: `true`, `false` y **`null` = todavía no se
 * sabe**.
 *
 * Quien lo consuma tiene que tratar `null` como incógnita y NO como "sin red".
 * La asimetría manda: el costo de intentar sin conexión es una petición que
 * falla y se reintenta; el de no intentar creyendo que no hay, es una cola
 * trabada indefinidamente. Ver el guard de `useReporteSyncWorker`.
 *
 * `isInternetReachable` se compara contra `false` y no contra `true` a
 * propósito: NetInfo lo resuelve sondeando un host propio, y en una red de
 * obra o corporativa esa sonda puede fallar mientras la API responde perfecto.
 * Solo un `false` explícito cuenta como incomunicación.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const evaluar = (state: NetInfoState) =>
      state.isConnected === true && state.isInternetReachable !== false;

    const unsub = NetInfo.addEventListener((state) => setIsOnline(evaluar(state)));

    // Siembra explícita. `addEventListener` normalmente emite al suscribirse,
    // pero solo si NetInfo ya tiene un estado o logra resolverlo; sin esta
    // consulta, un arranque donde eso no ocurre deja el valor en `null` y todo
    // lo que dependa de él se comporta como si no hubiera red. Es el mismo par
    // listener + fetch que ya usa `AdvanceRegistrationScreen`.
    let vivo = true;
    NetInfo.fetch().then((state) => {
      if (vivo) setIsOnline(evaluar(state));
    });

    return () => {
      vivo = false;
      unsub();
    };
  }, []);

  return isOnline;
}
