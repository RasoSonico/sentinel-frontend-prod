import { BaseService } from "./baseService";
import { Estimation, EstimationDetail } from "../../types/entities";
import axiosClient from "./axiosClient";

class EstimationService extends BaseService<Estimation> {
  constructor() {
    super("avance/estimation/");
  }

  // Enviar estimación para aprobación
  async submitForApproval(id: string) {
    try {
      const response = await axiosClient.post(
        `avance/estimation/${id}/submit/`
      );
      return response.data;
    } catch (error) {
      console.error(`Error al enviar estimación ${id} para aprobación:`, error);
      throw error;
    }
  }

  // Obtener estimaciones por obra
  async getByConstruction(constructionId: string) {
    try {
      const response = await this.getAll({
        params: { construction: constructionId },
      });
      return response;
    } catch (error) {
      console.error(
        `Error al obtener estimaciones de la obra ${constructionId}:`,
        error
      );
      throw error;
    }
  }

  // Crear detalle de estimación
  async createDetail(data: Partial<EstimationDetail>) {
    try {
      const response = await axiosClient.post("avance/estimation-item/", data);
      return response.data;
    } catch (error) {
      console.error("Error al crear detalle de estimación:", error);
      throw error;
    }
  }

  // Obtener detalles de una estimación
  async getDetails(estimationId: string) {
    try {
      const response = await axiosClient.get("avance/estimation-item/", {
        params: { estimation: estimationId },
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error al obtener detalles de la estimación ${estimationId}:`,
        error
      );
      throw error;
    }
  }
}

export default new EstimationService();
