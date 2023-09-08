import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import {logger} from 'firebase-functions';
import {onRequest, HttpsError} from 'firebase-functions/v2/https';
import {findPluginById} from '../services/plugin.service';
import {Plugin} from '../models/plugin.model';

const stripe = new Stripe('', {apiVersion: '2023-08-16'});
const expressStripe = express();
expressStripe.use(cors({origin: true}));


expressStripe.post('/api/stripe/2023-08-16/spaces/:spaceId/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  logger.info('stripe params : ' + JSON.stringify(req.params));
  logger.info('stripe query : ' + JSON.stringify(req.query));
  const sig = req.headers['stripe-signature'] as string;
  const {spaceId} = req.params;
  const pluginSnapshot = await findPluginById(spaceId, 'stripe').get();
  if (!pluginSnapshot.exists) {
    res
      .status(404)
      .send(new HttpsError('not-found', 'not found'));
    return;
  }
  const plugin = pluginSnapshot.data() as Plugin;
  const {webhookSecret} = plugin.configuration || {};
  if (webhookSecret === undefined) {
    res
      .status(404)
      .send(new HttpsError('not-found', 'secret not found'));
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  logger.info(`event type ${event.type}`);
  logger.info(JSON.stringify(event));
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

export const stripeapi = onRequest(expressStripe);
