import { StyleSheet } from "react-native";
import { DesignTokens } from "../../../styles/designTokens";

// Border colors per hierarchy depth — only gray tones; color is reserved for progress
export const DEPTH_BORDER_COLOR = ["#6B7280", "#9CA3AF", "#D1D5DB"] as const;
export const DEPTH_INDENT = [0, 12, 24] as const;

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  indicatorContainer: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingTop: DesignTokens.spacing.sm,
  },
  listContent: {
    paddingBottom: 80,
  },

  // ── Global card ────────────────────────────────────────────────────────────
  globalCard: {
    backgroundColor: DesignTokens.colors.executive.primary,
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 12,
    padding: 16,
  },
  globalCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  globalPct: {
    fontSize: 34,
    fontWeight: "500",
    color: "#E8F0FB",
    lineHeight: 38,
  },
  globalPctLabel: {
    fontSize: 12,
    color: "#6FA3D8",
    marginTop: 2,
  },
  globalBarBg: {
    backgroundColor: "#0D1E3A",
    borderRadius: 4,
    height: 7,
    marginTop: 10,
    overflow: "hidden",
  },
  globalBarFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3D8EF0",
  },
  globalMetas: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  globalMeta: {
    fontSize: 11,
    color: "#6FA3D8",
  },

  // ── Catalog selector ───────────────────────────────────────────────────────
  catalogSelector: {
    marginHorizontal: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  // Línea compacta de métricas del catálogo activo (ADR-003 D3): la zona
  // blanca es dominio exclusivo del catálogo
  catMetrics: {
    marginHorizontal: 12,
    marginBottom: 10,
  },
  catMetricsText: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
    fontVariant: ["tabular-nums"],
  },
  // El color lo inyecta el componente con colorPorcentaje(), igual que las
  // filas: aquí solo vive el peso. Antes traía un verde fijo que sobrevivió al
  // retiro del semáforo y dejaba la línea de catálogo contradiciendo al árbol.
  catMetricsPct: {
    fontWeight: "700",
  },
  // Mismo color que el relleno de la barra: el número y la barra son el mismo
  // plano de lectura. Antes era teal —que ataba el texto a su marca— pero junto
  // al verde de "Físico" se leían como dos verdes distintos sin razón aparente.
  catMetricsProg: {
    color: DesignTokens.colors.executive.light,
    fontWeight: "700",
  },
  // Sin negrita y en gris: es una ausencia que hay que declarar, no una cifra
  // que deba pesar lo mismo que las dos que la rodean.
  catMetricsSinPrograma: {
    color: DesignTokens.colors.neutral[400],
    fontStyle: "italic",
  },
  marcaProgramaCatalogo: {
    position: "absolute",
    top: 1, // catMetricsBarBg lleva marginTop 5; esto la deja 4px por encima
    marginLeft: -2,
    width: 4,
    height: 12,
    backgroundColor: "#0F766E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 2,
    zIndex: 2,
  },
  catMetricsBarBg: {
    position: "relative",
    height: 4,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginTop: 5,
    overflow: "hidden",
  },
  // backgroundColor lo inyecta el componente con colorBarra().
  catMetricsBarFill: {
    height: 4,
    borderRadius: 2,
  },
  catalogSelectorStatic: {
    paddingVertical: 6,
  },
  catalogSelectorTappable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  catalogName: {
    fontSize: 16,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[800],
    flex: 1,
  },
  constructionName: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
    marginTop: 1,
  },
  catalogChevron: {
    color: DesignTokens.colors.neutral[400],
  },

  // ── Mode toggle ────────────────────────────────────────────────────────────
  modeToggle: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: DesignTokens.colors.background.tertiary,
    borderRadius: 8,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 5,
  },
  modeBtnActive: {
    backgroundColor: DesignTokens.colors.background.primary,
  },
  modeBtnText: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[500],
  },
  modeBtnTextActive: {
    color: DesignTokens.colors.neutral[800],
    fontWeight: "500",
  },

  // ── Search input ───────────────────────────────────────────────────────────
  searchWrap: {
    marginHorizontal: 12,
    marginBottom: 8,
    position: "relative",
  },
  searchInput: {
    height: 38,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: DesignTokens.colors.neutral[300],
    backgroundColor: DesignTokens.colors.background.primary,
    color: DesignTokens.colors.neutral[800],
    paddingLeft: 36,
    paddingRight: 36,
    fontSize: 14,
  },
  resultsLabel: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
  },

  // ── Tree rows ──────────────────────────────────────────────────────────────
  treeRow: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  treeRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  treeRowHeaderIndented: {
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  rowNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: DesignTokens.colors.neutral[800],
    flexShrink: 1,
  },
  rowNameWorkItem: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowNameSection2: {
    fontSize: 13,
    fontWeight: "600",
  },
  rowNameSection3: {
    fontSize: 13,
    fontWeight: "400",
    color: DesignTokens.colors.neutral[600],
  },
  rowSub: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[400],
    marginTop: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    marginLeft: 8,
  },
  rowPct: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowMiniBar: {
    width: 36,
    height: 4,
    backgroundColor: DesignTokens.colors.neutral[200],
    borderRadius: 2,
    overflow: "hidden",
  },
  rowMiniBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // ── Concept rows ───────────────────────────────────────────────────────────
  conceptRow: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.background.primary,
    padding: 10,
  },
  conceptTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  conceptWbs: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[400],
  },
  conceptPctWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // Marca del programado sobre la barra de la fila. Teal = plano contractual.
  // Contenedor de la barra: la marca se posiciona AQUÍ, no dentro de la barra,
  // porque ésta recorta (overflow hidden) para el radio del relleno.
  barWrap: {
    position: "relative",
    justifyContent: "center",
  },
  // Teal oscuro con halo blanco: tiene que leerse tanto sobre la pista gris
  // como sobre el relleno slate o el ámbar de sobre-ejecución, sin ensanchar
  // la barra.
  marcaProgramaFila: {
    position: "absolute",
    top: -4,
    marginLeft: -2,
    width: 4,
    height: 12,
    backgroundColor: "#0F766E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 2,
    zIndex: 2,
  },

  // Aviso de sobre-ejecución. Sin fondo ni caja: en una sábana de cientos de
  // filas, un bloque de color por fila afectada competiría con la información
  // que la sábana existe para mostrar. El ámbar del texto basta, porque tras
  // retirar el semáforo es el único ámbar que puede aparecer en la fila.
  avisoSobre: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  avisoSobreIcono: {
    color: "#B45309",
    marginRight: 4,
  },
  avisoSobreTexto: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B45309",
  },

  conceptPct: {
    fontSize: 13,
    fontWeight: "600",
  },
  conceptDesc: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[700],
    lineHeight: 16,
    marginBottom: 5,
  },
  conceptNums: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 5,
  },
  conceptNum: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[500],
  },
  conceptNumValue: {
    color: DesignTokens.colors.neutral[800],
    fontWeight: "500",
  },
  conceptBarBg: {
    position: "relative",
    height: 4,
    backgroundColor: DesignTokens.colors.neutral[200],
    borderRadius: 2,
    overflow: "hidden",
  },
  conceptBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // ── Search results ─────────────────────────────────────────────────────────
  searchResult: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.background.primary,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: DesignTokens.colors.neutral[200],
  },
  crumbs: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 3,
    marginBottom: 5,
  },
  crumbBadge: {
    fontSize: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 4,
    fontWeight: "500",
    overflow: "hidden",
  },
  crumbSep: {
    fontSize: 9,
    color: DesignTokens.colors.neutral[400],
  },
  searchResultWbs: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[400],
    marginBottom: 2,
  },
  searchResultDesc: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[700],
    lineHeight: 18,
    marginBottom: 6,
  },
  searchResultMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultNums: {
    flexDirection: "row",
    gap: 10,
  },
  searchResultNum: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[500],
  },
  searchResultNumValue: {
    color: DesignTokens.colors.neutral[800],
    fontWeight: "500",
  },
  searchResultPct: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // ── Empty / loading ────────────────────────────────────────────────────────
  emptyState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[400],
    textAlign: "center",
  },

  // ── Bottom sheet picker ────────────────────────────────────────────────────
  sheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  sheetItemActive: {
    backgroundColor: DesignTokens.colors.primary[50],
  },
  sheetItemName: {
    fontSize: 15,
    color: DesignTokens.colors.neutral[800],
  },
  sheetItemNameActive: {
    color: DesignTokens.colors.primary[600],
    fontWeight: "600",
  },
  sheetItemSub: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[400],
    marginTop: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[800],
    padding: 20,
    paddingBottom: 8,
  },
});
