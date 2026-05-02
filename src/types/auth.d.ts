import { AuthSessionResult, DiscoveryDocument, TokenResponse } from "expo-auth-session";

export interface AuthProvider {
  login: () => Promise<TokenResponse | null>;
  handleAuthResponse: (response: AuthSessionResult) => Promise<TokenResponse | null>;
  enabled: boolean;
  discovery: DiscoveryDocument | null;
  clientId: string;
}

export interface AuthProviderConfig {
  tenantId?: string;
  clientId: string;
  scopes: string[];
  scheme: string;
  path: string;
}

export interface AuthConfig {
  activeProvider: string;
  providers: {
    [key: string]: AuthProviderConfig;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
}

export type UserRole =
  | "ADMIN"
  | "DESARROLLADOR"
  | "CONTRATISTA"
  | "INVERSIONISTA"
  | "INSPECTOR";
