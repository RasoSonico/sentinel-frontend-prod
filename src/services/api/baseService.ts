import axiosClient from "./axiosClient";
import { AxiosRequestConfig } from "axios";

export class BaseService<T> {
  endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  // Obtener todos los elementos
  async getAll(config?: AxiosRequestConfig): Promise<T[]> {
    try {
      const response = await axiosClient.get<T[]>(this.endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener ${this.endpoint}:`, error);
      throw error;
    }
  }

  // Obtener elemento por ID
  async getById(id: string | number, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosClient.get<T>(
        `${this.endpoint}${id}/`,
        config
      );
      return response.data;
    } catch (error) {
      console.error(`Error al obtener ${this.endpoint}/${id}:`, error);
      throw error;
    }
  }

  // Crear nuevo elemento
  async create(data: Partial<T>, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosClient.post<T>(this.endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`Error al crear en ${this.endpoint}:`, error);
      throw error;
    }
  }

  // Actualizar elemento
  async update(
    id: string | number,
    data: Partial<T>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await axiosClient.put<T>(
        `${this.endpoint}${id}/`,
        data,
        config
      );
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar ${this.endpoint}/${id}:`, error);
      throw error;
    }
  }

  // Actualizar parcialmente elemento
  async patch(
    id: string | number,
    data: Partial<T>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await axiosClient.patch<T>(
        `${this.endpoint}${id}/`,
        data,
        config
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error al actualizar parcialmente ${this.endpoint}/${id}:`,
        error
      );
      throw error;
    }
  }

  // Eliminar elemento
  async delete(
    id: string | number,
    config?: AxiosRequestConfig
  ): Promise<void> {
    try {
      await axiosClient.delete(`${this.endpoint}${id}/`, config);
    } catch (error) {
      console.error(`Error al eliminar ${this.endpoint}/${id}:`, error);
      throw error;
    }
  }
}
