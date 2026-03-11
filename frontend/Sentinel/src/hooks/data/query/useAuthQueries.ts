import { useQuery } from "@tanstack/react-query";
import { authMe } from "../api/authApi";

export const authMeQueryOptions = (enabled: boolean = true) => ({
  queryKey: ["authMe"],
  queryFn: authMe,
  enabled,
});

export const useAuthMeQuery = (enabled: boolean = true) =>
  useQuery(authMeQueryOptions(enabled));
