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
import {Plugin, PluginConfiguration, PluginDefinition, PluginStatus} from '@shared/models/plugin.model';
import {PartialWithFieldValue} from '@firebase/firestore';
import {ContentKind} from "@shared/models/content.model";

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
            if (aPlugin) {
              plugin.status = PluginStatus.INSTALLED
            } else {
              plugin.status = PluginStatus.UNKNOWN
            }
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

  install(spaceId: string, id: string): Observable<'installed' | 'not-found'> {
    const plugin = AVAILABLE_PLUGINS_MAP[id]
    if (plugin) {
      const addEntity: PartialWithFieldValue<Plugin> = {
        name: plugin.name,
        owner: plugin.owner,
        version: plugin.version,
        configurationFields: plugin.configurationFields,
        contents: plugin.contents,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      return from(setDoc(doc(this.firestore, `spaces/${spaceId}/plugins/${id}`), addEntity))
        .pipe(
          traceUntilFirst('Firestore:Plugins:create'),
          map(it => 'installed')
        );
    }
    return of('not-found')
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
    version: '0',
    configurationFields: [
      {
        name: 'webhookSecret',
        displayName: 'webhookSecret',
        required: true,
        description: 'Stripe Webhook Secret'
      }
    ],
    contents: [
      {
        id: 'stripe',
        kind: ContentKind.FOLDER,
        name: 'Stripe',
        slug: 'stripe',
        parentSlug: '',
        fullSlug: 'stripe'
      }
    ]
  }
}
