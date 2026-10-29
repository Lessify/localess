/** An item of a list that only names things (the sidebar's spaces): its id and its name. */
export interface IdName {
  id: string;
  name: string;
}

/** An item of a list that names things and where they are (the space's environments, the Visual Editor's preview URLs). */
export interface IdNameUrl extends IdName {
  url: string;
}
