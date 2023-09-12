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
  SchemaFieldReference,
  SchemaFieldSchema,
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
    version: '1.0.0-beta-9',
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
        displayName: 'Product Sync',
        required: false,
        description: 'Products to sync.',
        defaultValue: 'true',
        options: [
          {
            name: 'All',
            value: 'all'
          },
          {
            name: 'Active Only',
            value: 'true'
          },
          {
            name: 'Archived Only',
            value: 'false'
          }
        ]
      }
    ],
    actions: [
      {
        id: 'productsync',
        name: 'Product Sync',
        icon: 'sync',
        description: 'Sync Products via Stripe API'
      },
      {
        id: 'pricesync',
        name: 'Price Sync',
        icon: 'sync',
        description: 'Sync Price via Stripe API'
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
          version: 1
        },
        {
          id: 'stripe-products',
          kind: ContentKind.FOLDER,
          name: 'Products',
          slug: 'products',
          parentSlug: 'stripe',
          fullSlug: 'stripe/products',
          version: 1
        },
        {
          id: 'stripe-prices',
          kind: ContentKind.FOLDER,
          name: 'Prices',
          slug: 'prices',
          parentSlug: 'stripe',
          fullSlug: 'stripe/prices',
          version: 0
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
              name: 'active',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Active',
              description: 'Whether the product is currently available for purchase.',
              required: true,
              translatable: false,
            } as SchemaFieldBoolean,
            {
              name: 'default_price',
              kind: SchemaFieldKind.REFERENCE,
              displayName: 'Default Price Reference',
              required: false,
              path: 'stripe/prices',
            } as SchemaFieldReference,
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
              name: 'name',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Name',
              description: 'The product’s name, meant to be displayable to the customer.',
              required: true,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'package_dimensions',
              kind: SchemaFieldKind.SCHEMA,
              displayName: 'Package Dimensions',
              description: 'The dimensions of this product for shipping purposes.',
              required: false,
              schemas: ['stripe-product-package-dimensions']
            } as SchemaFieldSchema,
            {
              name: 'shippable',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Shippable',
              description: 'Whether this product is shipped (i.e., physical goods).',
              required: false,
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
              name: 'unit_label',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Unit Label',
              description: 'A label that represents units of this product. When set, this will be included in customers\' receipts, invoices, Checkout, and the customer portal.',
              required: false,
              translatable: false,
            } as SchemaFieldText,
          ],
          version: 2
        },
        {
          id: 'stripe-product-package-dimensions',
          name: 'stripe-product-package-dimensions',
          displayName: 'Stripe Product Package Dimensions',
          type: SchemaType.NODE,
          fields: [
            {
              name: 'height',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Height',
              description: 'Height, in inches.',
              required: true,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'length',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Length',
              description: 'Length, in inches.',
              required: true,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'weight',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Weight',
              description: 'Weight, in inches.',
              required: true,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'width',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Width',
              description: 'Width, in inches.',
              required: true,
              translatable: false,
            } as SchemaFieldNumber,
          ],
          version: 1
        },
        {
          id: 'stripe-price',
          name: 'stripe-price',
          displayName: 'Stripe Price',
          type: SchemaType.ROOT,
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
              name: 'active',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Active',
              description: 'Whether the price can be used for new purchases.',
              required: true,
              translatable: false,
            } as SchemaFieldBoolean,
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
            {
              name: 'currency',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Currency',
              description: 'Three-letter ISO currency code, in lowercase.',
              required: true,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'custom_unit_amount',
              kind: SchemaFieldKind.SCHEMA,
              displayName: 'Custom Unit Amount',
              description: 'When set, provides configuration for the amount to be adjusted by the customer during Checkout Sessions and Payment Links.',
              required: false,
              schemas: ['stripe-price-custom-unit-amount']
            } as SchemaFieldSchema,
            {
              name: 'livemode',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Live Mode',
              description: 'Has the value true if the object exists in live mode or the value false if the object exists in test mode.',
              required: true,
              translatable: false,
            } as SchemaFieldBoolean,
            {
              name: 'lookup_key',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Lookup Key',
              description: 'A lookup key used to retrieve prices dynamically from a static string. This may be up to 200 characters.',
              required: false,
              translatable: false,
              maxLength: 200
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
              name: 'product',
              kind: SchemaFieldKind.REFERENCE,
              displayName: 'Product Reference',
              required: true,
              path: 'stripe/products',
            } as SchemaFieldReference,
            {
              name: 'recurring',
              kind: SchemaFieldKind.SCHEMA,
              displayName: 'Recurring',
              description: 'The recurring components of a price such as interval and usage_type.',
              required: false,
              schemas: ['stripe-price-recurring']
            } as SchemaFieldSchema,
            {
              name: 'tax_behavior',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Tax Behavior',
              description: 'Only required if a default tax behavior was not provided in the Stripe Tax settings. Specifies whether the price is considered inclusive of taxes or exclusive of taxes. One of inclusive, exclusive, or unspecified. Once specified as either inclusive or exclusive, it cannot be changed.',
              required: false,
              translatable: false,
              options: [
                {
                  name: 'Exclusive',
                  value: 'exclusive'
                },
                {
                  name: 'Inclusive',
                  value: 'inclusive'
                },{
                  name: 'Unspecified',
                  value: 'unspecified'
                }              ]
            } as SchemaFieldOption,
            {
              name: 'tiers',
              kind: SchemaFieldKind.SCHEMAS,
              displayName: 'Tiers',
              description: 'Each element represents a pricing tier. This parameter requires billing_scheme to be set to tiered. See also the documentation for billing_scheme. This field is not included by default. To include it in the response, expand the tiers field.',
              required: false,
              schemas: ['stripe-price-tier']
            } as SchemaFieldSchemas,
            {
              name: 'tiers_mode',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Tiers Mode',
              description: 'Defines if the tiering price should be graduated or volume based. In volume-based tiering, the maximum quantity within a period determines the per unit price. In graduated tiering, pricing can change as the quantity grows.',
              required: false,
              translatable: false,
              options: [
                {
                  name: 'Graduated',
                  value: 'graduated'
                },
                {
                  name: 'Volume',
                  value: 'volume'
                }
              ]
            } as SchemaFieldOption,
            {
              name: 'type',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Type',
              description: 'One of one_time or recurring depending on whether the price is for a one-time purchase or a recurring (subscription) purchase.',
              required: true,
              translatable: false,
              options: [
                {
                  name: 'One Time',
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
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'unit_amount_decimal',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Unit Amount Decimal',
              description: 'The unit amount in rappen/cent to be charged, represented as a whole integer if possible. Only set if billing_scheme=per_unit.',
              required: false,
              translatable: false,
            } as SchemaFieldText
          ],
          version: 7
        },
        {
          id: 'stripe-price-recurring',
          name: 'stripe-price-recurring',
          displayName: 'Stripe Product Price Recurring',
          type: SchemaType.NODE,
          previewField: 'interval',
          fields: [
            {
              name: 'aggregate_usage',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Aggregate Usage',
              description: 'Specifies a usage aggregation strategy for prices of usage_type=metered. Allowed values are sum for summing up all usage during a period, last_during_period for using the last usage record reported within a period, last_ever for using the last usage record ever (across period bounds) or max which uses the usage record with the maximum reported usage during a period. Defaults to sum.',
              required: false,
              translatable: false,
              options: [
                {
                  name: 'Last During Period',
                  value: 'last_during_period'
                },
                {
                  name: 'Last Ever',
                  value: 'last_ever'
                },
                {
                  name: 'Max',
                  value: 'max'
                },
                {
                  name: 'Sum',
                  value: 'sum'
                }
              ]
            } as SchemaFieldOption,
            {
              name: 'interval',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Interval',
              description: 'Specifies a usage aggregation strategy for prices of usage_type=metered. Allowed values are sum for summing up all usage during a period, last_during_period for using the last usage record reported within a period, last_ever for using the last usage record ever (across period bounds) or max which uses the usage record with the maximum reported usage during a period. Defaults to sum.',
              required: true,
              translatable: false,
              options: [
                {
                  name: 'Day',
                  value: 'day'
                },
                {
                  name: 'Month',
                  value: 'month'
                },
                {
                  name: 'Week',
                  value: 'week'
                },
                {
                  name: 'Year',
                  value: 'year'
                }
              ]
            } as SchemaFieldOption,
            {
              name: 'interval_count',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Interval Count',
              description: 'The number of intervals (specified in the interval attribute) between subscription billings. For example, interval=month and interval_count=3 bills every 3 months.',
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'usage_type',
              kind: SchemaFieldKind.OPTION,
              displayName: 'Usage Type',
              description: 'Configures how the quantity per period should be determined. Can be either metered or licensed. licensed automatically bills the quantity set when adding it to a subscription. metered aggregates the total usage based on usage records. Defaults to licensed.',
              required: true,
              translatable: false,
              options: [
                {
                  name: 'Licensed',
                  value: 'licensed'
                },
                {
                  name: 'Metered',
                  value: 'metered'
                }
              ]
            } as SchemaFieldOption,
          ],
          version: 2
        },
        {
          id: 'stripe-price-tier',
          name: 'stripe-price-tier',
          displayName: 'Stripe Product Price Tier',
          previewField: 'up_to',
          type: SchemaType.NODE,
          fields: [
            {
              name: 'flat_amount',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Flat Amount',
              description: 'Price for the entire tier.',
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'flat_amount_decimal',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Flat Amount Decimal',
              description: 'Price for the entire tier.',
              required: false,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'unit_amount',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Unit Amount',
              description: 'Per unit price for units relevant to the tier.',
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'unit_amount_decimal',
              kind: SchemaFieldKind.TEXT,
              displayName: 'Unit Amount Decimal',
              description: 'Per unit price for units relevant to the tier.',
              required: false,
              translatable: false,
            } as SchemaFieldText,
            {
              name: 'up_to',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Up To',
              description: 'Up to and including to this quantity will be contained in the tier.',
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
          ],
          version: 3
        },
        {
          id: 'stripe-price-custom-unit-amount',
          name: 'stripe-price-custom-unit-amount',
          displayName: 'Stripe Price Custom Unit Amount',
          type: SchemaType.NODE,
          fields: [
            {
              name: 'maximum',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Maximum',
              description: 'The maximum unit amount the customer can specify for this item.',
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'minimum',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Minimum',
              description: 'The minimum unit amount the customer can specify for this item. Must be at least the minimum charge amount.',
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
            {
              name: 'preset',
              kind: SchemaFieldKind.NUMBER,
              displayName: 'Preset',
              description: 'The starting unit amount which can be updated by the customer.',
              required: false,
              translatable: false,
            } as SchemaFieldNumber,
          ],
          version: 1
        }
      ]
    },
    uninstall: {
      contentRootIds: ['stripe'],
      schemasIds: [
        'stripe-product',
        'stripe-product-package-dimensions',
        'stripe-price',
        'stripe-price-recurring',
        'stripe-price-tire',
        'stripe-price-custom-unit-amount'
      ]
    }
  },
  'll-ecommerce' : {
    id: 'll-ecommerce',
    name: 'Localess E-Commerce',
    owner: 'Lessify GmbH',
    version: '0.0.1-beta-0',
    install : {
      contents: [
      ],
      schemas: [
        {
          id: 'll-product',
          name: 'll-product',
          type: SchemaType.ROOT,
          displayName: 'Product',
          previewField: 'name',
          fields: [],
          version: 0
        }
      ]
    },
  }
}
