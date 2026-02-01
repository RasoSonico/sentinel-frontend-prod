import { useEffect, useRef } from "react";
import { usePhotoCapture } from "./usePhotoCapture";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  addPhotoToCurrentAdvance,
  removePhotoFromCurrentAdvance,
  selectCurrentAdvance,
} from "../../redux/slices/avance/advanceSlice";

export function useAdvancePhotoSync(
  options: Parameters<typeof usePhotoCapture>[0]
) {
  const dispatch = useAppDispatch();
  const currentAdvance = useAppSelector(selectCurrentAdvance);
  const photoCapture = usePhotoCapture(options);
  const { photos: localPhotos, clearPhotos: clearLocalPhotos } = photoCapture;

  // Track previous local photos count to detect new photos
  const prevLocalPhotosCountRef = useRef(localPhotos.length);

  // Sync local photos to Redux when new photos are added
  useEffect(() => {
    const prevCount = prevLocalPhotosCountRef.current;
    const currentCount = localPhotos.length;

    if (currentCount > prevCount) {
      // New photo was added - sync the new photo to Redux
      const newPhoto = localPhotos[currentCount - 1];
      if (newPhoto) {
        dispatch(addPhotoToCurrentAdvance(newPhoto));
      }
    }

    prevLocalPhotosCountRef.current = currentCount;
  }, [localPhotos, dispatch]);

  // Clear local photos when Redux is cleared (e.g., after form submission)
  useEffect(() => {
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

  // Return Redux photos as source of truth, with local capture functions
  return {
    ...photoCapture,
    photos: currentAdvance.photos,
    removePhoto,
  };
}
