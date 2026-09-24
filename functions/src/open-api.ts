import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GenerateOpenApiData, Schema, UserPermission } from './models';
import { findSchemas, findSpaceById, generateOpenApi } from './services';
import { canPerform } from './utils/user-auth-utils';
import { authUid } from './utils/log-auth';

// Generate
const generate = onCall<GenerateOpenApiData>(async request => {
  logger.info('[OpenApi::generate] data: ' + JSON.stringify(request.data));
  logger.info('[OpenApi::generate] auth uid: ' + authUid(request.auth));
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'unauthenticated');
  if (!canPerform(UserPermission.DEV_OPEN_API, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId } = data;
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (spaceSnapshot.exists) {
    const schemasSnapshot = await findSchemas(spaceId).get();
    const schemaById = new Map<string, Schema>(schemasSnapshot.docs.map(it => [it.id, it.data() as Schema]));
    return JSON.stringify(generateOpenApi(schemaById));
  } else {
    logger.info(`[OpenApi::generate] Space ${spaceId} does not exist.`);
    throw new HttpsError('not-found', 'Space not found');
  }
});

export const openapi = {
  generate: generate,
};
