//Tipos para los parámetros de navegación
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { NavigatorScreenParams } from "@react-navigation/native";
import { Incident } from "../types/incidencia";
import { DateFilter } from "../components/ui/filters/DateRangeFilter";

// Parámetros para la navegación de autenticación
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Parámetros para la navegación principal
// (ADR-003 Fase 1: tabs CONTRATISTA = Sábana (Home) · Reportes · Maquinaria ·
// Perfil; las tabs Avances e Incidencias desaparecen — sus pantallas viven en
// el stack de Sábana)
export type AppTabParamList = {
  Home: NavigatorScreenParams<SabanaStackParamList> | undefined;
  Obras: undefined;
  Catalogos: undefined;
  Cronogramas: undefined;
  Reportes: NavigatorScreenParams<ReportesStackParamList> | undefined;
  Maquinaria: undefined;
  Perfil: undefined;
  Dashboard: undefined;
  Aprobacion: undefined;
  Estatus: undefined;
  Problematicas: undefined;
  Financiero: undefined;
};

// Parámetros para el navegador de Obras
export type ObraStackParamList = {
  ObrasList: undefined;
  ObraDetail: { obraId: string; title: string };
  ObraCreate: undefined;
  ObraEdit: { obraId: string };
};

// Parámetros para el navegador de Catálogos
export type CatalogoStackParamList = {
  CatalogosList: undefined;
  CatalogoDetail: { catalogoId: string; title: string };
  CatalogoCreate: undefined;
  CatalogoEdit: { catalogoId: string };
  ConceptosList: { catalogoId: string; title: string };
  ConceptoDetail: { conceptoId: string; title: string };
  ConceptoCreate: { catalogoId: string };
  ConceptoEdit: { conceptoId: string };
};

// Parámetros para el navegador de Cronogramas
export type CronogramaStackParamList = {
  CronogramasList: undefined;
  CronogramaDetail: { cronogramaId: string; title: string };
  CronogramaCreate: undefined;
  CronogramaEdit: { cronogramaId: string };
  ActividadesList: { cronogramaId: string; title: string };
  ActividadDetail: { actividadId: string; title: string };
  ActividadCreate: { cronogramaId: string };
  ActividadEdit: { actividadId: string };
  GanttView: { cronogramaId: string; title: string };
};

// Parámetros para el navegador de Maquinaria
export type MaquinariaStackParamList = {
  HubDiario: undefined;
  AltaNuevaMaquinaria: { constructionId: number };
  ReactivarMaquinaria: { constructionId: number };
};

// Parámetros para el navegador de Sábana (home del CONTRATISTA, ADR-003).
// Absorbe el historial de avances, el registro, la cola de sync y las
// pantallas de incidencias (la tab Incidencias dejó de existir).
export type SabanaStackParamList = {
  SabanaHome: undefined;
  AvancesList:
    | { initialFilter?: DateFilter; openAdvanceId?: number }
    | undefined;
  AvanceRegistration: { constructionId: string; constructionName: string };
  PendingSync: undefined;
  IncidentsList: { initialFilter?: DateFilter } | undefined;
  IncidentRegistration: undefined;
  IncidentDetail: { incident: Incident };
};

// Parámetros para el navegador de Reportes (tab de primer nivel, ADR-003)
export type ReportesStackParamList = {
  ReportSelection: undefined;
  AdvanceReport: {
    constructionId: string;
    constructionName: string;
    /** Fecha local YYYY-MM-DD para inicializar el rango (Reporte del día) */
    dateFrom?: string;
    dateTo?: string;
  };
};

// Tipos para props de navegación específicas
export type AvanceListScreenNavigationProp = StackNavigationProp<
  SabanaStackParamList,
  "AvancesList"
>;

export type AdvanceRegistrationScreenNavigationProp = StackNavigationProp<
  SabanaStackParamList,
  "AvanceRegistration"
>;

// Tipos para props de navegación específicas de Incidencias
export type IncidentListScreenNavigationProp = StackNavigationProp<
  SabanaStackParamList,
  "IncidentsList"
>;

export type IncidentRegistrationScreenNavigationProp = StackNavigationProp<
  SabanaStackParamList,
  "IncidentRegistration"
>;

export type IncidentDetailScreenNavigationProp = StackNavigationProp<
  SabanaStackParamList,
  "IncidentDetail"
>;

// Tipo para la ruta raíz que decide entre Auth y App
export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

// Tipos para el uso de la navegación en componentes
export type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;
export type AppNavigationProp = StackNavigationProp<AppTabParamList>;
export type ObraNavigationProp = StackNavigationProp<ObraStackParamList>;
export type CatalogoNavigationProp =
  StackNavigationProp<CatalogoStackParamList>;
export type CronogramaNavigationProp =
  StackNavigationProp<CronogramaStackParamList>;
export type ReportesNavigationProp =
  StackNavigationProp<ReportesStackParamList>;
export type RootNavigationProp = StackNavigationProp<RootStackParamList>;

// Tipos para las propiedades de ruta
export type ObraRouteProps = RouteProp<
  ObraStackParamList,
  keyof ObraStackParamList
>;
export type CatalogoRouteProps = RouteProp<
  CatalogoStackParamList,
  keyof CatalogoStackParamList
>;
export type CronogramaRouteProps = RouteProp<
  CronogramaStackParamList,
  keyof CronogramaStackParamList
>;
export type ReportesRouteProps = RouteProp<
  ReportesStackParamList,
  keyof ReportesStackParamList
>;

export type MaquinariaNavigationProp =
  StackNavigationProp<MaquinariaStackParamList>;

export type MaquinariaRouteProps = RouteProp<
  MaquinariaStackParamList,
  keyof MaquinariaStackParamList
>;

export type SabanaNavigationProp = StackNavigationProp<SabanaStackParamList>;

export type SabanaRouteProps = RouteProp<
  SabanaStackParamList,
  keyof SabanaStackParamList
>;
