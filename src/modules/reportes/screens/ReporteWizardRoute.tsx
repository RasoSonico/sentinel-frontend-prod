import React, { useCallback } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";

import type { ReportesStackParamList } from "src/navigation/types";

import { ReporteWizardScreen } from "./ReporteWizardScreen";

/**
 * Adaptador entre la ruta y el wizard.
 *
 * El wizard recibe callbacks y no conoce la navegación: así se puede montar en
 * un test o en otra superficie sin arrastrar un navigator. Este archivo es lo
 * único que sabe de rutas.
 */

type Ruta = RouteProp<ReportesStackParamList, "ReporteWizard">;
type Navegacion = StackNavigationProp<ReportesStackParamList, "ReporteWizard">;

export default function ReporteWizardRoute() {
  const { params } = useRoute<Ruta>();
  const navigation = useNavigation<Navegacion>();

  const salir = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Tras guardar se REEMPLAZA la ruta en vez de apilar el detalle encima: si
   * el wizard siguiera en la pila, el "atrás" del sistema devolvería al usuario
   * a un borrador que ya se envió.
   */
  const irAMisReportes = useCallback(
    (localId: string) => {
      navigation.replace("ReporteDetalle", {
        localId,
        constructionName: params.constructionName,
        fechaReporte: new Date().toISOString().slice(0, 10),
        esAutor: true,
      });
    },
    [navigation, params.constructionName],
  );

  /**
   * "Generar Excel" del modal de resultado.
   *
   * Lleva al detalle, que es donde viven los botones de generación — y para
   * entonces el worker ya tiene el `reporteId` real. Ofrecer la descarga aquí
   * mismo obligaría a esperar al POST dentro de un modal, con el usuario
   * mirando un spinner sin saber qué pasa.
   */
  const generarExcel = useCallback(
    (localId: string) => irAMisReportes(localId),
    [irAMisReportes],
  );

  return (
    <ReporteWizardScreen
      constructionId={params.constructionId}
      constructionName={params.constructionName}
      onSalir={salir}
      onIrAMisReportes={irAMisReportes}
      onGenerarExcel={generarExcel}
    />
  );
}
