/* tslint:disable */
/* eslint-disable */
export interface PullRequestMinimal {
  base: {
'ref': string;
'sha': string;
'repo': {
'id': number;
'url': string;
'name': string;
};
};
  head: {
'ref': string;
'sha': string;
'repo': {
'id': number;
'url': string;
'name': string;
};
};
  id: number;
  number: number;
  url: string;
}
