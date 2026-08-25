import { StyleSheet } from "react-native";
import { DesignTokens } from "src/styles/designTokens";
import { fs, lh, sp } from "src/styles/escala";

// Captura rápida (L-03, ADR-004 D13.2). Reparto deliberado de color:
// "restan N" en slate informativo, y el ÁMBAR reservado exclusivamente a la
// alerta de sobre-ejecución. Si ambos compitieran, la señal que importa
// perdería fuerza.
export default StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  contenido: {
    paddingHorizontal: sp(DesignTokens.spacing.lg),
    paddingBottom: sp(40),
  },

  cejilla: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: DesignTokens.colors.neutral[500],
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    marginBottom: sp(4),
  },
  // Mismo cuerpo que la ficha a propósito: las dos láminas muestran el mismo
  // bloque de concepto y deben leerse igual. Si mueves uno, mueve el otro.
  descripcion: {
    fontSize: fs(12),
    lineHeight: lh(fs(12)),
    color: DesignTokens.colors.neutral[900],
    marginBottom: sp(8),
  },
  filaContexto: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp(DesignTokens.spacing.lg),
  },
  contextoNumeros: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[600],
  },
  restante: {
    fontSize: 14,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.executive.secondary,
  },

  etiquetaCampo: {
    fontSize: 12,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[600],
    marginBottom: sp(6),
    marginTop: sp(DesignTokens.spacing.md),
  },

  filaCantidad: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 26,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: 10,
    paddingHorizontal: sp(14),
    paddingVertical: sp(10),
    backgroundColor: DesignTokens.colors.background.primary,
  },
  chipUnidad: {
    marginLeft: sp(10),
    paddingHorizontal: sp(12),
    paddingVertical: sp(8),
    borderRadius: 999,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  chipUnidadTexto: {
    fontSize: 14,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
  },

  previa: {
    marginTop: sp(8),
    fontSize: 13,
    color: DesignTokens.colors.neutral[600],
  },
  previaFuerte: {
    fontWeight: DesignTokens.typography.fontWeight.bold,
    color: DesignTokens.colors.neutral[900],
  },

  // Teal, nunca ámbar: esta línea INFORMA contra el programa, y el ámbar está
  // reservado a la alerta de sobre-ejecución del contrato, unos píxeles más
  // abajo. Si las dos gritaran, ninguna se leería.
  vsPrograma: {
    marginTop: sp(3),
    fontSize: 12.5,
    color: "#0F766E",
  },
  vsProgramaFuerte: {
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: "#115E59",
  },

  alerta: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: sp(10),
    padding: sp(12),
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.warning[50],
    borderWidth: 1,
    borderColor: DesignTokens.colors.warning[200],
  },
  alertaIcono: {
    color: DesignTokens.colors.warning[600],
    marginRight: 8,
    marginTop: 1,
  },
  alertaTexto: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: DesignTokens.colors.warning[800],
  },

  filaFotos: {
    flexDirection: "row",
    alignItems: "center",
  },
  botonFoto: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: sp(14),
    paddingVertical: sp(10),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    marginRight: sp(10),
  },
  botonFotoIcono: {
    color: DesignTokens.colors.neutral[700],
    marginRight: 6,
  },
  botonFotoTexto: {
    fontSize: 14,
    color: DesignTokens.colors.neutral[700],
  },
  // Miniaturas de la evidencia. `flexWrap` porque el pipeline no impone tope de
  // fotos: con cinco o más la fila debe bajar de renglón, no comprimirlas.
  filaMiniaturas: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: sp(10),
  },
  miniaturaWrap: {
    marginRight: sp(8),
    marginBottom: sp(8),
  },
  miniatura: {
    width: sp(64),
    height: sp(64),
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  // La "x" monta sobre la esquina de la miniatura, fuera del área de la imagen:
  // dentro competiría con la foto, que es justamente lo que se vino a mirar.
  quitarMiniatura: {
    position: "absolute",
    top: -6,
    right: -6,
  },
  quitarMiniaturaIcono: {
    color: DesignTokens.colors.neutral[600],
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },

  inputNotas: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: sp(12),
    paddingVertical: sp(10),
    fontSize: 14,
    minHeight: sp(56),
    textAlignVertical: "top",
    color: DesignTokens.colors.neutral[900],
    backgroundColor: DesignTokens.colors.background.primary,
  },

  avisoOffline: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: sp(DesignTokens.spacing.md),
    padding: sp(10),
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  avisoIcono: {
    color: DesignTokens.colors.neutral[600],
    marginRight: 6,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 12,
    color: DesignTokens.colors.neutral[600],
  },

  cta: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.primary[600],
    borderRadius: 10,
    paddingVertical: sp(15),
    marginTop: sp(DesignTokens.spacing.lg),
  },
  ctaConfirmar: {
    backgroundColor: DesignTokens.colors.warning[600],
  },
  ctaDeshabilitado: {
    backgroundColor: DesignTokens.colors.neutral[300],
  },
  ctaTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
  },
});
