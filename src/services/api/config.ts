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
    },
    photos: {
      confirmUpload: "/api/avance/photos/confirm-upload/",
      bulkUpload: "/api/avance/photos/bulk-upload/",
      upload: "/api/avance/photos/upload/",
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
    reportes: {
      physicalAdvance: "/api/reportes/physical-advance/",
    },
    maquinaria: {
      hub: "/api/maquinaria/hub-diario/",
      tipos: "/api/maquinaria/tipos/",
      maquinarias: "/api/maquinaria/maquinarias/",
      estancias: "/api/maquinaria/estancias/",
      jornadas: "/api/maquinaria/jornadas/",
      jornadaTransitoria: "/api/maquinaria/jornadas/transitoria/",
      reconciliaciones: "/api/maquinaria/reconciliaciones/",
    },
  },
  azureBlobUrl: "https://sentinel.blob.core.windows.net",
};

// Log the configured URL
console.log("API URL from Expo config:", API_URL);
