import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  programaVencido,
  proximoCorte,
  rendimientoRequerido,
  BANDA_MUERTA,
  EstadoPrograma,
} from "src/hooks/data/query/useAvance/utils/programaCalculos";
import { DatosPrograma } from "src/hooks/data/query/useAvance/utils/sabanaTreeBuilder";
import { fechaConDia, fechaLarga } from "../utils/fechaPrograma";
import styles from "./styles/RecuadroPrograma.styles";

interface Props {
  programa: DatosPrograma;
  /** Volumen ejecutado acumulado, en la unidad del concepto. */
  ejecutado: number;
  unidad: string;
  /**
   * El acumulado rebasó lo CONTRATADO. Igual que en el chip, llega desde fuera:
   * es un hecho del contrato y `DatosPrograma` no conoce la cantidad contratada.
   */
  sobreEjecutado?: boolean;
  /** Fecha operativa `YYYY-MM-DD`; la misma con la que se construyó el árbol. */
  hoy: string;
}

const num = (valor: number, decimales = 1) =>
  valor.toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

/**
 * Las tres capas de la ficha del concepto (ADR-004 enmienda E3).
 *
 * La jerarquía no es decorativa, es el diagnóstico:
 *
 *   (a) Estado de HOY — protagonista. Responde la pregunta que el cliente hace
 *       cualquier día del ciclo, no solo el día del corte.
 *   (b) Meta del próximo corte — la cifra contractualmente exigible, firme.
 *   (c) Rendimiento requerido vs programado — la capa PREVENTIVA: cuando el
 *       requerido se despega del programado, la alerta llega semanas antes de
 *       que el corte lo confirme.
 *
 * La fila de la sábana lleva solo (a); el diagnóstico completo vive aquí.
 *
 * D11 aplicado hacia adentro: (b) y (c) no siempre existen —un concepto en su
 * último tramo no tiene próximo corte; un tramo interrumpido no tiene
 * rendimiento programado que comparar— y cuando faltan **no se renderizan**.
 * No se dibuja una tarjeta con "—" ni con 0: una meta de 0 se leería como
 * "no hay nada que hacer", que es lo contrario de "no hay dato".
 */
const RecuadroPrograma: React.FC<Props> = ({
  programa,
  ejecutado,
  unidad,
  sobreEjecutado = false,
  hoy,
}) => {
  const { corte, rendimiento, vencido, desviacion } = useMemo(() => {
    const siguiente = proximoCorte(programa.fila, hoy);
    return {
      corte: siguiente,
      rendimiento: rendimientoRequerido(programa.fila, ejecutado, hoy),
      vencido: programaVencido(programa.fila, ejecutado, hoy),
      desviacion: ejecutado - programa.programado,
    };
  }, [programa, ejecutado, hoy]);

  // La sobre-ejecución se COME los estados positivos (misma regla que el chip):
  // decirle "vas adelantado" a quien se pasó de lo contratado es decirle que va
  // bien, y no va bien. `ATRASADO` sobrevive porque no transmite eso y porque
  // mide otra vara: se puede deber contra programa y sobrar contra contrato a
  // la vez, sobre todo tras una reprogramación.
  const mandaSobreEjecucion = sobreEjecutado && programa.estado !== "ATRASADO";

  // "Aún no arranca" solo manda la caja cuando NO hay nada que reportar. Si ya
  // hay volumen capturado, el adelanto es la noticia y el arranque pasa a ser
  // el detalle.
  const mandaNoIniciado =
    programa.noIniciado && programa.estado !== "ADELANTADO";

  const tono = mandaSobreEjecucion
    ? TONO_SOBRE_EJECUTADO
    : mandaNoIniciado
      ? TONO_NO_INICIADO
      : TONOS[programa.estado];

  // El faltante contra el corte puede ser negativo (ya se rebasó la meta):
  // decirlo es información real, no un error que haya que ocultar.
  const faltanteCorte = corte ? corte.volumen_acumulado - ejecutado : 0;

  // La comparación de rendimientos usa la MISMA banda muerta que el estado: un
  // exceso de medio punto porcentual no es una alerta, es ruido de redondeo.
  const rendimientoEnAlerta =
    rendimiento != null &&
    rendimiento.requerido > rendimiento.programado * (1 + BANDA_MUERTA);

  return (
    <>
      {/* ── (a) Estado de hoy ─────────────────────────────────────────────── */}
      <View style={[styles.hoy, tono.caja]}>
        <Text style={[styles.hoyEtiqueta, tono.etiqueta]}>
          HOY · {fechaLarga(hoy).toUpperCase()}
        </Text>
        {/* Sin signo: la palabra ya dice la dirección. Un "−34.5 de atraso"
            hace leer dos veces —el menos y el atraso apuntan a lo mismo— y en
            valor absoluto la cifra se compara de un golpe con el faltante que
            aparece abajo, que también es absoluto. */}
        <Text style={[styles.hoyTitular, tono.titular]}>
          {mandaSobreEjecucion
            ? "Regularizar volumen"
            : mandaNoIniciado
              ? `Inicia el ${fechaLarga(programa.fechaInicio)}`
              : programa.estado === "ATRASADO"
                ? `${num(Math.abs(desviacion))} ${unidad} de atraso`
                : programa.estado === "ADELANTADO"
                  ? `${num(desviacion)} ${unidad} de adelanto`
                  : "Al día con el programa"}
        </Text>

        {/* Vocabulario canónico de D14 para la ficha (donde sí cabe completo).
            Cuando el programa aún no arranca se omite: un "programado 0.0" se
            leería como una exigencia cumplida, cuando lo cierto es que todavía
            no hay exigencia. */}
        {mandaSobreEjecucion ? (
          <Text style={[styles.hoyDetalle, tono.detalle]}>
            El acumulado rebasó lo contratado.
          </Text>
        ) : mandaNoIniciado ? null : (
          <Text style={[styles.hoyDetalle, tono.detalle]}>
            programado {num(programa.programado)} · ejecutado {num(ejecutado)}{" "}
            {unidad}
            {/* El adelanto sobre un programa que aún no arranca necesita decir
                contra qué se adelantó, o el "0.0 programado" no se entiende. */}
            {programa.noIniciado
              ? ` · el programa inicia el ${fechaLarga(programa.fechaInicio)}`
              : ""}
          </Text>
        )}
      </View>

      {/* ── Programa vencido — el CTA que llenaba el hueco ─────────────────
          Pasada la fecha fin no hay próximo corte ni tramo vigente, así que las
          dos tarjetas desaparecen. Correcto: esas metas ya no existen. Pero el
          silencio no lo era — aquí hay un dato accionable y es el más urgente
          de la ficha. Ámbar, no rojo: el rojo ya está gritando arriba el
          atraso, y esto es la salida, no la condena. */}
      {vencido && (
        <View style={styles.vencido}>
          {/* Triángulo, no círculo: la FORMA es lo que se lee como alerta —un
              círculo dice "información" sin importar el glifo que lleve dentro—
              y es el mismo ícono con que la captura rápida marca la
              sobre-ejecución, para que ambos avisos se lean como familia. */}
          <Ionicons
            name="warning-outline"
            size={18}
            style={styles.vencidoIcono}
          />
          <View style={styles.vencidoCuerpo}>
            <Text style={styles.vencidoTitulo}>Programa vencido</Text>
            {/* Una sola salida, y es la contractual. Este recuadro vive en el
                plano del CONTRATO (D8/D14): pasada la fecha fin, capturar
                avance ya no regulariza nada —actualiza el número, no la
                obligación vencida—. Y la captura ya está ofrecida por el CTA
                de abajo, así que repetirla aquí solo diluiría la única acción
                que sí cierra el hueco. */}
            <Text style={styles.vencidoTexto}>
              La programación cerró el {fechaLarga(vencido.fechaFin)} y quedan{" "}
              <Text style={styles.vencidoFuerte}>
                {num(vencido.faltante)} {unidad}
              </Text>{" "}
              por ejecutar. Solicita una reprogramación.
            </Text>
          </View>
        </View>
      )}

      {(corte || rendimiento) && (
        <View style={styles.fila}>
          {/* ── (b) Meta del próximo corte ─────────────────────────────────── */}
          {corte && (
            <View style={[styles.tarjeta, styles.tarjetaCorte]}>
              {/* Con día de la semana: el corte de la obra cae siempre en el
                  mismo día, así que verlo confirma que la fecha pertenece al
                  ciclo y no obliga a ir al calendario. */}
              <Text style={styles.tarjetaEtiqueta}>
                AL CORTE {fechaConDia(corte.fecha_corte).toUpperCase()}
              </Text>
              <Text style={styles.tarjetaValor}>
                {num(corte.volumen_acumulado)} {unidad}
              </Text>
              <Text style={styles.tarjetaPie}>
                {faltanteCorte > 0
                  ? `faltan ${num(faltanteCorte)}`
                  : "meta alcanzada"}
              </Text>
            </View>
          )}

          {/* ── (c) Rendimiento requerido ──────────────────────────────────── */}
          {rendimiento && (
            <View
              style={[
                styles.tarjeta,
                rendimientoEnAlerta
                  ? styles.tarjetaAlerta
                  : styles.tarjetaCorte,
              ]}
            >
              <Text
                style={[
                  styles.tarjetaEtiqueta,
                  rendimientoEnAlerta ? styles.textoAlerta : null,
                ]}
              >
                RENDIMIENTO REQ.
              </Text>
              <Text
                style={[
                  styles.tarjetaValor,
                  rendimientoEnAlerta ? styles.textoAlerta : null,
                ]}
              >
                {num(rendimiento.requerido)} {unidad}/día
              </Text>
              <Text
                style={[
                  styles.tarjetaPie,
                  rendimientoEnAlerta ? styles.textoAlertaSuave : null,
                ]}
              >
                vs {num(rendimiento.programado)} {unidad}/día de programa
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  );
};

/**
 * Un tono por estado. Se define fuera del componente para que los objetos de
 * estilo sean estables entre renders.
 *
 * El teal de AL_DIA no es decorativo: es el color del plano contractual en todo
 * el sistema (D8/D14 — teal + líneas = contrato; morado + barras = producción).
 */
const TONOS: Record<
  EstadoPrograma,
  {
    caja: object;
    etiqueta: object;
    titular: object;
    detalle: object;
  }
> = {
  ATRASADO: {
    caja: styles.cajaAtrasado,
    etiqueta: styles.etiquetaAtrasado,
    titular: styles.titularAtrasado,
    detalle: styles.detalleAtrasado,
  },
  ADELANTADO: {
    caja: styles.cajaAdelantado,
    etiqueta: styles.etiquetaAdelantado,
    titular: styles.titularAdelantado,
    detalle: styles.detalleAdelantado,
  },
  AL_DIA: {
    caja: styles.cajaAlDia,
    etiqueta: styles.etiquetaAlDia,
    titular: styles.titularAlDia,
    detalle: styles.detalleAlDia,
  },
};

/** Fuera del mapa por estado: `noIniciado` es ortogonal al estado, no un valor suyo. */
const TONO_NO_INICIADO = {
  caja: styles.cajaNoIniciado,
  etiqueta: styles.etiquetaNoIniciado,
  titular: styles.titularNoIniciado,
  detalle: styles.detalleNoIniciado,
};

/** Ámbar: mismo tono que el chip y que el aviso de la fila. */
const TONO_SOBRE_EJECUTADO = {
  caja: styles.cajaSobre,
  etiqueta: styles.etiquetaSobre,
  titular: styles.titularSobre,
  detalle: styles.detalleSobre,
};

export default React.memo(RecuadroPrograma);
