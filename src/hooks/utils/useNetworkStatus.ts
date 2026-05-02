import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(
        state.isConnected === true && state.isInternetReachable !== false,
      );
    });

    return unsub;
  }, []);

  return isOnline;
}
