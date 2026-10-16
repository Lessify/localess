import type { AppApi } from './app-api';

export interface SchemaFieldDto {
  name: string;
  kind: string;
  displayName?: string;
  required?: boolean;
  translatable?: boolean;
  description?: string;
  source?: string;
  schemas?: string[];
}

export interface SchemaDto {
  id: string;
  name: string;
  type: 'ROOT' | 'NODE' | 'ENUM';
  displayName?: string;
  description?: string;
  labels?: string[];
  previewField?: string;
  fields?: SchemaFieldDto[];
  values?: { name: string; value: string }[];
}

export function schemasOf(api: AppApi, spaceId: string): Promise<SchemaDto[]> {
  return api.get(`/api/app/spaces/${spaceId}/schemas`);
}

export async function schemaNamed(api: AppApi, spaceId: string, name: string): Promise<SchemaDto | undefined> {
  return (await schemasOf(api, spaceId)).find(it => it.name === name);
}
