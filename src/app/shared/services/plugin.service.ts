import {Injectable} from '@angular/core';
import {
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
  setDoc,
  UpdateData,
  updateDoc
} from '@angular/fire/firestore';
import {from, Observable, of} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {Plugin, PluginConfiguration, PluginDefinition} from '@shared/models/plugin.model';
import {PartialWithFieldValue} from '@firebase/firestore';
import {ContentKind} from '@shared/models/content.model';
import {
  SchemaFieldBoolean,
  SchemaFieldKind,
  SchemaFieldNumber,
  SchemaFieldOption,
  SchemaFieldSchemas,
  SchemaFieldText,
  SchemaFieldTextarea,
  SchemaType
} from '@shared/models/schema.model';
import {Functions, httpsCallableData} from "@angular/fire/functions";
import {ObjectUtils} from "@core/utils/object-utils.service";

@Injectable()
export class PluginService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
  }

  findAll(spaceId: string): Observable<Plugin[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('createdAt', 'desc')]

    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/plugins`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Plugins:findAll'),
        map((it) => it as Plugin[]),
        map((it) =>
          it.map((plugin) => {
            const aPlugin = AVAILABLE_PLUGINS_MAP[plugin.id]
            plugin.latestVersion = aPlugin.version
            return plugin;
          })
        )
      );
  }

  findAllAvailable(spaceId: string): Observable<PluginDefinition[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/plugins`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Plugins:findAll'),
        map((it) => it as Plugin[]),
        map((dbPlugins) => {
          const pcl: PluginDefinition[] = []
          Object.getOwnPropertyNames(AVAILABLE_PLUGINS_MAP)
            .forEach((aPluginId) => {
              const isPluginInstalled = dbPlugins.some((it) => it.id === aPluginId);
              if (isPluginInstalled === false) {
                pcl.push(AVAILABLE_PLUGINS_MAP[aPluginId])
              }
            })
          return pcl
        })
      )
  }

  findById(spaceId: string, id: string): Observable<Plugin> {
    return docData(doc(this.firestore, `spaces/${spaceId}/plugins/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Plugins:findById'),
        map((it) => it as Plugin)
      );
  }

  install(spaceId: string, id: string): Observable<boolean> {
    const plugin = AVAILABLE_PLUGINS_MAP[id]
    if (plugin) {
      const addEntity: PartialWithFieldValue<Plugin> = {
        name: plugin.name,
        owner: plugin.owner,
        version: plugin.version,
        configurationFields: plugin.configurationFields,
        actions: plugin.actions,
        install: plugin.install,
        uninstall: plugin.uninstall,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      return from(setDoc(doc(this.firestore, `spaces/${spaceId}/plugins/${id}`), addEntity))
        .pipe(
          traceUntilFirst('Firestore:Plugins:create'),
          map(it => true)
        );
    }
    return of(false)
  }

  sendEvent(spaceId: string, id: string, actionId: string): Observable<void> {
    const pluginEvent = httpsCallableData<{ spaceId: string}, void>(this.functions, `${id}-${actionId}`);
    return pluginEvent({spaceId})
      .pipe(
        traceUntilFirst(`Functions:Plugins:sendEvent:${id}-${actionId}`),
      );
  }

  updateConfiguration(spaceId: string, id: string, configuration: PluginConfiguration): Observable<void> {
    ObjectUtils.clean(configuration)
    const update: UpdateData<Plugin> = {
      configuration: configuration,
      updatedAt: serverTimestamp()
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/plugins/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Plugins:updateConfiguration'),
      );
  }

  updateVersion(spaceId: string, id: string): Observable<boolean> {
    const plugin = AVAILABLE_PLUGINS_MAP[id]
    if (plugin) {
      const update: UpdateData<Plugin> = {
        name: plugin.name,
        owner: plugin.owner,
        version: plugin.version,
        configurationFields: plugin.configurationFields,
        actions: plugin.actions,
        install: plugin.install,
        uninstall: plugin.uninstall,
        updatedAt: serverTimestamp()
      }
      return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/plugins/${id}`), update))
        .pipe(
          traceUntilFirst('Firestore:Plugins:updateVersion'),
          map(it => true)
        );
    }
    return of(false)
  }

  uninstall(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/plugins/${id}`)))
      .pipe(
        traceUntilFirst('Firestore:Plugins:delete'),
      );
  }

}

const AVAILABLE_PLUGINS_MAP: Record<string, PluginDefinition> = {
  'stripe': {
    id: 'stripe',
    name: 'Stripe',
    owner: 'Lessify GmbH',
    version: '16',
    configurationFields: [
      {
        name: 'apiSecretKey',
        displayName: 'API Secret Key',
        required: true,
        description: 'Can be found in API Keys tab.'
      },
      {
        name: 'webhookSigningSecret',
        displayName: 'Webhook Signing Secret',
        required: false,
        description: 'Can be fond in Webhook details page.'
      },
      {
        name: 'productSyncActive',
        displayName: 'Product Sync Active',
        required: false,
        description: 'Product active status to be synced',
        defaultValue: 'all',
        options: [
          {
            name: 'All',
            value: 'all'
          },
          {
            name: 'Yes',
            value: 'true'
          },
          {
            name: 'No',
            value: 'false'
          }
        ]
      }
    ],
    actions: [
      {
        id: 'productsync',
        name: 'Product Sync',
        description: 'Sync Products via Stripe API'
      }
    ],
    install: {
      contents: [
        {
          id: 'stripe',
          kind: ContentKind.FOLDER,
          name: 'Stripe',
          slug: 'stripe',
          parentSlug: '',
          fullSlug: 'stripe',
          version: 2
        },
        {
          id: 'stripe-products',
          kind: ContentKind.FOLDER,
          name: 'Products',
          slug: 'products',
          parentSlug: 'stripe',
          fullSlug: 'stripe/products',
          version: 3
        },
      ],
      schemas: [
        {
          id: 'stripe-product',
          name: 'stripe-product',
          displayName: 'Stripe Product',
          type: SchemaType.ROOT,
          previewField: 'name',
          fields: [
            {
              name: 'id',
              kind: SchemaFieldKind.TEXT,
              displayName: 'ID',
              description: 'Product unique identifier.',
              required: true,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'name',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Name',
              description: 'The product’s name, meant to be displayable to the customer.',
              required: true,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'active',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Active',
              description: 'Whether the product is currently available for purchase.',
              required: true,
              translatable: false,
            } as SchemaFieldBoolean,
            {
              name: 'description',
              kind: SchemaFieldKind.TEXTAREA,
              displayName: 'Description',
              description: 'The product’s description, meant to be displayable to the customer. Use this field to optionally store a long form explanation of the product being sold for your own rendering purposes.',
              required: false,
              translatable: false,
            } as SchemaFieldTextarea,
            {
              name: 'livemode',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Live Mode',
              description: 'Has the value true if the object exists in live mode or the value false if the object exists in test mode.',
              required: true,
              translatable: false,
            } as SchemaFieldBoolean,
            {
              name: 'type',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Type',
              description: 'Has the value true if the object exists in live mode or the value false if the object exists in test mode.',
              required: true,
              translatable: false,
              options: [
                {
                  name: 'Good',
                  value: 'good'
                },
                {
                  name: 'Service',
                  value: 'service'
                }
              ]
            } as SchemaFieldOption,
            {
              name: 'prices',
              kind: SchemaFieldKind.SCHEMAS,
              displayName: 'Prices',
              description: 'Product prices',
              required: false,
              schemas: ['stripe-price']
            } as SchemaFieldSchemas
          ],
          version: 11
        },
        {
          id: 'stripe-price',
          name: 'stripe-price',
          displayName: 'Stripe Price',
          type: SchemaType.NODE,
          previewField: 'id',
          fields: [
            {
              name: 'id',
              kind: SchemaFieldKind.TEXT,
              displayName: 'ID',
              description: 'Price unique identifier.',
              required: true,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'nickname',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Nickname',
              description: 'A brief description of the price, hidden from customers.',
              required: false,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'active',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Active',
              description: 'Whether the price can be used for new purchases.',
              required: true,
              translatable: false,
            } as SchemaFieldBoolean,
            {
              name: 'currency',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Currency',
              description: 'Three-letter ISO currency code, in lowercase.',
              required: true,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'livemode',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Live Mode',
              description: 'Has the value true if the object exists in live mode or the value false if the object exists in test mode.',
              required: true,
              translatable: false,
            } as SchemaFieldBoolean,
            {
              name: 'type',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Type',
              description: 'One of one_time or recurring depending on whether the price is for a one-time purchase or a recurring (subscription) purchase.',
              required: true,
              translatable: false,
              options: [
                {
                  name: 'One tIME',
                  value: 'one_time'
                },
                {
                  name: 'Recurring',
                  value: 'recurring'
                }
              ]
            } as SchemaFieldOption,
            {
              name: 'unit_amount',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Unit Amount',
              description: 'The unit amount in rappen/cent to be charged, represented as a whole integer if possible. Only set if billing_scheme=per_unit.',
              required: true,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'billing_scheme',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Billing Scheme',
              description: 'Describes how to compute the price per period. Either per_unit or tiered. per_unit indicates that the fixed amount (specified in unit_amount or unit_amount_decimal) will be charged per unit in quantity (for prices with usage_type=licensed), or per unit of total usage (for prices with usage_type=metered). tiered indicates that the unit pricing will be computed using a tiering strategy as defined using the tiers and tiers_mode attributes.',
              required: true,
              translatable: false,
              options: [
                {
                  name: 'Per Unit',
                  value: 'per_unit'
                },
                {
                  name: 'Tiered',
                  value: 'tiered'
                }
              ]
            } as SchemaFieldOption,
          ],
          version: 13
        }
      ]
    },
    uninstall: {
      contentRootIds: ['stripe'],
      schemasIds: ['stripe-product', 'stripe-price']
    }
  }
}
