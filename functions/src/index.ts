import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({
  timeoutSeconds: 540,
  region: 'europe-west6',
  concurrency: 600,
  cpu: 1,
  minInstances: 0,
  maxInstances: 1,
});

export { asset } from './assets';

export { content } from './contents';

export { openapi } from './open-api';

export { setup } from './setup';

export { space } from './spaces';

export { storage } from './storage';

export { task } from './tasks';

export { translate } from './translate';

export { translation } from './translations';

export { user } from './users';

export { v1 as publicv1 } from './v1';

// Plugins API
export { unsplash } from './plugins/unsplash/api';
