export type UnsplashSearchParams = {
  query: string;
  page?: number;
  perPage?: number;
  color?: 'black_and_white' | 'black' | 'white' | 'yellow' | 'orange' | 'red' | 'purple' | 'magenta' | 'green' | 'teal' | 'blue';
  orientation?: 'landscape' | 'portrait' | 'squarish';
};

export type UnsplashSearchResult = {
  limit?: number;
  remaining?: number;
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
};

export type UnsplashRandomResult = {
  limit?: number;
  remaining?: number;
  results: UnsplashPhoto[];
};

export type UnsplashPhoto = {
  id: string;
  slug: string;
  alternative_slugs: Record<string, string>;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color?: string | null;
  blur_hash?: string | null;
  description?: string | null;
  alt_description?: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
    small_s3: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  likes: number;
  liked_by_user: boolean;
  asset_type: string;
  user: {
    id: string;
    updated_at: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string;
    twitter_username?: string | null;
    portfolio_url: string;
    bio: string;
    location: string;
    links?: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
      following: string;
      followers: string;
    };
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    instagram_username: string;
    total_collections: number;
    total_likes: number;
    total_photos: number;
    total_promoted_photos: number;
    total_illustrations: number;
    total_promoted_illustrations: number;
    accepted_tos: boolean;
    for_hire: boolean;
  };
  exif?: {
    make: string;
    model: string;
    name: string;
    exposure_time: string;
    aperture: string;
    focal_length: string;
    iso: number;
  };
  location?: {
    name: string;
    city?: string | null;
    country: string;
    position?: {
      latitude: number;
      longitude: number;
    };
  };
  views: number;
  downloads: number;
  public_domain: boolean;
  tags?: [{ title: string }];
};
