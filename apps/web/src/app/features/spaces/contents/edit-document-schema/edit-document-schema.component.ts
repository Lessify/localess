import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { NotificationService } from '@core/services/notification.service';
import { TranslateService } from '@core/services/translate.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import {
  CONTENT_DEFAULT_LOCALE,
  ContentAsset,
  ContentData,
  ContentDocument,
  ContentReference,
  isFieldTranslatable,
  Locale,
  Schema,
  SchemaComponent,
  SchemaEnum,
  SchemaField,
  SchemaFieldKind,
  SchemaType,
  Space,
} from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideBookCopy, lucideCirclePlus, lucideGripVertical, lucideInfo, lucideLanguages, lucideTrash, lucideX } from '@ng-icons/lucide';
import { tablerRowInsertBottom, tablerRowInsertTop } from '@ng-icons/tabler-icons';
import { toProviderLocale } from '@shared/models/locale.model';
import { sortSchemaEnumValue } from '@shared/models/schema.model';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { Subscription } from 'rxjs';
import { auditTime, filter, tap } from 'rxjs/operators';
import { v4 } from 'uuid';

import { AssetSelectComponent } from '../shared/asset-select/asset-select.component';
import { AssetsSelectComponent } from '../shared/assets-select/assets-select.component';
import { duplicateBlock, removeBlock } from '../shared/block-actions';
import { extractSchemaContent } from '../shared/content.utils';
import { ContentHelperService } from '../shared/content-helper.service';
import { LinkSelectComponent } from '../shared/link-select/link-select.component';
import { MarkdownEditorComponent } from '../shared/markdown-editor/markdown-editor.component';
import { ReferenceSelectComponent } from '../shared/reference-select/reference-select.component';
import { ReferencesSelectComponent } from '../shared/references-select/references-select.component';
import { RichTextEditorComponent } from '../shared/rich-text-editor/rich-text-editor.component';
import { TranslateMenuComponent } from '../shared/translate-menu/translate-menu.component';
import { SchemaSelectChange } from './edit-document-schema.model';

// Preview updates are sent at most this often while typing.
const FORM_CHANGE_INTERVAL = 200;

@Component({
  selector: 'll-content-document-schema-edit',
  templateUrl: './edit-document-schema.component.html',
  styleUrls: ['./edit-document-schema.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RichTextEditorComponent,
    TranslateMenuComponent,
    LinkSelectComponent,
    ReferenceSelectComponent,
    ReferencesSelectComponent,
    AssetSelectComponent,
    AssetsSelectComponent,
    DragDropModule,
    HlmFieldImports,
    HlmButtonImports,
    HlmTooltipImports,
    HlmIconImports,
    HlmDropdownMenuImports,
    HlmItemImports,
    HlmInputGroupImports,
    HlmSwitchImports,
    HlmSelectImports,
    MarkdownEditorComponent,
    HlmAccordionImports,
    HlmSeparatorImports,
  ],
  providers: [
    provideIcons({
      lucideCirclePlus,
      lucideTrash,
      lucideGripVertical,
      tablerRowInsertTop,
      tablerRowInsertBottom,
      lucideBookCopy,
      lucideLanguages,
      lucideInfo,
      lucideX,
    }),
  ],
})
export class EditDocumentSchemaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly contentHelperService = inject(ContentHelperService);
  private readonly translateService = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);
  readonly fe = inject(FormErrorHandlerService);

  // Form
  form: FormRecord = this.fb.record({});
  private formChanges?: Subscription;
  private pendingFormChange?: Record<string, unknown>;

  schemaForm = viewChild<ElementRef<HTMLFormElement>>('schemaForm');

  isDefaultLocale = computed(() => this.selectedLocale().id === CONTENT_DEFAULT_LOCALE.id);

  /** A non-translatable field viewed outside the default locale: its shared value is read-only. */
  isLockedInLocale(field: SchemaField): boolean {
    return !this.isDefaultLocale() && !isFieldTranslatable(field);
  }
  selectedLocaleId = computed(() => this.selectedLocale().id);
  // Subscriptions
  settingsStore = inject(LocalSettingsStore);

  private destroyRef = inject(DestroyRef);

  // Inputs
  readonly documents = input<ContentDocument[]>([]);
  readonly space = input<Space>();
  readonly data = input<ContentData>({ _id: '', _schema: '' });
  schemas = input.required<Schema[]>();
  /**
   * Incremented by the parent to force a regeneration after it mutates the document in place.
   *
   * The regeneration effect below keys off the document id and the selected locale, neither of
   * which changes when a bulk translation writes new values into the same document.
   */
  readonly refresh = input(0);
  selectedLocale = input.required<Locale>();
  availableLocales = input.required<Locale[]>();
  // Form Highlight
  hoverSchemaPath = input<string[]>();
  hoverSchemaField = input<string>();
  // Handle on Click Focus Event
  clickSchemaField = input<string>();
  // Outputs
  schemaChange = output<SchemaSelectChange>();
  formChange = output<string>();
  structureChange = output<string>();
  // Form -> iFrame hover highlight
  schemaHover = output<{ id: string; schema: string; field?: string }>();
  schemaLeave = output<void>();

  rootSchema = computed(() =>
    this.schemas()
      .filter(it => it.type === SchemaType.ROOT || it.type === SchemaType.NODE)
      .map(it => it as SchemaComponent)
      .find(it => it.id == this.data()?._schema),
  );
  documentId = computed(() => this.data()._id);
  schemaMapById = computed(() => new Map<string, Schema>(this.schemas().map(it => [it.id, it])));
  schemaCompNodeList = computed(() =>
    this.schemas()
      .filter(it => it.type === SchemaType.NODE)
      .map(it => it as SchemaComponent),
  );
  schemaCompNodeById = computed(
    () =>
      new Map<string, SchemaComponent>(
        this.schemas()
          .filter(it => it.type === SchemaType.NODE)
          .map(it => it as SchemaComponent)
          .map(it => [it.id, it]),
      ),
  );
  schemaEnumMapById = computed(
    () =>
      new Map<string, SchemaEnum>(
        this.schemas()
          .filter(it => it.type === SchemaType.ENUM)
          .map(it => it as SchemaEnum)
          .map(it => {
            it.values?.sort(sortSchemaEnumValue);
            return it;
          })
          .map(it => [it.id, it]),
      ),
  );
  optionItemToStringMap = computed(() => {
    const map = new Map<string, (v: string | string[]) => string>();
    for (const [id, schema] of this.schemaEnumMapById()) {
      const values = schema.values ?? [];
      const toLabel = (v: string) => values.find(o => o.value === v)?.name ?? v;
      map.set(id, (value: string | string[]) => (Array.isArray(value) ? value.map(toLabel).join(', ') : toLabel(value)));
    }
    return map;
  });
  //Loadings
  isFormLoading = signal(true);

  constructor() {
    effect(() => {
      const element = this.schemaForm()?.nativeElement;
      const field = this.hoverSchemaField();
      if (element && field) {
        element
          .querySelector<HTMLElement>(`.mat-mdc-text-field-wrapper:has(#schema-field-${field})`)
          ?.classList.add('mdc-text-field--focused');
        element.querySelector<HTMLElement>(`[hlminputgroup]:has(#schema-field-${field})`)?.classList.add('border-primary');
      } else if (element) {
        element.querySelectorAll<HTMLElement>(`[id^="schema-field-"]`).forEach(item => {
          if (item !== document.activeElement) {
            item.closest('.mat-mdc-text-field-wrapper')?.classList.remove('mdc-text-field--focused');
            item.closest('[hlminputgroup]')?.classList.remove('border-primary');
          }
        });
      }
    });
    effect(() => {
      const element = this.schemaForm()?.nativeElement;
      const field = this.clickSchemaField();
      if (element && field) {
        element.querySelector<HTMLElement>(`#schema-field-${field}`)?.focus();
      }
    });
    // Regenerates the form once on creation, and again whenever the document (_id) or the
    // selected locale actually changes. rootSchema/schemas are read untracked so a schemas()
    // reference change alone (e.g. a reload) doesn't trigger a regeneration on its own.
    effect(() => {
      this.documentId();
      this.selectedLocaleId();
      this.refresh();
      untracked(() => this.onChanged());
    });
  }

  generateForm(): void {
    this.stopFormChanges();
    const rootSchema = this.rootSchema();
    if (rootSchema && (rootSchema.type === SchemaType.ROOT || rootSchema.type === SchemaType.NODE)) {
      // true - check all fields, false - all fields become optional
      this.form = this.contentHelperService.generateSchemaForm(rootSchema, this.isDefaultLocale());
    }
  }

  onChanged(): void {
    this.isFormLoading.set(true);
    this.cd.detectChanges();
    this.generateForm();
    this.formPatch();
    // Subscribed after the patch, so loading the form isn't reported as an edit.
    this.listenToFormChanges();
    this.isFormLoading.set(false);
  }

  // Form values are written to data() on every change, so save/publish always see the latest
  // edit; only the formChange notification (the preview update) is throttled.
  private listenToFormChanges(): void {
    const rootSchema = this.rootSchema();
    if (!rootSchema || (rootSchema.type !== SchemaType.ROOT && rootSchema.type !== SchemaType.NODE)) return;
    this.formChanges = this.form.valueChanges
      .pipe(
        filter(it => Object.keys(it).length !== 0),
        tap(formValue => {
          this.writeFormValue(rootSchema, formValue);
          this.pendingFormChange = formValue;
        }),
        auditTime(FORM_CHANGE_INTERVAL),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.emitPendingFormChange(),
        error: (err: unknown) => console.error(err),
      });
  }

  // Drops the previous form's subscription, first delivering an edit it was still holding back.
  private stopFormChanges(): void {
    this.formChanges?.unsubscribe();
    this.formChanges = undefined;
    this.emitPendingFormChange();
  }

  private emitPendingFormChange(): void {
    if (this.pendingFormChange === undefined) return;
    const formValue = this.pendingFormChange;
    this.pendingFormChange = undefined;
    this.formChange.emit(JSON.stringify(formValue));
  }

  private writeFormValue(rootSchema: SchemaComponent, formValue: Record<string, unknown>): void {
    for (const field of rootSchema.fields || []) {
      if (field.kind === SchemaFieldKind.SCHEMAS) continue;
      if (field.kind === SchemaFieldKind.SCHEMA) continue;
      const value = formValue[field.name];
      if (this.isDefaultLocale()) {
        // check everything
        if (value === null) {
          delete this.data()[field.name];
        } else {
          this.data()[field.name] = value;
        }
      } else {
        // check only locale
        if (isFieldTranslatable(field)) {
          if (value === undefined || value === null || value === '') {
            delete this.data()[`${field.name}_i18n_${this.selectedLocaleId()}`];
          } else if (Array.isArray(value) && value.length === 0) {
            delete this.data()[`${field.name}_i18n_${this.selectedLocaleId()}`];
          } else {
            this.data()[`${field.name}_i18n_${this.selectedLocaleId()}`] = value;
          }
        }
        // A non-translatable field holds one value shared by every locale, editable only in the
        // default locale. Its control is not always disabled here (reference and asset pickers keep
        // theirs enabled to show the value), so never write it back from another locale.
      }
    }
  }

  formPatch(): void {
    this.form.reset();
    const rootSchema = this.rootSchema();
    if (rootSchema) {
      const schemaContent = extractSchemaContent(this.data(), rootSchema, this.selectedLocaleId(), false);
      this.form.patchValue(schemaContent);
      Object.getOwnPropertyNames(schemaContent).forEach(fieldName => {
        const content = schemaContent[fieldName];
        if (content instanceof Array) {
          // Assets
          if (content.some(it => it.kind === SchemaFieldKind.ASSET)) {
            const assets: ContentAsset[] = content;
            const fa = this.form.controls[fieldName] as FormArray;
            assets.forEach(it => fa.push(this.contentHelperService.assetContentToForm(it)));
          }
          // References
          if (content.some(it => it.kind === SchemaFieldKind.REFERENCE)) {
            const references: ContentReference[] = content;
            const fa = this.form.controls[fieldName] as FormArray;
            references.forEach(it => fa.push(this.contentHelperService.referenceContentToForm(it)));
          }
        }
      });
    }
  }

  filterSchema(ids: string[]): SchemaComponent[] {
    return ids
      .map(id => this.schemaCompNodeById().get(id))
      .filter(it => it !== undefined)
      .sort((a, b) => {
        if (a.displayName) {
          if (b.displayName) {
            return a.displayName.localeCompare(b.displayName);
          }
          return a.displayName.localeCompare(b.id);
        } else {
          if (b.displayName) {
            return a.id.localeCompare(b.displayName);
          }
          return a.id.localeCompare(b.id);
        }
      });
  }

  addSchemaOne(field: SchemaField, schema: Schema): void {
    const sch: ContentData | undefined = this.data()[field.name];
    if (sch) {
      this.data()[field.name] = {
        _id: v4(),
        _schema: schema.id,
      };
    } else {
      this.data()[field.name] = {
        _id: v4(),
        _schema: schema.id,
      };
    }
    this.structureChange.emit(`addSchemaOne ${field.name} ${schema.id}`);
  }

  removeSchemaOne(field: SchemaField): void {
    removeBlock({ parent: this.data(), field: field.name });
    this.structureChange.emit(`removeSchemaOne ${field.name}`);
  }

  addSchemaMany(field: SchemaField, schema: Schema, index?: number): void {
    const fieldData: ContentData[] | undefined = this.data()[field.name];
    if (fieldData) {
      if (index !== undefined) {
        // add at index
        fieldData.splice(index, 0, {
          _id: v4(),
          _schema: schema.id,
        });
      } else {
        fieldData.push({
          _id: v4(),
          _schema: schema.id,
        });
      }
    } else {
      this.data()[field.name] = [
        {
          _id: v4(),
          _schema: schema.id,
        },
      ];
    }
    this.structureChange.emit(`addSchemaMany ${field.name} ${schema.id}`);
  }

  duplicateSchemaMany(field: SchemaField, item: ContentData, idx: number): void {
    duplicateBlock({ parent: this.data(), field: field.name, index: idx });
    this.structureChange.emit(`duplicateSchemaMany ${item._schema} ${item._id}`);
  }

  removeSchemaMany(field: SchemaField, schemaId: string): void {
    const sch: ContentData[] | undefined = this.data()[field.name];
    const index = sch?.findIndex(it => it._id == schemaId) ?? -1;
    if (index >= 0) {
      removeBlock({ parent: this.data(), field: field.name, index });
    }
    this.structureChange.emit(`removeSchemaMany ${field.name}`);
  }

  navigationTo(contentId: string, fieldName: string, schemaName: string): void {
    this.schemaChange.emit({ contentId, fieldName, schemaName: schemaName });
  }

  onFieldHover(fieldName: string): void {
    this.schemaHover.emit({ id: this.data()._id, schema: this.data()._schema, field: fieldName });
  }

  onItemHover(item: ContentData): void {
    this.schemaHover.emit({ id: item._id, schema: item._schema });
  }

  onSchemaLeave(): void {
    this.schemaLeave.emit();
  }

  onAssetsChange() {
    this.form.updateValueAndValidity();
    this.cd.markForCheck();
  }

  schemaDropDrop(event: CdkDragDrop<string[], any>, data: any[]): void {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(data, event.previousIndex, event.currentIndex);
    this.structureChange.emit(`schemaDropDrop from-${event.previousIndex} to-${event.currentIndex}`);
  }

  previewText(content: ContentData, schema: SchemaComponent, localeId: string): string | undefined {
    if (schema.previewField) {
      const field = schema.fields?.find(it => it.name === schema.previewField);
      if (field) {
        if (isFieldTranslatable(field) && !this.isDefaultLocale()) {
          return content[schema.previewField + '_i18n_' + localeId];
        } else {
          return content[schema.previewField];
        }
      }
    }
    return undefined;
  }

  translate(fieldName: string, sourceLocale: string, targetLocale: string): void {
    // get source locale content
    // this.data()[`${field.name}_i18n_${this.selectedLocaleId()}`];
    //debugger;
    let content = '';
    if (sourceLocale === CONTENT_DEFAULT_LOCALE.id) {
      content = this.data()[fieldName];
    } else {
      content = this.data()[`${fieldName}_i18n_${sourceLocale}`];
    }
    if (content === undefined || content === null || content === '') {
      this.notificationService.error('No content to translate');
    } else {
      this.translateService
        .translate({
          content: content,
          sourceLocale: toProviderLocale(sourceLocale, this.space()?.localeFallback.id),
          targetLocale: toProviderLocale(targetLocale, this.space()?.localeFallback.id),
        })
        .subscribe({
          next: result => {
            if (this.form.contains(fieldName)) {
              this.form.controls[fieldName].setValue(result);
            }
            this.notificationService.success('Translated');
          },
          error: err => {
            console.error(err);
            this.notificationService.error('Can not be translation.', {
              action: {
                type: 'link',
                label: 'Documentation',
                link: 'https://localess.org/docs/setup/firebase#errors-in-the-user-interface',
              },
            });
          },
        });
    }
  }
}
