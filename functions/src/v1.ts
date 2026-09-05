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
// `cv` redirect. At 600 concurrency per instance this bounds the API at ~6000 concurrent requests
// while still capping runaway cost.
export const v1 = onRequest({ memory: '512MiB', maxInstances: 10 }, expressApp);
