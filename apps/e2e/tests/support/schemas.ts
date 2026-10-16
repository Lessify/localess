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

/** An Enum schema with these values (`name` is shown, `value` is stored). */
export async function createEnum(
  api: AppApi,
  spaceId: string,
  name: string,
  values: { name: string; value: string }[],
): Promise<{ id: string; name: string }> {
  const schema = await api.createSchema(spaceId, { name, type: 'ENUM' });
  await api.send('put', `/api/app/spaces/${spaceId}/schemas/${schema.id}`, { values });
  return schema;
}
