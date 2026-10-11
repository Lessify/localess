/** The path children of `folder` carry as their `parentPath`. */
export const folderPath = (folder: { id: string; parentPath: string }) =>
  folder.parentPath ? `${folder.parentPath}/${folder.id}` : folder.id;
