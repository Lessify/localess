export interface ExportDialogModel {
  spaceId: string
}

export interface  ExportDialogReturn {
  /**
   * number of milliseconds.
   */
  fromDate?: number
  /**
   * content id
   */
  uri?: string
}
