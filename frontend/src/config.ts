// Backend wiring, injected at build time by Vite (see .env.example / CI).
// Empty strings in local dev simply mean the auth/API features are unconfigured.
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  userPoolId: import.meta.env.VITE_USER_POOL_ID ?? "",
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID ?? "",
};

export const isBackendConfigured = Boolean(
  config.apiUrl && config.userPoolId && config.userPoolClientId,
);
