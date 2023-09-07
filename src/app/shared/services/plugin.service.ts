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
import {SchemaFieldKind, SchemaType} from '@shared/models/schema.model';

@Injectable()
export class PluginService {
  constructor(
    private readonly firestore: Firestore,
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
    version: '1',
    configurationFields: [
      {
        name: 'webhookSecret',
        displayName: 'webhookSecret',
        required: true,
        description: 'Stripe Webhook Secret'
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
          version: 0
        }
      ],
      schemas: [
        {
          id: 'stripe-product',
          name: 'stripe-product',
          displayName: 'Stripe Product',
          type: SchemaType.ROOT,
          previewField: 'id',
          fields: [
            {
              name: 'id',
              kind: SchemaFieldKind.TEXT,
              displayName: 'ID',
              description: 'Product unique identifier',
              required: true,
              translatable: false,
            }
          ],
          version: 0
        }
      ]
    },
    uninstall: {
      contentRootIds: ['stripe'],
      schemasIds: ['stripe-product']
    }
  }
}
