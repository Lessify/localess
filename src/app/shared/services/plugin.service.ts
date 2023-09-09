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
import {SchemaFieldBoolean, SchemaFieldKind, SchemaFieldText, SchemaFieldTextarea, SchemaType} from '@shared/models/schema.model';
import {Functions, httpsCallableData} from "@angular/fire/functions";

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
    version: '8',
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
      }
    ],
    actions: [
      {
        id: 'productsync',
        name: 'Product Sync'
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
              name: 'active',
              kind: SchemaFieldKind.BOOLEAN,
              displayName: 'Active',
              description: 'Whether the product is currently available for purchase.',
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
          ],
          version: 7
        }
      ]
    },
    uninstall: {
      contentRootIds: ['stripe'],
      schemasIds: ['stripe-product']
    }
  }
}
