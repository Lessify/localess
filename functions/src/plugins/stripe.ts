import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import {logger} from 'firebase-functions';
import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';
import {findPluginById} from '../services/plugin.service';
import {canPerform} from '../utils/security-utils';
import {Plugin, PluginActionData} from '../models/plugin.model';
import {UserPermission} from '../models/user.model';
import {firestoreService} from '../config';
import {ContentData, ContentDocument, ContentKind} from '../models/content.model';
import {FieldValue, WithFieldValue} from 'firebase-admin/firestore';

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

  const stripe = new Stripe(apiSecretKey, {apiVersion: '2023-08-16'});

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSigningSecret);
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
  if (!canPerform(UserPermission.SPACE_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const {spaceId} = request.data;
  const pluginSnapshot = await findPluginById(spaceId, 'stripe').get();
  if (!pluginSnapshot.exists) {
    throw new HttpsError('failed-precondition', 'Stripe Plugin not installed.');
  }
  const plugin = pluginSnapshot.data() as Plugin;
  const {apiSecretKey, productSyncActive} = plugin.configuration || {};
  if (apiSecretKey === undefined) {
    throw new HttpsError('failed-precondition', 'API Secret Key not configured.');
  }
  const stripe = new Stripe(apiSecretKey, {apiVersion: '2023-08-16'});
  const batch = firestoreService.batch();
  let count = 0;
  let active: boolean | undefined;
  switch (productSyncActive) {
    case 'true': {
      active = true;
      break;
    }
    case 'false': {
      active = false;
      break;
    }
  }
  await stripe.products.list({active: active}).autoPagingEach((product) => {
    logger.info('[productSync] product: ' + JSON.stringify(product));
    const prices: ContentData[] = [];
    stripe.prices.list({product: product.id}).autoPagingEach((price) => {
      logger.info('[productSync] price: ' + JSON.stringify(price));
      prices.push(
        {
          _id: price.id,
          schema: 'stripe-price',
          nickname: price.nickname,
          id: price.id,
          active: price.active,
          currency: price.currency,
          livemode: price.livemode,
          type: price.type,
          unit_amount: price.unit_amount,
          billing_scheme: price.billing_scheme,
        } as ContentData
      );
    });
    const documentId = `stripe-product-${product.id}`;
    const add: WithFieldValue<ContentDocument> = {
      kind: ContentKind.DOCUMENT,
      name: product.name,
      slug: product.id,
      parentSlug: 'stripe/products',
      fullSlug: `stripe/products/${product.id}`,
      schema: 'stripe-product',
      data: {
        _id: product.id,
        schema: 'stripe-product',
        id: product.id,
        name: product.name,
        active: product.active,
        description: product.description,
        livemode: product.livemode,
        type: product.type,
        prices: prices,
      } as ContentData,
      locked: true,
      lockedBy: 'Stripe',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(firestoreService.doc(`spaces/${spaceId}/contents/${documentId}`), add, {merge: true});
    count++;
  });
  if (count > 0) {
    logger.info('[productSync] batch.commit() : ' + count);
    await batch.commit();
  }
  logger.info('[productSync] finished');
});

export const stripe = {
  api: onRequest(expressApp),
  productsync: productSync,
};
