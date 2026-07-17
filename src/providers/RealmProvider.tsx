import { RealmProvider, useRealm } from "@realm/react";
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import Realm from "realm";
import { AvanceBaseCatalog } from "src/realm/avanceBase/Catalog";
import { AvanceBaseConcept } from "src/realm/avanceBase/Concept";
import { AvanceBaseFiltersApplied } from "src/realm/avanceBase/FiltersApplied";
import { AvanceBaseMeta } from "src/realm/avanceBase/Meta";
import { AvanceBaseResponse } from "src/realm/avanceBase/Response";
import { AvanceBaseSection } from "src/realm/avanceBase/Section";
import { AvanceBaseWorkItem } from "src/realm/avanceBase/WorkItem";
import { PhysicalAdvanceResponse } from "src/realm/avanceByCatalog/PhysicalAdvanceResponse";
import { AdvancePhoto } from "src/realm/avanceByCatalog/Photo";
import { AvancesByCatalogResponse } from "src/realm/avanceByCatalog/Response";
import { CatalogsByConstructionResponse } from "src/realm/catalogsByConstruction/Response";
import { CatalogoItemRealm } from "src/realm/catalogsByConstruction/CatalogoItem";
import { PartidasByCatalogResponse } from "src/realm/partidasByCatalog/Response";
import { PartidaItemRealm } from "src/realm/partidasByCatalog/PartidaItem";
import { ConceptsByWorkItemResponse } from "src/realm/conceptsByWorkItem/Response";
import { ConceptoItemRealm } from "src/realm/conceptsByWorkItem/ConceptoItem";
import { AssignedConstructionResponse } from "src/realm/assignedConstruction/Response";
import { ConstructionRealm } from "src/realm/assignedConstruction/Construction";
import { PendingAdvanceSubmission } from "src/realm/pendingAdvance/PendingAdvanceSubmission";
import { PendingPhotoSubmission } from "src/realm/pendingAdvance/PendingPhotoSubmission";
import { MaquinariaHubResponse } from "src/realm/maquinariaHub/Response";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import { TiposMaquinariaResponse } from "src/realm/tiposMaquinaria/Response";
import { TipoMaquinariaRealm } from "src/realm/tiposMaquinaria/TipoMaquinariaRealm";

// One-time wipe function - REMOVE AFTER DEPLOYMENT
const performDatabaseWipe = async (realm: Realm) => {
  const WIPE_VERSION = 1; // Increment to trigger new wipe
  const WIPE_KEY = `realm_wipe_v${WIPE_VERSION}`;

  // Check if already wiped
  const hasWiped = await AsyncStorage.getItem(WIPE_KEY);
  if (hasWiped) return;

  console.log("[RealmWipe] Starting FULL database wipe...");

  // Wipe ALL Realm data
  realm.write(() => {
    realm.deleteAll();
  });

  // Delete local photo files
  const photosDir = `${FileSystem.documentDirectory}photos/`;
  await FileSystem.deleteAsync(photosDir, { idempotent: true });

  // Mark as wiped
  await AsyncStorage.setItem(WIPE_KEY, "true");
  console.log("[RealmWipe] Full database wipe complete");
};

// Wrapper component to trigger wipe - REMOVE AFTER DEPLOYMENT
function RealmWipeHandler({ children }: { children: React.ReactNode }) {
  const realm = useRealm();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    performDatabaseWipe(realm).then(() => setIsReady(true));
  }, [realm]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}

// IMPORTANTE: schema y onMigration viven a nivel de módulo para que su
// identidad sea estable entre renders. @realm/react compara la configuración
// en cada re-render (isEqual, funciones por referencia): una arrow inline
// hace que la config "cambie" en cada render del árbol raíz y el provider
// CIERRA y reabre el Realm → carreras "Cannot access realm that has been
// closed" en queryFns en vuelo al volver del background.
const SENTINEL_SCHEMA = [
  // Avance Base schemas
  AvanceBaseResponse,
  AvanceBaseCatalog,
  AvanceBaseWorkItem,
  AvanceBaseSection,
  AvanceBaseConcept,
  AvanceBaseMeta,
  AvanceBaseFiltersApplied,
  // Advances By Catalog schemas
  AvancesByCatalogResponse,
  PhysicalAdvanceResponse,
  AdvancePhoto,
  // Catalogs By Construction schemas
  CatalogsByConstructionResponse,
  CatalogoItemRealm,
  // Partidas By Catalog schemas
  PartidasByCatalogResponse,
  PartidaItemRealm,
  // Concepts By WorkItem schemas
  ConceptsByWorkItemResponse,
  ConceptoItemRealm,
  // Assigned Construction schemas
  AssignedConstructionResponse,
  ConstructionRealm,
  // Pending Advance Submission schema
  PendingAdvanceSubmission,
  // Pending Photo Submission schema
  PendingPhotoSubmission,
  // Maquinaria schemas
  MaquinariaHubResponse,
  MaquinariaHubItemRealm,
  TiposMaquinariaResponse,
  TipoMaquinariaRealm,
];

// Nota: la prop correcta de @realm/react es onMigration; el nombre anterior
// (migration) no existía y las migraciones v8/v10 nunca corrieron por esa vía
const handleMigration = (oldRealm: Realm, newRealm: Realm) => {
  if (oldRealm.schemaVersion < 8) {
    newRealm.delete(newRealm.objects("AssignedConstructionResponse"));
    newRealm.delete(newRealm.objects("AvanceBaseResponse"));
  }
  // schemaVersion 9: added Maquinaria schemas — no existing data to migrate
  // schemaVersion 10: added AvanceBaseSection, section_id and wbs_code on
  // AvanceBaseConcept, sections list on AvanceBaseWorkItem — structural
  // change requires a fresh sync to repopulate
  if (oldRealm.schemaVersion < 10) {
    newRealm.delete(newRealm.objects("AvanceBaseResponse"));
  }
  // schemaVersion 11 (ADR-003 Fase 1): AdvancePhoto embebido + photos/
  // photo_count/concept_wbs_code/concept_section_name en
  // PhysicalAdvanceResponse — el cache de avances se repuebla al
  // siguiente sync; la cola pendiente no se toca
  if (oldRealm.schemaVersion < 11) {
    newRealm.delete(newRealm.objects("AvancesByCatalogResponse"));
  }
};

export default function RealmProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealmProvider
      schema={SENTINEL_SCHEMA}
      schemaVersion={11}
      onMigration={handleMigration}
    >
      {children}
      {/* Hanlder to Wipe Realm Data for Dev Purposes */}
      {/* <RealmWipeHandler>{children}</RealmWipeHandler> */}
    </RealmProvider>
  );
}
