import {setGlobalOptions} from 'firebase-functions/v2';

setGlobalOptions({
  timeoutSeconds: 10 * 60,
});

export {onAssetDeleted} from './assets';

export {contentPublish, onContentUpdate, onContentDelete, onContentWrite} from './contents';

export {setup} from './setup';

export {onSpaceDelete} from './spaces';

export {onFileUpload} from './storage';

export {onTaskCreate, onTaskDeleted} from './tasks';

export {translate} from './translate';

export {translationsPublish, onTranslationCreate} from './translations';

export {onAuthUserCreate, onUserUpdate, userInvite, onUserDelete, usersSync} from './users';

export {v1} from './v1';
