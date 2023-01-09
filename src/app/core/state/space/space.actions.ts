import {createAction, props} from '@ngrx/store';
import {ContentPathItem} from '@core/state/space/space.model';

// tslint:disable-next-line:typedef
export const actionSpaceChange = createAction(
  '[Space] Change',
  props<{
    id: string;
    name: string;
  }>()
);

export const actionSpaceContentPathChange = createAction(
  '[Space Content Path] Change',
  props<{
    contentPath?: ContentPathItem[]
  }>()
);
