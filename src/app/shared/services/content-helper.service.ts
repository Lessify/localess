import {Injectable} from '@angular/core';
import {
  Schematic,
  SchematicComponent,
  SchematicComponentKind
} from '@shared/models/schematic.model';
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
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
        form.patchValue(this.extractSchematicContent(selectedContent, schematic, locale))
        if (!form.valid) {
          for (const controlName in form.controls) {
            const component = schematicComponentsMap.get(controlName);
            const control = form.controls[controlName];
            if (control && !control.valid) {
              errors.push({
                contentId: selectedContent._id,
                schematic: schematic.displayName || schematic.name,
                fieldName: controlName,
                fieldDisplayName: component?.displayName,
                errors: control.errors
              })
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

  extractSchematicContent(data: ContentPageData, schematic: Schematic, locale: string): Record<string, any> {
    const result: Record<string, any> = {}
    schematic.components?.forEach((comp) => {
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
    return result
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
      }
    }
    return form;
  }
}
