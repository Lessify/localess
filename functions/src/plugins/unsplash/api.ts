import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { API_DOMAIN, UnsplashSearchParams } from './models';
import { logger } from 'firebase-functions';
import { isEmulatorEnabled, remoteConfigTemplate } from '../../config';

const search = onCall<UnsplashSearchParams>(async request => {
  logger.info('[unsplash::search] data: ' + JSON.stringify(request.data));
  logger.info('[unsplash::search] context.auth: ' + JSON.stringify(request.auth));

  const { page, perPage, query, orientation } = request.data;
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
  if (perPage) {
    url.searchParams.append('per_page', perPage.toString());
  } else {
    url.searchParams.append('per_page', '20');
  }
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
  logger.info('[unsplash::random] context.auth: ' + JSON.stringify(request.auth));

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
