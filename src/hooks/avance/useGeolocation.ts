import { useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as Location from "expo-location";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  altitude: number | null;
  formattedAddress?: string;
}

interface UseGeolocationProps {
  requireHighAccuracy?: boolean;
  requestPermissionOnMount?: boolean;
  updateInterval?: number; // Intervalo de actualización en ms
}

/**
 * Hook personalizado para gestionar la geolocalización
 */
export const useGeolocation = ({
  requireHighAccuracy = true,
  requestPermissionOnMount = true,
  updateInterval = 10000, // 10 segundos por defecto
}: UseGeolocationProps = {}) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [watchId, setWatchId] = useState<Location.LocationSubscription | null>(
    null
  );

  // Solicitar permisos al montar el componente si está configurado
  useEffect(() => {
    if (requestPermissionOnMount) {
      requestPermission();
    }

    return () => {
      // Limpiar el seguimiento de ubicación al desmontar
      if (watchId) {
        watchId.remove();
      }
    };
  }, [requestPermissionOnMount]);

  /**
   * Solicitar permiso de ubicación
   */
  const requestPermission = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErrorMsg("Se requiere permiso para acceder a la ubicación");
        setHasPermission(false);
        Alert.alert(
          "Permiso denegado",
          "Necesitamos acceso a la ubicación para registrar correctamente los avances.",
          [{ text: "Entendido", style: "default" }]
        );
        return false;
      }

      setHasPermission(true);
      return true;
    } catch (error) {
      console.error("Error al solicitar permisos de ubicación:", error);
      setErrorMsg("Error al solicitar permisos de ubicación");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener la ubicación actual una sola vez
   */
  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Verificar permisos si no se han solicitado antes
      if (hasPermission === null) {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) return null;
      } else if (hasPermission === false) {
        setErrorMsg("No hay permisos para acceder a la ubicación");
        return null;
      }

      const locationOptions: Location.LocationOptions = {
        accuracy: requireHighAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
      };

      const currentLocation = await Location.getCurrentPositionAsync(
        locationOptions
      );

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        timestamp: currentLocation.timestamp,
        altitude: currentLocation.coords.altitude,
      };

      setLocation(locationData);
      return locationData;
    } catch (error) {
      console.error("Error al obtener ubicación:", error);
      setErrorMsg("No se pudo obtener la ubicación");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener dirección en texto a partir de coordenadas
   */
  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    try {
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResponse && addressResponse.length > 0) {
        const address = addressResponse[0];
        const formattedAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.postalCode,
          address.country,
        ]
          .filter(Boolean)
          .join(", ");

        // Actualizar la ubicación con la dirección formateada
        if (location) {
          setLocation({
            ...location,
            formattedAddress,
          });
        }

        return formattedAddress;
      }

      return null;
    } catch (error) {
      console.error("Error al obtener dirección:", error);
      return null;
    }
  };

  /**
   * Iniciar seguimiento continuo de ubicación
   */
  const startLocationTracking = async (): Promise<boolean> => {
    try {
      // Verificar permisos
      if (hasPermission === null) {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) return false;
      } else if (hasPermission === false) {
        setErrorMsg("No hay permisos para acceder a la ubicación");
        return false;
      }

      // Detener seguimiento existente si hay uno
      if (watchId) {
        watchId.remove();
      }

      // Configurar opciones de seguimiento
      const locationOptions: Location.LocationOptions = {
        accuracy: requireHighAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
        timeInterval: updateInterval,
        distanceInterval: 10, // Actualizar cada 10 metros
      };

      // Iniciar nuevo seguimiento
      const subscription = await Location.watchPositionAsync(
        locationOptions,
        (newLocation) => {
          const locationData: LocationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
            timestamp: newLocation.timestamp,
            altitude: newLocation.coords.altitude,
          };

          setLocation(locationData);
        }
      );

      setWatchId(subscription);
      return true;
    } catch (error) {
      console.error("Error al iniciar seguimiento de ubicación:", error);
      setErrorMsg("No se pudo iniciar el seguimiento de ubicación");
      return false;
    }
  };

  /**
   * Detener seguimiento de ubicación
   */
  const stopLocationTracking = (): void => {
    if (watchId) {
      watchId.remove();
      setWatchId(null);
    }
  };

  return {
    location,
    errorMsg,
    loading,
    hasPermission,
    getCurrentLocation,
    getAddressFromCoordinates,
    startLocationTracking,
    stopLocationTracking,
    requestPermission,
  };
};
