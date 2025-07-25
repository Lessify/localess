import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TextFieldModule } from '@angular/cdk/text-field';
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
  Input,
  OnChanges,
  OnInit,
  output,
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetContent, ContentData, ContentDocument, ReferenceContent } from '@shared/models/content.model';
import { DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import {
  Schema,
  SchemaComponent,
  SchemaEnum,
  SchemaField,
  SchemaFieldKind,
  SchemaFieldOption,
  SchemaFieldOptions,
  SchemaType,
  sortSchemaEnumValue,
} from '@shared/models/schema.model';
import { Space } from '@shared/models/space.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@shared/services/translate.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { MarkdownComponent } from 'ngx-markdown';
import { debounceTime } from 'rxjs';
import { filter } from 'rxjs/operators';
import { v4 } from 'uuid';
import { AssetSelectComponent } from '../shared/asset-select/asset-select.component';
import { AssetsSelectComponent } from '../shared/assets-select/assets-select.component';
import { LinkSelectComponent } from '../shared/link-select/link-select.component';
import { ReferenceSelectComponent } from '../shared/reference-select/reference-select.component';
import { ReferencesSelectComponent } from '../shared/references-select/references-select.component';
import { RichTextEditorComponent } from '../shared/rich-text-editor/rich-text-editor.component';
import { SchemaSelectChange } from './edit-document-schema.model';

@Component({
  selector: 'll-content-document-schema-edit',
  templateUrl: './edit-document-schema.component.html',
  styleUrls: ['./edit-document-schema.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    CanUserPerformPipe,
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatMenuModule,
    TextFieldModule,
    RichTextEditorComponent,
    MatTabsModule,
    MarkdownComponent,
    MatSlideToggleModule,
    MatSelectModule,
    LinkSelectComponent,
    ReferenceSelectComponent,
    ReferencesSelectComponent,
    AssetSelectComponent,
    AssetsSelectComponent,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    DragDropModule,
    MatExpansionModule,
  ],
})
export class EditDocumentSchemaComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly contentHelperService = inject(ContentHelperService);
  private readonly translateService = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);
  readonly fe = inject(FormErrorHandlerService);

  // Form
  form: FormRecord = this.fb.record({});

  schemaForm = viewChild<ElementRef<HTMLFormElement>>('schemaForm');

  isDefaultLocale = computed(() => this.selectedLocale().id === DEFAULT_LOCALE.id);
  selectedLocaleId = computed(() => this.selectedLocale().id);
  // Subscriptions
  settingsStore = inject(LocalSettingsStore);

  private destroyRef = inject(DestroyRef);

  // Inputs
  @Input() documents: ContentDocument[] = [];
  @Input() space?: Space;
  @Input() data: ContentData = { _id: '', _schema: '', schema: '' };
  //data = input.required<ContentData>();
  schemas = input.required<Schema[]>();
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

  rootSchema?: SchemaComponent;
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
  schemaFieldsMap: Map<string, SchemaField> = new Map<string, SchemaField>();
  //Loadings
  isFormLoading = true;

  constructor() {
    effect(() => {
      const element = this.schemaForm()?.nativeElement;
      const field = this.hoverSchemaField();
      if (element && field) {
        element
          .querySelector<HTMLElement>(`.mat-mdc-text-field-wrapper:has(#schema-field-${field})`)
          ?.classList.add('mdc-text-field--focused');
      } else if (element) {
        element.querySelectorAll<HTMLElement>(`[id^="schema-field-"]`).forEach(item => {
          if (item !== document.activeElement) {
            item.closest('.mat-mdc-text-field-wrapper')?.classList.remove('mdc-text-field--focused');
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    //console.group('EditDocumentSchemaComponent:ngOnChanges')
    //console.log(changes);

    const dataChange = changes['data'];
    if (dataChange) {
      if (dataChange.isFirstChange()) {
        this.rootSchema = this.schemas()
          .filter(it => it.type === SchemaType.ROOT || it.type === SchemaType.NODE)
          .map(it => it as SchemaComponent)
          .find(it => it.id == this.data.schema);
        this.schemaFieldsMap = new Map<string, SchemaField>(this.rootSchema?.fields?.map(it => [it.name, it]));
      } else {
        // Update only when content is different
        if (dataChange.currentValue._id != dataChange.previousValue._id) {
          // Find new root schema and regenerate the form
          this.rootSchema = this.schemas()
            .filter(it => it.type === SchemaType.ROOT || it.type === SchemaType.NODE)
            .map(it => it as SchemaComponent)
            .find(it => it.id == this.data.schema);
          this.schemaFieldsMap = new Map<string, SchemaField>(this.rootSchema?.fields?.map(it => [it.name, it]));
          this.clearForm();
          this.onChanged();
        }
      }
    }

    const selectedLocaleChange = changes['selectedLocale'];
    if (selectedLocaleChange) {
      this.onChanged();
    }
    //console.groupEnd()
  }

  ngOnInit(): void {
    //console.group('ngOnInit')
    //console.log(`data`, ObjectUtils.clone(this.data))
    //console.log(`schemas : ${JSON.stringify(this.schemas)}`)
    //console.log(`locale : ${this.locale}`)
    //console.log(`localeFallback : ${this.localeFallback}`)
    //console.groupEnd()

    this.generateForm();
    if (this.data) {
      this.formPatch();
      // this.form.reset()
      // this.form.patchValue(this.contentService.extractSchemaContent(this.data, this.rootSchema!, this.locale));
    }
  }

  generateForm(): void {
    if (this.rootSchema && (this.rootSchema.type === SchemaType.ROOT || this.rootSchema.type === SchemaType.NODE)) {
      // true - check all fields, false - all fields become optional
      this.form = this.contentHelperService.generateSchemaForm(this.rootSchema, this.isDefaultLocale());

      this.form.valueChanges
        .pipe(
          debounceTime(500),
          filter(it => Object.keys(it).length !== 0),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: formValue => {
            //console.group('form');
            //console.log(Object.getOwnPropertyNames(formValue));
            //console.log('formValue', ObjectUtils.clone(formValue));
            //console.log('Before data', ObjectUtils.clone(this.data));
            //console.log('rootSchema', ObjectUtils.clone(this.rootSchema));
            for (const field of this.rootSchema?.fields || []) {
              //console.log('field', field.name, field.kind);
              if (field.kind === SchemaFieldKind.SCHEMAS) continue;
              if (field.kind === SchemaFieldKind.SCHEMA) continue;
              const value = formValue[field.name];
              //console.log('value', value);
              if (this.isDefaultLocale()) {
                // check everything
                if (value === null) {
                  delete this.data[field.name];
                } else {
                  this.data[field.name] = value;
                }
              } else {
                // check only locale
                if (field.translatable) {
                  if (value === undefined || value === null || value === '') {
                    delete this.data[`${field.name}_i18n_${this.selectedLocaleId()}`];
                  } else if (Array.isArray(value) && value.length === 0) {
                    delete this.data[`${field.name}_i18n_${this.selectedLocaleId()}`];
                  } else {
                    this.data[`${field.name}_i18n_${this.selectedLocaleId()}`] = value;
                  }
                }
              }
            }
            this.formChange.emit(JSON.stringify(formValue));
            //console.log('After data', ObjectUtils.clone(this.data));
            //console.groupEnd();
          },
          error: (err: unknown) => console.error(err),
          complete: () => console.log('completed'),
        });
    }
  }

  clearForm(): void {
    //console.group('clearForm')
    for (const ctrlName in this.form.controls) {
      this.form.removeControl(ctrlName);
    }
    //console.groupEnd()
  }

  onChanged(): void {
    //console.group('onChanged')
    this.isFormLoading = true;
    this.cd.detectChanges();
    this.generateForm();
    this.formPatch();
    //this.form.reset();
    //this.form.patchValue(this.contentService.extractSchemaContent(this.data, this.rootSchema!, this.locale));
    this.isFormLoading = false;
    this.cd.markForCheck();
    //console.groupEnd()
  }

  formPatch(): void {
    //console.group('formPatch')
    this.form.reset();
    const extractSchemaContent = this.contentHelperService.extractSchemaContent(
      this.data,
      this.rootSchema!,
      this.selectedLocaleId(),
      false,
    );
    //console.log('extractSchemaContent', ObjectUtils.clone(extractSchemaContent))
    this.form.patchValue(extractSchemaContent);
    Object.getOwnPropertyNames(extractSchemaContent).forEach(fieldName => {
      const content = extractSchemaContent[fieldName];
      if (content instanceof Array) {
        // Assets
        if (content.some(it => it.kind === SchemaFieldKind.ASSET)) {
          const assets: AssetContent[] = content;
          const fa = this.form.controls[fieldName] as FormArray;
          assets.forEach(it => fa.push(this.contentHelperService.assetContentToForm(it)));
        }
        // References
        if (content.some(it => it.kind === SchemaFieldKind.REFERENCE)) {
          const references: ReferenceContent[] = content;
          const fa = this.form.controls[fieldName] as FormArray;
          references.forEach(it => fa.push(this.contentHelperService.referenceContentToForm(it)));
        }
      }
    });
    //console.groupEnd()
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
    const sch: ContentData | undefined = this.data[field.name];
    if (sch) {
      this.data[field.name] = {
        _id: v4(),
        _schema: schema.id,
        schema: schema.id,
      };
    } else {
      this.data[field.name] = {
        _id: v4(),
        _schema: schema.id,
        schema: schema.id,
      };
    }
    this.structureChange.emit(`addSchemaOne ${field.name} ${schema.id}`);
  }

  removeSchemaOne(field: SchemaField): void {
    delete this.data[field.name];
    this.structureChange.emit(`removeSchemaOne ${field.name}`);
  }

  addSchemaMany(field: SchemaField, schema: Schema, index?: number): void {
    const fieldData: ContentData[] | undefined = this.data[field.name];
    if (fieldData) {
      if (index !== undefined) {
        // add at index
        fieldData.splice(index, 0, {
          _id: v4(),
          _schema: schema.id,
          schema: schema.id,
        });
      } else {
        fieldData.push({
          _id: v4(),
          _schema: schema.id,
          schema: schema.id,
        });
      }
    } else {
      this.data[field.name] = [
        {
          _id: v4(),
          _schema: schema.id,
          schema: schema.id,
        },
      ];
    }
    this.structureChange.emit(`addSchemaMany ${field.name} ${schema.id}`);
  }

  duplicateSchemaMany(data: any[], item: ContentData, idx: number): void {
    const clone = this.contentHelperService.clone(item, true);
    data.splice(idx + 1, 0, clone);
    //console.log(data)
    this.structureChange.emit(`duplicateSchemaMany ${item.schema} ${item._id}`);
  }

  removeSchemaMany(field: SchemaField, schemaId: string): void {
    const sch: ContentData[] | undefined = this.data[field.name];
    if (sch) {
      const idx = sch.findIndex(it => it._id == schemaId);
      if (idx >= 0) {
        sch.splice(idx, 1);
      }
      if (sch.length == 0) {
        delete this.data[field.name];
      }
    }
    this.structureChange.emit(`removeSchemaMany ${field.name}`);
  }

  navigationTo(contentId: string, fieldName: string, schemaName: string): void {
    this.schemaChange.emit({ contentId, fieldName, schemaName: schemaName });
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
        if (field.translatable && !this.isDefaultLocale()) {
          return content[schema.previewField + '_i18n_' + localeId];
        } else {
          return content[schema.previewField];
        }
      }
    }
    return undefined;
  }

  defaultOptionPlaceholder(field: SchemaFieldOption): string {
    if (!this.isDefaultLocale()) {
      const value = this.data[field.name] as string;
      return field.options?.find(it => it.value === value)?.name || '';
    }
    return '';
  }

  defaultOptionsPlaceholder(field: SchemaFieldOptions): string {
    if (!this.isDefaultLocale()) {
      const values = this.data[field.name] as string[];
      const options = new Map(field.options?.map(it => [it.value, it.name]));
      return values.map(it => options.get(it)).join(',');
    }
    return '';
  }

  markFiledAvailable(event: MatSlideToggleChange, field: SchemaField) {
    console.log(event, field);
    const formField = this.form.controls[field.name];
    if (event.checked) {
      formField.enable();
    } else {
      formField.setValue(undefined);
      formField.disable();
    }
  }

  translate(fieldName: string, sourceLocale: string, targetLocale: string): void {
    // get source locale content
    // this.data[`${field.name}_i18n_${this.selectedLocaleId()}`];
    //debugger;
    let content = '';
    if (sourceLocale === DEFAULT_LOCALE.id) {
      content = this.data[fieldName];
    } else {
      content = this.data[`${fieldName}_i18n_${sourceLocale}`];
    }
    if (content === undefined || content === null || content === '') {
      this.notificationService.error('No content to translate');
    } else {
      this.translateService
        .translate({
          content: content,
          sourceLocale: sourceLocale !== DEFAULT_LOCALE.id ? sourceLocale : null,
          targetLocale: targetLocale,
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
            this.notificationService.error('Can not be translation.', [
              {
                label: 'Documentation',
                link: 'https://localess.org/docs/setup/firebase#errors-in-the-user-interface',
              },
            ]);
          },
        });
    }
  }
}
