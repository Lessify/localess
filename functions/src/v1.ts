import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { CDN } from './v1/cdn';
import { MANAGE } from './v1/manage';
import { DEV_TOOLS } from './v1/dev-tools';

// API V1
const expressApp = express();
expressApp.use(cors({ origin: true }));
// 5mb instead of the express default 100kb: schema push payloads carry a whole space's schemas in one body.
expressApp.use(express.json({ limit: '5mb' }));
expressApp.use('/', CDN);
expressApp.use('/', DEV_TOOLS);
expressApp.use('/', MANAGE);

// `maxInstances` overrides the codebase-wide `setGlobalOptions({ maxInstances: 1 })` in `index.ts`.
// This is the only public, unauthenticated-traffic-facing function: a single instance makes it a
// hard scaling ceiling and a single point of failure for every consumer's CDN cache miss and
// `cv` redirect.
//
// `concurrency` is set explicitly rather than left at the Gen 2 default of 80. Since every
// `image/jpeg` request now decodes and re-encodes through sharp (see `resolveDefaultFormat`),
// this function is memory-bound on raw pixel buffers rather than on request count: a single
// 6000x4000 JPEG costs ~72MB decoded, so a handful in flight together is what exhausts an
// instance, not traffic volume. 20 x 1GiB is the starting point — revisit against observed
// memory utilisation rather than treating it as tuned.
export const v1 = onRequest({ memory: '1GiB', concurrency: 20, maxInstances: 10 }, expressApp);
