import { Injectable } from '@angular/core';
import { Schema, SchemaComponent, SchemaField, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { FormArray, FormBuilder, FormGroup, FormRecord, ValidatorFn, Validators } from '@angular/forms';
import {
  AssetContent,
  ContentData,
  ContentError,
  isAssetContent,
  isLinkContent,
  isReferenceContent,
  ReferenceContent,
} from '@shared/models/content.model';
import { CommonValidator } from '@shared/validators/common.validator';
import { v4 } from 'uuid';
import { DEFAULT_LOCALE } from '@shared/models/locale.model';

@Injectable()
export class ContentHelperService {
  constructor(private readonly fb: FormBuilder) {}

  validateContent(data: ContentData, schemas: Schema[], locale: string): ContentError[] {
    //console.group('validateContent');
    const isDefaultLocale = DEFAULT_LOCALE.id === locale;
    const errors: ContentError[] = [];
    const schemasById = new Map<string, Schema>(schemas.map(it => [it.id, it]));
    const contentIteration = [data];
    // Iterative traversing content and validating fields.
    let selectedContent = contentIteration.pop();
    while (selectedContent) {
      const schema = schemasById.get(selectedContent.schema);
      if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
        const schemaFieldsMap = new Map<string, SchemaField>(schema.fields?.map(it => [it.name, it]));
        const form = this.generateSchemaForm(schema, isDefaultLocale);
        const extractSchemaContent = this.extractSchemaContent(selectedContent, schema, locale, true);
        form.patchValue(extractSchemaContent);

        // handle array like Asset/Reference Array
        Object.getOwnPropertyNames(extractSchemaContent).forEach(fieldName => {
          const content = extractSchemaContent[fieldName];
          //console.log(fieldName, content);
          if (content instanceof Array) {
            // Assets
            if (content.some(it => it.kind === SchemaFieldKind.ASSET)) {
              const assets: AssetContent[] = content;
              const fa = form.controls[fieldName] as FormArray;
              assets.forEach(it => fa.push(this.assetContentToForm(it)));
            }
            // References
            if (content.some(it => it.kind === SchemaFieldKind.REFERENCE)) {
              const references: ReferenceContent[] = content;
              const fa = form.controls[fieldName] as FormArray;
              references.forEach(it => fa.push(this.referenceContentToForm(it)));
            }
          }
        });

        //console.log(extractSchemaContent);
        //console.log(form.value);

        if (form.invalid) {
          for (const controlName in form.controls) {
            const component = schemaFieldsMap.get(controlName);
            const control = form.controls[controlName];
            if (control && control.invalid) {
              if (control instanceof FormGroup) {
                switch (control.value.kind) {
                  case SchemaFieldKind.LINK: {
                    errors.push({
                      contentId: selectedContent._id,
                      locale: locale,
                      schema: schema.displayName || schema.id,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: control.controls['uri'].errors,
                    });
                    break;
                  }
                  case SchemaFieldKind.REFERENCE: {
                    errors.push({
                      contentId: selectedContent._id,
                      locale: locale,
                      schema: schema.displayName || schema.id,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: control.controls['uri'].errors,
                    });
                    break;
                  }
                  case SchemaFieldKind.ASSET: {
                    errors.push({
                      contentId: selectedContent._id,
                      locale: locale,
                      schema: schema.displayName || schema.id,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: control.controls['uri'].errors,
                    });
                    break;
                  }
                  default: {
                    console.log(`Unknown KIND : ${control.value}`);
                  }
                }
              } else {
                errors.push({
                  contentId: selectedContent._id,
                  locale: locale,
                  schema: schema.displayName || schema.id,
                  fieldName: controlName,
                  fieldDisplayName: component?.displayName,
                  errors: control.errors,
                });
              }
            } else {
              // Work around for Form Array required
              if (control instanceof FormArray) {
                if (component?.required) {
                  if (control.length === 0) {
                    errors.push({
                      contentId: selectedContent._id,
                      locale: locale,
                      schema: schema.displayName || schema.id,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: { required: true },
                    });
                  }
                }
              }
            }
          }
        }
        schema.fields
          ?.filter(it => it.kind === SchemaFieldKind.SCHEMA)
          .forEach(field => {
            const sch: ContentData | undefined = selectedContent && selectedContent[field.name];
            if (sch) {
              contentIteration.push(sch);
            }
          });
        schema.fields
          ?.filter(it => it.kind === SchemaFieldKind.SCHEMAS)
          .forEach(field => {
            const sch: ContentData[] | undefined = selectedContent![field.name];
            sch?.forEach(it => contentIteration.push(it));
          });
      }
      selectedContent = contentIteration.pop();
    }
    //console.log('errors', errors);
    //console.groupEnd();
    return errors;
  }

  extractSchemaContent(data: ContentData, schema: SchemaComponent, locale: string, full: boolean): Record<string, any> {
    //console.group('extractSchemaContent')
    //console.log('data',data)
    const isDefaultLocale = locale === DEFAULT_LOCALE.id;
    const result: Record<string, any> = {};
    schema.fields
      ?.filter(it => full || ![SchemaFieldKind.SCHEMA, SchemaFieldKind.SCHEMAS].includes(it.kind))
      ?.forEach(field => {
        //console.log('field', field)
        let value;
        if (field.translatable && !isDefaultLocale) {
          // Extract Locale specific values
          value = data[`${field.name}_i18n_${locale}`];
        } else {
          // Extract not translatable values or Default Locale
          value = data[field.name];
        }
        if (value !== undefined) {
          result[field.name] = value;
        }
      });
    //console.log('result',result)
    //console.groupEnd()
    return result;
  }

  clone<T>(source: T, generateNewID = false): T {
    if (source instanceof Array) {
      const target: any = Object.assign([], source);
      Object.getOwnPropertyNames(target).forEach(value => {
        if (target[value] instanceof Object) {
          target[value] = this.clone(target[value], generateNewID);
        }
      });
      return target;
    } else if (source instanceof Object) {
      const target: any = Object.assign({}, source);
      Object.getOwnPropertyNames(target).forEach(fieldName => {
        const value = target[fieldName];
        if (target[fieldName] instanceof Object) {
          target[fieldName] = this.clone(target[fieldName], generateNewID);
          if (Object.getOwnPropertyNames(target[fieldName]).some(it => it === 'kind')) {
            if (isLinkContent(value) && (value.uri === undefined || value.uri === null || value.uri === '')) {
              delete target[fieldName];
            } else if (isReferenceContent(value) && (value.uri === undefined || value.uri === null || value.uri === '')) {
              delete target[fieldName];
            } else if (isAssetContent(value) && (value.uri === undefined || value.uri === null || value.uri === '')) {
              delete target[fieldName];
            }
          }
        }
        if (generateNewID && fieldName === '_id') {
          target[fieldName] = v4();
        }
        if (value == null) {
          delete target[fieldName];
        } else if (Array.isArray(value) && value.length === 0) {
          delete target[fieldName];
        }
      });
      return target;
    }
    return null as unknown as T;
  }

  generateSchemaForm(schema: SchemaComponent, isDefaultLocale: boolean): FormRecord {
    //console.group('ContentHelperService:generateSchemaForm')
    //console.log('schema', schema)
    const form: FormRecord = this.fb.record({});
    for (const field of schema.fields || []) {
      const validators: ValidatorFn[] = [];
      // Mark required only in default locale
      if (isDefaultLocale && field.required) {
        validators.push(Validators.required);
      }
      // translatable + isDefaultLocale => disabled = false
      // translatable + !isDefaultLocale => disabled = false
      // !translatable + isDefaultLocale => disabled = false
      // !translatable + !isDefaultLocale => disabled = true
      const disabled = !(field.translatable === true || isDefaultLocale);
      switch (field.kind) {
        case SchemaFieldKind.TEXT:
        case SchemaFieldKind.TEXTAREA:
        case SchemaFieldKind.RICH_TEXT:
        case SchemaFieldKind.MARKDOWN: {
          if (field.minLength) {
            validators.push(Validators.minLength(field.minLength));
          }
          if (field.maxLength) {
            validators.push(Validators.maxLength(field.maxLength));
          }
          form.setControl(
            field.name,
            this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.NUMBER: {
          if (field.minValue) {
            validators.push(Validators.min(field.minValue));
          }
          if (field.maxValue) {
            validators.push(Validators.max(field.maxValue));
          }
          form.setControl(
            field.name,
            this.fb.control<number | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.COLOR: {
          form.setControl(
            field.name,
            this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.BOOLEAN: {
          form.setControl(
            field.name,
            this.fb.control<boolean | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.DATE: {
          form.setControl(
            field.name,
            this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.DATETIME: {
          form.setControl(
            field.name,
            this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.OPTION: {
          form.setControl(
            field.name,
            this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.OPTIONS: {
          if (field.minValues) {
            validators.push(Validators.minLength(field.minValues));
          }
          if (field.maxValues) {
            validators.push(Validators.maxLength(field.maxValues));
          }
          form.setControl(
            field.name,
            this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
        case SchemaFieldKind.LINK: {
          const link = this.fb.group({
            kind: this.fb.control(SchemaFieldKind.LINK, Validators.required),
            type: this.fb.control<'url' | 'content'>('url', Validators.required),
            target: this.fb.control<'_blank' | '_self'>('_self', Validators.required),
            uri: this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: false, //disabled
              },
              validators,
            ),
          });
          form.setControl(field.name, link);
          break;
        }
        case SchemaFieldKind.REFERENCE: {
          const link = this.fb.group({
            kind: this.fb.control(SchemaFieldKind.REFERENCE, Validators.required),
            uri: this.fb.control<string | undefined>(
              {
                value: undefined,
                disabled: false, //disabled
              },
              validators,
            ),
          });
          form.setControl(field.name, link);
          break;
        }
        case SchemaFieldKind.REFERENCES: {
          if (field.required) {
            validators.push(CommonValidator.minLength(1));
          }
          form.setControl(field.name, this.fb.array([], validators));
          break;
        }
        case SchemaFieldKind.ASSET: {
          form.setControl(
            field.name,
            this.fb.group({
              uri: this.fb.control<string | undefined>(
                {
                  value: undefined,
                  disabled: false, //disabled
                },
                validators,
              ),
              kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
            }),
          );
          break;
        }
        case SchemaFieldKind.ASSETS: {
          if (field.required) {
            validators.push(CommonValidator.minLength(1));
          }
          form.setControl(field.name, this.fb.array([], validators));
          break;
        }
        case SchemaFieldKind.SCHEMA: {
          form.setControl(
            field.name,
            this.fb.control<any | undefined>(
              {
                value: undefined,
                disabled: disabled,
              },
              validators,
            ),
          );
          break;
        }
      }
    }
    //console.groupEnd()
    return form;
  }

  assetsContentToFormArray(uris: AssetContent[]): FormArray {
    return this.fb.array(
      uris.map(it =>
        this.fb.group({
          uri: this.fb.control(it.uri, Validators.required),
          kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
        }),
      ),
    );
  }

  assetContentToForm(asset: AssetContent): FormGroup {
    return this.fb.group({
      uri: this.fb.control(asset.uri),
      kind: this.fb.control(asset.kind),
    });
  }

  referenceContentToForm(reference: ReferenceContent): FormGroup {
    return this.fb.group({
      uri: this.fb.control(reference.uri),
      kind: this.fb.control(reference.kind),
    });
  }

  assetsFormArray(uris: string[]): FormArray {
    return this.fb.array(
      uris.map(it =>
        this.fb.group({
          uri: this.fb.control(it, Validators.required),
          kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
        }),
      ),
    );
  }

  assetFormGroup(uri: string): FormGroup {
    return this.fb.group({
      uri: this.fb.control(uri, Validators.required),
      kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
    });
  }
}
