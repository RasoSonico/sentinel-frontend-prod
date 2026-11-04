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
   * Tras guardar, el destino es **la lista de la obra**, no el detalle.
   *
   * El wizard es una ruta modal de este mismo stack y `ReportSelection` es su
   * raíz: la lista ya está montada debajo, así que esto no apila nada —vuelve
   * a ella y le deja el id del recién guardado—. El wizard sale de la pila,
   * que es lo que impide que el "atrás" del sistema devuelva al usuario a un
   * borrador ya enviado.
   *
   * Antes esto reemplazaba la ruta por el detalle del reporte identificado por
   * su id LOCAL, y el botón que decía "Ir a mis reportes" no llevaba a la
   * lista. Cuando el worker purgaba la copia local, ese id dejaba de resolver
   * y la pantalla se quedaba muerta.
   */
  const irAMisReportes = useCallback(
    (localId: string) => {
      navigation.navigate("ReportSelection", { recienGuardado: localId });
    },
    [navigation],
  );

  return (
    <ReporteWizardScreen
      constructionId={params.constructionId}
      constructionName={params.constructionName}
      borradorId={params.borradorId}
      onSalir={salir}
      onGuardado={irAMisReportes}
    />
  );
}
