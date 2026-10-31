import { ExpoConfig, ConfigContext } from "expo/config";

// Function to determine API URL based on environment and platform
const getApiUrl = (): string => {
  // Detect environment
  const envType = process.env.APP_ENV || process.env.NODE_ENV || "development";

  if (envType === "production") {
    return "https://your-production-server.com/api/";
  } else if (envType === "staging") {
    return "https://your-staging-server.com/api/";
  } else {
    // For development, detect platform
    const { platform } = process;

    if (platform === "darwin") {
      // macOS - assume iOS simulator
      return "http://localhost:8000/api/";
    } else if (platform === "win32") {
      // Windows - assume Android emulator
      return "http://10.0.2.2:8000/api/";
    } else {
      // Default - works on local networks if backend is accessible
      return "http://192.168.1.X:8000/api/"; // Change X to your actual IP!
    }
  }
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Sentinel",
  slug: "sentinel",
  scheme: "sentinel",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/Icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./src/assets/SENTINEL.jpg",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  // Los spreads NO son opcionales, por lo mismo que en `extra` más abajo:
  // redefinir estos objetos sin ellos borraba en silencio lo que app.json ya
  // declaraba, y nada avisa — la config resuelta simplemente sale sin eso.
  //
  // De `ios` se perdían `scheme` y `associatedDomains` —los universal links
  // contra el backend— y de `android`, los intent filters del esquema
  // `sentinel`. Los dos llevaban tiempo sin llegar a ninguna build.
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: "com.urbaingenieria.sentinel",
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./src/assets/Icon.png",
      backgroundColor: "#FFFFFF",
    },
    package: "com.urbaingenieria.sentinel",
    // Explícito y en FALSO, aunque sea el default: app.json lo declaraba en
    // true y el spread de arriba lo habría encendido de golpe.
    //
    // Encenderlo no es una línea de config: la app dibujaría bajo las barras
    // del sistema, y las pantallas sin encabezado de navegación —Login,
    // Perfil y las dos hojas de firma— usan el `SafeAreaView` de react-native,
    // que en Android no hace nada. Su contenido se metería debajo del reloj.
    // Migrarlas a `react-native-safe-area-context` y revisar en dispositivo es
    // una pasada propia.
    //
    // Mientras tanto la barra se pinta por pantalla desde `useBarraDeEstado`,
    // que es justo lo que deja de funcionar cuando esto se enciende.
    edgeToEdgeEnabled: false,
  },
  web: {
    favicon: "./src/assets/SENTINEL_LOGO.png",
  },
  extra: {
    // El spread NO es opcional: `extra` de app.json trae `eas.projectId`, y
    // redefinir este objeto sin él lo borraba de la config resuelta. EAS lee
    // ahí el enlace del proyecto, así que sin el spread `eas build` responde
    // "EAS project not configured" y `eas env:create` truena al intentar
    // escribir el id de vuelta ("Cannot read properties of undefined").
    ...config.extra,
    apiUrl: getApiUrl(),
    environment: process.env.NODE_ENV || "development",
  },
});
