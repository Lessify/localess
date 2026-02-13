import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { CDN } from './v1/cdn';
import { MANAGE } from './v1/manage';
import { DEV_TOOLS } from './v1/dev-tools';

// API V1
const expressApp = express();
expressApp.use(cors({ origin: true }));
expressApp.use('/', CDN);
expressApp.use('/', DEV_TOOLS);
expressApp.use('/', MANAGE);

export const v1 = onRequest({ memory: '512MiB' }, expressApp);
