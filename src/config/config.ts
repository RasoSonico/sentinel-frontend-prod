import { AZURE_TENANT_ID, AZURE_CLIENT_ID, AUTH_SCHEME, API_URL } from "@env";

export default {
  api: {
    baseUrl: API_URL || "https://api.sentinel-app.com",
  },
  auth: {
    activeProvider: "azure",
    providers: {
      azure: {
        tenantId: AZURE_TENANT_ID,
        clientId: AZURE_CLIENT_ID,
        scopes: ["openid", "profile", "email", "offline_access"],
        scheme: AUTH_SCHEME || "sentinel",
        path: "auth",
      },
    },
  },
};
