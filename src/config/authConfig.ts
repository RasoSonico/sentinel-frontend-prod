// src/config/authConfig.ts
import { AZURE_TENANT_ID, AZURE_CLIENT_ID, AUTH_SCHEME } from "@env";

export default {
  activeProvider: "azure",
  providers: {
    azure: {
      tenantId: AZURE_TENANT_ID,
      clientId: AZURE_CLIENT_ID,
      scopes: ["openid", "profile", "email", "offline_access"],
      scheme: AUTH_SCHEME,
      path: "auth",
    },
  },
};
