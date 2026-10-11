/** The OAuth login providers. Lowercase: they name the providers (`/api/auth/google`), not states of ours. */
export const OAUTH_PROVIDERS = ['google', 'microsoft'] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number];
