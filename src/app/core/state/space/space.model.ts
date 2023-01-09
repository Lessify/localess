export interface SpaceState {
  id: string
  name: string
  contentPath?: ContentPathItem[]
}

export interface ContentPathItem {
  fullSlug: string
  name: string
}
