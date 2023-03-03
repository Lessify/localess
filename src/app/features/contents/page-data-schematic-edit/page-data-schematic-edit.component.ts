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
import {Schematic, SchematicComponent} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {ContentPage, ContentPageData} from '@shared/models/content.model';
import {takeUntil} from 'rxjs/operators';
import {debounceTime, Subject} from 'rxjs';
import {v4} from 'uuid';
import {environment} from '../../../../environments/environment';
import {SchematicSelectChange} from './page-data-schematic-edit.model';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {Space} from '@shared/models/space.model';
import {ObjectUtils} from '@core/utils/object-utils.service';

@Component({
  selector: 'll-page-data-schematic-edit',
  templateUrl: './page-data-schematic-edit.component.html',
  styleUrls: ['./page-data-schematic-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageDataSchematicEditComponent implements OnInit, OnChanges, OnDestroy {

  // Form
  form: FormRecord = this.fb.record({});
  // Subscriptions
  private destroy$ = new Subject();

  @Input() data: ContentPageData = {_id: '', schematic: ''};
  @Input() schematics: Schematic[] = [];
  @Input() pages: ContentPage[] = [];
  @Input() locale: string = 'en';
  @Input() localeFallback: string = 'en';
  @Input() space?: Space;
  @Output() schematicChange = new EventEmitter<SchematicSelectChange>();

  isDebug = environment.debug
  rootSchematic?: Schematic;
  schematicMapById: Map<string, Schematic> = new Map<string, Schematic>();
  schematicMapByName: Map<string, Schematic> = new Map<string, Schematic>();
  schematicComponentsMap: Map<string, SchematicComponent> = new Map<string, SchematicComponent>();
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
    //console.log('PageDataSchematicEditComponent:ngOnChanges')
    //console.log(changes)

    const schematicsChange = changes['schematics'];
    if (schematicsChange) {
      this.schematicMapById = new Map<string, Schematic>(this.schematics.map(it => [it.id, it]));
      this.schematicMapByName = new Map<string, Schematic>(this.schematics.map(it => [it.name, it]));
    }

    const dataChange = changes['data'];
    if (dataChange) {
      if (dataChange.isFirstChange()) {
        this.rootSchematic = this.schematics.find(it => it.name == this.data.schematic);
        this.schematicComponentsMap = new Map<string, SchematicComponent>(this.rootSchematic?.components?.map(it => [it.name, it]));
      } else {
        // Update only when content is different
        if (dataChange.currentValue._id != dataChange.previousValue._id) {
          // Find new root schematic and regenerate the form
          this.rootSchematic = this.schematics.find(it => it.name == this.data.schematic);
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

  }

  ngOnInit(): void {
    // console.group('ngOnInit')
    //console.log(`content : ${JSON.stringify(this.content)}`)
    //console.log(`schematics : ${JSON.stringify(this.schematics)}`)
    //console.log(`locale : ${this.locale}`)
    //console.log(`localeFallback : ${this.localeFallback}`)
    // console.groupEnd()

    this.generateForm();
    if (this.data) {
      this.formPatch()
      // this.form.reset()
      // this.form.patchValue(this.contentService.extractSchematicContent(this.data, this.rootSchematic!, this.locale));
    }

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
            const schematic = this.schematicComponentsMap.get(key)
            if (value !== null) {
              if (schematic?.translatable) {
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

  generateForm(): void {
    if (this.rootSchematic) {
      const isFallbackLocale = this.locale === this.localeFallback
      this.form = this.contentService.generateSchematicForm(this.rootSchematic, isFallbackLocale)
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
    //this.form.patchValue(this.contentService.extractSchematicContent(this.data, this.rootSchematic!, this.locale));
    this.isFormLoading = false;
    this.cd.markForCheck();
  }

  formPatch(): void {
    this.form.reset();
    let extractSchematicContent = this.contentService.extractSchematicContent(this.data, this.rootSchematic!, this.locale, false);
    this.form.patchValue(extractSchematicContent);
    Object.getOwnPropertyNames(extractSchematicContent)
      .filter(it => extractSchematicContent[it] instanceof Array)
      .forEach(fieldName => {
        //console.log(fieldName)
        // Assets
        this.form.controls[fieldName] = this.contentService.assetsToFormArray(extractSchematicContent[fieldName])
      })
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
    let sch: ContentPageData[] | undefined = this.data[component.name];
    if (sch) {
      sch.push(
        {
          _id: v4(),
          schematic: schematic.name
        }
      )
    } else {
      this.data[component.name] = [
        {
          _id: v4(),
          schematic: schematic.name
        }
      ]
    }
  }

  removeSchematic(component: SchematicComponent, schematicId: string): void {
    let sch: ContentPageData[] | undefined = this.data[component.name];
    if (sch) {
      let idx = sch.findIndex(it => it._id == schematicId);
      if (idx >= 0) {
        sch.splice(idx)
      }
      if (sch.length == 0) {
        delete this.data[component.name];
      }
    }
  }

  navigationTo(contentId: string, fieldName: string, schematicName: string): void {
    this.schematicChange.emit({contentId, fieldName, schematicName})
  }

  onAssetsChange() {
    this.form.updateValueAndValidity()
    this.cd.markForCheck()
  }
}
