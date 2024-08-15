export interface MaterialIcons {
  host: string;
  asset_url_pattern: string;
  families: string[];
  icons: MaterialIcon[];
}

export interface MaterialIcon {
  name: string;
  version: number;
  popularity: number;
  codepoint: number;
  unsupported_families: string[];
  categories: string[];
  tags: string[];
  sizes_px: number[];
}
