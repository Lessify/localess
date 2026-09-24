import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { API_DOMAIN, UnsplashSearchParams } from './models';
import { logger } from 'firebase-functions';
import { isEmulatorEnabled, remoteConfigTemplate } from '../../config';
import { authUid } from '../../utils/log-auth';
import { canPerform } from '../../utils/user-auth-utils';
import { UserPermission } from '../../models';
import { normalizePaging } from './paging';

/**
 * Only users who can add assets may use the Unsplash picker - it spends the operator's API quota.
 * @param {CallableRequest} request the callable request
 */
function requireAssetCreate(request: CallableRequest<unknown>): void {
  if (!request.auth) throw new HttpsError('unauthenticated', 'unauthenticated');
  if (!canPerform(UserPermission.ASSET_CREATE, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
}

const search = onCall<UnsplashSearchParams>(async request => {
  logger.info('[unsplash::search] data: ' + JSON.stringify(request.data));
  logger.info('[unsplash::search] auth uid: ' + authUid(request.auth));
  requireAssetCreate(request);

  const { query, orientation } = request.data;
  const { page, perPage } = normalizePaging(request.data.page, request.data.perPage);
  let unsplashApiKey: string | undefined = undefined;
  if (isEmulatorEnabled) {
    // Read from local env
    unsplashApiKey = process.env.UNSPLASH_API_KEY;
  } else {
    // Get Server Configuration
    try {
      await remoteConfigTemplate.load();
      const config = remoteConfigTemplate.evaluate();
      unsplashApiKey = config.getString('unsplash_api_key');
    } catch (error) {
      logger.warn(error);
      throw new HttpsError('failed-precondition', 'Unsplash API Key is not configured.');
    }
  }
  const url = new URL(`${API_DOMAIN}/search/photos`);
  url.searchParams.append('query', query);
  url.searchParams.append('per_page', perPage.toString());
  if (page) {
    url.searchParams.append('page', page.toString());
  }
  if (orientation) {
    url.searchParams.append('orientation', orientation);
  }

  const data = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept-Version': 'v1',
      Authorization: `Client-ID ${unsplashApiKey}`,
    },
  });
  logger.info('[unsplash::search] headers:', data.headers);
  logger.info('[unsplash::search] status:', data.status, data.statusText);
  if (data.ok) {
    return {
      limit: data.headers.get('X-RateLimit-Limit'),
      remaining: data.headers.get('X-RateLimit-Remaining'),
      ...(await data.json()),
    };
  }
  throw new HttpsError('failed-precondition', 'Unsplash API Key is not configured properly.');
});

const random = onCall(async request => {
  logger.info('[unsplash::random] data: ' + JSON.stringify(request.data));
  logger.info('[unsplash::random] auth uid: ' + authUid(request.auth));
  requireAssetCreate(request);

  let unsplashApiKey: string | undefined = undefined;
  if (isEmulatorEnabled) {
    // Read from local env
    unsplashApiKey = process.env.UNSPLASH_API_KEY;
  } else {
    // Get Server Configuration
    try {
      await remoteConfigTemplate.load();
      const config = remoteConfigTemplate.evaluate();
      unsplashApiKey = config.getString('unsplash_api_key');
    } catch (error) {
      logger.warn(error);
      throw new HttpsError('failed-precondition', 'Unsplash API Key is not configured.');
    }
  }
  const url = new URL(`${API_DOMAIN}/photos/random`);
  url.searchParams.append('count', '20');

  const data = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept-Version': 'v1',
      Authorization: `Client-ID ${unsplashApiKey}`,
    },
  });
  logger.info('[unsplash::random] headers:', data.headers);
  logger.info('[unsplash::random] status:', data.status, data.statusText);
  if (data.ok) {
    return {
      limit: data.headers.get('X-RateLimit-Limit'),
      remaining: data.headers.get('X-RateLimit-Remaining'),
      results: await data.json(),
    };
  }
  throw new HttpsError('failed-precondition', 'Unsplash API Key is not configured properly.');
});

export const unsplash = {
  search: search,
  random: random,
};
