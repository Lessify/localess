import {setGlobalOptions} from 'firebase-functions/v2';

setGlobalOptions({
  timeoutSeconds: 10 * 60,
  region: 'europe-west6',
});

export {onAssetDeleted} from './assets';

export {contentPublish, onContentUpdate, onContentDelete, onContentWrite} from './contents';

export {setup} from './setup';

// eslint-disable-next-line camelcase
export * as space from './spaces';

export {onFileUpload} from './storage';

export {onTaskCreate, onTaskDeleted} from './tasks';

export {translate} from './translate';

export {translationsPublish, onTranslationCreate} from './translations';

export {onAuthUserCreate, onUserUpdate, userInvite, onUserDelete, usersSync} from './users';

export {v1} from './v1';
