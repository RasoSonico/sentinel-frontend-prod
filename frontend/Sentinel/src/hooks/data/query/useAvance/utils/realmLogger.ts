/**
 * Shared logging utilities for Realm operations
 * Provides consistent, detailed logging across all hooks
 *
 * Debug mode can be enabled by setting:
 * - Environment variable: EXPO_PUBLIC_REALM_DEBUG=true
 * - Or programmatically: setRealmDebugMode(true)
 */

// Debug mode state
let isDebugMode = false;

/**
 * Check if debug mode is enabled
 * Can be set via environment variable or programmatically
 */
const isDebugEnabled = (): boolean => {
  // Check programmatic override first
  if (isDebugMode) return true;

  // Check environment variable
  if (process.env.EXPO_PUBLIC_REALM_DEBUG === "true") return true;

  // Check __DEV__ flag for development builds
  if (__DEV__ && process.env.EXPO_PUBLIC_REALM_DEBUG !== "false") {
    // In dev mode, only enable if explicitly set
    return false;
  }

  return false;
};

/**
 * Programmatically enable/disable debug mode
 * Useful for runtime toggling in dev tools
 */
export const setRealmDebugMode = (enabled: boolean) => {
  isDebugMode = enabled;
  console.log(`🔧 Realm debug mode ${enabled ? "ENABLED" : "DISABLED"}`);
};

/**
 * Get current debug mode status
 */
export const getRealmDebugMode = (): boolean => {
  return isDebugEnabled();
};

/**
 * Log API fetch start
 */
export const logApiFetchStart = (entityName: string) => {
  console.log(`📡 Fetching ${entityName} from API...`);
};

/**
 * Log API response received
 * Only shows full data in debug mode
 */
export const logApiResponse = (entityName: string, data: unknown) => {
  if (isDebugEnabled()) {
    console.log(
      `📊 API Response for ${entityName}:`,
      JSON.stringify(data, null, 2),
    );
  } else {
    console.log(`📊 API Response for ${entityName} received`);
  }
};

/**
 * Log no data received from API
 */
export const logNoApiData = (entityName: string) => {
  console.log(`⚠️ No ${entityName} data received from API`);
};

/**
 * Log Realm storage start
 */
export const logRealmStoreStart = (entityName: string) => {
  console.log(`📝 Storing ${entityName} in Realm...`);
};

/**
 * Log prepared data for Realm
 * Only shows full data in debug mode
 */
export const logPreparedData = (entityName: string, data: unknown) => {
  if (isDebugEnabled()) {
    console.log(
      `📦 Prepared ${entityName} data for Realm:`,
      JSON.stringify(data, null, 2),
    );
  } else {
    console.log(`📦 Prepared ${entityName} data for Realm`);
  }
};

/**
 * Log successful Realm storage
 */
export const logRealmStoreSuccess = (entityName: string) => {
  console.log(`✅ Successfully stored ${entityName} in Realm`);
};

/**
 * Log Realm storage error
 * Always shows full error details regardless of debug mode
 */
export const logRealmStoreError = (
  entityName: string,
  error: unknown,
  data?: unknown,
) => {
  console.error(`❌ Error storing ${entityName} in Realm:`, error);
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }

  // Always show data that failed in errors for debugging
  if (data) {
    console.error("Data attempted to store:", JSON.stringify(data, null, 2));
  }
};

/**
 * Log Realm verification
 * Only shows full data in debug mode
 */
export const logRealmVerification = (
  entityName: string,
  exists: boolean,
  data?: unknown,
) => {
  if (isDebugEnabled()) {
    console.log(`🔍 Verification - ${entityName} exists in Realm:`, exists);
    if (exists && data) {
      console.log(`🔍 Verification - ${entityName} data:`, data);
    }
  } else {
    console.log(
      `🔍 Verification - ${entityName}:`,
      exists ? "Found ✓" : "Not found ✗",
    );
  }
};

/**
 * Log hook state
 * Only shows detailed state in debug mode
 */
export const logHookState = (
  hookName: string,
  state: {
    isOnline?: boolean | null;
    hasRealm?: boolean;
    hasCached?: boolean;
    cachedData?: unknown;
    queryState?: unknown;
  },
) => {
  if (!isDebugEnabled()) {
    // In production, just log a simple summary
    const status = state.hasCached ? "💾 Cached" : "🌐 Fetching";
    console.log(`🎣 ${hookName}: ${status}`);
    return;
  }

  // In debug mode, show full details
  console.group(`🎣 ${hookName}`);

  if (state.isOnline !== undefined) {
    console.log("🌐 Network status:", state.isOnline ? "ONLINE" : "OFFLINE");
  }

  if (state.hasRealm !== undefined) {
    console.log(
      "💾 Realm instance:",
      state.hasRealm ? "Available" : "Not available",
    );
  }

  if (state.hasCached !== undefined) {
    console.log(
      "📦 Cached object from Realm:",
      state.hasCached ? "Found" : "Not found",
    );
  }

  if (state.cachedData !== undefined) {
    console.log("📦 Cached data:", state.cachedData);
  }

  if (state.queryState) {
    console.log("📊 React Query state:", state.queryState);
  }

  console.groupEnd();
};

/**
 * Log offline mode usage
 */
export const logOfflineMode = (entityName: string, cached: unknown) => {
  if (isDebugEnabled()) {
    console.log(
      `📴 Network status: Offline | Using cached ${entityName}`,
      cached,
    );
  } else {
    console.log(`📴 Offline mode: Using cached ${entityName}`);
  }
};

/**
 * Log array length
 */
export const logArrayLength = (entityName: string, length: number) => {
  console.log(`📏 ${entityName} count:`, length);
};
