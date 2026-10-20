import { RealmProvider } from "@realm/react";
import React from "react";
import Realm from "realm";
import { AvanceBaseCatalog } from "src/realm/avanceBase/Catalog";
import { AvanceBaseConcept } from "src/realm/avanceBase/Concept";
import { AvanceBaseFiltersApplied } from "src/realm/avanceBase/FiltersApplied";
import { AvanceBaseMeta } from "src/realm/avanceBase/Meta";
import { AvanceBaseResponse } from "src/realm/avanceBase/Response";
import { AvanceBaseSection } from "src/realm/avanceBase/Section";
import { AvanceBaseWorkItem } from "src/realm/avanceBase/WorkItem";
import { UltimaCarga } from "src/realm/avanceBase/UltimaCarga";
import {
  Programa,
  ProgramaConceptoRealm,
  ProgramaCorte,
} from "src/realm/avanceBase/Programa";
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
import { PendingReporteSubmission } from "src/realm/pendingReporte/PendingReporteSubmission";
import { PendingReportePhotoSubmission } from "src/realm/pendingReporte/PendingReportePhotoSubmission";
import { PendingJornadaSubmission } from "src/realm/pendingJornada/PendingJornadaSubmission";
import { PendingMaquinariaSubmission } from "src/realm/pendingMaquinaria/PendingMaquinariaSubmission";
import { MaquinariaHubResponse } from "src/realm/maquinariaHub/Response";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import { TiposMaquinariaResponse } from "src/realm/tiposMaquinaria/Response";
import { TipoMaquinariaRealm } from "src/realm/tiposMaquinaria/TipoMaquinariaRealm";

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
  // Fase 2 (schemaVersion 12): programa contractual y trazabilidad de cargas
  UltimaCarga,
  ProgramaCorte,
  ProgramaConceptoRealm,
  Programa,
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
  // Cola del reporte de actividades diario (schemaVersion 13, ADR-006 D7)
  PendingReporteSubmission,
  PendingReportePhotoSubmission,
  // Cola de la jornada de maquinaria (schemaVersion 16)
  PendingJornadaSubmission,
  // Cola del alta de maquinaria (schemaVersion 17)
  PendingMaquinariaSubmission,
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
  // schemaVersion 12 (ADR-004 Fase 2): bloque `programa` y `ultimas_cargas` en
  // AvanceBaseResponse, más `syncedAt` en la cola (enmienda E8).
  //
  // Se borra SOLO AvanceBaseResponse —donde viven los campos nuevos— y se
  // repuebla con el siguiente prefetch. NO se tocan las colas
  // (PendingAdvanceSubmission / PendingPhotoSubmission): borrarlas destruiría
  // capturas de campo sin sincronizar. `syncedAt` es nullable, así que los
  // items existentes quedan en null, que es exactamente "aún no sincronizó" —
  // el valor correcto para todo lo que siga en cola al migrar.
  if (oldRealm.schemaVersion < 12) {
    newRealm.delete(newRealm.objects("AvanceBaseResponse"));
  }
  // schemaVersion 13 (ADR-006 D7): cola del reporte de actividades diario.
  //
  // Bump ADITIVO: dos clases nuevas y ninguna existente modificada, así que no
  // hay NADA que borrar ni que migrar. Se deja la rama vacía a propósito, para
  // que quede constancia de que la omisión es deliberada y no un olvido — el
  // patrón E1 del ADR-003 pide declarar cada versión aunque no haga trabajo.
  if (oldRealm.schemaVersion < 13) {
    // Sin migración de datos: clases nuevas.
  }
  if (oldRealm.schemaVersion < 14) {
    // Sin migración de datos: `area` y `supervisionJson` se agregan con
    // default en el esquema. Un reporte encolado ANTES de esta versión queda
    // con `area: ""` y el servidor lo rechazará con 400 — es correcto: se
    // capturó bajo un contrato que ya no existe, y el usuario lo ve como
    // fallido con reintento en vez de recibir un documento sin área.
  }
  if (oldRealm.schemaVersion < 15) {
    // Sin migración de datos: `ultimo_horometro` y `ultimo_horometro_fecha`
    // son opcionales en `MaquinariaHubItemRealm` y nacen nulos. El hub es
    // caché de lectura, así que el primer refetch con señal los llena solo;
    // mientras tanto la pantalla de captura simplemente no muestra la
    // referencia de la lectura anterior, que es el comportamiento correcto
    // para una máquina de la que todavía no se sabe nada.
  }
  if (oldRealm.schemaVersion < 16) {
    // Sin migración de datos: `PendingJornadaSubmission` es una clase nueva y
    // ninguna existente cambió. La rama va vacía a propósito, como las
    // anteriores, para que la omisión se lea deliberada y no como olvido.
  }
  if (oldRealm.schemaVersion < 17) {
    // Sin migración de datos: clase nueva (`PendingMaquinariaSubmission`) más
    // `maquinariaLocalId` opcional en la cola de jornadas, que nace nulo.
    //
    // Nulo es además el valor CORRECTO para lo que ya estuviera encolado: una
    // jornada capturada antes de esta versión solo pudo crearse contra una
    // máquina que ya existía en el servidor, así que su `estanciaId` es real y
    // no hay enlace que esperar.
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
      schemaVersion={17}
      onMigration={handleMigration}
    >
      {children}
    </RealmProvider>
  );
}
