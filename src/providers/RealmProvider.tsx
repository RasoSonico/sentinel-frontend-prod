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
import { PendingCapturaSubmission } from "src/realm/pendingJornada/PendingCapturaSubmission";
import { PendingMaquinariaSubmission } from "src/realm/pendingMaquinaria/PendingMaquinariaSubmission";
import { MaquinariaHubResponse } from "src/realm/maquinariaHub/Response";
import { MaquinariaHubItemRealm } from "src/realm/maquinariaHub/MaquinariaHubItemRealm";
import { DetalleJornadaRealm } from "src/realm/maquinariaHub/DetalleJornadaRealm";
import { TurnoRealm } from "src/realm/maquinariaHub/TurnoRealm";
import { JornadaHubRealm } from "src/realm/maquinariaHub/JornadaHubRealm";
import { TurnoAbiertoRealm } from "src/realm/maquinariaHub/TurnoAbiertoRealm";
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
  // Cola de capturas de la hoja de jornada (schemaVersion 21, ADR-009 D1).
  // Sustituye a la cola de jornadas de la versión 16.
  PendingCapturaSubmission,
  // Cola del alta de maquinaria (schemaVersion 17)
  PendingMaquinariaSubmission,
  // Maquinaria schemas
  MaquinariaHubResponse,
  MaquinariaHubItemRealm,
  // Renglones de la jornada (schemaVersion 18). Embebido y compartido por el
  // caché del hub y la cola de envío: es el mismo dato en dos momentos.
  DetalleJornadaRealm,
  // Turnos y jornada completa en el caché del hub (schemaVersion 21, ADR-009)
  TurnoRealm,
  JornadaHubRealm,
  TurnoAbiertoRealm,
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
  // schemaVersion 18 (ADR-007): una jornada pasa de una actividad a N.
  //
  // **La primera migración de maquinaria que NO es aditiva.** Desaparecen
  // `jornada_catalog`/`jornada_concept` del caché del hub y
  // `catalogId`/`conceptId`/`esTransitoria` de la cola.
  if (oldRealm.schemaVersion < 18) {
    // 1. El caché del hub se tira entero. Es de solo lectura y el primer
    //    refetch con señal lo reconstruye con la forma nueva; conservarlo
    //    dejaría filas a medio camino entre dos contratos.
    newRealm.delete(newRealm.objects("MaquinariaHubResponse"));

    // 2. La cola NO se tira: ahí vive trabajo que el supervisor capturó en
    //    campo y que todavía no llega al servidor.
    //
    //    Una jornada encolada antes de esta versión no tiene renglones, y el
    //    servidor rechaza con 400 una jornada TRABAJANDO sin actividades. Se
    //    le arma uno con lo que se supo de ella. Mismo criterio que la
    //    migración 0005 del backend: un renglón que diga que no se sabe es
    //    más útil que perder el registro.
    const viejas = oldRealm.objects("PendingJornadaSubmission");
    const nuevas = newRealm.objects("PendingJornadaSubmission");
    for (let i = 0; i < viejas.length; i += 1) {
      const vieja = viejas[i] as unknown as { conceptId: number | null };
      const nueva = nuevas[i] as unknown as {
        detalles: unknown[];
        estado: string;
      };
      // SIN_OPERAR no lleva renglones, y el servidor lo exige así.
      if (nueva.estado !== "TRABAJANDO") continue;

      nueva.detalles.push(
        vieja.conceptId
          ? {
              orden: 1,
              concept: vieja.conceptId,
              descripcion: "",
              horas_estimadas: null,
            }
          : {
              // Solo se supo el catálogo, que ya no tiene dónde vivir, y su
              // nombre nunca estuvo en la cola. Queda la marca: el supervisor
              // puede corregirla al abrir la jornada.
              orden: 1,
              concept: null,
              descripcion: "Actividad capturada antes de la actualización",
              horas_estimadas: null,
            },
      );
    }
  }

  // schemaVersion 19 (firma): `firmaJson` en la cola del reporte.
  //
  // Aditiva y sin migración de datos: el campo nace vacío y vacío es el
  // valor correcto para lo ya encolado. Un reporte capturado antes de esta
  // versión no tiene firma, y el servidor cae a la del perfil de su autor —
  // que es quien lo capturó. Si no la tuviera dada de alta, el envío falla
  // con 400 y el usuario lo ve en la lista de pendientes, que es mejor que
  // entregar un documento sin firmar.

  // schemaVersion 20: las dos lecturas del horómetro de la jornada de HOY en
  // el caché del hub, para la tabla de maquinaria de la previsualización.
  //
  // Aditiva y sin migración de datos: nacen en nulo, y nulo es correcto para
  // lo que ya está cacheado — esas filas se escribieron sin las lecturas.
  // El primer refresco del hub las trae; hasta entonces la tabla imprime "—"
  // en esas columnas, que es lo mismo que hace el documento cuando no hay
  // lectura. Nada que inventar y nada que corregir.

  // schemaVersion 21 (ADR-009): la jornada se captura en varias veces.
  //
  // La cola cambia de unidad —de jornada a captura— y el caché del hub pasa
  // a guardar la jornada completa, con turnos.
  if (oldRealm.schemaVersion < 21) {
    // 1. El caché del hub se tira: es de solo lectura y el primer refetch con
    //    señal lo reconstruye con la forma nueva.
    newRealm.delete(newRealm.objects("MaquinariaHubResponse"));

    // 2. La cola NO se tira: cada jornada sin enviar se vuelve UNA captura con
    //    lo mismo que traía. El servidor la reparte igual que si la hubiera
    //    capturado la hoja nueva de una sola vez. Las ya confirmadas no se
    //    mudan: el hub las trae.
    const viejas = oldRealm.objects("PendingJornadaSubmission");
    for (let i = 0; i < viejas.length; i += 1) {
      const vieja = viejas[i] as unknown as {
        _id: string;
        estanciaId: number;
        maquinariaId: number;
        maquinariaLocalId: string | null;
        fecha: string;
        estado: string;
        detalles: {
          orden: number;
          concept: number | null;
          descripcion: string;
          horas_estimadas: string | null;
        }[];
        motivoInactividad: string | null;
        observaciones: string;
        horometroInicial: string | null;
        horometroFinal: string | null;
        constructionId: number;
        maquinariaEtiqueta: string;
        status: string;
        createdAt: Date;
      };
      if (vieja.status === "done") continue;
      newRealm.create("PendingCapturaSubmission", {
        _id: vieja._id,
        estanciaId: vieja.estanciaId,
        maquinariaId: vieja.maquinariaId,
        maquinariaLocalId: vieja.maquinariaLocalId,
        fecha: vieja.fecha,
        registradoEn: vieja.createdAt.toISOString(),
        autor: "",
        horometroInicial: vieja.horometroInicial,
        horometroFinal: vieja.horometroFinal,
        cerrarAnteriorFinal: null,
        cerrarAnteriorSinFinal: false,
        estado: vieja.estado === "SIN_OPERAR" ? "SIN_OPERAR" : null,
        motivoInactividad: vieja.motivoInactividad,
        observaciones: vieja.observaciones ?? "",
        detalles: Array.from(vieja.detalles).map((d) => ({
          orden: d.orden,
          concept: d.concept,
          descripcion: d.descripcion,
          horas_estimadas: d.horas_estimadas,
          registrado_en: null,
          autor: null,
        })),
        constructionId: vieja.constructionId,
        maquinariaEtiqueta: vieja.maquinariaEtiqueta,
        // Presupuesto de intentos completo: el contrato cambió, y lo que haya
        // fallado contra el viejo merece otra oportunidad contra el nuevo.
        status: "pending",
        createdAt: vieja.createdAt,
        lastAttemptAt: null,
        failedAt: null,
        retryCount: 0,
        maxRetries: 3,
        errorMessage: null,
        errorMotivo: null,
        jornadaFecha: null,
        syncedAt: null,
      });
    }
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
      schemaVersion={21}
      onMigration={handleMigration}
    >
      {children}
    </RealmProvider>
  );
}
