import type { TranslationServiceClient } from '@google-cloud/translate';
import type { IntegrationTestResult } from '@localess/shared';

import { type IntegrationProvider, type ProviderErrorKind, TEST_TIMEOUT_MS, unexpected } from './integration-provider.js';

/** What a service account key file holds that the client needs. */
export interface GoogleCredentials {
  projectId: string;
  credentials: { client_email: string; private_key: string };
}

/** The project and credentials of a service account JSON saved in the UI (validated before it was saved). */
export function googleCredentials(values: Record<string, string>): GoogleCredentials {
  const json = JSON.parse(values['serviceAccount'] ?? '') as { project_id: string; client_email: string; private_key: string };
  return { projectId: json.project_id, credentials: { client_email: json.client_email, private_key: json.private_key } };
}

/** gRPC status codes the Translation API answers with. */
const PERMISSION_DENIED = 7;
const RESOURCE_EXHAUSTED = 8;
const UNAUTHENTICATED = 16;
const UNAVAILABLE = 14;
const INTERNAL = 13;
const DEADLINE_EXCEEDED = 4;

/**
 * Google Cloud Translation v3. In the UI: a service account key file (the project comes from it) and a location. From
 * env: GOOGLE_CLOUD_PROJECT with Application Default Credentials.
 */
export class GoogleTranslateIntegration implements IntegrationProvider {
  readonly id = 'google-translate' as const;

  /** A client for these values: the key file's credentials, or ADC for env values (`projectId`). */
  async client(values: Record<string, string>): Promise<{ client: TranslationServiceClient; projectId: string; location: string }> {
    const { TranslationServiceClient } = await import('@google-cloud/translate');
    const location = values['location'] || 'global';
    if (values['serviceAccount']) {
      const { projectId, credentials } = googleCredentials(values);
      return { client: new TranslationServiceClient({ projectId, credentials }), projectId, location };
    }
    return { client: new TranslationServiceClient(), projectId: values['projectId'] ?? '', location };
  }

  validate(values: Record<string, string>): string | undefined {
    let json: unknown;
    try {
      json = JSON.parse(values['serviceAccount'] ?? '');
    } catch {
      return 'Paste the whole service account JSON file.';
    }
    const key = json as Record<string, unknown> | null;
    const looksRight = ['project_id', 'client_email', 'private_key'].every(it => typeof key?.[it] === 'string' && key[it] !== '');
    return looksRight ? undefined : "This doesn't look like a service account key.";
  }

  async test(values: Record<string, string>): Promise<IntegrationTestResult> {
    let projectId = values['projectId'] ?? '';
    try {
      const google = await this.client(values);
      projectId = google.projectId;
      await google.client.translateText(
        {
          parent: `projects/${projectId}/locations/${google.location}`,
          contents: ['hello'],
          mimeType: 'text/plain',
          targetLanguageCode: 'de',
        },
        { timeout: TEST_TIMEOUT_MS, maxRetries: 0 },
      );
      return { ok: true, message: 'Connected to Google Cloud Translation.', details: `Project ${projectId}.` };
    } catch (error) {
      if (this.isApiOff(error)) {
        return {
          ok: false,
          reason: 'setup',
          message: `The service account works, but the Cloud Translation API is not enabled in project ${projectId}. Enable it, wait a minute, then test again.`,
          fixUrl: `https://console.cloud.google.com/apis/library/translate.googleapis.com?project=${encodeURIComponent(projectId)}`,
        };
      }
      switch (this.classify(error)) {
        case 'auth':
          return {
            ok: false,
            reason: 'auth',
            message: 'Google rejected this service account. Give it the "Cloud Translation API User" role, or create a new key.',
            fixUrl: 'https://console.cloud.google.com/iam-admin/iam',
          };
        case 'quota':
          return { ok: false, reason: 'quota', message: "This project's Cloud Translation quota is used up." };
        case 'unreachable':
          return { ok: false, reason: 'unreachable', message: "Couldn't reach Google Cloud. Your server may block outgoing traffic." };
        default:
          return unexpected('Google Cloud Translation', error);
      }
    }
  }

  classify(error: unknown): ProviderErrorKind {
    const code = (error as { code?: unknown } | undefined)?.code;
    // The API switched off is PERMISSION_DENIED too: for a real call it's the key's setup, the admin's to fix.
    if (code === UNAUTHENTICATED || code === PERMISSION_DENIED) return 'auth';
    if (code === RESOURCE_EXHAUSTED) return 'quota';
    if (code === UNAVAILABLE || code === DEADLINE_EXCEEDED || code === INTERNAL) return 'unreachable';
    if (typeof code === 'string' && ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)) return 'unreachable';
    return 'other';
  }

  private isApiOff(error: unknown): boolean {
    const message = error instanceof Error ? error.message : '';
    return (error as { code?: unknown }).code === PERMISSION_DENIED && /has not been used|is disabled|SERVICE_DISABLED/i.test(message);
  }
}
