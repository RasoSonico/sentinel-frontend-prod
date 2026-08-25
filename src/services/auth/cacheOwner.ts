import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import type Realm from "realm";
import { telemetry } from "src/services/telemetry";
import { queryClient, asyncStoragePersister } from "src/providers/QueryProvider";

/**
 * Limpieza de cache al cambiar de identidad (ADR-004, §Prerrequisitos).
 *
 * Realm y el cache persistido de React Query sobreviven al logout. En un
 * dispositivo compartido en obra eso significa que el usuario siguiente ve los
 * datos del anterior hasta que aterriza el primer refetch — y con el programa
 * contractual de Fase 2, un catálogo completo de otra obra es información
 * sensible y visualmente indistinguible de la propia.
 *
 * El anclaje es la IDENTIDAD, no el logout: si vuelve el mismo usuario conserva
 * su cache offline y su cola pendiente (crítico en campo, donde salir y volver
 * a entrar es rutina). Solo se borra cuando entra alguien distinto.
 */

const OWNER_KEY = "sentinel-cache-owner";

export type CacheOwnerOutcome =
  | "adopted" // no había marcador — se adopta la identidad actual, sin borrar
  | "same-owner" // mismo usuario — no se toca nada
  | "wiped" // identidad distinta — se borró todo el cache local
  | "unknown-identity"; // no se pudo determinar quién es — no se toca nada

interface AzureAccessTokenClaims {
  oid?: string;
  sub?: string;
}

/**
 * Identidad estable del usuario, leída del propio access token.
 *
 * Deliberadamente NO se usa `authMe`: eso metería una llamada de red en todo
 * arranque en frío y rompería el camino rápido de AuthLoading ("token válido →
 * sin red") y el comportamiento offline. El token de Azure es un JWT y trae la
 * identidad; decodificarlo es local y submilisegundo.
 *
 * `oid` es el object id del usuario en el tenant (estable entre apps y
 * sesiones). `sub` es el fallback por si algún token no trae `oid`.
 */
export function identityFromAccessToken(
  accessToken: string | null | undefined,
): string | null {
  if (!accessToken) return null;

  try {
    const claims = jwtDecode<AzureAccessTokenClaims>(accessToken);
    return claims.oid ?? claims.sub ?? null;
  } catch (error) {
    console.warn("[CacheOwner] No se pudo decodificar el access token:", error);
    return null;
  }
}

export async function getCacheOwner(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(OWNER_KEY);
  } catch (error) {
    console.warn("[CacheOwner] No se pudo leer el marcador de dueño:", error);
    return null;
  }
}

async function setCacheOwner(identity: string): Promise<void> {
  await AsyncStorage.setItem(OWNER_KEY, identity);
}

/**
 * Borra los dos caches que sostienen datos del usuario anterior.
 *
 * Son dos rutas distintas hacia el mismo dato viejo y hay que cerrar ambas:
 *  - Realm lo lee la UI DIRECTO (`useAvanceBase` retorna `data: cached ?? null`).
 *  - El persister de AsyncStorage rehidrata el cache de React Query al
 *    siguiente montaje, aunque `queryClient.clear()` ya haya vaciado memoria.
 *
 * `deleteAll()` en vez de enumerar clases: cuando la identidad cambió no hay
 * nada rescatable, y una lista explícita se pudre en cuanto se agregan clases
 * nuevas (las de `programa` en la Etapa 6, sin ir más lejos).
 *
 * NUNCA `AsyncStorage.clear()`: compite con las escrituras en background de
 * redux-persist y del propio persister — causa secundaria documentada del Fix 2
 * en `docs/silent-token-refresh.md`. Borrado dirigido por llave, nada más.
 */
export async function wipeLocalCaches(realm: Realm): Promise<void> {
  realm.write(() => {
    realm.deleteAll();
  });

  queryClient.clear();
  await asyncStoragePersister.removeClient();
}

/**
 * Compara la identidad del token contra el dueño registrado del cache y borra
 * si cambió. Debe correr ANTES de que monte el árbol autenticado:
 *
 *  - `AuthLoading` — arranque en frío. `RootNavigator` lo renderiza en
 *    exclusiva hasta `onAuthChecked()`, así que ningún componente sostiene
 *    todavía un objeto Realm vivo.
 *  - `useAuth.login()` — cambio de usuario sin reiniciar la app; se llama antes
 *    de `setIsAuthenticated(true)`, que es lo que monta `AppNavigator`.
 *
 * Hacerlo después provocaría el `Accessing object which has been invalidated`
 * que ya conoce este código (patrones 6 y 10 de la guía de ADR-004).
 */
export async function ensureCacheOwner(
  realm: Realm,
  accessToken: string | null | undefined,
): Promise<CacheOwnerOutcome> {
  const identity = identityFromAccessToken(accessToken);

  // Sin identidad legible no se decide nada. Borrar aquí destruiría datos de
  // campo por un token malformado o un fallo de parseo — y no hace falta: sin
  // token válido la API responde 401 y el interceptor termina en forceLogout.
  if (!identity) {
    console.warn(
      "[CacheOwner] Identidad indeterminable — no se toca el cache local",
    );
    telemetry.trackEvent("cache_owner_identity_unknown");
    return "unknown-identity";
  }

  const owner = await getCacheOwner();

  // Ausencia de marcador NO significa "esto es de otra persona": significa que
  // nunca lo registramos. Es el caso de las instalaciones que ya están en campo
  // el día que esto se libera. Se adopta sin borrar — un wipe incondicional
  // aquí se comería las capturas sin sincronizar de todos los dispositivos que
  // las tengan. El riesgo residual (un dispositivo que cambió de manos ANTES de
  // la actualización) dura una sola sesión y solo sin red, porque
  // `refetchOnMount: true` reemplaza `avance/base/` al primer montaje con
  // conexión; y se cierra para siempre tras ese primer login.
  if (owner === null) {
    await setCacheOwner(identity);
    console.log("[CacheOwner] Sin marcador previo — identidad adoptada");
    return "adopted";
  }

  if (owner === identity) {
    return "same-owner";
  }

  // Identidad distinta: se borra todo. El usuario anterior ya fue advertido al
  // cerrar sesión si tenía cola pendiente (PerfilScreen). Al usuario nuevo NO
  // se le informa nada — decirle cuántas capturas tenía el anterior le revela
  // actividad ajena.
  const pendingAdvances = realm.objects("PendingAdvanceSubmission").length;
  const pendingPhotos = realm.objects("PendingPhotoSubmission").length;

  console.log("[CacheOwner] Cambio de identidad — borrando cache local");
  await wipeLocalCaches(realm);
  await setCacheOwner(identity);

  telemetry.trackEvent("cache_wiped_identity_change", {
    pending_advances: pendingAdvances,
    pending_photos: pendingPhotos,
  });

  return "wiped";
}
