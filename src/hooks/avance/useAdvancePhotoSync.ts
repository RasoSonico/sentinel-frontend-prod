import { useEffect, useRef } from "react";
import { usePhotoCapture } from "./usePhotoCapture";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  addPhotoToCurrentAdvance,
  removePhotoFromCurrentAdvance,
  updatePhotoFilenameInCurrentAdvance,
  selectCurrentAdvance,
} from "../../redux/slices/avance/advanceSlice";

export function useAdvancePhotoSync(
  options: Parameters<typeof usePhotoCapture>[0],
) {
  const dispatch = useAppDispatch();
  const currentAdvance = useAppSelector(selectCurrentAdvance);
  const photoCapture = usePhotoCapture(options);
  const { photos: localPhotos, clearPhotos: clearLocalPhotos } = photoCapture;

  // Track previous local photos count to detect new photos
  const prevLocalPhotosCountRef = useRef(localPhotos.length);
  const justSyncedRef = useRef(false);

  // Sync local photos to Redux when new photos are added
  useEffect(() => {
    const prevCount = prevLocalPhotosCountRef.current;
    const currentCount = localPhotos.length;

    if (currentCount > prevCount) {
      justSyncedRef.current = true;
      // New photos were added - sync ALL new photos to Redux
      const newPhotos = localPhotos.slice(prevCount);
      newPhotos.forEach((photo) => dispatch(addPhotoToCurrentAdvance(photo)));
    }

    prevLocalPhotosCountRef.current = currentCount;
  }, [localPhotos, dispatch]);

  // Clear local photos when Redux is cleared (e.g., after form submission)
  useEffect(() => {
    if (justSyncedRef.current) {
      justSyncedRef.current = false;
      return;
    }
    if (currentAdvance.photos.length === 0 && localPhotos.length > 0) {
      clearLocalPhotos();
      prevLocalPhotosCountRef.current = 0;
    }
  }, [currentAdvance.photos.length, localPhotos.length, clearLocalPhotos]);

  // Wrap removePhoto to also remove from Redux
  const removePhoto = (photoId: string) => {
    photoCapture.removePhoto(photoId);
    dispatch(removePhotoFromCurrentAdvance(photoId));
  };

  // Wrap updatePhotoFilename to also update Redux
  const updatePhotoFilename = (photoId: string, newFilename: string) => {
    photoCapture.updatePhotoFilename(photoId, newFilename);
    dispatch(updatePhotoFilenameInCurrentAdvance({ photoId, newFilename }));
  };

  // Return Redux photos as source of truth, with local capture functions
  return {
    ...photoCapture,
    photos: currentAdvance.photos,
    removePhoto,
    updatePhotoFilename,
  };
}
