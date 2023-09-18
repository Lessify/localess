/* tslint:disable */
/* eslint-disable */
export type SearchResultTextMatches = Array<{
'object_url'?: string;
'object_type'?: string | null;
'property'?: string;
'fragment'?: string;
'matches'?: Array<{
'text'?: string;
'indices'?: Array<number>;
}>;
}>;
