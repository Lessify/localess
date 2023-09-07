import {setGlobalOptions} from 'firebase-functions/v2';

setGlobalOptions({
  timeoutSeconds: 540,
  region: 'europe-west6',
});

export {asset} from './assets';

export {content} from './contents';

export {plugin} from './plugins';

export {setup} from './setup';

export {space} from './spaces';

export {storage} from './storage';

export {task} from './tasks';

export {translate} from './translate';

export {translation} from './translations';

export {user} from './users';

export {v1 as publicv1} from './v1';

// Plugins API
export {stripeapi} from './plugins/stripe';
