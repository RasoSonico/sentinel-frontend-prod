import { useEffect, useRef } from "react";
import { useGeolocation } from "./useGeolocation";

export function useAdvanceLocation(
  options?: Parameters<typeof useGeolocation>[0]
) {
  const geo = useGeolocation(options);
  const { getCurrentLocation } = geo;
  const hasFetched = useRef(false);

  useEffect(() => {
    if (options?.requestPermissionOnMount && !hasFetched.current) {
      hasFetched.current = true;
      const fetchLocation = async () => {
        try {
          await getCurrentLocation();
        } catch (error) {
          // Optionally handle error globally
          console.error("Error al obtener ubicación:", error);
        }
      };
      fetchLocation();
    }
    // Only run on mount or if requestPermissionOnMount changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.requestPermissionOnMount]);

  return geo;
}
