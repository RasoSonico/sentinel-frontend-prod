# Silent Token Refresh — Auth System Reference

**Last updated:** 2026-05-17
**Affected files:** `authConfig.json`, `auth.ts`, `apiClient.ts`, `AuthLoading.tsx`, `useAuth.ts`, `useAdvanceSyncWorker.ts`, `usePhotoSyncWorker.ts`, `AppNavigator.styles.tsx`, `PerfilScreen.tsx`, `authSelectors.ts`

---

## Overview

SENTINEL uses Azure AD (OAuth 2.0 PKCE) via `expo-auth-session`. The access token expires every 60 minutes. The goal is that users are **never logged out unless they tap the logout button** — token expiry, poor connectivity, and app restarts are all transparent.

This document covers two successive rounds of fixes and the final state of the system.

---

## Token Lifetime

| Token         | Lifetime                              | Purpose                              |
| ------------- | ------------------------------------- | ------------------------------------ |
| Access token  | 60 minutes                            | `Bearer` header on every API request |
| Refresh token | 24 h inactive / 90-day sliding window | Silently obtains new access tokens   |

Tokens are stored as a serialized `TokenResponse` in `expo-secure-store` under the key `auth-token`. The `TokenResponse` class from `expo-auth-session` provides `shouldRefresh()`, which returns `true` when the access token is expired or nearly expired.

---

## Fix History

### Fix 1 — Silent refresh (2026-04-07)

**Symptom:** Users were logged out exactly every 60 minutes. Any API call after token expiry redirected to the login screen.

**Root causes:**

1. `authConfig.json` only requested one scope (`api://sentinel-auth/access_as_user`). Azure AD requires `offline_access` to include a refresh token. Without it, `refreshToken` was always `null`. `_performRefresh` returned `null` immediately, triggering `forceLogout()`.

2. The 401 interceptor in `apiClient.ts` called `forceLogout()` on any 401 with no retry attempt.

3. Multiple concurrent API calls each attempted to call `refreshAsync()` independently. Azure uses refresh token rotation — the second caller would receive `AADSTS70043` (token already used) and trigger `forceLogout()`.

**Changes:**

- Added `offline_access` to `authConfig.json` scopes.
- Extracted `_performRefresh()` as a shared function in `auth.ts`.
- Added `forceRefreshToken()` with a module-level promise mutex (`_refreshPromise`) to dedup concurrent refresh calls.
- Rewrote the 401 interceptor to refresh-and-retry before logging out.

---

### Fix 2 — Race condition & network resilience (2026-05-17)

**Symptom:** After ~1 hour of use, reloading AdvanceListScreen caused a gray screen. Then the app would "open and close immediately" 6–8 times before recovering.

**Root cause (primary):** `SyncWorkerProvider` mounts at provider tree level 9, while `RootNavigator` (which contains `AuthLoading`) is at level 13. When an expired token + pending advances in the Realm queue were present, the sync workers fired API calls within 500 ms of app start. `AuthLoading` was simultaneously calling `maybeRefreshToken()`. Both called `_performRefresh()` with the same refresh token — Azure rotation invalidated the second call → `forceLogout()` → token permanently deleted from SecureStore. All subsequent cold starts found no token and showed the login screen immediately (user perceived this as "opens and closes").

**Secondary root causes:**

- `_performRefresh()` returned `null` for ALL failures, making it impossible to distinguish a confirmed Azure rejection (`invalid_grant`) from a transient network error. The 401 interceptor and `AuthLoading` both called `forceLogout()` on network errors.
- `AppNavigator.loadingContainer` had no `backgroundColor`. When `queryClient.clear()` fired during `forceLogout()`, the loading view showed as a transparent gray flash.
- `selectIsAuthenticated` in `authSelectors.ts` derived from `state.auth.token`, which is never set in the Azure PKCE flow. The correct field is `state.auth.isAuthenticated`.
- `PerfilScreen`'s logout handler called `AsyncStorage.clear()` before `auth.logout()`, racing with `redux-persist` and `PersistQueryClientProvider` background writes.

**Changes:**

See [Changed Files](#changed-files) section below.

---

## Current Architecture

### Startup flow (`AuthLoading.tsx`)

```
App cold start
│
├─ getTokenResponse()       ← reads SecureStore, no network call
│
├─ No token?
│   └─ clearCredentials() → login screen
│
├─ Token valid (shouldRefresh() = false)?
│   └─ setIsAuthenticated(true) → app screen
│
└─ Token expired (shouldRefresh() = true)?
    └─ maybeRefreshToken()
        ├─ Success (TokenResponse)    → setIsAuthenticated(true) → app screen
        ├─ 'network_error'            → setIsAuthenticated(true) → app screen
        │   (token exists in SecureStore; interceptor will retry on next API call)
        └─ null (Azure rejected)      → clearCredentials() → login screen
```

**Key invariant:** `setIsAuthenticated(true)` is dispatched before `onAuthChecked()`. `SyncWorkerProvider` mounts before `RootNavigator` in the provider tree, but both sync workers gate their `processQueue` on `isAuthenticated === true`. The race window is closed entirely.

---

### 401 interceptor flow (`apiClient.ts`)

```
API request → 401 response
│
├─ First attempt? (_retry not set)
│   └─ forceRefreshToken()          ← deduped mutex; all concurrent callers share one promise
│       ├─ Success (TokenResponse)  → update Authorization header → replay request
│       ├─ 'network_error'          → Promise.reject(error) — session preserved, request fails
│       └─ null (Azure rejected)    → forceLogout() → login screen
│
└─ Already retried? (_retry = true)
    └─ forceLogout() → login screen
```

The request interceptor (`addTokenToRequestsInterceptor`) is unchanged — it reads the token from SecureStore and adds the `Authorization` header on every outgoing request.

---

### RefreshResult type (`auth.ts`)

```typescript
export type RefreshResult = TokenResponse | "network_error" | null;
```

| Value             | Meaning                                                                     | Caller action                               |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `TokenResponse`   | Refresh succeeded; new tokens saved to SecureStore                          | Retry the request / keep user authenticated |
| `"network_error"` | Transient failure (no internet, DNS, timeout)                               | Keep session alive; do NOT delete token     |
| `null`            | Azure explicitly rejected the tokens (`invalid_grant`, `AADSTS70043`, etc.) | Call `forceLogout()`                        |

---

### Sync worker gating (`useAdvanceSyncWorker.ts`, `usePhotoSyncWorker.ts`)

Both workers read `state.auth.isAuthenticated` from Redux. `processQueue` returns immediately if `isAuthenticated` is `false`. The debounced trigger effect also has this guard in its early-return condition. Since Redux initializes with `isAuthenticated: false`, workers are dormant until `AuthLoading` completes.

---

## Changed Files

| File                                            | Change                                                                                                                                                             | Fix           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `src/config/authConfig.json`                    | Added `offline_access` scope                                                                                                                                       | Fix 1         |
| `src/utils/auth.ts`                             | Added `RefreshResult` type; `_performRefresh` now classifies Azure failures vs. network errors; `forceRefreshToken` mutex; `maybeRefreshToken` updated return type | Fix 1 + Fix 2 |
| `src/services/api/apiClient.ts`                 | 401 interceptor: refresh-and-retry; handles `"network_error"` without logout                                                                                       | Fix 1 + Fix 2 |
| `src/navigation/AuthLoading.tsx`                | Reads token first without network call; keeps user authenticated on `"network_error"`                                                                              | Fix 2         |
| `src/hooks/avance/useAdvanceSyncWorker.ts`      | `isAuthenticated` gate on `processQueue` and trigger effect                                                                                                        | Fix 2         |
| `src/hooks/avance/usePhotoSyncWorker.ts`        | `isAuthenticated` gate on `processQueue` and trigger effect                                                                                                        | Fix 2         |
| `src/navigation/styles/AppNavigator.styles.tsx` | Added `backgroundColor: '#FFFFFF'` to `loadingContainer`                                                                                                           | Fix 2         |
| `src/modules/profiles/PerfilScreen.tsx`         | Removed `AsyncStorage.clear()` and redundant `dispatch(logout())`; `auth.logout()` handles everything                                                              | Fix 2         |
| `src/redux/selectors/authSelectors.ts`          | `selectIsAuthenticated` now reads `state.auth.isAuthenticated` instead of `state.auth.token`                                                                       | Fix 2         |

---

## Edge Cases

| Scenario                                                          | Behavior                                                                                                                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single 401, refresh succeeds                                      | Request retried transparently; user sees nothing                                                                                                                             |
| Multiple concurrent 401s                                          | Mutex (`_refreshPromise`) ensures one Azure call; all waiters share the result                                                                                               |
| Token expired at startup, network available                       | `AuthLoading` refreshes silently; user lands on last screen                                                                                                                  |
| Token expired at startup, no network                              | `AuthLoading` gets `"network_error"` → keeps user authenticated; 401 interceptor retries refresh on first API call                                                           |
| Token expired + pending advances in queue                         | Sync workers wait for `isAuthenticated = true`; no race with `AuthLoading`                                                                                                   |
| Azure explicitly rejects refresh (`invalid_grant`, `AADSTS70043`) | `_performRefresh` returns `null` → `forceLogout()` → login screen                                                                                                            |
| Refresh token expired (90-day window)                             | Same as above                                                                                                                                                                |
| No token in SecureStore                                           | `getTokenResponse()` returns `null` → `clearCredentials()` → login screen immediately                                                                                        |
| Retried request also gets 401                                     | `_retry` flag prevents second refresh → `forceLogout()`                                                                                                                      |
| Voluntary logout (PerfilScreen)                                   | `auth.logout()` → `forceLogout()`: deletes SecureStore token, clears Redux, clears React Query cache. `redux-persist` writes the cleared state to AsyncStorage automatically |

---

## Known Limitation — SecureStore Size

After adding `offline_access`, the stored `TokenResponse` includes a refresh token and may exceed 2048 bytes:

```
WARN Value being stored in SecureStore is larger than 2048 bytes
     and it may not be stored successfully.
```

This warning is cosmetic in current Expo SDK versions but will become an error in a future SDK. Resolution: store the access and refresh tokens separately under two SecureStore keys instead of serializing the full `TokenResponse` object.

---

## Build Configuration

The project uses EAS Build. Configuration lives in `eas.json` (build profiles) and `app.config.ts` (dynamic Expo config). The EAS `projectId` is in `app.config.ts` under `extra.eas.projectId`.

| Profile       | Output         | Purpose                                       |
| ------------- | -------------- | --------------------------------------------- |
| `development` | APK (internal) | Dev client with Metro, for active development |
| `preview`     | APK (internal) | Standalone APK for QA and stakeholder testing |
| `production`  | AAB            | Play Store release                            |

Build command:

```bash
npx eas-cli build --profile preview --platform android
```
