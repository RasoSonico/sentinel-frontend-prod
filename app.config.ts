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
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.urbaingenieria.sentinel",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./src/assets/Icon.png",
      backgroundColor: "#FFFFFF",
    },
    package: "com.urbaingenieria.sentinel",
  },
  web: {
    favicon: "./src/assets/SENTINEL_LOGO.png",
  },
  extra: {
    apiUrl: getApiUrl(),
    environment: process.env.NODE_ENV || "development",
  },
});
