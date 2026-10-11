import type { settings } from '../../infra/database/schema.js';
import { toDto } from './dto.transformer.js';

/** The settings row as the SPA reads it: its fixed `id` left out. */
export const toSettings = (entity: typeof settings.$inferSelect) => toDto(entity, ['id']);
