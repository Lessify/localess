import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormBuilder, FormRecord } from '@angular/forms';
import { Schema, SchemaField, SchemaFieldKind } from '@shared/models/schema.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetContent, ContentData, ContentDocument, ReferenceContent } from '@shared/models/content.model';
import { takeUntil } from 'rxjs/operators';
import { debounceTime, Subject } from 'rxjs';
import { v4 } from 'uuid';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { Space } from '@shared/models/space.model';
import { SchemaSelectChange } from './edit-document-schema.model';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { selectSettings } from '@core/state/settings/settings.selectors';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { DEFAULT_LOCALE } from '@shared/models/locale.model';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component({
  selector: 'll-content-document-schema-edit',
  templateUrl: './edit-document-schema.component.html',
  styleUrls: ['./edit-document-schema.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditDocumentSchemaComponent implements OnInit, OnChanges, OnDestroy {
  // Form
  form: FormRecord = this.fb.record({});

  isDefaultLocale = true;
  // Subscriptions
  settings$ = this.store.select(selectSettings);
  private destroy$ = new Subject();

  @Input() data: ContentData = { _id: '', schema: '' };
  @Input() schemas: Schema[] = [];
  @Input() documents: ContentDocument[] = [];
  @Input({ required: true }) locale = 'en';
  @Input() space?: Space;
  @Output() schemaChange = new EventEmitter<SchemaSelectChange>();

  rootSchema?: Schema;
  schemaMapById: Map<string, Schema> = new Map<string, Schema>();
  schemaMapByName: Map<string, Schema> = new Map<string, Schema>();
  schemaFieldsMap: Map<string, SchemaField> = new Map<string, SchemaField>();
  //Loadings
  isFormLoading = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    private readonly contentHelperService: ContentHelperService,
    readonly fe: FormErrorHandlerService,
    private readonly store: Store<AppState>
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    //console.group('EditDocumentSchemaComponent:ngOnChanges')
    //console.log(changes)

    const schemasChange = changes['schemas'];
    if (schemasChange) {
      this.schemaMapById = new Map<string, Schema>(this.schemas.map(it => [it.id, it]));
      this.schemaMapByName = new Map<string, Schema>(this.schemas.map(it => [it.name, it]));
    }

    const dataChange = changes['data'];
    if (dataChange) {
      if (dataChange.isFirstChange()) {
        this.rootSchema = this.schemas.find(it => it.name == this.data.schema);
        this.schemaFieldsMap = new Map<string, SchemaField>(this.rootSchema?.fields?.map(it => [it.name, it]));
      } else {
        // Update only when content is different
        if (dataChange.currentValue._id != dataChange.previousValue._id) {
          // Find new root schema and regenerate the form
          this.rootSchema = this.schemas.find(it => it.name == this.data.schema);
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
    if (this.rootSchema) {
      // true - check all fields, false - all fields become optional
      this.form = this.contentHelperService.generateSchemaForm(this.rootSchema, this.isDefaultLocale);

      this.form.valueChanges.pipe(debounceTime(500), takeUntil(this.destroy$)).subscribe({
        next: formValue => {
          console.group('form');
          console.log(Object.getOwnPropertyNames(formValue));
          console.log('formValue', ObjectUtils.clone(formValue));
          console.log('Before data', ObjectUtils.clone(this.data));

          //for (const key of Object.getOwnPropertyNames(formValue)) {
          for (const field of this.rootSchema?.fields || []) {
            console.log('name', field.name);
            const value = formValue[field.name];
            console.log('value', ObjectUtils.clone(value));
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
                if (value === null || value === '') {
                  delete this.data[`${field.name}_i18n_${this.locale}`];
                } else {
                  this.data[`${field.name}_i18n_${this.locale}`] = value;
                }
              }
            }
          }
          console.log('After data', ObjectUtils.clone(this.data));
          console.groupEnd();
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

  filterSchema(ids?: string[]): Schema[] {
    if (ids) {
      const result: Schema[] = [];
      for (const id of ids) {
        const r = this.schemaMapById.get(id);
        if (r) {
          result.push(r);
        }
      }
      return result;
    }
    return this.schemas;
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined);
    this.destroy$.complete();
  }

  addSchemaOne(field: SchemaField, schema: Schema): void {
    const sch: ContentData | undefined = this.data[field.name];
    if (sch) {
      this.data[field.name] = {
        _id: v4(),
        schema: schema.name,
      };
    } else {
      this.data[field.name] = {
        _id: v4(),
        schema: schema.name,
      };
    }
  }

  removeSchemaOne(field: SchemaField): void {
    delete this.data[field.name];
  }

  addSchemaMany(field: SchemaField, schema: Schema): void {
    const sch: ContentData[] | undefined = this.data[field.name];
    if (sch) {
      sch.push({
        _id: v4(),
        schema: schema.name,
      });
    } else {
      this.data[field.name] = [
        {
          _id: v4(),
          schema: schema.name,
        },
      ];
    }
  }

  duplicateSchemaMany(event: MouseEvent, data: any[], item: ContentData, idx: number): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    const clone = this.contentHelperService.clone(item, true);
    data.splice(idx + 1, 0, clone);
    //console.log(data)
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
  }

  previewText(content: ContentData, schema: Schema, locale: string): string | undefined {
    if (schema.previewField) {
      const field = schema.fields?.find(it => it.name === schema.previewField);
      if (field) {
        if (field.translatable) {
          return content[schema.previewField + '_i18n_' + locale];
        } else {
          return content[schema.previewField];
        }
      }
    }
    return undefined;
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
