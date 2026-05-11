import React, { useRef, useMemo } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useAdvancePhotoSync } from "../../../hooks/avance/useAdvancePhotoSync";
import { useAdvanceLocation } from "../../../hooks/avance/useAdvanceLocation";
import AdvancePhotoSection from "./components/AdvancePhotoSection";
import AdvanceLocationSection from "./components/AdvanceLocationSection";
import { OfflineIndicatorConnected } from "./components/OfflineIndicatorConnected";
import { SubmitSection } from "./components/SubmitSection";
import styles from "./styles/AdvanceForm.styles";
import {
  CatalogField,
  PartidaField,
  ConceptField,
  QuantityField,
  NotesField,
  CompletionField,
} from "./fields";
import { AdvanceFormProvider } from "./context/AdvanceFormContext";
import { useFormContext, useWatch } from "react-hook-form";
import { AdvanceFormFieldsZod } from "./util/advanceFormValidation";
import { useAdvanceFormContext } from "./context/AdvanceFormContext";

interface AdvanceFormProps {
  constructionId: number;
  formSessionId?: string;
  onSuccess?: () => void;
}

function AdvanceFormContent() {
  const { control } = useFormContext<AdvanceFormFieldsZod>();
  const { catalogs } = useAdvanceFormContext();

  const { location, loading: isLoadingLocation } = useAdvanceLocation({
    requestPermissionOnMount: true,
  });

  // Watch partida to derive partidaName for photos
  const catalogId = useWatch({ control, name: "catalog" });
  const partidaId = useWatch({ control, name: "partida" });

  const partidaName = useMemo(() => {
    if (!catalogs || !catalogId || !partidaId) return "";
    const catalog = catalogs.find((c) => c.id === catalogId);
    const partida = catalog?.work_items.find((wi) => wi.id === partidaId);
    return partida?.name ?? "";
  }, [catalogs, catalogId, partidaId]);

  const {
    photos,
    loading: loadingPhotos,
    takePhoto,
    pickImage,
    removePhoto,
    updatePhotoFilename,
  } = useAdvancePhotoSync({
    maxPhotos: 5,
    includeLocation: true,
    partidaName: partidaName || "",
  });

  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <OfflineIndicatorConnected />
        <View style={styles.formSection}>
          <CatalogField />
          <PartidaField />
          <ConceptField />
          <QuantityField />
          <CompletionField />
          <NotesField />
          <AdvancePhotoSection
            photos={photos}
            loading={loadingPhotos}
            onTakePhoto={takePhoto}
            onPickImage={pickImage}
            onRemovePhoto={removePhoto as any}
            onUpdatePhotoFilename={updatePhotoFilename}
            partidaName={partidaName || ""}
            style={styles.photoSection}
          />
          <AdvanceLocationSection
            loading={isLoadingLocation}
            location={
              location
                ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy ?? undefined,
                  }
                : null
            }
            error={false}
          />
        </View>

        <SubmitSection scrollViewRef={scrollViewRef} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AdvanceForm: React.FC<AdvanceFormProps> = ({
  constructionId,
  formSessionId,
}) => {
  return (
    <AdvanceFormProvider constructionId={constructionId} formSessionId={formSessionId}>
      <AdvanceFormContent />
    </AdvanceFormProvider>
  );
};

export default AdvanceForm;
