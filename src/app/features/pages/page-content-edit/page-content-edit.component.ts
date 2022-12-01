import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {
  Schematic,
  SchematicComponent,
  SchematicComponentKind
} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';
import {ActivatedRoute, Router} from '@angular/router';
import {SchematicService} from '@shared/services/schematic.service';
import {PageService} from '@shared/services/page.service';
import {Page, PageContentComponent} from '@shared/models/page.model';
import {Store} from '@ngrx/store';
import {AppState} from '../../../core/state/core.state';
import {selectSpace} from '../../../core/state/space/space.selector';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, debounceTime, Subject} from 'rxjs';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {Locale} from '@shared/models/locale.model';
import {ObjectUtils} from '../../../core/utils/object-utils.service';
import {v4} from 'uuid';

@Component({
  selector: 'll-page-content-edit',
  templateUrl: './page-content-edit.component.html',
  styleUrls: ['./page-content-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContentEditComponent implements OnInit, OnDestroy {

  selectedSpace?: Space;
  selectedLocale?: Locale;
  pageId: string;
  page?: Page;
  content: PageContentComponent = {_id: '', schematic: ''};
  schematic?: Schematic;
  schematicComponentsMap?: Map<string, SchematicComponent>;
  schematics: Schematic[] = []

  //Loadings
  isLoading: boolean = true;
  isPublishLoading: boolean = false;
  isSaveLoading: boolean = false;
  isFormLoading: boolean = false;

  // Form
  form: FormRecord = this.fb.record({});

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly cd: ChangeDetectorRef,
    private readonly spaceService: SpaceService,
    private readonly schematicService: SchematicService,
    private readonly pageService: PageService,
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
    readonly fe: FormErrorHandlerService,
  ) {
    this.pageId = this.activatedRoute.snapshot.paramMap.get('id') || "";
  }

  ngOnInit(): void {
    this.loadData(this.pageId)
    this.form.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500)
      )
      .subscribe({
        next: (formValue) => {
          console.group('form')
          console.log(Object.getOwnPropertyNames(formValue))
          console.log(formValue)
          console.log('Before')
          console.log(this.content)

          for (const key of Object.getOwnPropertyNames(formValue)) {
            const value = formValue[key]
            const schematic = this.schematicComponentsMap?.get(key)
            if (value !== null) {
              if (schematic?.translatable && this.selectedLocale) {
                this.content[`${key}_i18n_${this.selectedLocale.id}`] = value
              } else {
                this.content[key] = value
              }
            }
          }
          console.log('After')
          console.log(this.content)
          console.groupEnd()
        },
        error: (err) => console.log(err),
        complete: () => console.log('completed')
      })
  }

  loadData(pageId: string): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.pageService.findById(it.id, pageId),
            this.schematicService.findAll(it.id)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, page, schematics]) => {
          this.selectedSpace = space;
          this.selectedLocale = space.localeFallback;
          this.page = page;
          this.schematic = schematics.find(it => it.id === page.schematic);
          this.content = page.content ? ObjectUtils.clone(page.content) : {
            _id: v4(),
            schematic: this.schematic?.name || ''
          };
          this.schematics = schematics;
          this.schematicComponentsMap = new Map<string, SchematicComponent>(this.schematic?.components?.map(it => [it.name, it]));
          this.generateForm();
          if (this.content) {
            this.form.reset()
            this.form.patchValue(this.extractLocaleContent(this.selectedLocale));
          }
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  generateForm(): void {
    for (const component of this.schematic?.components || []) {
      const validators: ValidatorFn[] = []
      if (component.required) {
        validators.push(Validators.required)
      }
      // translatable + fallBackLocale => disabled = false
      // translatable + !fallBackLocale => disabled = false
      // !translatable + fallBackLocale => disabled = false
      // !translatable + !fallBackLocale => disabled = true
      const disabled = !((component.translatable === true) || (this.selectedLocale?.id === this.selectedSpace?.localeFallback.id))
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

  publish(): void {
    this.isPublishLoading = true;

    setTimeout(() => {
      this.isPublishLoading = false
      this.cd.markForCheck()
    }, 1000)
  }

  save(): void {
    this.isSaveLoading = true;

    this.pageService.updateContent(this.selectedSpace!.id, this.pageId, this.content)
      .subscribe({
        next: () => {
          this.notificationService.success('Article has been updated.');
        },
        error: () => {
          this.notificationService.error('Article can not be updated.');
        },
        complete: () => {
          setTimeout(() => {
            this.isSaveLoading = false
            this.cd.markForCheck()
          }, 1000)
        }
      })
  }

  back(): void {
    this.router.navigate(['features', 'pages']);
  }

  onLocaleChanged(locale: Locale): void {
    this.selectedLocale = locale;
    this.isFormLoading = true;
    this.cd.detectChanges();
    this.generateForm();
    this.form.reset()
    this.form.patchValue(this.extractLocaleContent(locale));
    this.isFormLoading = false;
    this.cd.markForCheck();
  }

  extractLocaleContent(locale: Locale): Record<string, any> {
    const result: Record<string, any> = {}
    // Extract Locale specific values
    this.schematic?.components?.forEach((comp) => {
      const value = this.content[`${comp.name}_i18n_${locale.id}`]
      if (value) {
        result[comp.name] = this.content[`${comp.name}_i18n_${locale.id}`]
      }
    })
    // Extract not translatable values in fallback locale
    this.schematic?.components?.forEach((comp) => {
      const value = this.content[comp.name]
      if (value) {
        result[comp.name] = value
      }
    })
    return result
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
}
