import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export function getTabBarIconName(
  routeName: string,
  focused: boolean,
): IoniconName {
  switch (routeName) {
    case "Home":
      // Home = Sábana (grilla de avance) desde ADR-003 Fase 1
      return focused ? "grid" : "grid-outline";
    case "Obras":
      return focused ? "business" : "business-outline";
    case "Catalogos":
      return focused ? "list" : "list-outline";
    case "Reportes":
      return focused ? "document-text" : "document-text-outline";
    case "Perfil":
      return focused ? "person" : "person-outline";
    case "Cola":
      return focused ? "cloud-upload" : "cloud-upload-outline";
    case "Maquinaria":
      return focused ? "construct" : "construct-outline";
    default:
      return "ellipse-outline";
  }
}
