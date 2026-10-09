import { inject, Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormRecord, ValidatorFn, Validators } from '@angular/forms';
import {
  CONTENT_DEFAULT_LOCALE,
  ContentAsset,
  ContentData,
  ContentReference,
  isFieldTranslatable,
  Schema,
  SchemaComponent,
  SchemaField,
  SchemaFieldKind,
  SchemaType,
} from '@localess/shared';
import { ContentError } from '@shared/models/content.model';
import { CommonValidator } from '@shared/validators/common.validator';

import { extractSchemaContent } from './content.utils';

@Injectable({ providedIn: 'root' })
export class ContentHelperService {
  private readonly fb = inject(FormBuilder);

  /**
   * Validate Content Data against Schemas and locale
   * @param {ContentData} data - document
   * @param {Schema[]} schemas
   * @param {string} locale
   */
  validateContent(data: ContentData, schemas: Schema[], locale: string): ContentError[] {
    //console.group('validateContent');
    const isDefaultLocale = CONTENT_DEFAULT_LOCALE.id === locale;
    const errors: ContentError[] = [];
    const schemasById = new Map<string, Schema>(schemas.map(it => [it.id, it]));
    const contentIteration = [data];
    // Iterative traversing content and validating fields.
    let selectedContent = contentIteration.pop();
    while (selectedContent) {
      const schema = schemasById.get(selectedContent._schema);
      if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
        const schemaFieldsMap = new Map<string, SchemaField>(schema.fields?.map(it => [it.name, it]));
        const form = this.generateSchemaForm(schema, isDefaultLocale);
        const schemaContent = extractSchemaContent(selectedContent, schema, locale, true);
        form.patchValue(schemaContent);

        // handle array like Asset/Reference Array
        Object.getOwnPropertyNames(schemaContent).forEach(fieldName => {
          const content = schemaContent[fieldName];
          //console.log(fieldName, content);
          if (content instanceof Array) {
            // Assets
            if (content.some(it => it.kind === SchemaFieldKind.ASSET)) {
              const assets: ContentAsset[] = content;
              const fa = form.controls[fieldName] as FormArray;
              assets.forEach(it => fa.push(this.assetContentToForm(it)));
            }
            // References
            if (content.some(it => it.kind === SchemaFieldKind.REFERENCE)) {
              const references: ContentReference[] = content;
              const fa = form.controls[fieldName] as FormArray;
              references.forEach(it => fa.push(this.referenceContentToForm(it)));
            }
          }
        });

        //console.log(schemaContent);
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
      const disabled = !(isFieldTranslatable(field) || isDefaultLocale);
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

  assetContentToForm(asset: ContentAsset): FormGroup {
    return this.fb.group({
      uri: this.fb.control(asset.uri),
      kind: this.fb.control(asset.kind),
    });
  }

  referenceContentToForm(reference: ContentReference): FormGroup {
    return this.fb.group({
      uri: this.fb.control(reference.uri),
      kind: this.fb.control(reference.kind),
    });
  }
}
