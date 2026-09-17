export interface AddFolderDialogContext {
  reservedNames: string[];
  reservedSlugs: string[];
}

export interface AddFolderDialogResult {
  name: string;
  slug: string;
}
