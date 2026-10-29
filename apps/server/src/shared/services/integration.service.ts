import {
  type Integration,
  integrationDefinition,
  type IntegrationField,
  type IntegrationId,
  type IntegrationList,
  INTEGRATIONS,
  type TranslatePrimary,
} from '@localess/shared';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';

import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { EventService } from '../../infra/events/event.service.js';
import { SECRET_BOX, type SecretBox } from '../../infra/secrets/secret-box.js';
import type { IntegrationSettingSelect } from '../entities/integration-setting.entity.js';
import { AppSettingRepository } from '../repositories/app-setting.repository.js';
import { IntegrationSettingRepository } from '../repositories/integration-setting.repository.js';

/** The active configuration of an integration: from env (locked) or saved in the UI. */
export interface ResolvedIntegration {
  id: IntegrationId;
  source: 'env' | 'ui';
  values: Record<string, string>;
}

/** What a real call to a provider answered: a success, or a failure that says something about the key. */
export type IntegrationOutcome = { ok: true } | { ok: false; reason: 'auth' | 'quota'; message: string };

const PRIMARY_KEY = 'translate.primary';
const ENTITY = 'integrations';

/** `••••` and the last 4 characters: enough to tell keys apart, useless to anyone else. */
const secretHint = (value: string): string => `••••${value.length > 8 ? value.slice(-4) : ''}`;

/** A file's hint: the service account it is (`client_email`), else just that one is saved. */
function fileHint(value: string): string {
  try {
    const email = (JSON.parse(value) as { client_email?: unknown }).client_email;
    if (typeof email === 'string') return email;
  } catch {
    // not JSON: nothing to show
  }
  return 'saved';
}

function hintOf(field: IntegrationField, value: string): string {
  if (field.type === 'text') return value;
  return field.type === 'file' ? fileHint(value) : secretHint(value);
}

/**
 * The single answer to "is this integration on, and with what values?" (docs/superpowers/specs/2026-10-29-integrations-
 * settings-design.md): env first (locked, all values from env), then the row saved in the UI, then off. Answers are
 * cached per instance and dropped on every `integrations` event, so a change on any instance applies everywhere.
 */
@Injectable()
export class IntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationService.name);
  private readonly resolved = new Map<IntegrationId, Promise<ResolvedIntegration | undefined>>();
  private primary?: Promise<IntegrationList['translatePrimary']>;
  private subscription?: Subscription;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SECRET_BOX) private readonly secretBox: SecretBox,
    private readonly integrationSettingRepository: IntegrationSettingRepository,
    private readonly appSettingRepository: AppSettingRepository,
    private readonly eventService: EventService,
  ) {}

  onModuleInit(): void {
    this.subscription = this.eventService.stream().subscribe(event => {
      if (event.entity === ENTITY) this.forget();
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Whether the environment configures `id` (the card is read-only). */
  isEnvLocked(id: IntegrationId): boolean {
    return this.config.integrationEnv[id] !== undefined;
  }

  /** Whether keys can be saved in the UI on this server, and why not. */
  secretStorage(): { available: boolean; reason?: string } {
    return { available: this.secretBox.available, reason: this.secretBox.reason };
  }

  /** The active configuration, undefined when off, switched off, or unreadable on this server. */
  resolve(id: IntegrationId): Promise<ResolvedIntegration | undefined> {
    let answer = this.resolved.get(id);
    if (!answer) {
      answer = this.load(id);
      this.resolved.set(id, answer);
      // A failed read is not remembered.
      answer.catch(() => this.resolved.delete(id));
    }
    return answer;
  }

  /** Every integration as Admin → Settings shows it: never a secret, only hints. */
  async findAll(): Promise<Integration[]> {
    const rows = new Map((await this.integrationSettingRepository.findAll()).map(it => [it.id, it]));
    return INTEGRATIONS.map(definition => {
      if (this.isEnvLocked(definition.id)) {
        return {
          id: definition.id,
          source: 'env',
          enabled: true,
          envVars: definition.lockEnv,
          hints: {},
        };
      }
      const row = rows.get(definition.id);
      if (!row) return { id: definition.id, source: 'none', enabled: false, envVars: [], hints: {} };
      return {
        id: definition.id,
        source: 'ui',
        enabled: row.enabled,
        envVars: [],
        hints: row.hints,
        status: this.open(row) ? row.status : 'unreadable',
        statusMessage: row.statusMessage ?? undefined,
        statusAt: row.statusAt?.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        updatedBy: row.updatedByUser?.email,
      };
    });
  }

  /** Seals and stores the values (missing `text` values take their default), switched on. */
  async save(id: IntegrationId, values: Record<string, string>, status: 'verified' | 'unverified', userId: string): Promise<void> {
    const definition = integrationDefinition(id);
    const complete: Record<string, string> = {};
    const hints: Record<string, string> = {};
    for (const field of definition.fields) {
      const value = values[field.key] ?? field.default;
      if (value === undefined || value === '') continue;
      complete[field.key] = value;
      hints[field.key] = hintOf(field, value);
    }
    const secrets = this.secretBox.seal(JSON.stringify(complete), id);
    await this.integrationSettingRepository.upsert(id, {
      enabled: true,
      secrets,
      hints,
      status,
      statusMessage: null,
      statusAt: new Date(),
      updatedBy: userId,
    });
    this.forget();
  }

  async setEnabled(id: IntegrationId, enabled: boolean, userId: string): Promise<void> {
    await this.integrationSettingRepository.update(id, { enabled, updatedBy: userId });
    this.forget();
  }

  /** Disconnect: the row and its key are deleted. */
  async remove(id: IntegrationId): Promise<void> {
    await this.integrationSettingRepository.delete(id);
    this.forget();
  }

  /**
   * What a real call answered, for integrations saved in the UI (an env integration's key is the operator's to fix). Writes,
   * and publishes, only when the status changes: a success on a verified integration costs nothing.
   */
  async recordOutcome(id: IntegrationId, outcome: IntegrationOutcome): Promise<void> {
    if (this.isEnvLocked(id)) return;
    const row = await this.integrationSettingRepository.findOne(id);
    if (!row) return;
    const status = outcome.ok ? 'verified' : outcome.reason === 'auth' ? 'rejected' : 'quota';
    const statusMessage = outcome.ok ? null : outcome.message;
    if (row.status === status && (row.statusMessage ?? null) === statusMessage) return;
    await this.integrationSettingRepository.update(id, { status, statusMessage, statusAt: new Date(), ...keepUpdated(row) });
    this.forget();
  }

  /** The provider tried first: LOCALESS_TRANSLATE_PRIMARY, else the admin's choice, else DeepL. */
  translatePrimary(): Promise<IntegrationList['translatePrimary']> {
    this.primary ??= this.loadPrimary();
    this.primary.catch(() => (this.primary = undefined));
    return this.primary;
  }

  /** The admin's choice; undefined goes back to the default. */
  async setTranslatePrimary(value: TranslatePrimary | undefined, userId: string): Promise<void> {
    if (value) await this.appSettingRepository.upsert(PRIMARY_KEY, value, userId, ENTITY);
    else await this.appSettingRepository.delete(PRIMARY_KEY, ENTITY);
    this.forget();
  }

  private async loadPrimary(): Promise<IntegrationList['translatePrimary']> {
    if (this.config.translatePrimary) return { value: this.config.translatePrimary, source: 'env' };
    const row = await this.appSettingRepository.findOne(PRIMARY_KEY);
    if (row?.value === 'deepl' || row?.value === 'google-translate') return { value: row.value, source: 'ui' };
    return { value: 'deepl', source: 'default' };
  }

  private async load(id: IntegrationId): Promise<ResolvedIntegration | undefined> {
    const env = this.config.integrationEnv[id];
    if (env) return { id, source: 'env', values: env };
    const row = await this.integrationSettingRepository.findOne(id);
    if (!row?.enabled) return undefined;
    const values = this.open(row);
    return values ? { id, source: 'ui', values } : undefined;
  }

  /** The row's values, undefined when this server's key can't open them (another secret, a lost secret.key). */
  private open(row: IntegrationSettingSelect): Record<string, string> | undefined {
    try {
      return JSON.parse(this.secretBox.open(row.secrets, row.id)) as Record<string, string>;
    } catch {
      this.logger.warn(`The saved key of ${row.id} can't be read on this server (LOCALESS_SECRET_KEY or secret.key changed?)`);
      return undefined;
    }
  }

  private forget(): void {
    this.resolved.clear();
    this.primary = undefined;
  }
}

/** A status change isn't an edit by an admin: `updated_at` stays. */
const keepUpdated = (row: IntegrationSettingSelect) => ({ updatedAt: row.updatedAt });
