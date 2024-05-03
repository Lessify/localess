import { TranslationType } from './translation.model';
import { z } from 'zod';

// const ID_PATTERN = /^[a-zA-Z]+[a-zA-Z0-9-_.]*[a-zA-Z0-9]+$/;

export const translationSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(TranslationType),
  locales: z.record(z.string(), z.string()),
  labels: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const zTranslationExportArraySchema = z.array(translationSchema);

export const zTranslationFlatExportSchema = z.record(z.string(), z.string());
