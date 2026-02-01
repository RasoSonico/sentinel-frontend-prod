import { RealmProvider } from "@realm/react";
import React from "react";
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
      ]}
      schemaVersion={3}
    >
      {children}
    </RealmProvider>
  );
}
