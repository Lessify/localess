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
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {
  Schematic,
  SchematicComponent,
  SchematicComponentKind
} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';
import {PageContentComponent} from '@shared/models/page.model';
import {takeUntil} from 'rxjs/operators';
import {debounceTime, Subject} from 'rxjs';
import {v4} from 'uuid';
import {environment} from '../../../../environments/environment';
import {SchematicSelectChange} from './page-content-schematic-edit.model';
import {ContentService} from '@shared/services/content.service';

@Component({
  selector: 'll-page-content-schematic-edit',
  templateUrl: './page-content-schematic-edit.component.html',
  styleUrls: ['./page-content-schematic-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContentSchematicEditComponent implements OnInit, OnChanges, OnDestroy {

  // Form
  form: FormRecord = this.fb.record({});
  // Subscriptions
  private destroy$ = new Subject();

  @Input() content: PageContentComponent = {_id: '', schematic: ''};
  @Input() schematics: Schematic[] = [];
  @Input() locale: string = 'en';
  @Input() localeFallback: string = 'en';
  @Output() schematicChange = new EventEmitter<SchematicSelectChange>();

  isTest = environment.test
  rootSchematic?: Schematic;
  schematicMapById: Map<string, Schematic> = new Map<string, Schematic>();
  schematicMapByName: Map<string, Schematic> = new Map<string, Schematic>();
  schematicComponentsMap: Map<string, SchematicComponent> = new Map<string, SchematicComponent>();
  //Loadings
  isFormLoading: boolean = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    private readonly contentService: ContentService,
    readonly fe: FormErrorHandlerService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.group('ngOnChanges')
    console.log(changes)

    const schematicsChange = changes['schematics'];
    if (schematicsChange) {
      this.schematicMapById = new Map<string, Schematic>(this.schematics.map(it => [it.id, it]));
      this.schematicMapByName = new Map<string, Schematic>(this.schematics.map(it => [it.name, it]));
    }

    const contentChange = changes['content'];
    if (contentChange) {
      if (contentChange.isFirstChange()) {
        this.rootSchematic = this.schematics.find(it => it.name == this.content.schematic);
        this.schematicComponentsMap = new Map<string, SchematicComponent>(this.rootSchematic?.components?.map(it => [it.name, it]));
      } else {
        // Update only when content is different
        if (contentChange.currentValue._id != contentChange.previousValue._id) {
          // Find new root schematic and regenerate the form
          this.rootSchematic = this.schematics.find(it => it.name == this.content.schematic);
          this.schematicComponentsMap = new Map<string, SchematicComponent>(this.rootSchematic?.components?.map(it => [it.name, it]));
          this.clearForm();
          this.onChanged();
        }
      }
    }

    const localeChange = changes['locale'];
    if (localeChange) {
      this.onChanged();
    }

    console.groupEnd()
  }

  ngOnInit(): void {
    console.group('ngOnInit')
    //console.log(`content : ${JSON.stringify(this.content)}`)
    //console.log(`schematics : ${JSON.stringify(this.schematics)}`)
    //console.log(`locale : ${this.locale}`)
    //console.log(`localeFallback : ${this.localeFallback}`)
    console.groupEnd()

    this.generateForm();
    if (this.content) {
      this.form.reset()
      this.form.patchValue(this.contentService.extractSchematicContent(this.content, this.rootSchematic!, this.locale));
    }

    this.form.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
      )
      .subscribe({
        next: (formValue) => {
          console.group('form')
          // console.log(Object.getOwnPropertyNames(formValue))
          //console.log(formValue)
          // console.log('Before')
          // console.log(this.content)

          for (const key of Object.getOwnPropertyNames(formValue)) {
            const value = formValue[key]
            const schematic = this.schematicComponentsMap.get(key)
            if (value !== null) {
              if (schematic?.translatable) {
                this.content[`${key}_i18n_${this.locale}`] = value
              } else {
                this.content[key] = value
              }
            }
          }
          // console.log('After')
          //console.log(this.content)
          console.groupEnd()
        },
        error: (err) => console.log(err),
        complete: () => console.log('completed')
      })
  }

  generateForm(): void {
    for (const component of this.rootSchematic?.components || []) {
      const validators: ValidatorFn[] = []
      if (component.required) {
        validators.push(Validators.required)
      }
      // translatable + fallBackLocale => disabled = false
      // translatable + !fallBackLocale => disabled = false
      // !translatable + fallBackLocale => disabled = false
      // !translatable + !fallBackLocale => disabled = true
      const disabled = !((component.translatable === true) || (this.locale === this.localeFallback))
      switch (component.kind) {
        case SchematicComponentKind.TEXT:
        case SchematicComponentKind.TEXTAREA: {
          if (component.minLength) {
            validators.push(Validators.minLength(component.minLength))
          }
          if (component.maxLength) {
            validators.push(Validators.maxLength(component.maxLength))
          }
          this.form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          //this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
          break;
        }
        case SchematicComponentKind.NUMBER: {
          if (component.minValue) {
            validators.push(Validators.min(component.minValue))
          }
          if (component.maxValue) {
            validators.push(Validators.max(component.maxValue))
          }
          //this.form.setControl(component.name, this.fb.control<number | undefined>({ value: component.defaultValue ? Number.parseInt(component.defaultValue) : undefined, disabled: disabled}, validators))
          this.form.setControl(component.name, this.fb.control<number | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.COLOR: {
          //this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
          this.form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.BOOLEAN: {
          //this.form.setControl(component.name, this.fb.control<boolean | undefined>({ value: component.defaultValue === 'true', disabled: disabled}, validators))
          this.form.setControl(component.name, this.fb.control<boolean | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.DATE: {
          //this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
          this.form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
        case SchematicComponentKind.DATETIME: {
          //this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
          this.form.setControl(component.name, this.fb.control<string | undefined>({
            value: undefined,
            disabled: disabled
          }, validators))
          break;
        }
      }
    }
  }

  clearForm(): void {
    console.group('clearForm')
    for (const ctrlName in this.form.controls) {
      this.form.removeControl(ctrlName)
    }
    console.groupEnd()
  }

  onChanged(): void {
    this.isFormLoading = true;
    this.cd.detectChanges();
    this.generateForm();
    this.form.reset();
    this.form.patchValue(this.contentService.extractSchematicContent(this.content, this.rootSchematic!, this.locale));
    this.isFormLoading = false;
    this.cd.markForCheck();
  }

  filterSchematic(ids?: string[]): Schematic[] {
    if (ids) {
      const result: Schematic[] = [];
      for (const id of ids) {
        const r = this.schematicMapById.get(id)
        if (r) {
          result.push(r)
        }
      }
      return result;
    }
    return this.schematics
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  addSchematic(component: SchematicComponent, schematic: Schematic): void {
    let sch: PageContentComponent[] | undefined = this.content[component.name];
    if (sch) {
      sch.push(
        {
          _id: v4(),
          schematic: schematic.name
        }
      )
    } else {
      this.content[component.name] = [
        {
          _id: v4(),
          schematic: schematic.name
        }
      ]
    }
  }

  removeSchematic(component: SchematicComponent, schematicId: string): void {
    let sch: PageContentComponent[] | undefined = this.content[component.name];
    if (sch) {
      let idx = sch.findIndex(it => it._id == schematicId);
      if (idx >= 0) {
        sch.splice(idx)
      }
      if (sch.length == 0) {
        delete this.content[component.name];
      }
    }
  }

  navigationTo(contentId: string, fieldName: string, schematicName: string): void {
    this.schematicChange.emit({contentId, fieldName, schematicName})
  }
}
