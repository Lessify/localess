import {setGlobalOptions} from 'firebase-functions/v2';

setGlobalOptions({
  timeoutSeconds: 540,
  region: 'europe-west6',
});

export {
  onAssetDeleted as onassetdeleted,
} from './assets';

export {
  contentPublish as contentpublish,
  onContentUpdate as oncontentupdate,
  onContentDelete as oncontentdelete,
  onContentWrite as oncontentwrite,
} from './contents';

export {setup} from './setup';

export {
  onSpaceDelete as onspacedelete,
} from './spaces';

export {
  onFileUpload as onfileupload,
} from './storage';

export {
  onTaskCreate as ontaskcreate,
  onTaskDeleted as ontaskdeleted,
} from './tasks';

export {translate} from './translate';

export {
  translationsPublish as translationspublish,
  onTranslationCreate as ontranslationcreate,
} from './translations';

export {
  onAuthUserCreate as onauthusercreate,
  onUserUpdate as onuserupdate,
  userInvite as userinvite,
  onUserDelete as onuserdelete,
  usersSync as userssync,
} from './users';

export {v1} from './v1';
