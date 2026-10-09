import { ValidationErrors } from '@angular/forms';
import { Content, ContentKind } from '@localess/shared';

// UI-only content helpers; the content model itself is in @localess/shared.

export function sortContent(a: Content, b: Content): number {
  const aIsFolder = a.kind === ContentKind.FOLDER ? 0 : 1;
  const bIsFolder = b.kind === ContentKind.FOLDER ? 0 : 1;
  return `${aIsFolder}${a.name}`.localeCompare(`${bIsFolder}${b.name}`);
}

export interface ContentError {
  contentId: string;
  locale: string;
  schema: string;
  fieldName: string;
  fieldDisplayName?: string;
  errors: ValidationErrors | null;
}
