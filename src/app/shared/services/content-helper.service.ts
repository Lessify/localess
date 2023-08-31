import {Injectable} from '@angular/core';
import {Schema, SchemaField, SchemaFieldKind} from '@shared/models/schema.model';
import {FormArray, FormBuilder, FormGroup, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {ContentData, ContentError} from '@shared/models/content.model';
import {CommonValidator} from '@shared/validators/common.validator';
import {v4} from 'uuid';

@Injectable()
export class ContentHelperService {
  constructor(
    private readonly fb: FormBuilder,
  ) {
  }

  validateContent(data: ContentData, schemas: Schema[], locale: string): ContentError[] | null {
    const errors: ContentError[] = [];
    const schemasByName = new Map<string, Schema>(schemas.map(it => [it.name, it]));
    const contentIteration = [data]
    // Iterative traversing content and validating fields.
    let selectedContent = contentIteration.pop()
    while (selectedContent) {
      const schema = schemasByName.get(selectedContent.schema)
      if (schema) {
        const schemaFieldsMap = new Map<string, SchemaField>(schema.fields?.map(it => [it.name, it]));
        const form = this.generateSchemaForm(schema, true)
        const extractSchemaContent = this.extractSchemaContent(selectedContent, schema, locale, true)
        form.patchValue(extractSchemaContent)

        // handle array like Asset Array
        Object.getOwnPropertyNames(extractSchemaContent)
          .forEach(fieldName => {
            const content = extractSchemaContent[fieldName]
            if (content instanceof Array) {
              // Assets
              if (content.some((it) => it.kind === SchemaFieldKind.ASSET)) {
                form.controls[fieldName] = this.assetsToFormArray(content)
              }
            }
          })

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
                      schema: schema.displayName || schema.name,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: control.controls['uri'].errors
                    })
                    break;
                  }
                  case SchemaFieldKind.ASSET: {
                    errors.push({
                      contentId: selectedContent._id,
                      schema: schema.displayName || schema.name,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: control.controls['uri'].errors
                    })
                    break;
                  }
                  default: {
                    console.log(`Unknown KIND : ${control.value}`)
                  }
                }
              } else {
                errors.push({
                  contentId: selectedContent._id,
                  schema: schema.displayName || schema.name,
                  fieldName: controlName,
                  fieldDisplayName: component?.displayName,
                  errors: control.errors
                })
              }
            } else {
              // Work around for Form Array required
              if (control instanceof FormArray) {
                if (component?.required) {
                  if (control.length === 0) {
                    errors.push({
                      contentId: selectedContent._id,
                      schema: schema.displayName || schema.name,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: {required: true}
                    })
                  }
                }
              }
            }
          }
        }
        schema.fields
          ?.filter((it) => it.kind === SchemaFieldKind.SCHEMA)
          .forEach((field) => {
            const sch: ContentData | undefined = selectedContent![field.name];
            if (sch) {
              contentIteration.push(sch)
            }
          })
        schema.fields
          ?.filter((it) => it.kind === SchemaFieldKind.SCHEMAS)
          .forEach((field) => {
            const sch: ContentData[] | undefined = selectedContent![field.name];
            sch?.forEach((it) => contentIteration.push(it));
          })
      }
      selectedContent = contentIteration.pop()
    }
    return errors.length > 0 ? errors : null;
  }

  extractSchemaContent(data: ContentData, schema: Schema, locale: string, full: boolean): Record<string, any> {
    const result: Record<string, any> = {}
    schema.fields
      ?.filter(it => full || ![SchemaFieldKind.SCHEMA, SchemaFieldKind.SCHEMAS].includes(it.kind))
      ?.forEach((field) => {
        let value;
        if (field.translatable) {
          // Extract Locale specific values
          value = data[`${field.name}_i18n_${locale}`]
        } else {
          // Extract not translatable values in fallback locale
          value = data[field.name]
        }
        if (value) {
          result[field.name] = value;
        }
      })
    // console.log(result)
    return result
  }

  clone<T>(source: T, generateNewID: boolean = false): T {
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
        if (target[fieldName] instanceof Object) {
          target[fieldName] = this.clone(target[fieldName], generateNewID);
          if (Object.getOwnPropertyNames(target[fieldName]).some(it => it === 'kind')) {
            switch (target[fieldName]['kind']) {
              case SchemaFieldKind.LINK: {
                if (target[fieldName]['uri'] === undefined || target[fieldName]['uri'] === '') {
                  delete target[fieldName];
                }
                break;
              }
              case SchemaFieldKind.ASSET: {
                if (target[fieldName]['uri'] === undefined || target[fieldName]['uri'] === '') {
                  delete target[fieldName];
                }
                break;
              }
            }
          }
        }
        const value = target[fieldName]
        if (generateNewID && fieldName === '_id') {
          target[fieldName] = v4()
        }
        if (value == null) {
          delete target[fieldName];
        } else if (value instanceof Array && value.length === 0) {
          delete target[fieldName];
        }
      });
      return target;
    }
    return null as unknown as T;
  }

  generateSchemaForm(schema: Schema, isFallbackLocale: boolean): FormRecord {
    const form: FormRecord = this.fb.record({});
    for (const field of schema.fields || []) {
      const validators: ValidatorFn[] = []
      if (field.required) {
        validators.push(Validators.required)
      }
      // translatable + fallBackLocale => disabled = false
      // translatable + !fallBackLocale => disabled = false
      // !translatable + fallBackLocale => disabled = false
      // !translatable + !fallBackLocale => disabled = true
      const disabled = !((field.translatable === true) || (isFallbackLocale))
      switch (field.kind) {
        case SchemaFieldKind.TEXT:
        case SchemaFieldKind.TEXTAREA:
        case SchemaFieldKind.MARKDOWN: {
          if (field.minLength) {
            validators.push(Validators.minLength(field.minLength))
          }
          if (field.maxLength) {
            validators.push(Validators.maxLength(field.maxLength))
          }
          form.setControl(field.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.NUMBER: {
          if (field.minValue) {
            validators.push(Validators.min(field.minValue))
          }
          if (field.maxValue) {
            validators.push(Validators.max(field.maxValue))
          }
          form.setControl(field.name, this.fb.control<number | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.COLOR: {
          form.setControl(field.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.BOOLEAN: {
          form.setControl(field.name, this.fb.control<boolean | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.DATE: {
          form.setControl(field.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.DATETIME: {
          form.setControl(field.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.OPTION: {
          form.setControl(field.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.OPTIONS: {
          if (field.minValues) {
            validators.push(Validators.minLength(field.minValues))
          }
          if (field.maxValues) {
            validators.push(Validators.maxLength(field.maxValues))
          }
          form.setControl(field.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchemaFieldKind.LINK: {
          const link = this.fb.group({
            kind: this.fb.control(SchemaFieldKind.LINK, Validators.required),
            type: this.fb.control<'url' | 'content'>('url', Validators.required),
            target: this.fb.control<'_blank' | '_self'>('_self', Validators.required),
            uri: this.fb.control<string | undefined>({
              value: undefined,
              disabled: disabled
            }, validators)
          })
          form.setControl(field.name, link)
          break;
        }
        case SchemaFieldKind.ASSET: {
          form.setControl(field.name, this.fb.group({
            uri: this.fb.control<string | undefined>({
              value: undefined,
              disabled: disabled
            }, validators),
            kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
          }))
          break;
        }
        case SchemaFieldKind.ASSETS: {
          if (field.required) {
            validators.push(CommonValidator.minLength(1))
          }
          form.setControl(field.name, this.fb.array([], validators));
          break;
        }
        case SchemaFieldKind.SCHEMA: {
          form.setControl(field.name, this.fb.control<any | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
      }
    }
    return form;
  }

  assetsToFormArray(uris: { uri: string }[]): FormArray {
    return this.fb.array(uris.map(it => this.fb.group({
      uri: this.fb.control(it.uri, Validators.required),
      kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
    })))
  }

  assetsFormArray(uris: string[]): FormArray {
    return this.fb.array(uris.map(it => this.fb.group({
      uri: this.fb.control(it, Validators.required),
      kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
    })))
  }

  assetFormGroup(uri: string): FormGroup {
    return this.fb.group({
      uri: this.fb.control(uri, Validators.required),
      kind: this.fb.control(SchemaFieldKind.ASSET, Validators.required),
    })
  }
}
