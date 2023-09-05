import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import {logger} from 'firebase-functions';
import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';

const stripe = new Stripe('', {apiVersion: '2023-08-16'});
const expressStripe = express();
expressStripe.use(cors({origin: true}));

const webhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET_KEY');

expressStripe.post('/api/stripe/2023-08-16/spaces/:spaceId/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  logger.info('stripe 2023-08-16 params : ' + JSON.stringify(req.params));
  logger.info('stripe 2023-08-16 query : ' + JSON.stringify(req.query));
  const sig = req.headers['stripe-signature'] as string;
  const {spaceId} = req.params;
  console.log(spaceId);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret.value());
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  console.log(`event type ${event.type}`);
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

export const stripeApi = onRequest({secrets: [webhookSecret]}, expressStripe);
