import { BaseService } from "./baseService";
import { Physical } from "../../types/entities";
import axiosClient from "./axiosClient";

class PhysicalService extends BaseService<Physical> {
  constructor() {
    super("avance/physical/");
  }

  // Subir fotos de avance
  async uploadPhotos(id: string, photos: FormData) {
    try {
      const response = await axiosClient.post(
        `avance/physical/${id}/upload_photos/`,
        photos,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error al subir fotos:", error);
      throw error;
    }
  }

  // Obtener avances por concepto
  async getByConceptId(conceptId: string) {
    try {
      const response = await this.getAll({
        params: { concept: conceptId },
      });
      return response;
    } catch (error) {
      console.error(
        `Error al obtener avances del concepto ${conceptId}:`,
        error
      );
      throw error;
    }
  }
}

export default new PhysicalService();
