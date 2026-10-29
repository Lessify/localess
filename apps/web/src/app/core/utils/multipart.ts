/**
 * A multipart body: the fields first (the server reads them from the parts before the file), then the file. Fields
 * are typed by the caller with the request's shared type (`AssetUpload`, `TaskImportCreate`); undefined ones are left out.
 */
export function multipartForm(fields: Record<string, string | undefined>, file: File): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) if (value !== undefined) form.append(name, value);
  form.append('file', file, file.name);
  return form;
}
