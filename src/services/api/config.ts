import Constants from "expo-constants";

// API url for expo config
const API_URL = Constants.expoConfig?.extra?.apiUrl;
export const isDevelopment =
  Constants.expoConfig?.extra?.environment === "development";
const baseURL =
  "https://sentinel-backend-app-bcbjhve6fcd6f4fz.mexicocentral-01.azurewebsites.net";

export const API_CONFIG = {
  baseURL,
  endpoints: {
    auth: "/auth",
    me: "/api/usuarios/me/",
    catalogs: "/api/catalogo/catalog/",
    partidas: "/api/catalogo/workitem/",
    concepts: "/api/catalogo/concept/",
    submitAdvance: "/api/avance/physical/",
    advances: {
      list: "/api/avance/physical/",
      base: "/api/avance/base/",
      // + `${constructionId}/summary/` (agregado global de obra, ADR-002)
      constructionSummary: "/api/avance/construction/",
    },
    photos: {
      confirmUpload: "/api/avance/photos/confirm-upload/",
      bulkUpload: "/api/avance/photos/bulk-upload/",
      upload: "/api/avance/photos/upload/",
      list: "/api/avance/photos/",
    },
    construction: {
      catalog: "/api/catalogo/catalog/",
    },
    obra: {
      constructions: {
        myConstructions: "/api/obra/constructions/my_constructions/",
      },
    },
    obraConstructions: "/api/obra/constructions/",
    incidencias: {
      incidents: "/api/incidencias/incidents/",
      incidentTypes: "/api/incidencias/incident-types/",
      incidentClassifications: "/api/incidencias/incident-classifications/",
    },
    // Catálogo de empresas participantes. Fuera de `reportes` a propósito: el
    // roster de una obra no es un hecho del formato UIN-RP-F-002, y cualquier
    // módulo que necesite saber quién ejecuta lee de aquí.
    proveedores: {
      lista: "/api/proveedores/",
    },
    // Firma del usuario. Módulo propio y no parte de `usuarios`: la firma
    // la adopta cualquier documento que la requiera, no solo el perfil.
    firma: {
      mia: "/api/firma/mia",
    },
    reportes: {
      physicalAdvance: "/api/reportes/physical-advance/",
      // Reporte de actividades diario (UIN-RP-F-002) — ADR-006
      actividades: "/api/reportes/actividades/",
      fotoUpload: "/api/reportes/fotos/upload/",
      fotoConfirmUpload: "/api/reportes/fotos/confirm-upload/",
    },
    // "Descargar datos" de Perfil: Excel sin formato de la obra.
    tablas: {
      excel: "/api/tablas/excel/",
    },
    maquinaria: {
      hub: "/api/maquinaria/hub-diario/",
      tipos: "/api/maquinaria/tipos/",
      maquinarias: "/api/maquinaria/maquinarias/",
      estancias: "/api/maquinaria/estancias/",
      jornadas: "/api/maquinaria/jornadas/",
      capturas: "/api/maquinaria/capturas/",
      reconciliaciones: "/api/maquinaria/reconciliaciones/",
    },
  },
  azureBlobUrl: "https://sentinel.blob.core.windows.net",
};

// Log the configured URL
console.log("API URL from Expo config:", API_URL);
