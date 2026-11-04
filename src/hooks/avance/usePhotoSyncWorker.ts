import { useEffect, useRef, useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useQueryClient } from "@tanstack/react-query";
import { usePendingPhotoQueue } from "./usePendingPhotoQueue";
import { useNetworkStatus } from "../utils/useNetworkStatus";
import { useAppSelector } from "src/redux/hooks";
import { useSnackbar } from "../useSnackbar";
import { AVANCE_QUERY_KEYS } from "../data/query/avanceQueries.const";
import {
  requestSingleUpload,
  uploadToAzureBlob,
  confirmUpload,
  uriToBlob,
  getFileSize,
  getImageDimensions,
  getCameraInfo,
  getAzureUploadErrorMessage,
  PhotoUploadRequest,
  AzureUploadResult,
} from "../../services/api/photoService";
import { PendingPhotoSubmission } from "src/realm/pendingAdvance/PendingPhotoSubmission";
import { ApiError } from "src/services/api/apiClient";
import * as Device from "expo-device";

const DEBOUNCE_MS = 500;

/**
 * El presupuesto de reintentos se mide en TIEMPO, no en intentos (ADR-006 F49).
 *
 * Mismo arreglo que ya corre en reportes y en maquinaria. Aquí el techo eran
 * tres intentos gastados en siete segundos: con la señal yendo y viniendo —que
 * es la condición normal de una obra, no la excepción— una foto moría antes de
 * que el usuario saliera de la zona sin cobertura.
 */
const ESPERA_BASE_MS = 5_000;
const ESPERA_MAXIMA_MS = 5 * 60 * 1000;

/** Corre una vez por instalación. */
const MARCA_RESCATE = "avances.rescate_fotos_detenidas.v1";

/**
 * Un 4xx no se arregla reintentando: el servidor entendió y rechazó. Un 5xx,
 * un plazo vencido o un corte, sí. 408 y 429 son 4xx que piden volver.
 */
const esPermanente = (status: number | undefined): boolean =>
  status !== undefined &&
  status >= 400 &&
  status < 500 &&
  status !== 408 &&
  status !== 429;

export function usePhotoSyncWorker() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const isOnline = useNetworkStatus();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const {
    waitingPhotos,
    uploadedPhotos,
    donePhotos,
    markPhotoAsSyncing,
    markPhotoAsUploaded,
    aplazarFoto,
    rescatarFotosDetenidas,
    markPhotoAsFailed,
    markPhotoAsWaiting,
    markPhotoAsDone,
    removePhoto,
    removeDonePhotos,
    resetStuckSyncingPhotos,
    detectAndHandleOrphanedPhotos,
    getPhotoById,
    checkPhotoFileExists,
  } = usePendingPhotoQueue();

  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Reprograma el ciclo. Es ESTADO y no un ref: un ref no provoca render, así
   * que el disparador no volvería a correr y el reintento no llegaría nunca.
   */
  const [pulso, setPulso] = useState(0);

  /** Espera actual del respaldo y el instante en que vence. */
  const esperaRef = useRef(0);
  const finDeEsperaRef = useRef(0);
  const reintentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Programa el siguiente intento, duplicando la espera (F49).
   *
   * Vive FUERA del ciclo. Antes cada fallo dormía dentro del lazo, con un
   * `await` entre dos fotos: el ciclo entero quedaba detenido, así que una
   * foto con mala suerte retrasaba las de todos los demás avances.
   *
   * También es lo que evita el giro en vacío: `aplazarFoto` escribe en Realm,
   * la consulta viva cambia y el disparador vuelve a correr de inmediato. Sin
   * esta ventana, una foto que no puede subir reintentaría cada medio segundo
   * hasta agotar la batería.
   */
  const programarReintento = useCallback(() => {
    esperaRef.current = Math.min(
      esperaRef.current === 0 ? ESPERA_BASE_MS : esperaRef.current * 2,
      ESPERA_MAXIMA_MS,
    );
    finDeEsperaRef.current = Date.now() + esperaRef.current;
    if (reintentoRef.current) clearTimeout(reintentoRef.current);
    reintentoRef.current = setTimeout(() => {
      finDeEsperaRef.current = 0;
      if (mountedRef.current) setPulso((p) => p + 1);
    }, esperaRef.current);
  }, []);

  /** Borra la espera: lo que la motivaba ya cambió. */
  const reiniciarEspera = useCallback(() => {
    esperaRef.current = 0;
    finDeEsperaRef.current = 0;
    if (reintentoRef.current) {
      clearTimeout(reintentoRef.current);
      reintentoRef.current = null;
    }
  }, []);

  // Reset stuck photos and detect orphaned photos on mount
  useEffect(() => {
    // Reset photos stuck in syncing state (e.g., from app crash during upload)
    const resetCount = resetStuckSyncingPhotos();
    if (resetCount > 0) {
      console.log(`[PhotoSyncWorker] Reset ${resetCount} stuck syncing photos`);
    }

    // Detect and handle orphaned photos
    // (photos whose parent advance was deleted but photos weren't updated)
    const orphanResult = detectAndHandleOrphanedPhotos();
    if (orphanResult.orphanedCount > 0) {
      console.log(
        `[PhotoSyncWorker] Detected ${orphanResult.orphanedCount} orphaned photos, ` +
          `handled ${orphanResult.handledCount}`,
      );
    }
  }, [resetStuckSyncingPhotos, detectAndHandleOrphanedPhotos]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reintentoRef.current) clearTimeout(reintentoRef.current);
    };
  }, []);

  /**
   * Rescate de UNA SOLA VEZ de las fotos que murieron bajo la regla vieja.
   *
   * Hasta F49 cualquier tropiezo de red mandaba una foto a `failed`, y de ahí
   * no la sacaba nadie. Instalar la versión nueva sin esto arreglaría las
   * fotos futuras y dejaría enterradas las de las jornadas que ya se
   * trabajaron — que es justo el trabajo que más costó.
   *
   * La marca vive en `AsyncStorage` y no en Realm para no pedir una migración
   * de esquema por algo que ocurre una vez en la vida de la instalación.
   */
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (await AsyncStorage.getItem(MARCA_RESCATE)) return;
        if (!vivo) return;
        const revividas = await rescatarFotosDetenidas();
        await AsyncStorage.setItem(MARCA_RESCATE, new Date().toISOString());
        if (revividas > 0) {
          console.log(
            `[PhotoSyncWorker] Rescate único: ${revividas} foto(s) vuelven a la fila`,
          );
        }
      } catch (error) {
        // Que falle el rescate no puede impedir que el worker arranque.
        console.warn("[PhotoSyncWorker] No se pudo correr el rescate único", error);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [rescatarFotosDetenidas]);

  // Limpieza de arranque: fotos "done" que quedaron de una sesión que murió
  // antes de la limpieza post-refetch. Se refresca el cache de avances
  // PRIMERO para que el contador no caiga al eliminarlas; mientras no haya
  // conexión, quedarse en la cola es inocuo (el conteo por máximo las cubre).
  const doneCleanupRef = useRef(false);
  useEffect(() => {
    if (doneCleanupRef.current) return;
    if (donePhotos.length === 0) return;
    if (!isOnline || !isAuthenticated) return;
    doneCleanupRef.current = true;

    (async () => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG],
          }),
          queryClient.invalidateQueries({
            queryKey: [AVANCE_QUERY_KEYS.PHOTOS_BY_DAY],
          }),
        ]);
      } catch (error) {
        console.warn(
          "[PhotoSyncWorker] Error refreshing advances before done-cleanup:",
          error,
        );
      }
      await removeDonePhotos();
    })();
  }, [donePhotos, isOnline, isAuthenticated, queryClient, removeDonePhotos]);

  /**
   * Confirm a photo upload with the backend
   * Used for both new uploads and retrying failed confirmations
   */
  const confirmPhotoUpload = useCallback(
    async (remotePhotoId: string, uploadSuccess: boolean): Promise<boolean> => {
      try {
        const cameraInfo = getCameraInfo();
        await confirmUpload({
          photo_id: remotePhotoId,
          upload_successful: uploadSuccess,
          error_message: uploadSuccess
            ? undefined
            : "Failed to upload to Azure Blob",
          camera_info: cameraInfo,
        });
        return true;
      } catch (error) {
        console.error("[PhotoSyncWorker] Confirm upload error:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Upload a single photo to Azure (full flow: request SAS → upload → confirm)
   */
  const uploadPhoto = useCallback(
    async (
      photo: PendingPhotoSubmission,
    ): Promise<{
      success: boolean;
      remotePhotoId?: string;
      error?: string;
      /** El servidor dijo que no. Reintentar daría el mismo resultado. */
      permanente?: boolean;
    }> => {
      if (!photo.physicalAdvanceId) {
        console.error(
          "[PhotoSyncWorker] Photo missing physicalAdvanceId:",
          photo._id,
        );
        return {
          success: false,
          error: "Falta ID de avance físico",
          permanente: true,
        };
      }

      // Check if local file exists
      console.log("[PhotoSyncWorker] Attempting upload from:", photo.localUri);
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.localUri);
        if (!fileInfo.exists) {
          console.error(
            "[PhotoSyncWorker] Local file not found:",
            photo.localUri,
          );
          // Return a special error indicating the file is permanently missing
          return {
            success: false,
            error: "Archivo local no encontrado - el archivo fue eliminado",
          };
        }
        console.log(
          "[PhotoSyncWorker] File verified, size:",
          "size" in fileInfo ? fileInfo.size : "unknown",
        );
      } catch (error) {
        console.error("[PhotoSyncWorker] Error checking file:", error);
        return { success: false, error: "Error al verificar archivo local" };
      }

      try {
        // Prepare photo data for API
        const fileSize = await getFileSize(photo.localUri);
        const dimensions = await getImageDimensions(photo.localUri);

        const photoData: PhotoUploadRequest = {
          physical_advance_id: photo.physicalAdvanceId,
          construction_id: photo.constructionId,
          filename: photo.filename,
          file_size: fileSize,
          content_type: "image/jpeg",
          device_model: Device.modelName ?? "Unknown Device",
          latitude: photo.latitude ?? undefined,
          longitude: photo.longitude ?? undefined,
          gps_accuracy: photo.gpsAccuracy ?? undefined,
          taken_at: photo.takenAt.toISOString(),
          image_width: dimensions.width,
          image_height: dimensions.height,
        };

        console.log(
          "[PhotoSyncWorker] Requesting SAS token for:",
          photo.filename,
        );

        // Step 1: Request SAS token
        const uploadResponse = await requestSingleUpload(photoData);
        const remotePhotoId = uploadResponse.photo_id;

        // Step 2: Convert URI to Blob
        const fileBlob = await uriToBlob(photo.localUri);

        // Step 3: Upload to Azure Blob
        console.log("[PhotoSyncWorker] Uploading to Azure:", photo.filename);
        const azureResult: AzureUploadResult = await uploadToAzureBlob(
          uploadResponse.upload_url,
          fileBlob,
          "image/jpeg",
        );

        if (!azureResult.success) {
          const errorMessage = getAzureUploadErrorMessage(azureResult);
          console.error(
            "[PhotoSyncWorker] Azure upload failed:",
            photo.filename,
            azureResult,
          );

          // If it's a SAS token issue, we need to request a new one
          if (azureResult.errorType === "expired_sas") {
            return {
              success: false,
              error: errorMessage,
              // Don't return remotePhotoId since we need a fresh SAS token
            };
          }

          // `forbidden` de Blob es el único definitivo: la credencial no
          // autoriza esa escritura y pedir otra no cambia nada. Un 403 por SAS
          // caducado llega como `expired_sas`, arriba, y sí se reintenta.
          return {
            success: false,
            error: errorMessage,
            permanente: azureResult.errorType === "forbidden",
          };
        }

        // Step 4: Confirm upload - this might fail due to auth
        console.log("[PhotoSyncWorker] Confirming upload:", photo.filename);
        try {
          await confirmPhotoUpload(remotePhotoId, true);
          console.log("[PhotoSyncWorker] Upload confirmed:", photo.filename);
          return { success: true, remotePhotoId };
        } catch (confirmError) {
          // Photo is on Azure but confirmation failed
          // Return partial success so we can retry just the confirmation
          console.error(
            "[PhotoSyncWorker] Confirm failed after successful upload:",
            confirmError,
          );
          return {
            success: false,
            remotePhotoId, // Keep this so we can retry confirmation
            error: "Foto subida pero fallo la confirmación",
          };
        }
      } catch (error) {
        console.error("[PhotoSyncWorker] Upload error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        const status = error instanceof ApiError ? error.status : undefined;
        return {
          success: false,
          error: errorMessage,
          permanente: esPermanente(status),
        };
      }
    },
    [confirmPhotoUpload],
  );

  /**
   * Retry confirmation for a photo that was uploaded but not confirmed
   */
  const retryConfirmation = useCallback(
    async (
      photo: PendingPhotoSubmission,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!photo.remotePhotoId) {
        console.error(
          "[PhotoSyncWorker] Cannot retry confirmation - no remotePhotoId:",
          photo._id,
        );
        return { success: false, error: "Falta ID de foto remota" };
      }

      try {
        console.log(
          "[PhotoSyncWorker] Retrying confirmation for:",
          photo.filename,
        );
        await confirmPhotoUpload(photo.remotePhotoId, true);
        console.log(
          "[PhotoSyncWorker] Confirmation retry successful:",
          photo.filename,
        );
        return { success: true };
      } catch (error) {
        console.error("[PhotoSyncWorker] Confirmation retry failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Error al confirmar";
        return { success: false, error: errorMessage };
      }
    },
    [confirmPhotoUpload],
  );

  /**
   * Process the photo sync queue
   */
  const processQueue = useCallback(async () => {
    // Get photos ready for upload (waiting with physicalAdvanceId)
    const photosReadyForUpload = [...waitingPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    );

    // Get photos that need confirmation retry (uploaded with remotePhotoId)
    const photosNeedingConfirmation = [...uploadedPhotos].filter(
      (p) => p.remotePhotoId !== null,
    );

    const totalToProcess =
      photosReadyForUpload.length + photosNeedingConfirmation.length;

    /**
     * `isOnline === false` y no `!isOnline`: `null` significa "todavía no se
     * sabe", y tratarlo como "sin red" deja la cola trabada justo cuando la
     * sonda de red no logra decidir — que en obra es el caso común, no el
     * raro. Ante la duda se intenta: un POST sin señal falla y se reintenta.
     */
    if (
      syncInProgressRef.current ||
      isOnline === false ||
      !isAuthenticated ||
      totalToProcess === 0
    ) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    let successCount = 0;
    let failCount = 0;

    try {
      // First, process photos needing confirmation retry (quick operations)
      // Sin releer `isOnline`: el ciclo lo capturó al crearse y no puede
      // cambiar a media vuelta. Un corte real lo detecta el intento mismo, que
      // falla y se aplaza.
      for (const photo of photosNeedingConfirmation) {
        if (!mountedRef.current) break;

        setCurrentPhotoId(photo._id);
        markPhotoAsSyncing(photo._id);

        const result = await retryConfirmation(photo);

        if (result.success) {
          // "done": se conserva en la cola hasta que el refetch de avances
          // refleje el photo_count nuevo (evita que el contador Fotos del
          // Hoy cuente hacia abajo foto por foto)
          markPhotoAsDone(photo._id);
          successCount++;
        } else {
          // La foto YA está en Azure; lo único que falta es que el servidor la
          // registre. Rendirse aquí dejaría bytes subidos que nadie reclama,
          // así que se aplaza y se vuelve. `aplazarFoto` la deja en
          // `uploaded`, de modo que el siguiente intento solo confirma.
          aplazarFoto(photo._id, result.error || "Error al confirmar subida");
          failCount++;
        }
      }

      // Then, process photos needing full upload
      for (const photo of photosReadyForUpload) {
        if (!mountedRef.current) break;

        setCurrentPhotoId(photo._id);
        markPhotoAsSyncing(photo._id);

        const result = await uploadPhoto(photo);

        if (result.success) {
          // "done": se conserva en la cola hasta que el refetch de avances
          // refleje el photo_count nuevo (evita que el contador Fotos del
          // Hoy cuente hacia abajo foto por foto)
          markPhotoAsDone(photo._id);
          successCount++;
        } else {
          // Subió a Azure y falló la confirmación: se guarda el id remoto
          // para que el siguiente intento solo confirme, sin remandar bytes.
          if (result.remotePhotoId) {
            markPhotoAsUploaded(photo._id, result.remotePhotoId);
            aplazarFoto(
              photo._id,
              result.error || "Foto subida, falta confirmarla",
            );
            failCount++;
            console.log(
              "[PhotoSyncWorker] Photo uploaded, pending confirmation:",
              photo.filename,
            );
          } else {
            /**
             * **Dos desenlaces, no tres (F49).**
             *
             * Se detiene si el archivo ya no está en el teléfono —reintentar
             * no lo va a traer de vuelta— o si el servidor rechazó. Todo lo
             * demás vuelve a la fila: un corte de red no dice nada sobre la
             * foto, y antes bastaba para matarla en tres intentos.
             */
            const archivoPerdido =
              result.error?.includes("Archivo local no encontrado") ||
              result.error?.includes("el archivo fue eliminado");

            if (archivoPerdido || result.permanente) {
              markPhotoAsFailed(
                photo._id,
                archivoPerdido
                  ? "El archivo de la fotografía ya no está en este teléfono"
                  : result.error || "El servidor rechazó la fotografía",
              );
              failCount++;
              console.warn(
                "[PhotoSyncWorker] Foto detenida:",
                photo.filename,
                result.error,
              );
              showSnackbar(
                archivoPerdido
                  ? `Archivo de foto no encontrado: ${photo.filename.substring(0, 15)}...`
                  : `Error al subir foto: ${photo.filename.substring(0, 15)}...`,
                "error",
              );
            } else {
              // Sin dormir aquí: el espaciado lo pone el ciclo. Dormir dentro
              // del lazo detenía de paso las fotos de los demás avances.
              aplazarFoto(photo._id, result.error || "Error al subir foto");
              failCount++;
            }
          }
        }
      }

      // Show batch completion message
      if (successCount > 0) {
        showSnackbar(
          `${successCount} foto${successCount > 1 ? "s" : ""} sincronizada${successCount > 1 ? "s" : ""}`,
          "success",
        );

        // Las fotos nuevas ya existen en el servidor: refrescar (a) la lista
        // de avances (photo_count → contador Fotos del Hoy, 📷 de las cards,
        // franja de evidencia) y (b) la galería del día (PHOTOS_BY_DAY). Sin
        // esto los datos quedan viejos indefinidamente: refetchOnMount está
        // en false y estos observers viven montados — nadie más los refresca.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [AVANCE_QUERY_KEYS.ADVANCES_BY_CATALOG],
          }),
          queryClient.invalidateQueries({
            queryKey: [AVANCE_QUERY_KEYS.PHOTOS_BY_DAY],
          }),
        ]);

        // Solo DESPUÉS de que el refetch aterrizó (invalidateQueries espera
        // a las queries activas) se eliminan las fotos "done": el conteo
        // pasa de la cola al photo_count del servidor sin hueco visible
        await removeDonePhotos();
      }
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      setCurrentPhotoId(null);

      if (successCount > 0) {
        // Algo avanzó: la red está sirviendo y la espera acumulada ya no
        // describe nada. Se borra y se vuelve a pasar enseguida.
        reiniciarEspera();
        if (mountedRef.current) setPulso((p) => p + 1);
      } else if (failCount > 0) {
        // Nada salió y algo lo intentó: se vuelve, más tarde cada vez. Lo que
        // NO se hace es rendirse.
        programarReintento();
      }
    }
  }, [
    isOnline,
    waitingPhotos,
    uploadedPhotos,
    markPhotoAsSyncing,
    markPhotoAsUploaded,
    aplazarFoto,
    markPhotoAsFailed,
    markPhotoAsDone,
    removeDonePhotos,
    uploadPhoto,
    retryConfirmation,
    isAuthenticated,
    showSnackbar,
    queryClient,
    programarReintento,
    reiniciarEspera,
  ]);

  /**
   * Volver a tener red borra la espera.
   *
   * Declarado ANTES del disparador a propósito: los efectos corren en orden de
   * declaración, así que para cuando el de abajo mira la ventana, esta ya está
   * limpia y el intento sale de inmediato en vez de esperar los cinco minutos
   * acumulados sin señal. Es el caso de la obra: se sale de la zona muerta y
   * la cola tiene que vaciarse al llegar, no un rato después.
   */
  useEffect(() => {
    if (isOnline === true) reiniciarEspera();
  }, [isOnline, reiniciarEspera]);

  // Debounced effect to trigger sync when conditions are met
  useEffect(() => {
    const photosReadyForUpload = [...waitingPhotos].filter(
      (p) => p.physicalAdvanceId !== null,
    );
    const photosNeedingConfirmation = [...uploadedPhotos].filter(
      (p) => p.remotePhotoId !== null,
    );

    const totalToProcess =
      photosReadyForUpload.length + photosNeedingConfirmation.length;

    if (
      isOnline === false ||
      !isAuthenticated ||
      totalToProcess === 0 ||
      syncInProgressRef.current
    ) {
      return;
    }
    // Dentro de la ventana de espera no se insiste: el temporizador del
    // respaldo despertará al ciclo cuando toque. Sin esto, `aplazarFoto`
    // cambia la consulta viva y este efecto volvería a correr de inmediato.
    if (Date.now() < finDeEsperaRef.current) return;

    const timeoutId = setTimeout(() => {
      processQueue();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [
    isOnline,
    isAuthenticated,
    waitingPhotos,
    uploadedPhotos,
    pulso,
    processQueue,
  ]);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (isOnline === false) {
      showSnackbar("Sin conexión a internet", "error");
      return;
    }
    // Una persona que toca el botón está diciendo "ahora": hacerla esperar el
    // respaldo sería contestarle que no a algo que sí se puede intentar.
    reiniciarEspera();
    await processQueue();
  }, [isOnline, processQueue, showSnackbar, reiniciarEspera]);

  /**
   * Retry a specific failed photo
   */
  const retryPhoto = useCallback(
    async (photoId: string) => {
      const photo = getPhotoById(photoId);

      if (
        !photo ||
        (photo.status !== "failed" && photo.status !== "uploaded")
      ) {
        return;
      }

      // Check if file still exists (only needed for full upload)
      if (photo.status === "failed" && !photo.remotePhotoId) {
        const fileExists = await checkPhotoFileExists(photoId);
        if (!fileExists) {
          showSnackbar("El archivo de la foto ya no existe", "error");
          await removePhoto(photoId, false);
          return;
        }
      }

      // If photo was uploaded but confirmation failed, retry confirmation only
      if (photo.remotePhotoId) {
        markPhotoAsUploaded(photoId, photo.remotePhotoId);
      } else {
        markPhotoAsWaiting(photoId);
      }

      if (isOnline) {
        await processQueue();
      }
    },
    [
      isOnline,
      processQueue,
      getPhotoById,
      markPhotoAsUploaded,
      markPhotoAsWaiting,
      checkPhotoFileExists,
      removePhoto,
      showSnackbar,
    ],
  );

  return {
    isSyncing,
    currentPhotoId,
    syncNow,
    retryPhoto,
  };
}
