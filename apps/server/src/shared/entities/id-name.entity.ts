/** An item of a list that only names things (the sidebar's spaces): its id and its name. */
export interface IdNameEntity {
  id: string;
  name: string;
}

/** An item of a list that names things and where they are (the space's environments): its id, its name and its URL. */
export interface IdNameUrlEntity extends IdNameEntity {
  url: string;
}
