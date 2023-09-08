import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import {logger} from 'firebase-functions';
import {onRequest, onCall, HttpsError} from 'firebase-functions/v2/https';
import {findPluginById} from '../services/plugin.service';
import {Plugin, PluginActionData} from '../models/plugin.model';

const expressApp = express();
expressApp
  .use(cors({origin: true}));

expressApp.post('/api/stripe/2023-08-16/spaces/:spaceId/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  logger.info('stripe params : ' + JSON.stringify(req.params));
  logger.info('stripe query : ' + JSON.stringify(req.query));
  const sig = req.headers['stripe-signature']!;
  const {spaceId} = req.params;
  const pluginSnapshot = await findPluginById(spaceId, 'stripe').get();
  if (!pluginSnapshot.exists) {
    res
      .status(404)
      .send(new HttpsError('not-found', 'not found'));
    return;
  }
  const plugin = pluginSnapshot.data() as Plugin;
  const {apiSecretKey, webhookSigningSecret} = plugin.configuration || {};
  if (apiSecretKey === undefined || webhookSigningSecret === undefined) {
    res
      .status(404)
      .send(new HttpsError('not-found', 'configuration not found'));
    return;
  }

  const stripeApp = new Stripe(apiSecretKey, {apiVersion: '2023-08-16'});

  let event: Stripe.Event;

  try {
    event = stripeApp.webhooks.constructEvent((req as any).rawBody, sig, webhookSigningSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  logger.info(`event type ${event.type}`);
  logger.info(JSON.stringify(event.data));
  // Handle the event
  switch (event.type) {
    case 'product.created': {
      console.log(`event type ${event.type}`);
      break;
    }
    case 'product.updated': {
      console.log(`event type ${event.type}`);
      break;
    }
    case 'product.deleted': {
      console.log(`event type ${event.type}`);
      break;
    }
    default: {
      console.log(`Unhandled event type ${event.type}`);
    }
  }


  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

const productSync = onCall<PluginActionData>(async (request) => {
  logger.info('[productSync] data: ' + JSON.stringify(request.data));
  logger.info('[productSync] context.auth: ' + JSON.stringify(request.auth));
});

export const stripe = {
  api: onRequest(expressApp),
  productSync: productSync,
};
