import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {Schema,} from '@shared/models/schema.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {ActivatedRoute, Router} from '@angular/router';
import {SchemaService} from '@shared/services/schema.service';
import {ContentService} from '@shared/services/content.service';
import {
  ContentError,
  ContentKind,
  ContentDocument,
  ContentData
} from '@shared/models/content.model';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {selectSpace} from '@core/state/space/space.selector';
import {distinctUntilChanged, filter, switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, Subject} from 'rxjs';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {DEFAULT_LOCALE, Locale} from '@shared/models/locale.model';
import {v4} from 'uuid';
import {environment} from '../../../../environments/environment';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {SchemaPathItem} from './edit-document.model';
import {SchemaSelectChange} from '../edit-document-schema/edit-document-schema.model';

@Component({
  selector: 'll-content-document-edit',
  templateUrl: './edit-document.component.html',
  styleUrls: ['./edit-document.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditDocumentComponent implements OnInit, OnDestroy {

  isDebug = environment.debug
  selectedSpace?: Space;
  selectedLocale: Locale = DEFAULT_LOCALE;
  availableLocales: Locale[] = [];
  entityId: string;
  document?: ContentDocument;
  documentData: ContentData = {_id: '', schema: ''};
  selectedDocumentData: ContentData = {_id: '', schema: ''};
  rootSchema?: Schema;
  schemaMapByName?: Map<string, Schema>;
  schemaPath: SchemaPathItem[] = [];
  schemas: Schema[] = [];
  contentErrors: ContentError[] | null = null;
  documents: ContentDocument[] = [];

  //Loadings
  isLoading: boolean = true;
  isPublishLoading: boolean = false;
  isSaveLoading: boolean = false;

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly cd: ChangeDetectorRef,
    private readonly spaceService: SpaceService,
    private readonly schemaService: SchemaService,
    private readonly contentService: ContentService,
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
    private readonly contentHelperService: ContentHelperService,
    readonly fe: FormErrorHandlerService,
  ) {
    this.entityId = this.activatedRoute.snapshot.paramMap.get('contentId') || "";
  }

  ngOnInit(): void {
    this.loadData(this.entityId)
  }

  loadData(contentId: string): void {
    this.store.select(selectSpace)
      .pipe(
        distinctUntilChanged(),
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.contentService.findById(it.id, contentId),
            this.contentService.findAllDocuments(it.id),
            this.schemaService.findAll(it.id)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, document, documents, schemas]) => {
          this.selectedSpace = space;
          this.selectedLocale = space.localeFallback;
          this.availableLocales = space.locales;
          this.documents = documents;

          if (document.kind === ContentKind.DOCUMENT) {
            this.document = document;
            this.rootSchema = schemas.find(it => it.id === document.schema);
            this.documentData = document.data || {
              _id: v4(),
              schema: this.rootSchema?.name || ''
            };
          }

          // Generate initial path only once
          if (this.rootSchema && this.schemaPath.length == 0) {
            this.schemaPath = [{
              contentId: this.documentData._id,
              schemaName: this.documentData.schema,
              fieldName: ''
            }];
          }

          // Select content base on path
          this.navigateToSchema(this.schemaPath[this.schemaPath.length - 1])

          this.schemas = schemas;
          this.schemaMapByName = new Map<string, Schema>(this.schemas?.map(it => [it.name, it]));
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  publish(): void {
    this.isPublishLoading = true;
    this.contentService.publish(this.selectedSpace!.id, this.entityId)
      .subscribe({
        next: () => {
          this.notificationService.success('Content has been published.');
        },
        error: () => {
          this.notificationService.error('Content can not be published.');
        },
        complete: () => {
          setTimeout(() => {
            this.isPublishLoading = false
            this.cd.markForCheck()
          }, 1000)
        }
      })
  }

  save(): void {
    console.group('save')
    this.isSaveLoading = true;

    //console.log(this.pageData)

    this.contentErrors = this.contentHelperService.validateContent(this.documentData, this.schemas, this.selectedLocale.id)

    //console.log(this.contentErrors)

    if (!this.contentErrors) {
      this.contentService.updateDocumentData(this.selectedSpace!.id, this.entityId, this.documentData)
        .subscribe({
          next: () => {
            this.notificationService.success('Content has been updated.');
          },
          error: () => {
            this.notificationService.error('Content can not be updated.');
          },
          complete: () => {
            setTimeout(() => {
              this.isSaveLoading = false
              this.cd.markForCheck()
            }, 1000)
          }
        })
    } else {
      this.notificationService.warn('Content is not valid. Please check all fields are filled correctly.')
      this.isSaveLoading = false;
    }
    console.groupEnd()
  }

  back(): void {
    this.router.navigate(['features', 'contents']);
  }

  openPublishedInNewTab(locale: string): void {
    const url = `${location.origin}/api/v1/spaces/${this.selectedSpace?.id}/contents/${this.entityId}?locale=${locale}`
    window.open(url, '_blank')
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  onLocaleChanged(locale: Locale): void {
    this.selectedLocale = locale;
  }

  onSchemaChange(event: SchemaSelectChange): void {
    this.schemaPath.push({
      contentId: event.contentId,
      schemaName: event.schemaName,
      fieldName: event.fieldName
    });
    const field = this.selectedDocumentData[event.fieldName]
    console.log(Array.isArray(field))

    if (Array.isArray(field)) {
      this.selectedDocumentData = field.find((it: ContentData) => it._id == event.contentId);
    } else {
      this.selectedDocumentData = field
    }
  }

  navigateToSchema(pathItem: SchemaPathItem): void {
    const idx = this.schemaPath.findIndex((it) => it.contentId == pathItem.contentId);
    this.schemaPath.splice(idx + 1);
    // Select Root
    if (idx == 0) {
      this.selectedDocumentData = this.documentData;
    } else {
      let localSelectedContent = this.documentData;
      for (const path of this.schemaPath) {
        if (path.fieldName === '') continue;
        const field = localSelectedContent[path.fieldName]
        if (Array.isArray(field)) {
          localSelectedContent = localSelectedContent[path.fieldName].find((it: ContentData) => it._id == path.contentId);
        } else {
          localSelectedContent = field
        }
      }
      this.selectedDocumentData = localSelectedContent;
    }
  }
}
