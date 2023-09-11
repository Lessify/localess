import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import {logger} from 'firebase-functions';
import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';
import {findPluginById} from '../../services/plugin.service';
import {canPerform} from '../../utils/security-utils';
import {Plugin, PluginActionData} from '../../models/plugin.model';
import {UserPermission} from '../../models/user.model';
import {firestoreService} from '../../config';
import {ContentDocument, ContentKind} from '../../models/content.model';
import {FieldValue, UpdateData, WithFieldValue} from 'firebase-admin/firestore';
import {generateProductWithPricesData} from './utils';
import {ProductContentData} from './model';

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
  logger.info(JSON.stringify(event.data.object));
  // Handle the event
  if (event.type === 'product.created') {
    const product = event.data.object as Stripe.Product;
    const documentId = `stripe-product-${product.id}`;
    const productData = await generateProductWithPricesData(stripe, product);
    const add: WithFieldValue<ContentDocument<ProductContentData>> = {
      kind: ContentKind.DOCUMENT,
      name: product.name,
      slug: product.id,
      parentSlug: 'stripe/products',
      fullSlug: `stripe/products/${product.id}`,
      schema: 'stripe-product',
      data: productData,
      locked: true,
      lockedBy: 'Stripe',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await firestoreService.doc(`spaces/${spaceId}/contents/${documentId}`).set(add, {merge: true});
  } else if (event.type === 'product.updated') {
    const product = event.data.object as Stripe.Product;
    const documentId = `stripe-product-${product.id}`;
    const productData = await generateProductWithPricesData(stripe, product);
    const update: UpdateData<ContentDocument<ProductContentData>> = {
      data: productData,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await firestoreService.doc(`spaces/${spaceId}/contents/${documentId}`).update(update, {exists: true});
  } else if (event.type === 'product.deleted') {
    const product = event.data.object as Stripe.Product;
    await firestoreService.doc(`spaces/${spaceId}/contents/stripe-product-${product.id}`).delete({exists: true});
  } else {
    console.log(`Unhandled event type ${event.type}`);
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
  let active: boolean | undefined = true;
  if (productSyncActive === 'true') {
    active = true;
  } else if (productSyncActive === 'false') {
    active = false;
  } else if (productSyncActive === 'all') {
    active = undefined;
  }
  logger.info(`[productSync] to sync active=${active}`);
  await stripe.products.list({
    active: active,
    expand: ['data.default_price', 'data.default_price.tiers'],
  })
    .autoPagingEach(async (product) => {
      // logger.info('[productSync] product: ' + JSON.stringify(product));
      const documentId = `stripe-product-${product.id}`;
      const productData = await generateProductWithPricesData(stripe, product);
      const add: WithFieldValue<ContentDocument<ProductContentData>> = {
        kind: ContentKind.DOCUMENT,
        name: product.name,
        slug: product.id,
        parentSlug: 'stripe/products',
        fullSlug: `stripe/products/${product.id}`,
        schema: 'stripe-product',
        data: productData,
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
