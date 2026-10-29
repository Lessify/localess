/**
 * The messages of content writes the service and the repository refuse: the service checks what it read, the
 * repository the same rules again under the contents lock (another write may have changed them since).
 */
export const contentErrors = {
  noSchema: (schema: string | undefined): string => `No ROOT schema '${schema ?? ''}' in the space`,
  noParent: 'No such folder',
  taken: (path: string): string => `'${path}' is already used`,
  intoItself: 'A folder cannot be moved into itself',
  notDocument: 'Only documents have data',
  cloneNotDocument: 'Only documents can be cloned',
};
