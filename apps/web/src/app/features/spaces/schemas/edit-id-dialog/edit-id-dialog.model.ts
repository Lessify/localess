import { SchemaUsage } from '@localess/shared';

/** Edits a schema's name (shown as its ID), not the row id. */
export interface EditIdDialogContext {
  name: string;
  reservedNames: string[];
  /** What uses the schema (a schema in use can not be renamed); absent when it could not be read. */
  usage?: SchemaUsage;
}

/** The new name on its own, not the form object. */
export type EditIdDialogResult = string;
