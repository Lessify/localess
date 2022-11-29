import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
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
import {Page, PageContent} from '@shared/models/page.model';
import {Store} from '@ngrx/store';
import {AppState} from '../../../core/state/core.state';
import {selectSpace} from '../../../core/state/space/space.selector';
import {filter, switchMap} from 'rxjs/operators';
import {combineLatest, debounceTime} from 'rxjs';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {Locale} from '@shared/models/locale.model';
import {ObjectUtils} from '../../../core/utils/object-utils.service';

@Component({
  selector: 'll-page-content-edit',
  templateUrl: './page-content-edit.component.html',
  styleUrls: ['./page-content-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContentEditComponent implements OnInit {

  selectedSpace?: Space;
  selectedLocale?: Locale;
  pageId: string;
  page?: Page;
  content: PageContent = {};
  schematic?: Schematic;
  schematicComponentsMap?: Map<string, SchematicComponent>;
  schematics: Schematic[] = []

  //Loadings
  isLoading: boolean = true;
  isPublishLoading: boolean = false;
  isSaveLoading: boolean = false;
  isFormLoading: boolean = false;

  form: FormRecord = this.fb.record({});

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
        debounceTime(500)
      )
      .subscribe({
        next: (formValue) => {
          console.log(Object.getOwnPropertyNames(formValue))
          console.log(formValue)
          console.log(this.schematicComponentsMap)

          for (const key of Object.getOwnPropertyNames(formValue)) {
            const value = formValue[key]
            if(value !== null) {
              if (this.selectedLocale) {
                this.content[`${key}_i18n_${this.selectedLocale.id}`] = value
              } else {
                this.content[key] = value
              }
            }
          }
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
        )
      )
      .subscribe({
        next: ([space, page, schematics]) => {
          this.selectedSpace = space;
          //this.selectedLocale = space.localeFallback;
          this.page = page;
          this.content = ObjectUtils.clone(page.content);
          this.schematic = schematics.find(it => it.id === page.schematic);
          this.schematics = schematics;
          this.schematicComponentsMap = new Map<string, SchematicComponent>(this.schematic?.components?.map(it => [it.name, it]));
          this.generateForm();
          if (this.content) {
            this.form.reset()
            this.form.patchValue(this.content);
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
      switch (component.kind) {
        case SchematicComponentKind.TEXT:
        case SchematicComponentKind.TEXTAREA: {
          if (component.minLength) {
            validators.push(Validators.minLength(component.minLength))
          }
          if (component.maxLength) {
            validators.push(Validators.maxLength(component.maxLength))
          }
          const disabled = (this.selectedLocale === undefined) === (component.translatable === true)
          this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
          break;
        }
        case SchematicComponentKind.NUMBER: {
          if (component.minValue) {
            validators.push(Validators.min(component.minValue))
          }
          if (component.maxValue) {
            validators.push(Validators.max(component.maxValue))
          }
          const disabled = (this.selectedLocale === undefined) === (component.translatable === true)
          this.form.setControl(component.name, this.fb.control<number | undefined>({ value: component.defaultValue ? Number.parseInt(component.defaultValue) : undefined, disabled: disabled}, validators))
          break;
        }
        case SchematicComponentKind.COLOR: {
          const disabled = (this.selectedLocale === undefined) === (component.translatable === true)
          this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
          break;
        }
        case SchematicComponentKind.BOOLEAN: {
          const disabled = (this.selectedLocale === undefined) === (component.translatable === true)
          this.form.setControl(component.name, this.fb.control<boolean | undefined>({ value: component.defaultValue === 'true', disabled: disabled}, validators))
          break;
        }
        case SchematicComponentKind.DATE: {
          const disabled = (this.selectedLocale === undefined) === (component.translatable === true)
          this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
          break;
        }
        case SchematicComponentKind.DATETIME: {
          const disabled = (this.selectedLocale === undefined) === (component.translatable === true)
          this.form.setControl(component.name, this.fb.control<string | undefined>({ value: component.defaultValue, disabled: disabled}, validators))
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


    this.pageService.updateContent(this.selectedSpace!.id, this.pageId, this.form.value)
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

  onLocaleChanged(locale?: Locale): void {
    this.selectedLocale = locale;
    //this.form = this.fb.record({});
    this.isFormLoading = true;
    this.cd.detectChanges();
    this.generateForm();
    this.isFormLoading = false;
    this.cd.markForCheck();
  }
}
