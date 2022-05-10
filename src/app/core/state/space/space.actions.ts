import {createAction, props} from '@ngrx/store';

// tslint:disable-next-line:typedef
export const actionSpaceChange = createAction(
  '[Space] Change',
  props<{
    id: string;
    name: string;
  }>()
);
