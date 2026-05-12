//Tipos para los parámetros de navegación
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { NavigatorScreenParams } from "@react-navigation/native";
import { Incident } from "../types/incidencia";

// Parámetros para la navegación de autenticación
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Parámetros para la navegación principal
export type AppTabParamList = {
  Home: undefined;
  Obras: undefined;
  Catalogos: undefined;
  Cronogramas: undefined;
  Avances: undefined;
  Incidencias: undefined;
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

// Parámetros para el navegador de Avances
export type AvanceStackParamList = {
  AvancesList: undefined;
  AvanceRegistration: { constructionId: string; constructionName: string };
  AvanceDetail: { avanceId: string; title: string };
  AvanceCreate: undefined;
  AvanceEdit: { avanceId: string };
  EstimacionesList: undefined;
  EstimacionDetail: { estimacionId: string; title: string };
  EstimacionCreate: undefined;
  EstimacionEdit: { estimacionId: string };
  Dashboard: undefined;
  ReportSelection: undefined;
  AdvanceReport: { constructionId: string; constructionName: string };
  PendingSync: undefined;
};

// Parámetros para el navegador de Incidencias
export type IncidenciaStackParamList = {
  IncidentsList: undefined;
  IncidentRegistration: undefined;
  IncidentDetail: { incident: Incident };
};

// Tipos para props de navegación específicas
export type AvanceListScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvancesList"
>;

export type AdvanceRegistrationScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvanceRegistration"
>;

export type AdvanceDetailScreenNavigationProp = StackNavigationProp<
  AvanceStackParamList,
  "AvanceDetail"
>;

// Tipos para props de navegación específicas de Incidencias
export type IncidentListScreenNavigationProp = StackNavigationProp<
  IncidenciaStackParamList,
  "IncidentsList"
>;

export type IncidentRegistrationScreenNavigationProp = StackNavigationProp<
  IncidenciaStackParamList,
  "IncidentRegistration"
>;

export type IncidentDetailScreenNavigationProp = StackNavigationProp<
  IncidenciaStackParamList,
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
export type AvanceNavigationProp = StackNavigationProp<AvanceStackParamList>;
export type IncidenciaNavigationProp =
  StackNavigationProp<IncidenciaStackParamList>;
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
export type AvanceRouteProps = RouteProp<
  AvanceStackParamList,
  keyof AvanceStackParamList
>;
export type IncidenciaRouteProps = RouteProp<
  IncidenciaStackParamList,
  keyof IncidenciaStackParamList
>;
