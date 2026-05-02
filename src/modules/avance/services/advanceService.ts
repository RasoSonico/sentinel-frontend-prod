import { BaseService } from "../../../services/api/baseService";
import apiClient, { apiRequest } from "../../../services/api/apiClient";
import {
  AdvanceRegistration,
  Concept,
  PhysicalAdvance,
  PhysicalAdvanceSummary,
  PhysicalAdvanceResponse,
} from "../../../types/entities";

/**
 * Servicio para gestión de avances físicos
 */
class AdvanceService extends BaseService<PhysicalAdvance> {
  constructor() {
    super("avance/physical/");
  }

  /**
   * Obtener conceptos disponibles para registrar avance
   * @param constructionId ID de la obra
   * @param params Parámetros adicionales de filtrado
   * @returns Lista de conceptos disponibles
   */
  async getAvailableConcepts(
    constructionId: string,
    params?: {
      workItemId?: string;
      query?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    concepts: Concept[];
    total: number;
    pages: number;
  }> {
    try {
      const queryParams = new URLSearchParams({
        construction_id: constructionId,
        page: (params?.page || 1).toString(),
        page_size: (params?.pageSize || 50).toString(),
      });

      if (params?.workItemId)
        queryParams.append("work_item_id", params.workItemId);
      if (params?.query) queryParams.append("search", params.query);

      const response = await apiRequest<{
        results: Concept[];
        count: number;
        total_pages: number;
      }>(
        "get",
        `/catalogo/concept/available-for-advance/?${queryParams.toString()}`,
        "Error al obtener conceptos disponibles"
      );

      return {
        concepts: response.results,
        total: response.count,
        pages: response.total_pages,
      };
    } catch (error) {
      console.error("Error al obtener conceptos disponibles:", error);
      throw error;
    }
  }

  /**
   * Registrar un avance físico
   * @param advance Datos del avance a registrar
   * @returns Avance registrado
   */
  async registerAdvance(
    advance: AdvanceRegistration
  ): Promise<PhysicalAdvance> {
    try {
      const response = await apiRequest<PhysicalAdvance>(
        "post",
        "/avance/physical/",
        "Error al registrar avance",
        advance
      );
      return response;
    } catch (error) {
      console.error("Error al registrar avance:", error);
      throw error;
    }
  }

  /**
   * Obtener avances registrados para un catálogo
   * @param catalogId ID del catálogo
   * @param params Parámetros adicionales
   * @returns Lista de avances
   */
  async getAdvancesByCatalog(
    catalogId: number,
    params?: {
      conceptId?: string;
      startDate?: string;
      endDate?: string;
      status?: "PENDING" | "APPROVED" | "REJECTED";
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    advances: PhysicalAdvanceResponse[];
    total: number;
    pages: number;
  }> {
    try {
      const queryParams = new URLSearchParams({
        catalog: catalogId.toString(),
        page: (params?.page || 1).toString(),
        page_size: (params?.pageSize || 50).toString(),
      });

      if (params?.conceptId) queryParams.append("concept", params.conceptId);
      if (params?.startDate) queryParams.append("start_date", params.startDate);
      if (params?.endDate) queryParams.append("end_date", params.endDate);
      if (params?.status) queryParams.append("status", params.status);

      const endpoint = `/api/avance/physical/?${queryParams.toString()}`;
      console.log("🔍 Requesting advances by catalog:", endpoint);

      const response = await apiRequest<{
        results: PhysicalAdvanceResponse[];
        count: number;
        next: string | null;
        previous: string | null;
      }>("get", endpoint, "Error al obtener avances por catálogo");

      console.log("📦 Advances response:", {
        count: response.count,
        resultsLength: response.results.length,
        advances: response.results,
      });

      return {
        advances: response.results,
        total: response.count,
        pages: Math.ceil(response.count / (params?.pageSize || 50)),
      };
    } catch (error) {
      console.error("❌ Error al obtener avances por catálogo:", error);
      throw error;
    }
  }

  /**
   * Calcular resumen de avances localmente a partir de la lista
   * @param advances Lista de avances
   * @returns Resumen calculado
   */
  calculateAdvanceSummary(
    advances: PhysicalAdvanceResponse[]
  ): Partial<PhysicalAdvanceSummary> {
    const summary = {
      total_advances: advances.length,
      pending_advances: advances.filter((a) => a.status === "PENDING").length,
      approved_advances: advances.filter((a) => a.status === "APPROVED").length,
      rejected_advances: advances.filter((a) => a.status === "REJECTED").length,
    };

    console.log("📊 Calculated summary:", summary);
    return summary;
  }

  /**
   * Aprobar un avance físico
   * @param advanceId ID del avance
   * @param comments Comentarios opcionales
   * @returns Avance actualizado
   */
  async approveAdvance(
    advanceId: string,
    comments?: string
  ): Promise<PhysicalAdvance> {
    try {
      const response = await apiClient.post(
        `/avance/physical/${advanceId}/approve/`,
        {
          comments,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error al aprobar avance ${advanceId}:`, error);
      throw error;
    }
  }

  /**
   * Rechazar un avance físico
   * @param advanceId ID del avance
   * @param reason Motivo del rechazo
   * @returns Avance actualizado
   */
  async rejectAdvance(
    advanceId: string,
    reason: string
  ): Promise<PhysicalAdvance> {
    try {
      const response = await apiClient.post(
        `/avance/physical/${advanceId}/reject/`,
        {
          reason,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error al rechazar avance ${advanceId}:`, error);
      throw error;
    }
  }

  /**
   * Verificar si un concepto tiene avances pendientes
   * @param conceptId ID del concepto
   * @returns true si tiene avances pendientes
   */
  async hasPendingAdvances(conceptId: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/avance/physical/check-pending/`, {
        params: { concept_id: conceptId },
      });
      return response.data.has_pending;
    } catch (error) {
      console.error(
        `Error al verificar avances pendientes para concepto ${conceptId}:`,
        error
      );
      throw error;
    }
  }
}

export default new AdvanceService();
