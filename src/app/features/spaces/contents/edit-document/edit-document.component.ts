import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowLeft,
  lucideChevronDown,
  lucideCircleQuestionMark,
  lucideCopy,
  lucideEarth,
  lucideEllipsis,
  lucideEllipsisVertical,
  lucideFolderRoot,
  lucideFormInput,
  lucideLanguages,
  lucidePencil,
  lucidePlus,
  lucideSave,
  lucideTriangleAlert,
  lucideUpload,
  lucideVectorSquare,
  lucideWebhookOff,
} from '@ng-icons/lucide';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import {
  TranslateLocaleDialogComponent,
  TranslateLocaleDialogContext,
  TranslateLocaleDialogResult,
} from '@shared/components/translate-locale-dialog';
import { DirtyFormGuardComponent } from '@shared/guards/dirty-form.guard';
import { ContentData, ContentDocument, ContentError, ContentKind } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale, toProviderLocale } from '@shared/models/locale.model';
import { Schema, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { TokenPermission } from '@shared/models/token.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { ContentService } from '@shared/services/content.service';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { TokenService } from '@shared/services/token.service';
import { TranslateService } from '@shared/services/translate.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmResizableImports } from '@spartan-ng/helm/resizable';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { EMPTY } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { v4 } from 'uuid';

import { ContentPreviewComponent } from '../content-preview/content-preview.component';
import { EditDocumentSchemaComponent } from '../edit-document-schema/edit-document-schema.component';
import { SchemaSelectChange } from '../edit-document-schema/edit-document-schema.model';
import { DocumentStatusComponent } from '../shared/document-status/document-status.component';
import { SchemaPathItem } from './edit-document.model';

@Component({
  selector: 'll-content-document-edit',
  templateUrl: './edit-document.component.html',
  styleUrls: ['./edit-document.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'captureKeyboard($event)',
  },
  imports: [
    ClipboardModule,
    CanUserPerformPipe,
    CommonModule,
    ContentPreviewComponent,
    EditDocumentSchemaComponent,
    HlmResizableImports,
    HlmBreadcrumbImports,
    HlmIconImports,
    HlmButtonImports,
    HlmToggleGroupImports,
    HlmTooltipImports,
    HlmDropdownMenuImports,
    HlmSpinnerImports,
    HlmProgressImports,
    HlmScrollAreaImports,
    NgScrollbarModule,
    HlmButtonGroupImports,
    HlmAccordionImports,
    HlmKbdImports,
    DocumentStatusComponent,
    LocaleIconComponent,
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
      lucideEllipsisVertical,
      lucidePencil,
      lucideEarth,
      lucideChevronDown,
      lucidePlus,
      lucideCircleQuestionMark,
      lucideEllipsis,
      lucideWebhookOff,
      lucideCopy,
      lucideLanguages,
    }),
  ],
})
export class EditDocumentComponent implements OnInit, DirtyFormGuardComponent {
  private readonly router = inject(Router);
  readonly platformService = inject(PlatformService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly contentService = inject(ContentService);
  private readonly tokenService = inject(TokenService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(HlmDialogService);
  private readonly contentHelperService = inject(ContentHelperService);
  private readonly translateService = inject(TranslateService);
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

  previewComponent = viewChild(ContentPreviewComponent);

  selectedSpace = computed(() => this.spaceStore.selectedSpace());
  // Locales
  availableLocales = computed<Locale[]>(() => {
    const space = this.selectedSpace();
    if (space) {
      const { locales, localeFallback } = space;
      return locales.map(locale => {
        if (locale.id === localeFallback.id) {
          return {
            id: CONTENT_DEFAULT_LOCALE.id,
            name: `${locale.name} (${CONTENT_DEFAULT_LOCALE.name})`,
          };
        }
        return locale;
      });
    }
    return [];
  });
  availableLocalesMap = computed(() => new Map<string, string>(this.availableLocales().map(it => [it.id, it.name])));

  selectedLocale = linkedSignal<Locale>(() => {
    const locales = this.availableLocales();
    if (locales.length > 0) {
      return locales[0];
    }
    return CONTENT_DEFAULT_LOCALE;
  });
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
  /** Bumped to rebuild the schema form after a bulk translation mutates the document in place. */
  formRefresh = signal(0);
  selectedDocumentData: ContentData = { _id: '', _schema: '', schema: '' };
  documentIdsTree: Map<string, string[]> = new Map<string, string[]>();
  private savedDocumentData = signal<ContentData | undefined>(undefined);

  contentErrors: ContentError[] = [];

  availableToken?: string = undefined;

  //Loadings
  isLoading = signal(false);
  isPublishLoading = signal(false);
  isSaveLoading = signal(false);

  isResizing = signal(false);

  constructor() {}

  ngOnInit(): void {
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
      this.savedDocumentData.set(this.contentHelperService.clone(this.documentData));
    }
    this.generateDocumentIdsTree();
  }

  get isFormDirty(): boolean {
    const saved = this.savedDocumentData();
    if (saved !== undefined) {
      return !ObjectUtils.isEqual(this.contentHelperService.clone(saved), this.contentHelperService.clone(this.documentData));
    }

    const data = this.document().data;
    if (data === undefined) {
      return false;
    }

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
        this.previewComponent()?.sendEvent({ type: 'publish' });
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

  unpublish(): void {
    this.isPublishLoading.set(true);
    this.contentService.unpublish(this.spaceId(), this.contentId()).subscribe({
      next: () => {
        this.notificationService.success('Content has been unpublished.');
        this.previewComponent()?.sendEvent({ type: 'unpublish' });
        this.documentPublishedAt.set(undefined);
      },
      error: () => {
        this.notificationService.error('Content can not be unpublished.');
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
            const [inUseAssetsAcc, inUseLinksAcc, inUseReferencesAcc] = acc;
            const [inUseAssetsVal, inUseLinksVal, inUseReferencesVal] = val;
            inUseAssetsVal.forEach(it => inUseAssetsAcc.add(it));
            inUseLinksVal.forEach(it => inUseLinksAcc.add(it));
            inUseReferencesVal.forEach(it => inUseReferencesAcc.add(it));
            return [inUseAssetsAcc, inUseLinksAcc, inUseReferencesAcc];
          },
          [new Set<string>(), new Set<string>(), new Set<string>()],
        );
      this.contentService.updateDocumentData(this.spaceId(), this.contentId(), this.documentData, refs).subscribe({
        next: () => {
          this.notificationService.success('Content has been saved in draft.');
          this.previewComponent()?.sendEvent({ type: 'save' });
          this.documentUpdatedAt.set(Date.now() / 100);
          this.savedDocumentData.set(this.contentHelperService.clone(this.documentData));
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
    if (locale !== CONTENT_DEFAULT_LOCALE.id) {
      url.searchParams.set('locale', locale);
    }
    if (version) {
      url.searchParams.set('version', version);
    }
    url.searchParams.set('token', token);
    // url.searchParams.set('resolveReference', 'true');
    // url.searchParams.set('resolveLink', 'true');
    // url.searchParams.set('resolveAsset', 'true');
    window.open(url, '_blank');
  }

  openDraftV1InNewTab(locale: string): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(locale, this.availableToken, 'draft');
    } else {
      this.tokenService.findFirstByPermission(this.spaceId(), TokenPermission.CONTENT_DRAFT).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(locale, this.availableToken, 'draft');
          } else {
            this.notificationService.error('Please create Access Token with Content Draft Permission in your Space Settings');
          }
        },
      });
    }
  }

  openPublishedV1InNewTab(locale: string): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(locale, this.availableToken);
    } else {
      this.tokenService.findFirstByPermission(this.spaceId(), TokenPermission.CONTENT_PUBLIC).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(locale, this.availableToken);
          } else {
            this.notificationService.error('Please create Access Token with Content Public Permission in your Space Settings');
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
    const field = this.selectedDocumentData[pathItem.fieldName];
    const next: ContentData | undefined = Array.isArray(field) ? field.find((it: ContentData) => it._id == pathItem.contentId) : field;
    if (!next) {
      console.warn('navigateToSchemaForwards: target not found, aborting navigation', pathItem);
      return;
    }
    this.schemaPath.update(it => [...it, pathItem]);
    this.selectedDocumentData = next;
    // Send Message to iFrame about Schema Selection
    this.previewComponent()?.sendEvent({ type: 'enterSchema', id: pathItem.contentId, schema: pathItem.schemaName });
  }

  navigateToSchemaBackwards(pathItem: SchemaPathItem): void {
    const idx = this.schemaPath().findIndex(it => it.contentId == pathItem.contentId);
    const truncatedPath = this.schemaPath().slice(0, idx + 1);
    // Select Root
    if (idx == 0) {
      this.schemaPath.set(truncatedPath);
      this.selectedDocumentData = this.documentData;
    } else {
      let localSelectedContent: ContentData | undefined = this.documentData;
      for (const path of truncatedPath) {
        if (path.fieldName === '') continue;
        const field: ContentData | ContentData[] | undefined = localSelectedContent[path.fieldName];
        localSelectedContent = Array.isArray(field) ? field.find((it: ContentData) => it._id == path.contentId) : field;
        if (!localSelectedContent) break;
      }
      if (!localSelectedContent) {
        console.warn('navigateToSchemaBackwards: intermediate node not found, falling back to root', pathItem);
        this.schemaPath.set(this.schemaPath().slice(0, 1));
        this.selectedDocumentData = this.documentData;
      } else {
        this.schemaPath.set(truncatedPath);
        this.selectedDocumentData = localSelectedContent;
      }
    }
    // Send Message to iFrame about Schema Selection
    this.previewComponent()?.sendEvent({ type: 'enterSchema', id: pathItem.contentId, schema: pathItem.schemaName });
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

  captureKeyboard(event: KeyboardEvent): void {
    // Ctrl + S to Save
    if (this.platformService.isActionSave(event)) {
      event.preventDefault();
      this.save();
    }
  }

  onPreviewConnected(): void {
    this.sendCurrentContentToApp();
  }

  onPreviewSchemaSelect(event: { id: string; schema: string; field?: string }): void {
    const { id, schema, field } = event;
    console.log('llve', id, 'selectSchema', schema, field);
    // find element path
    const contentIdIteration = ObjectUtils.clone(this.documentIdsTree.get(id)) || [];
    // Iterative traversing content and validating fields.
    let selectedContentId = contentIdIteration.shift();
    // check Root Schema
    if (this.documentData._id === selectedContentId) {
      console.log('root', selectedContentId);
      const rootSchema = this.schemaMapById().get(this.documentData.schema);
      if (rootSchema) {
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
        schemaFieldsLoop: for (const schemaField of schema.fields || []) {
          if (schemaField.kind === SchemaFieldKind.SCHEMA) {
            const cData: ContentData | undefined = this.selectedDocumentData[schemaField.name];
            if (cData && cData._id === selectedContentId) {
              this.navigateToSchemaForwards({
                contentId: selectedContentId!,
                fieldName: schemaField.name,
                schemaName: cData.schema,
              });
              break;
            }
          }
          if (schemaField.kind === SchemaFieldKind.SCHEMAS) {
            const cData: ContentData[] | undefined = this.selectedDocumentData[schemaField.name];
            for (const content of cData || []) {
              if (content._id === selectedContentId) {
                this.navigateToSchemaForwards({
                  contentId: selectedContentId,
                  fieldName: schemaField.name,
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
  }

  onPreviewSchemaHover(event: { id: string; field?: string }): void {
    const contentIdIteration = ObjectUtils.clone(this.documentIdsTree.get(event.id)) || [];
    this.hoverSchemaPath.set(contentIdIteration);
    this.hoverSchemaField.set(event.field);
  }

  onPreviewSchemaLeave(): void {
    this.hoverSchemaPath.set(undefined);
    this.hoverSchemaField.set(undefined);
  }

  onFormChange(event: string) {
    const data = this.contentHelperService.extractContent(this.documentData, this.schemaMapById(), this.selectedLocale().id);
    console.debug('onFormChange', event, data);
    this.previewComponent()?.sendEvent({ type: 'input', data: data });
  }

  onStructureChange(event: string) {
    const data = this.contentHelperService.extractContent(this.documentData, this.schemaMapById(), this.selectedLocale().id);
    console.debug('onStructureChange', event, data);
    this.generateDocumentIdsTree();
    this.previewComponent()?.sendEvent({ type: 'change', data: data });
  }

  onFormSchemaHover(event: { id: string; schema: string; field?: string }): void {
    this.previewComponent()?.sendEvent({ type: 'hoverSchema', ...event });
  }

  onFormSchemaLeave(): void {
    this.previewComponent()?.sendEvent({ type: 'leaveSchema' });
  }

  private sendCurrentContentToApp(): void {
    const data = this.contentHelperService.extractContent(this.documentData, this.schemaMapById(), this.selectedLocale().id);
    this.previewComponent()?.sendEvent({ type: 'change', data });
  }

  copiedSlug() {
    this.notificationService.success(`Slug copied to clipboard.`);
  }

  copiedFullSlug() {
    this.notificationService.success(`Full Slug copied to clipboard.`);
  }

  /**
   * Translates the whole document into the selected locale.
   *
   * Runs against the in-memory document rather than the server's copy, so unsaved edits are
   * included rather than overwritten, and the result is applied to the form for review - nothing
   * reaches Firestore until the author presses Save.
   */
  openTranslateLocaleDialog(): void {
    this.dialog
      .open<TranslateLocaleDialogResult, TranslateLocaleDialogContext>(TranslateLocaleDialogComponent, {
        context: {
          locales: this.availableLocales(),
          localeFallback: this.selectedSpace()?.localeFallback,
          selectedLocale: this.selectedLocale().id,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => {
          const fields = this.contentHelperService.collectTranslatableFields(
            this.documentData,
            this.schemas(),
            it.sourceLocale,
            it.targetLocale,
            { overwrite: it.overwrite },
          );
          if (fields.length === 0) {
            this.notificationService.success('Nothing to translate: every field already has a translation.');
            return EMPTY;
          }
          const byId = new Map(fields.map(field => [field.id, field]));
          const fallbackLocaleId = this.selectedSpace()?.localeFallback.id;
          return this.translateService
            .translateBatch({
              items: fields.map(({ id, content, format }) => ({ id, content, format })),
              sourceLocale: toProviderLocale(it.sourceLocale, fallbackLocaleId),
              targetLocale: toProviderLocale(it.targetLocale, fallbackLocaleId),
            })
            .pipe(map(result => ({ result, byId, total: fields.length })));
        }),
      )
      .subscribe({
        next: ({ result, byId, total }) => {
          for (const item of result.items) byId.get(item.id)?.apply(item.content);
          // The document is mutated in place, so the form has to be rebuilt from it.
          this.formRefresh.update(v => v + 1);
          if (result.failed.length > 0) {
            this.notificationService.error(
              `Translated ${result.items.length} of ${total} fields. ${result.failed.length} could not be translated.`,
            );
          } else {
            this.notificationService.success(`Translated ${result.items.length} fields. Review them and press Save.`);
          }
        },
        error: () => {
          this.notificationService.error('Locale Translate failed.');
        },
      });
  }
}
