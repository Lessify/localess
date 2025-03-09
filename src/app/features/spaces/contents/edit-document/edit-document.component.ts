import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { BreadcrumbComponent, BreadcrumbItemComponent } from '@shared/components/breadcrumb';
import { StatusComponent } from '@shared/components/status';
import { AnimateDirective } from '@shared/directives/animate.directive';
import { DirtyFormGuardComponent } from '@shared/guards/dirty-form.guard';
import { ContentHistory } from '@shared/models/content-history.model';
import { ContentData, ContentDocument, ContentError, ContentKind } from '@shared/models/content.model';
import { DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { Schema, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { Space, SpaceEnvironment } from '@shared/models/space.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { ContentHistoryService } from '@shared/services/content-history.service';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { SpaceService } from '@shared/services/space.service';
import { TokenService } from '@shared/services/token.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { v4 } from 'uuid';
import { EditDocumentSchemaComponent } from '../edit-document-schema/edit-document-schema.component';
import { SchemaSelectChange } from '../edit-document-schema/edit-document-schema.model';
import { EventToApp, EventToEditor, SchemaPathItem } from './edit-document.model';

@Component({
  selector: 'll-content-document-edit',
  standalone: true,
  templateUrl: './edit-document.component.html',
  styleUrls: ['./edit-document.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    CanUserPerformPipe,
    CommonModule,
    StatusComponent,
    MatDividerModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatCardModule,
    BreadcrumbComponent,
    BreadcrumbItemComponent,
    EditDocumentSchemaComponent,
    MatExpansionModule,
    AnimateDirective,
  ],
})
export class EditDocumentComponent implements OnInit, DirtyFormGuardComponent {
  // Input
  spaceId = input.required<string>();
  contentId = input.required<string>();

  preview = viewChild<ElementRef<HTMLIFrameElement>>('preview');

  showHistory = false;

  selectedSpace?: Space;
  selectedLocale: Locale = DEFAULT_LOCALE;
  hoverSchemaPath = signal<string[] | undefined>(undefined);
  selectedEnvironment?: SpaceEnvironment;
  iframeUrl?: SafeUrl;
  availableLocales: Locale[] = [];
  availableLocalesMap: Map<string, string> = new Map<string, string>();
  document?: ContentDocument;
  documentData: ContentData = { _id: '', schema: '' };
  selectedDocumentData: ContentData = { _id: '', schema: '' };
  documentIdsTree: Map<string, string[]> = new Map<string, string[]>();
  rootSchema?: Schema;
  schemaMapById: Map<string, Schema> = new Map<string, Schema>();
  schemaPath: SchemaPathItem[] = [];
  schemas: Schema[] = [];
  contentErrors: ContentError[] = [];
  documents: ContentDocument[] = [];

  //Loadings
  isLoading = signal(true);
  isPublishLoading = signal(false);
  isSaveLoading = signal(false);
  //Store
  spaceStore = inject(SpaceStore);
  settingsStore = inject(LocalSettingsStore);
  // Subscriptions
  history$?: Observable<ContentHistory[]>;

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly router: Router,
    private readonly cd: ChangeDetectorRef,
    private readonly spaceService: SpaceService,
    private readonly schemaService: SchemaService,
    private readonly contentService: ContentService,
    private readonly contentHistoryService: ContentHistoryService,
    private readonly tokenService: TokenService,
    private readonly notificationService: NotificationService,
    private readonly contentHelperService: ContentHelperService,
    private readonly sanitizer: DomSanitizer,
    readonly fe: FormErrorHandlerService,
  ) {
    toObservable(this.spaceStore.selectedSpaceId)
      .pipe(
        distinctUntilChanged(),
        filter(it => it !== undefined), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it!),
            this.contentService.findById(it!, this.contentId()),
            this.contentService.findAllDocuments(it!),
            this.schemaService.findAll(it!),
          ]),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ([space, document, documents, schemas]) => {
          this.selectedSpace = space;
          //this.selectedLocale = space.localeFallback;
          this.availableLocales = [DEFAULT_LOCALE, ...space.locales];
          this.availableLocalesMap = new Map<string, string>(this.availableLocales.map(it => [it.id, it.name]));
          this.documents = documents;
          //console.log(ObjectUtils.clone(document))

          if (document.kind === ContentKind.DOCUMENT) {
            this.document = document;
            this.rootSchema = schemas.find(it => it.id === document.schema);
            if (document.data === undefined) {
              this.documentData = {
                _id: v4(),
                schema: this.rootSchema?.id || '',
              };
            } else if (typeof document.data === 'string') {
              this.documentData = JSON.parse(document.data);
            } else {
              this.documentData = ObjectUtils.clone(document.data);
            }
          }

          // Generate initial path only once
          if (this.rootSchema && this.schemaPath.length == 0) {
            this.schemaPath = [
              {
                contentId: this.documentData._id,
                schemaName: this.documentData.schema,
                fieldName: '',
              },
            ];
          }

          // Select content base on path
          this.navigateToSchemaBackwards(this.schemaPath[this.schemaPath.length - 1]);
          // Select Environment
          if (this.selectedEnvironment === undefined && space.environments && space.environments.length > 0) {
            this.changeEnvironment(space.environments[0]);
          }
          this.schemas = schemas;
          this.schemaMapById = new Map<string, Schema>(this.schemas?.map(it => [it.id, it]));
          this.generateDocumentIdsTree();
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  ngOnInit(): void {
    this.history$ = this.contentHistoryService.findAll(this.spaceId(), this.contentId());
  }

  get isFormDirty(): boolean {
    return JSON.stringify(this.document?.data) !== JSON.stringify(this.contentHelperService.clone(this.documentData));
  }

  publish(): void {
    this.isPublishLoading.set(true);
    this.contentService.publish(this.spaceId(), this.contentId()).subscribe({
      next: () => {
        this.notificationService.success('Content has been published.');
        this.sendEventToApp({ type: 'publish' });
      },
      error: () => {
        this.notificationService.error('Content can not be published.');
      },
      complete: () => {
        setTimeout(() => {
          this.isPublishLoading.set(false);
          this.cd.markForCheck();
        }, 1000);
      },
    });
  }

  save(): void {
    //console.group('save')
    this.isSaveLoading.set(true);

    //console.log('documentData', this.documentData)
    //console.log('document', this.document)
    this.contentErrors = [];
    this.contentErrors.push(...this.contentHelperService.validateContent(this.documentData, this.schemas, DEFAULT_LOCALE.id));
    for (const locale of this.selectedSpace?.locales || []) {
      this.contentErrors.push(...this.contentHelperService.validateContent(this.documentData, this.schemas, locale.id));
    }

    //console.log(this.contentErrors)

    if (this.contentErrors.length === 0) {
      this.contentService.updateDocumentData(this.spaceId(), this.contentId(), this.documentData).subscribe({
        next: () => {
          this.notificationService.success('Content has been saved in draft.');
          this.sendEventToApp({ type: 'save' });
        },
        error: () => {
          this.notificationService.error('Content can not be saved.');
        },
        complete: () => {
          setTimeout(() => {
            this.isSaveLoading.set(false);
            this.cd.markForCheck();
          }, 1000);
        },
      });
    } else {
      this.notificationService.warn('Content is not valid. Please check all fields are filled correctly.');
      this.isSaveLoading.set(false);
    }
    //console.groupEnd()
  }

  back(): void {
    this.router.navigate(['features', 'spaces', this.spaceId(), 'contents']);
  }

  openDraftInNewTab(locale: string): void {
    this.tokenService.findFirst(this.spaceId()).subscribe({
      next: tokens => {
        if (tokens.length === 1) {
          const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId()}/contents/${this.contentId()}`);
          url.searchParams.set('locale', locale);
          url.searchParams.set('version', 'draft');
          url.searchParams.set('token', tokens[0].id);
          window.open(url, '_blank');
        } else {
          this.notificationService.warn('Please create Access Token in your Space Settings');
        }
      },
    });
  }

  openPublishedInNewTab(locale: string): void {
    this.tokenService.findFirst(this.spaceId()).subscribe({
      next: tokens => {
        if (tokens.length === 1) {
          const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId()}/contents/${this.contentId()}`);
          url.searchParams.set('locale', locale);
          url.searchParams.set('token', tokens[0].id);
          window.open(url, '_blank');
        } else {
          this.notificationService.warn('Please create Access Token in your Space Settings');
        }
      },
    });
  }

  onLocaleChanged(locale: Locale): void {
    this.selectedLocale = locale;
  }

  onSchemaChange(event: SchemaSelectChange): void {
    console.log('onSchemaChange', event);
    this.navigateToSchemaForwards({
      contentId: event.contentId,
      schemaName: event.schemaName,
      fieldName: event.fieldName,
    });
  }

  navigateToSchemaForwards(pathItem: SchemaPathItem): void {
    //console.group('navigateToSchemaForwards')
    //console.log(pathItem)
    this.schemaPath.push(pathItem);
    const field = this.selectedDocumentData[pathItem.fieldName];
    if (Array.isArray(field)) {
      this.selectedDocumentData = field.find((it: ContentData) => it._id == pathItem.contentId);
    } else {
      this.selectedDocumentData = field;
    }
    // Send Message to iFrame about Schema Selection
    this.sendEventToApp({ type: 'enterSchema', id: pathItem.contentId });
    //console.groupEnd()
  }

  navigateToSchemaBackwards(pathItem: SchemaPathItem): void {
    //console.group('navigateToSchemaBackwards')
    //console.log('pathItem', pathItem)
    const idx = this.schemaPath.findIndex(it => it.contentId == pathItem.contentId);
    this.schemaPath.splice(idx + 1);
    // Select Root
    if (idx == 0) {
      //console.log(`Navigate to Root idx=${idx}`)
      //console.log('documentData', ObjectUtils.clone(this.documentData))
      this.selectedDocumentData = this.documentData;
    } else {
      //console.log(`Navigate to Child idx=${idx}`)
      let localSelectedContent = this.documentData;
      for (const path of this.schemaPath) {
        if (path.fieldName === '') continue;
        const field = localSelectedContent[path.fieldName];
        if (Array.isArray(field)) {
          localSelectedContent = localSelectedContent[path.fieldName].find((it: ContentData) => it._id == path.contentId);
        } else {
          localSelectedContent = field;
        }
      }
      //console.log('localSelectedContent', localSelectedContent)
      this.selectedDocumentData = localSelectedContent;
    }
    // Send Message to iFrame about Schema Selection
    this.sendEventToApp({ type: 'enterSchema', id: pathItem.contentId });
    //console.groupEnd()
  }

  changeEnvironment(env: SpaceEnvironment): void {
    this.selectedEnvironment = env;
    this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(env.url + this.document?.fullSlug || '');
  }

  generateDocumentIdsTree() {
    //console.group('generateDocumentIdsTree')
    const nodeIterator: { path: string[]; data: ContentData }[] = [{ path: [this.documentData._id], data: this.documentData }];
    let node = nodeIterator.shift();
    while (node) {
      this.documentIdsTree.set(node.data._id, node.path);
      const schema = this.schemaMapById.get(node.data.schema);
      if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
        for (const field of schema.fields || []) {
          if (field.kind === SchemaFieldKind.SCHEMA) {
            const cData: ContentData | undefined = node.data[field.name];
            if (cData) {
              nodeIterator.push({ path: [...node.path, cData._id], data: cData });
            }
          }
          if (field.kind === SchemaFieldKind.SCHEMAS) {
            const cData: ContentData[] | undefined = node.data[field.name];
            for (const content of cData || []) {
              if (cData) {
                nodeIterator.push({ path: [...node.path, content._id], data: content });
              }
            }
          }
        }
      }
      node = nodeIterator.shift();
    }
    //console.log(this.documentIdsTree)
    //console.groupEnd()
  }

  @HostListener('window:message', ['$event'])
  contentIdLink(event: MessageEvent<EventToEditor>): void {
    if (event.isTrusted && event.data && event.data.owner === 'LOCALESS') {
      console.log('MessageEvent', event);
      const { id, type } = event.data;
      // find element path
      const contentIdIteration = ObjectUtils.clone(this.documentIdsTree.get(id)) || [];
      if (type === 'selectSchema') {
        // Iterative traversing content and validating fields.
        let selectedContentId = contentIdIteration.shift();
        // check Root Schema
        if (this.documentData._id === selectedContentId) {
          console.log('root', selectedContentId);
          const schema = this.schemaMapById.get(this.documentData.schema);
          if (schema) {
            this.navigateToSchemaBackwards({
              contentId: this.documentData._id,
              schemaName: this.documentData.schema,
              fieldName: '',
            });
            selectedContentId = contentIdIteration.shift();
          } else {
            console.log(`schema ${this.selectedDocumentData.schema} not-found`);
            return;
          }
        } else {
          console.log(`root id ${selectedContentId} not-found`);
          return;
        }
        // Navigate to child
        while (selectedContentId) {
          console.log('child', selectedContentId);
          const schema = this.schemaMapById.get(this.selectedDocumentData.schema);
          if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
            schemaFieldsLoop: for (const field of schema.fields || []) {
              if (field.kind === SchemaFieldKind.SCHEMA) {
                const cData: ContentData | undefined = this.selectedDocumentData[field.name];
                if (cData && cData._id === selectedContentId) {
                  this.navigateToSchemaForwards({
                    contentId: selectedContentId!,
                    fieldName: field.name,
                    schemaName: cData.schema,
                  });
                  break;
                }
              }
              if (field.kind === SchemaFieldKind.SCHEMAS) {
                const cData: ContentData[] | undefined = this.selectedDocumentData[field.name];
                for (const content of cData || []) {
                  if (content._id === selectedContentId) {
                    this.navigateToSchemaForwards({
                      contentId: selectedContentId,
                      fieldName: field.name,
                      schemaName: content.schema,
                    });
                    break schemaFieldsLoop;
                  }
                }
              }
            }
            selectedContentId = contentIdIteration.shift();
          } else {
            console.log(`schema ${this.selectedDocumentData.schema} not-found`);
            return;
          }
        }
        console.log(`id ${selectedContentId} not-found`);
      } else if (type === 'hoverSchema') {
        this.hoverSchemaPath.set(contentIdIteration);
      } else if (type === 'leaveSchema') {
        this.hoverSchemaPath.set(undefined);
      }
    }
  }

  onFormChange(event: string) {
    console.log('onFormChange', event);
    this.sendEventToApp({ type: 'input', data: this.documentData });
  }

  onStructureChange(event: string) {
    console.log('onStructureChange', event);
    this.generateDocumentIdsTree();
    this.sendEventToApp({ type: 'change', data: this.documentData });
  }

  sendEventToApp(event: EventToApp) {
    const contentWindow = this.preview()?.nativeElement.contentWindow;
    if (contentWindow && this.selectedEnvironment) {
      const url = new URL(this.selectedEnvironment.url);
      contentWindow.postMessage(event, url.origin);
    }
  }
}
