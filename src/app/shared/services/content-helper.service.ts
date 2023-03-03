import {Injectable} from '@angular/core';
import {
  Schematic,
  SchematicComponent,
  SchematicComponentKind
} from '@shared/models/schematic.model';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormRecord,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {ContentError, ContentPageData} from '@shared/models/content.model';

@Injectable()
export class ContentHelperService {
  constructor(
    private readonly fb: FormBuilder,
  ) {
  }

  validateContent(data: ContentPageData, schematics: Schematic[], locale: string): ContentError[] | null {
    const errors: ContentError[] = [];
    const schematicsByName = new Map<string, Schematic>(schematics.map(it => [it.name, it]));
    const contentIteration = [data]
    // Iterative traversing content and validating fields.
    let selectedContent = contentIteration.pop()
    while (selectedContent) {
      const schematic = schematicsByName.get(selectedContent.schematic)
      if (schematic) {
        const schematicComponentsMap = new Map<string, SchematicComponent>(schematic.components?.map(it => [it.name, it]));
        const form = this.generateSchematicForm(schematic, true)
        const extractSchematicContent = this.extractSchematicContent(selectedContent, schematic, locale, true)
        form.patchValue(extractSchematicContent)

        Object.getOwnPropertyNames(extractSchematicContent)
          .filter(it => extractSchematicContent[it] instanceof Array)
          .forEach(fieldName => {
            // Assets
            form.controls[fieldName] = this.assetsToFormArray(extractSchematicContent[fieldName])
          })

        form.updateValueAndValidity()

        if (form.invalid) {
          for (const controlName in form.controls) {
            const component = schematicComponentsMap.get(controlName);
            const control = form.controls[controlName];
            if (control && control.invalid) {
              if (control instanceof FormGroup) {
                switch (control.value.kind) {
                  case SchematicComponentKind.LINK: {
                    errors.push({
                      contentId: selectedContent._id,
                      schematic: schematic.displayName || schematic.name,
                      fieldName: controlName,
                      fieldDisplayName: component?.displayName,
                      errors: control.controls['uri'].errors
                    })
                    break;
                  }
                  case SchematicComponentKind.ASSET: {
                    errors.push({
                      contentId: selectedContent._id,
                      schematic: schematic.displayName || schematic.name,
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
                  schematic: schematic.displayName || schematic.name,
                  fieldName: controlName,
                  fieldDisplayName: component?.displayName,
                  errors: control.errors
                })
              }
            } else {
              // Work around for Form Array required
              // if (control instanceof FormArray) {
              //   if(component?.required) {
              //     if(control.length === 0 ) {
              //       errors.push({
              //         contentId: selectedContent._id,
              //         schematic: schematic.displayName || schematic.name,
              //         fieldName: controlName,
              //         fieldDisplayName: component?.displayName,
              //         errors: {required: true}
              //       })
              //     }
              //   }
              // }
            }
          }
        }
        schematic.components
          ?.filter((it) => it.kind === SchematicComponentKind.SCHEMATIC)
          .forEach((component) => {
            const sch: ContentPageData[] | undefined = selectedContent![component.name];
            sch?.forEach((it) => contentIteration.push(it));
          })
      }
      selectedContent = contentIteration.pop()
    }
    return errors.length > 0 ? errors : null;
  }

  extractSchematicContent(data: ContentPageData, schematic: Schematic, locale: string, full: boolean): Record<string, any> {
    const result: Record<string, any> = {}
    schematic.components
      ?.filter(it => full || it.kind !== SchematicComponentKind.SCHEMATIC)
      ?.forEach((comp) => {
        let value;
        if (comp.translatable) {
          // Extract Locale specific values
          value = data[`${comp.name}_i18n_${locale}`]
        } else {
          // Extract not translatable values in fallback locale
          value = data[comp.name]
        }
        if (value) {
          result[comp.name] = value;
        }
      })
    console.log("ContentHelperService:extractSchematicContent")
    console.log(result)
    return result
  }

  clone<T>(source: T): T {
    if (source instanceof Array) {
      const target: any = Object.assign([], source);
      Object.getOwnPropertyNames(target).forEach(value => {
        if (target[value] instanceof Object) {
          target[value] = this.clone(target[value]);
        }
      });
      return target;
    } else if (source instanceof Object) {
      const target: any = Object.assign({}, source);
      Object.getOwnPropertyNames(target).forEach(value => {
        if (target[value] instanceof Object) {
          target[value] = this.clone(target[value]);
          if (Object.getOwnPropertyNames(target[value]).some(it => it === 'kind')) {
            switch (target[value]['kind']) {
              case SchematicComponentKind.LINK: {
                if (target[value]['uri'] === undefined || target[value]['uri'] === '') {
                  delete target[value];
                }
                break;
              }
              case SchematicComponentKind.ASSET: {
                if (target[value]['uri'] === undefined || target[value]['uri'] === '') {
                  delete target[value];
                }
                break;
              }
            }
          }
        }
        const v = target[value]
        if (v == null) {
          delete target[value];
        } else if (v instanceof Array && v.length === 0) {
          delete target[value];
        }

      });
      return target;
    }
    return null as unknown as T;
  }

  generateSchematicForm(schematic: Schematic, isFallbackLocale: boolean): FormRecord {
    const form: FormRecord = this.fb.record({});
    for (const component of schematic.components || []) {
      const validators: ValidatorFn[] = []
      if (component.required) {
        validators.push(Validators.required)
      }
      // translatable + fallBackLocale => disabled = false
      // translatable + !fallBackLocale => disabled = false
      // !translatable + fallBackLocale => disabled = false
      // !translatable + !fallBackLocale => disabled = true
      const disabled = !((component.translatable === true) || (isFallbackLocale))
      switch (component.kind) {
        case SchematicComponentKind.TEXT:
        case SchematicComponentKind.TEXTAREA: {
          if (component.minLength) {
            validators.push(Validators.minLength(component.minLength))
          }
          if (component.maxLength) {
            validators.push(Validators.maxLength(component.maxLength))
          }
          form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.NUMBER: {
          if (component.minValue) {
            validators.push(Validators.min(component.minValue))
          }
          if (component.maxValue) {
            validators.push(Validators.max(component.maxValue))
          }
          form.setControl(component.name, this.fb.control<number | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.COLOR: {
          form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.BOOLEAN: {
          form.setControl(component.name, this.fb.control<boolean | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.DATE: {
          form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.DATETIME: {
          form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.OPTION: {
          form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.OPTIONS: {
          if (component.minValues) {
            validators.push(Validators.minLength(component.minValues))
          }
          if (component.maxValues) {
            validators.push(Validators.maxLength(component.maxValues))
          }
          form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.LINK: {
          const link = this.fb.group({
            kind: this.fb.control(SchematicComponentKind.LINK, Validators.required),
            type: this.fb.control<'url' | 'content'>('url', Validators.required),
            uri: this.fb.control<string | undefined>({
              value: undefined,
              disabled: disabled
            }, validators)
          })
          form.setControl(component.name, link)
          break;
        }
        case SchematicComponentKind.ASSET: {
          form.setControl(component.name, this.fb.group({
            uri: this.fb.control<string | undefined>({
              value: undefined,
              disabled: disabled
            }, validators),
            kind: this.fb.control(SchematicComponentKind.ASSET, Validators.required),
          }))
          break;
        }
        case SchematicComponentKind.ASSETS: {
          if (component.required) {
            validators.push(Validators.minLength(1))
          }
          form.setControl(component.name, this.fb.array([], validators));
          break;
        }
      }
    }
    return form;
  }

  assetsToFormArray(uris: { uri: string }[]): FormArray {
    return this.fb.array(uris.map(it => this.fb.group({
      uri: this.fb.control(it.uri, Validators.required),
      kind: this.fb.control(SchematicComponentKind.ASSET, Validators.required),
    })))
  }

  assetsFormArray(uris: string[]): FormArray {
    return this.fb.array(uris.map(it => this.fb.group({
      uri: this.fb.control(it, Validators.required),
      kind: this.fb.control(SchematicComponentKind.ASSET, Validators.required),
    })))
  }

  assetFormGroup(uri: string): FormGroup {
    return this.fb.group({
      uri: this.fb.control(uri, Validators.required),
      kind: this.fb.control(SchematicComponentKind.ASSET, Validators.required),
    })
  }
}
