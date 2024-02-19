import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GenerateOpenApiData, Schema } from './models';
import { findSchemas, findSpaceById, generateOpenApi } from './services';

// Generate
const generate = onCall<GenerateOpenApiData>(async request => {
  logger.info('[OpenApi::generate] data: ' + JSON.stringify(request.data));
  logger.info('[OpenApi::generate] context.auth: ' + JSON.stringify(request.auth));
  const { data } = request;
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
