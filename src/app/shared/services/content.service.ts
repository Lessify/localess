import {Injectable} from '@angular/core';
import {Schematic, SchematicComponentKind} from '@shared/models/schematic.model';
import {FormBuilder, FormRecord, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {PageContentComponent} from '@shared/models/page.model';

export interface ContentError {
  contentId: string;
  fieldName: string;
  errors: ValidationErrors | null;
}

@Injectable()
export class ContentService {
  constructor(
    private readonly fb: FormBuilder,
  ) {
  }

  validateContent(content: PageContentComponent, schematics: Schematic[], locale: string): ContentError[] | null {
    const errors: ContentError[] = [];
    const schematicsByName = new Map<string, Schematic>(schematics.map(it => [it.name, it]));
    const contentIteration = [content]

    // Iterative traversing content and validating fields.
    let selectedContent = contentIteration.pop()
    while (selectedContent) {
      const schematic = schematicsByName.get(selectedContent.schematic)
      if (schematic) {
        const form = this.generateSchematicForm(schematic, true)
        form.patchValue(this.extractSchematicContent(selectedContent, schematic, locale))
        if (!form.valid) {
          for (const controlName in form.controls) {
            const control = form.controls[controlName];
            if (control && !control.valid) {
              errors.push({
                contentId: selectedContent._id,
                fieldName: controlName,
                errors: control.errors
              })
            }
          }
        }
        schematic.components
          ?.filter((it) => it.kind === SchematicComponentKind.SCHEMATIC)
          .forEach((component) => {
            const sch: PageContentComponent[] | undefined = selectedContent![component.name];
            sch?.forEach((it) => contentIteration.push(it));
          })
      }
      selectedContent = contentIteration.pop()
    }
    return errors.length > 0 ? errors : null;
  }

  extractSchematicContent(content: PageContentComponent, schematic: Schematic, locale: string): Record<string, any> {
    const result: Record<string, any> = {}
    schematic.components?.forEach((comp) => {
      let value;
      if (comp.translatable) {
        // Extract Locale specific values
        value = content[`${comp.name}_i18n_${locale}`]
      } else {
        // Extract not translatable values in fallback locale
        value = content[comp.name]
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
      }
    }
    return form;
  }
}
