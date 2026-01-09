import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  linkedSignal,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowLeft,
  lucideChevronDown,
  lucideCircleQuestionMark,
  lucideEarth,
  lucideEllipsisVertical,
  lucideFolderRoot,
  lucideFormInput,
  lucideFullscreen,
  lucideHistory,
  lucidePencil,
  lucidePlus,
  lucideRefreshCcw,
  lucideSave,
  lucideTriangleAlert,
  lucideUpload,
  lucideVectorSquare,
} from '@ng-icons/lucide';
import { tablerDeviceDesktop, tablerDeviceLaptop, tablerDeviceMobile, tablerDeviceTablet } from '@ng-icons/tabler-icons';
import { StatusComponent } from '@shared/components/status';
import { DirtyFormGuardComponent } from '@shared/guards/dirty-form.guard';
import { ContentHistory } from '@shared/models/content-history.model';
import { ContentData, ContentDocument, ContentError, ContentKind } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { Schema, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { SpaceEnvironment } from '@shared/models/space.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { ContentHistoryService } from '@shared/services/content-history.service';
import { ContentService } from '@shared/services/content.service';
import { NotificationService } from '@shared/services/notification.service';
import { TokenService } from '@shared/services/token.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmBreadCrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmResizableImports } from '@spartan-ng/helm/resizable';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { Observable } from 'rxjs';
import { v4 } from 'uuid';
import { EditDocumentSchemaComponent } from '../edit-document-schema/edit-document-schema.component';
import { SchemaSelectChange } from '../edit-document-schema/edit-document-schema.model';
import { EventToApp, EventToEditor, SchemaPathItem } from './edit-document.model';

@Component({
  selector: 'll-content-document-edit',
  templateUrl: './edit-document.component.html',
  styleUrls: ['./edit-document.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    CanUserPerformPipe,
    CommonModule,
    StatusComponent,
    MatDividerModule,
    MatSidenavModule,
    MatCardModule,
    EditDocumentSchemaComponent,
    MatExpansionModule,
    HlmResizableImports,
    HlmBreadCrumbImports,
    HlmIconImports,
    HlmButtonImports,
    HlmToggleGroupImports,
    HlmTooltipImports,
    BrnSelectImports,
    HlmDropdownMenuImports,
    HlmSpinnerImports,
    HlmProgressImports,
    HlmSheetImports,
    BrnSheetImports,
    HlmScrollAreaImports,
    NgScrollbarModule,
    HlmInputGroupImports,
    HlmButtonGroupImports,
    HlmLabelImports,
  ],
  providers: [
    provideIcons({
      lucideFolderRoot,
      lucideArrowLeft,
      lucideFormInput,
      lucideVectorSquare,
      lucideAlertCircle,
      lucideTriangleAlert,
      lucideSave,
      lucideUpload,
      lucideHistory,
      lucideEllipsisVertical,
      lucidePencil,
      lucideEarth,
      lucideFullscreen,
      tablerDeviceMobile,
      tablerDeviceTablet,
      tablerDeviceLaptop,
      tablerDeviceDesktop,
      lucideRefreshCcw,
      lucideChevronDown,
      lucidePlus,
      lucideCircleQuestionMark,
    }),
  ],
})
export class EditDocumentComponent implements OnInit, DirtyFormGuardComponent {
  private readonly router = inject(Router);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly contentService = inject(ContentService);
  private readonly contentHistoryService = inject(ContentHistoryService);
  private readonly tokenService = inject(TokenService);
  private readonly notificationService = inject(NotificationService);
  private readonly contentHelperService = inject(ContentHelperService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly fe = inject(FormErrorHandlerService);

  // Input
  spaceId = input.required<string>();
  contentId = input.required<string>();
  document = input.required<ContentDocument>();
  documents = computed(() => this.spaceStore.documents());
  schemas = computed(() => this.spaceStore.schemas());
  // Computed out of inputs
  rootSchema = computed(() => this.schemas().find(it => it.id === this.document().schema));
  documentUpdatedAt = linkedSignal(() => this.document().updatedAt.seconds);
  documentPublishedAt = linkedSignal(() => this.document().publishedAt?.seconds);
  //Store
  spaceStore = inject(SpaceStore);
  settingsStore = inject(LocalSettingsStore);

  preview = viewChild<ElementRef<HTMLIFrameElement>>('preview');

  showHistory = signal(false);

  selectedSpace = computed(() => this.spaceStore.selectedSpace());
  // Environments
  availableEnvironments = computed(() => this.selectedSpace()?.environments || []);
  selectedEnvironment = linkedSignal<SpaceEnvironment | undefined>(() => {
    const envs = this.availableEnvironments();
    if (envs.length > 0) {
      return envs[0];
    } else {
      return undefined;
    }
  });
  iframeUrl = computed(() => {
    const env = this.selectedEnvironment();
    const locale = this.selectedLocale();
    if (env) {
      const localePart = locale.id !== CONTENT_DEFAULT_LOCALE.id ? locale.id + '/' : '';
      return this.sanitizer.bypassSecurityTrustResourceUrl(`${env.url}${localePart}${this.document().fullSlug}`);
    } else {
      return undefined;
    }
  });
  // Locales
  availableLocales = computed<Locale[]>(() => [CONTENT_DEFAULT_LOCALE, ...(this.selectedSpace()?.locales || [])]);
  availableLocalesMap = computed(() => new Map<string, string>(this.availableLocales().map(it => [it.id, it.name])));

  selectedLocale = signal(CONTENT_DEFAULT_LOCALE);
  hoverSchemaPath = signal<string[] | undefined>(undefined);
  hoverSchemaField = signal<string | undefined>(undefined);
  clickSchemaField = signal<string | undefined>(undefined);
  schemaPath = linkedSignal<SchemaPathItem[]>(() => {
    const rootSchema = this.rootSchema();
    if (rootSchema) {
      return [
        {
          contentId: this.documentData._id,
          schemaName: this.documentData.schema,
          fieldName: '',
        },
      ];
    }
    return [];
  });
  isSamePath = computed(() => {
    const uiPath = this.schemaPath().map(it => it.contentId);
    return ObjectUtils.isEqual(uiPath, this.hoverSchemaPath());
  });
  schemaMapById = computed(() => new Map<string, Schema>(this.schemas().map(it => [it.id, it])));

  documentData: ContentData = { _id: '', _schema: '', schema: '' };
  selectedDocumentData: ContentData = { _id: '', _schema: '', schema: '' };
  documentIdsTree: Map<string, string[]> = new Map<string, string[]>();

  contentErrors: ContentError[] = [];

  availableToken?: string = undefined;

  //Loadings
  isLoading = signal(false);
  isPublishLoading = signal(false);
  isSaveLoading = signal(false);

  // Subscriptions
  history$?: Observable<ContentHistory[]>;

  private destroyRef = inject(DestroyRef);

  isResizing = signal(false);

  constructor() {}

  ngOnInit(): void {
    this.history$ = this.contentHistoryService.findAll(this.spaceId(), this.contentId());
    const document = this.document();
    // Initialize document data
    if (document.kind === ContentKind.DOCUMENT) {
      if (document.data === undefined) {
        this.documentData = {
          _id: v4(),
          _schema: this.rootSchema()?.id || '',
          schema: this.rootSchema()?.id || '',
        };
      } else if (typeof document.data === 'string') {
        this.documentData = JSON.parse(document.data);
      } else {
        this.documentData = ObjectUtils.clone(document.data);
      }
      this.selectedDocumentData = this.documentData;
    }
    this.generateDocumentIdsTree();
  }

  get isFormDirty(): boolean {
    const data = this.document().data;
    if (data === undefined) {
      return false;
    }

    // Normalize both original and current data for comparison
    const originalData = typeof data === 'string' ? JSON.parse(data) : data;
    const normalizedOriginal = this.contentHelperService.clone(originalData);
    const normalizedCurrent = this.contentHelperService.clone(this.documentData);

    return !ObjectUtils.isEqual(normalizedOriginal, normalizedCurrent);
  }

  publish(): void {
    this.isPublishLoading.set(true);
    this.contentService.publish(this.spaceId(), this.contentId()).subscribe({
      next: () => {
        this.notificationService.success('Content has been published.');
        this.sendEventToApp({ type: 'publish' });
        this.documentPublishedAt.set(Date.now() / 100);
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
    this.contentErrors.push(...this.contentHelperService.validateContent(this.documentData, this.schemas(), CONTENT_DEFAULT_LOCALE.id));
    for (const locale of this.selectedSpace()?.locales || []) {
      this.contentErrors.push(...this.contentHelperService.validateContent(this.documentData, this.schemas(), locale.id));
    }

    //console.log(this.contentErrors)

    if (this.contentErrors.length === 0) {
      const refs = this.availableLocales()
        .map(it => this.contentHelperService.extractReferences(this.documentData, this.schemas(), it.id))
        .reduce(
          (acc, val) => {
            const inUseAssets = acc[0];
            const inUseReferences = acc[1];
            val[0].forEach(it => inUseAssets.add(it));
            val[1].forEach(it => inUseReferences.add(it));
            return [inUseAssets, inUseReferences];
          },
          [new Set<string>(), new Set<string>()],
        );
      this.contentService.updateDocumentData(this.spaceId(), this.contentId(), this.documentData, refs).subscribe({
        next: () => {
          this.notificationService.success('Content has been saved in draft.');
          this.sendEventToApp({ type: 'save' });
          this.documentUpdatedAt.set(Date.now() / 100);
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
      this.notificationService.error('Content is not valid. Please check all fields are filled correctly.');
      this.isSaveLoading.set(false);
    }
    //console.groupEnd()
  }

  back(): void {
    this.router.navigate(['features', 'spaces', this.spaceId(), 'contents']);
  }

  openApiV1InNewTab(locale: string, token: string, version?: 'draft'): void {
    const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId()}/contents/${this.contentId()}`);
    url.searchParams.set('locale', locale);
    if (version) {
      url.searchParams.set('version', version);
    }
    url.searchParams.set('token', token);
    window.open(url, '_blank');
  }

  openDraftV1InNewTab(locale: string): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(locale, this.availableToken, 'draft');
    } else {
      this.tokenService.findFirst(this.spaceId()).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(locale, this.availableToken, 'draft');
          } else {
            this.notificationService.error('Please create Access Token in your Space Settings');
          }
        },
      });
    }
  }

  openPublishedV1InNewTab(locale: string): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(locale, this.availableToken);
    } else {
      this.tokenService.findFirst(this.spaceId()).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(locale, this.availableToken);
          } else {
            this.notificationService.error('Please create Access Token in your Space Settings');
          }
        },
      });
    }
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
    this.schemaPath.update(it => [...it, pathItem]);
    const field = this.selectedDocumentData[pathItem.fieldName];
    if (Array.isArray(field)) {
      this.selectedDocumentData = field.find((it: ContentData) => it._id == pathItem.contentId);
    } else {
      this.selectedDocumentData = field;
    }
    // Send Message to iFrame about Schema Selection
    this.sendEventToApp({ type: 'enterSchema', id: pathItem.contentId, schema: pathItem.schemaName });
    //console.groupEnd()
  }

  navigateToSchemaBackwards(pathItem: SchemaPathItem): void {
    //console.group('navigateToSchemaBackwards');
    console.log('pathItem', pathItem);
    const idx = this.schemaPath().findIndex(it => it.contentId == pathItem.contentId);
    this.schemaPath.update(it => {
      it.splice(idx + 1);
      return it;
    });
    // Select Root
    if (idx == 0) {
      //console.log(`Navigate to Root idx=${idx}`);
      //console.log('documentData', ObjectUtils.clone(this.documentData))
      this.selectedDocumentData = this.documentData;
    } else {
      //console.log(`Navigate to Child idx=${idx}`);
      let localSelectedContent = this.documentData;
      for (const path of this.schemaPath()) {
        if (path.fieldName === '') continue;
        const field = localSelectedContent[path.fieldName];
        if (Array.isArray(field)) {
          localSelectedContent = localSelectedContent[path.fieldName].find((it: ContentData) => it._id == path.contentId);
        } else {
          localSelectedContent = field;
        }
      }
      //console.log('localSelectedContent', localSelectedContent);
      this.selectedDocumentData = localSelectedContent;
    }
    // Send Message to iFrame about Schema Selection
    this.sendEventToApp({ type: 'enterSchema', id: pathItem.contentId, schema: pathItem.schemaName });
    //console.groupEnd();
  }

  generateDocumentIdsTree() {
    //console.group('generateDocumentIdsTree')
    const nodeIterator: { path: string[]; data: ContentData }[] = [
      {
        path: [this.documentData._id],
        data: this.documentData,
      },
    ];
    let node = nodeIterator.shift();
    while (node) {
      this.documentIdsTree.set(node.data._id, node.path);
      const schema = this.schemaMapById().get(node.data.schema);
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
      //console.log('MessageEvent', event);
      if (event.data.type === 'ping') {
        this.sendEventToApp({ type: 'pong' });
        return;
      }
      const { id, type, schema, field } = event.data;
      console.log('llve', id, type, schema, field);
      // find element path
      const contentIdIteration = ObjectUtils.clone(this.documentIdsTree.get(id)) || [];
      if (type === 'selectSchema') {
        // Iterative traversing content and validating fields.
        let selectedContentId = contentIdIteration.shift();
        // check Root Schema
        if (this.documentData._id === selectedContentId) {
          console.log('root', selectedContentId);
          const schema = this.schemaMapById().get(this.documentData.schema);
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
          const schema = this.schemaMapById().get(this.selectedDocumentData.schema);
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
            this.clickSchemaField.set(field);
          } else {
            console.log(`schema ${this.selectedDocumentData.schema} not-found`);
            return;
          }
        }
        console.log(`id ${selectedContentId} not-found`);
      } else if (type === 'hoverSchema') {
        this.hoverSchemaPath.set(contentIdIteration);
        this.hoverSchemaField.set(field);
      } else if (type === 'leaveSchema') {
        this.hoverSchemaPath.set(undefined);
        this.hoverSchemaField.set(undefined);
      }
    }
  }

  onFormChange(event: string) {
    const data = this.contentHelperService.extractContent(this.documentData, this.schemaMapById(), this.selectedLocale().id);
    console.debug('onFormChange', event, data);
    this.sendEventToApp({ type: 'input', data: data });
  }

  onStructureChange(event: string) {
    const data = this.contentHelperService.extractContent(this.documentData, this.schemaMapById(), this.selectedLocale().id);
    console.debug('onStructureChange', event, data);
    this.generateDocumentIdsTree();
    this.sendEventToApp({ type: 'change', data: data });
  }

  sendEventToApp(event: EventToApp) {
    const contentWindow = this.preview()?.nativeElement.contentWindow;
    const selectedEnvironment = this.selectedEnvironment();
    if (contentWindow && selectedEnvironment) {
      const url = new URL(selectedEnvironment.url);
      contentWindow.postMessage(event, url.origin);
    }
  }

  protected reloadEnvironment() {
    const environment = this.selectedEnvironment();
    this.selectedEnvironment.set(undefined);
    this.selectedEnvironment.set(environment);
  }
}
