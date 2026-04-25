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
import { AvanceBaseWorkItem } from "src/realm/avanceBase/WorkItem";
import { PhysicalAdvanceResponse } from "src/realm/avanceByCatalog/PhysicalAdvanceResponse";
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

export default function RealmProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealmProvider
      schema={[
        // Avance Base schemas
        AvanceBaseResponse,
        AvanceBaseCatalog,
        AvanceBaseWorkItem,
        AvanceBaseConcept,
        AvanceBaseMeta,
        AvanceBaseFiltersApplied,
        // Advances By Catalog schemas
        AvancesByCatalogResponse,
        PhysicalAdvanceResponse,
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
      ]}
      schemaVersion={7}
      migration={(oldRealm, newRealm) => {
        if (oldRealm.schemaVersion < 7) {
          // cumulative_volume and quantity_left added to AvanceBaseConcept
          // Embedded objects are rewritten on next sync — no data to migrate
        }
      }}
    >
      {children}
      {/* Hanlder to Wipe Realm Data for Dev Purposes */}
      {/* <RealmWipeHandler>{children}</RealmWipeHandler> */}
    </RealmProvider>
  );
}
