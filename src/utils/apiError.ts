import { AxiosError } from "axios";

export function normalizeApiError(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    if (status === 500) {
      return {
        message: "Internal server error. Please try again later.",
        status: 500,
        data: axiosError.response?.data,
        isAxiosError: true,
      };
    }
    return {
      message: axiosError.message,
      status,
      data: axiosError.response?.data,
      isAxiosError: true,
    };
  }
  // Fallback for non-Axios errors
  return {
    message: (error as Error)?.message || "Unknown error",
    status: undefined,
    data: undefined,
    isAxiosError: false,
  };
}
