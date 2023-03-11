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
  SimpleChanges
} from '@angular/core';
import {FormBuilder, FormRecord} from '@angular/forms';
import {Schema, SchemaField} from '@shared/models/schema.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {ContentDocument, ContentData} from '@shared/models/content.model';
import {takeUntil} from 'rxjs/operators';
import {debounceTime, Subject} from 'rxjs';
import {v4} from 'uuid';
import {environment} from '../../../../environments/environment';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {Space} from '@shared/models/space.model';
import {ObjectUtils} from '@core/utils/object-utils.service';
import {SchemaSelectChange} from './edit-document-schema.model';

@Component({
  selector: 'll-content-document-schema-edit',
  templateUrl: './edit-document-schema.component.html',
  styleUrls: ['./edit-document-schema.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditDocumentSchemaComponent implements OnInit, OnChanges, OnDestroy {

  // Form
  form: FormRecord = this.fb.record({});
  // Subscriptions
  private destroy$ = new Subject();

  @Input() data: ContentData = {_id: '', schema: ''};
  @Input() schemas: Schema[] = [];
  @Input() documents: ContentDocument[] = [];
  @Input() locale: string = 'en';
  @Input() localeFallback: string = 'en';
  @Input() space?: Space;
  @Output() schemaChange = new EventEmitter<SchemaSelectChange>();

  isDebug = environment.debug
  rootSchema?: Schema;
  schemaMapById: Map<string, Schema> = new Map<string, Schema>();
  schemaMapByName: Map<string, Schema> = new Map<string, Schema>();
  schemaFieldsMap: Map<string, SchemaField> = new Map<string, SchemaField>();
  //Loadings
  isFormLoading: boolean = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    private readonly contentService: ContentHelperService,
    readonly fe: FormErrorHandlerService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges')
    console.log(changes)

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

  }

  ngOnInit(): void {
    // console.group('ngOnInit')
    //console.log(`content : ${JSON.stringify(this.content)}`)
    //console.log(`schemas : ${JSON.stringify(this.schemas)}`)
    //console.log(`locale : ${this.locale}`)
    //console.log(`localeFallback : ${this.localeFallback}`)
    // console.groupEnd()

    this.generateForm();
    if (this.data) {
      this.formPatch()
      // this.form.reset()
      // this.form.patchValue(this.contentService.extractSchemaContent(this.data, this.rootSchema!, this.locale));
    }
  }

  generateForm(): void {
    if (this.rootSchema) {
      const isFallbackLocale = this.locale === this.localeFallback
      this.form = this.contentService.generateSchemaForm(this.rootSchema, isFallbackLocale)

      this.form.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(500),
        )
        .subscribe({
          next: (formValue) => {
            console.group('form')
            console.log(Object.getOwnPropertyNames(formValue))
            console.log(formValue)
            console.log('Before')
            console.log(ObjectUtils.clone(this.data))

            for (const key of Object.getOwnPropertyNames(formValue)) {
              const value = formValue[key]
              const schema = this.schemaFieldsMap.get(key)
              if (value !== null) {
                if (schema?.translatable) {
                  this.data[`${key}_i18n_${this.locale}`] = value
                } else {
                  this.data[key] = value
                }
              }
            }
            console.log('After')
            console.log(ObjectUtils.clone(this.data))
            console.groupEnd()
          },
          error: (err) => console.log(err),
          complete: () => console.log('completed')
        })
    }
  }

  clearForm(): void {
    // console.group('clearForm')
    for (const ctrlName in this.form.controls) {
      this.form.removeControl(ctrlName)
    }
    // console.groupEnd()
  }

  onChanged(): void {
    this.isFormLoading = true;
    this.cd.detectChanges();
    this.generateForm();
    this.formPatch()
    //this.form.reset();
    //this.form.patchValue(this.contentService.extractSchemaContent(this.data, this.rootSchema!, this.locale));
    this.isFormLoading = false;
    this.cd.markForCheck();
  }

  formPatch(): void {
    this.form.reset();
    let extractSchemaContent = this.contentService.extractSchemaContent(this.data, this.rootSchema!, this.locale, false);
    this.form.patchValue(extractSchemaContent);
    Object.getOwnPropertyNames(extractSchemaContent)
      .filter(it => extractSchemaContent[it] instanceof Array)
      .forEach(fieldName => {
        //console.log(fieldName)
        // Assets
        this.form.controls[fieldName] = this.contentService.assetsToFormArray(extractSchemaContent[fieldName])
      })
  }

  filterSchema(ids?: string[]): Schema[] {
    if (ids) {
      const result: Schema[] = [];
      for (const id of ids) {
        const r = this.schemaMapById.get(id)
        if (r) {
          result.push(r)
        }
      }
      return result;
    }
    return this.schemas
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  addSchema(field: SchemaField, schema: Schema): void {
    let sch: ContentData[] | undefined = this.data[field.name];
    if (sch) {
      sch.push(
        {
          _id: v4(),
          schema: schema.name
        }
      )
    } else {
      this.data[field.name] = [
        {
          _id: v4(),
          schema: schema.name
        }
      ]
    }
  }

  removeSchema(field: SchemaField, schemaId: string): void {
    let sch: ContentData[] | undefined = this.data[field.name];
    if (sch) {
      let idx = sch.findIndex(it => it._id == schemaId);
      if (idx >= 0) {
        sch.splice(idx)
      }
      if (sch.length == 0) {
        delete this.data[field.name];
      }
    }
  }

  navigationTo(contentId: string, fieldName: string, schemaName: string): void {
    this.schemaChange.emit({contentId, fieldName, schemaName: schemaName})
  }

  onAssetsChange() {
    this.form.updateValueAndValidity()
    this.cd.markForCheck()
  }
}
