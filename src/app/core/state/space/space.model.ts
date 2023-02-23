export interface SpaceState {
  id: string
  name: string
  contentPath?: PathItem[]
  assetPath?: PathItem[]
}

export interface PathItem {
  fullSlug: string
  name: string
}
