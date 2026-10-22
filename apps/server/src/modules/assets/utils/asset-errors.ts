/**
 * The messages of asset writes the service and the repository refuse: the service checks what it read, the repository
 * the same rules again under the assets lock (another write may have changed them since).
 */
export const assetErrors = {
  noFolder: 'No such folder',
  intoItself: 'A folder cannot be moved into itself',
  altOnFolder: 'Only files have alt text',
  noName: 'The file needs a name',
};
