import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  Input,
  OnChanges,
  OnInit,
  output,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormBuilder, FormRecord } from '@angular/forms';
import {
  Schema,
  SchemaComponent,
  SchemaEnum,
  SchemaField,
  SchemaFieldKind,
  SchemaFieldOption,
  SchemaFieldOptions,
  SchemaType,
} from '@shared/models/schema.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetContent, ContentData, ContentDocument, ReferenceContent } from '@shared/models/content.model';
import { filter } from 'rxjs/operators';
import { debounceTime } from 'rxjs';
import { v4 } from 'uuid';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { Space } from '@shared/models/space.model';
import { SchemaSelectChange } from './edit-document-schema.model';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DEFAULT_LOCALE } from '@shared/models/locale.model';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SettingsStore } from '@shared/store/settings.store';

@Component({
  selector: 'll-content-document-schema-edit',
  templateUrl: './edit-document-schema.component.html',
  styleUrls: ['./edit-document-schema.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditDocumentSchemaComponent implements OnInit, OnChanges {
  // Form
  form: FormRecord = this.fb.record({});

  isDefaultLocale = true;
  // Subscriptions
  settingsStore = inject(SettingsStore);

  private destroyRef = inject(DestroyRef);

  // Inputs
  @Input() documents: ContentDocument[] = [];
  @Input({ required: true }) locale = 'en';
  @Input() space?: Space;
  @Input() data: ContentData = { _id: '', schema: '' };
  //data = input.required<ContentData>();
  schemas = input.required<Schema[]>();
  // Outputs
  onSchemaChange = output<SchemaSelectChange>();
  onFormChange = output<string>();
  onStructureChange = output<string>();

  rootSchema?: SchemaComponent;
  schemaMapById = computed(() => new Map<string, Schema>(this.schemas().map(it => [it.id, it])));
  schemaCompNodeList = computed(() =>
    this.schemas()
      .filter(it => it.type === SchemaType.NODE)
      .map(it => it as SchemaComponent)
  );
  schemaCompNodeById = computed(
    () =>
      new Map<string, SchemaComponent>(
        this.schemas()
          .filter(it => it.type === SchemaType.NODE)
          .map(it => it as SchemaComponent)
          .map(it => [it.id, it])
      )
  );
  schemaEnumMapById = computed(
    () =>
      new Map<string, SchemaEnum>(
        this.schemas()
          .filter(it => it.type === SchemaType.ENUM)
          .map(it => it as SchemaEnum)
          .map(it => [it.id, it])
      )
  );
  schemaFieldsMap: Map<string, SchemaField> = new Map<string, SchemaField>();
  //Loadings
  isFormLoading = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    private readonly contentHelperService: ContentHelperService,
    readonly fe: FormErrorHandlerService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    //console.group('EditDocumentSchemaComponent:ngOnChanges')
    //console.log(changes)

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

    const localeChange = changes['locale'];
    if (localeChange) {
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
      this.form = this.contentHelperService.generateSchemaForm(this.rootSchema, this.isDefaultLocale);

      this.form.valueChanges
        .pipe(
          debounceTime(500),
          filter(it => Object.keys(it).length !== 0),
          takeUntilDestroyed(this.destroyRef)
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
              if (this.isDefaultLocale) {
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
                    delete this.data[`${field.name}_i18n_${this.locale}`];
                  } else if (Array.isArray(value) && value.length === 0) {
                    delete this.data[`${field.name}_i18n_${this.locale}`];
                  } else {
                    this.data[`${field.name}_i18n_${this.locale}`] = value;
                  }
                }
              }
            }
            this.onFormChange.emit(JSON.stringify(formValue));
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
    this.isDefaultLocale = this.locale === DEFAULT_LOCALE.id;
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
    const extractSchemaContent = this.contentHelperService.extractSchemaContent(this.data, this.rootSchema!, this.locale, false);
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

  filterSchema(ids?: string[]): SchemaComponent[] {
    if (ids) {
      const result: SchemaComponent[] = [];
      for (const id of ids) {
        const r = this.schemaCompNodeById().get(id);
        if (r) {
          result.push(r);
        }
      }
      return result;
    }
    return this.schemaCompNodeList();
  }

  addSchemaOne(field: SchemaField, schema: Schema): void {
    const sch: ContentData | undefined = this.data[field.name];
    if (sch) {
      this.data[field.name] = {
        _id: v4(),
        schema: schema.id,
      };
    } else {
      this.data[field.name] = {
        _id: v4(),
        schema: schema.id,
      };
    }
    this.onStructureChange.emit(`addSchemaOne ${field.name} ${schema.id}`);
  }

  removeSchemaOne(field: SchemaField): void {
    delete this.data[field.name];
    this.onStructureChange.emit(`removeSchemaOne ${field.name}`);
  }

  addSchemaMany(field: SchemaField, schema: Schema): void {
    const sch: ContentData[] | undefined = this.data[field.name];
    if (sch) {
      sch.push({
        _id: v4(),
        schema: schema.id,
      });
    } else {
      this.data[field.name] = [
        {
          _id: v4(),
          schema: schema.id,
        },
      ];
    }
    this.onStructureChange.emit(`addSchemaMany ${field.name} ${schema.id}`);
  }

  duplicateSchemaMany(event: MouseEvent, data: any[], item: ContentData, idx: number): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    const clone = this.contentHelperService.clone(item, true);
    data.splice(idx + 1, 0, clone);
    //console.log(data)
    this.onStructureChange.emit(`duplicateSchemaMany ${item.schema} ${item._id}`);
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
    this.onStructureChange.emit(`removeSchemaMany ${field.name}`);
  }

  navigationTo(contentId: string, fieldName: string, schemaName: string): void {
    this.onSchemaChange.emit({ contentId, fieldName, schemaName: schemaName });
  }

  onAssetsChange() {
    this.form.updateValueAndValidity();
    this.cd.markForCheck();
  }

  schemaDropDrop(event: CdkDragDrop<string[], any>, data: any[]): void {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(data, event.previousIndex, event.currentIndex);
    this.onStructureChange.emit(`schemaDropDrop from-${event.previousIndex} to-${event.currentIndex}`);
  }

  previewText(content: ContentData, schema: SchemaComponent, locale: string): string | undefined {
    if (schema.previewField) {
      const field = schema.fields?.find(it => it.name === schema.previewField);
      if (field) {
        if (field.translatable && !this.isDefaultLocale) {
          return content[schema.previewField + '_i18n_' + locale];
        } else {
          return content[schema.previewField];
        }
      }
    }
    return undefined;
  }

  defaultOptionPlaceholder(field: SchemaFieldOption): string {
    if (!this.isDefaultLocale) {
      const value = this.data[field.name] as string;
      return field.options?.find(it => it.value === value)?.name || '';
    }
    return '';
  }

  defaultOptionsPlaceholder(field: SchemaFieldOptions): string {
    if (!this.isDefaultLocale) {
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
}
