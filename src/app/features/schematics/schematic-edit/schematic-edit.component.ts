import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord} from '@angular/forms';
import {SchematicValidator} from '@shared/validators/schematic.validator';
import {
  Schematic,
  SchematicComponent,
  SchematicComponentKind,
  schematicComponentKindDescriptions,
  SchematicComponentOptionSelectable,
  SchematicUpdate
} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {environment} from '../../../../environments/environment';
import {CommonValidator} from '@shared/validators/common.validator';
import {SchematicService} from "@shared/services/schematic.service";
import {ActivatedRoute, Router} from "@angular/router";
import {selectSpace} from "@core/state/space/space.selector";
import {filter, switchMap, takeUntil} from "rxjs/operators";
import {combineLatest, Subject} from "rxjs";
import {Store} from "@ngrx/store";
import {AppState} from "@core/state/core.state";
import {SpaceService} from "@shared/services/space.service";
import {Space} from "@shared/models/space.model";
import {NotificationService} from "@shared/services/notification.service";

@Component({
  selector: 'll-schematic-edit',
  templateUrl: './schematic-edit.component.html',
  styleUrls: ['./schematic-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchematicEditComponent implements OnInit, OnDestroy {

  isDebug = environment.debug
  selectedSpace?: Space;
  entityId: string;
  entity?: Schematic;
  reservedNames: string[] = []
  schematics: Schematic[] = [];
  schematicComponentKindDescriptions = schematicComponentKindDescriptions;
  nameReadonly = true;
  componentNameReadonly = true;

  selectedComponentIdx ?: number;

  componentReservedNames: string[] = [];
  newComponentName = this.fb.control('', [...SchematicValidator.COMPONENT_NAME, CommonValidator.reservedName(this.componentReservedNames)]);

  //Loadings
  isLoading: boolean = true;
  isSaveLoading: boolean = false;
  // Subscriptions
  private destroy$ = new Subject();

  form: FormRecord = this.fb.record({
    name: this.fb.control('', SchematicValidator.NAME),
    displayName: this.fb.control<string | undefined>(undefined, SchematicValidator.DISPLAY_NAME),
    components: this.fb.array<SchematicComponent>([])
  });

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly spaceService: SpaceService,
    private readonly schematicService: SchematicService,
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
  ) {
    this.entityId = this.activatedRoute.snapshot.paramMap.get('schematicId') || "";
  }

  ngOnInit(): void {
    this.loadData(this.entityId);

  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  loadData(entityId: string): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.schematicService.findAll(it.id),
            this.schematicService.findById(it.id, entityId)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, schematics, schematic]) => {
          this.selectedSpace = space;
          this.reservedNames = schematics.map(it => it.name);
          this.schematics = schematics;
          this.entity = schematic;

          // Form
          this.form.controls['name'].setValidators([...SchematicValidator.NAME, CommonValidator.reservedName(this.reservedNames, this.entity?.name)])
          this.form.patchValue(schematic);

          this.components.clear()
          schematic.components?.forEach(it => this.addComponent(it))

          this.isLoading = false;
          this.cd.markForCheck();

        }
      })

  }

  get components(): FormArray<FormGroup> {
    return this.form.controls['components'] as FormArray<FormGroup>;
  }

  componentControlAt(index: number, controlName: string): AbstractControl | undefined {
    return this.components.at(index)?.controls[controlName]
  }

  componentAt(index: number): FormGroup | undefined {
    return this.components.at(index)
  }

  generateOptionForm(option?: SchematicComponentOptionSelectable): FormGroup {
    return this.fb.group({
      name: this.fb.control(option?.name, SchematicValidator.COMPONENT_OPTION_NAME),
      value: this.fb.control(option?.value, SchematicValidator.COMPONENT_OPTION_VALUE),
    })
  }

  addComponent(element?: SchematicComponent) {
    const componentName = element?.name || this.newComponentName.value || '';
    this.componentReservedNames.push(componentName)

    const defaultKind = SchematicComponentKind.TEXT;
    const componentForm = this.fb.group<{}>({
      // Base
      name: this.fb.control(componentName, [...SchematicValidator.COMPONENT_NAME, CommonValidator.reservedName(this.componentReservedNames, componentName)]),
      kind: this.fb.control(element?.kind || defaultKind, SchematicValidator.COMPONENT_KIND),
      displayName: this.fb.control<string | undefined>(element?.displayName, SchematicValidator.COMPONENT_DISPLAY_NAME),
      required: this.fb.control<boolean | undefined>(element?.required, SchematicValidator.COMPONENT_REQUIRED),
      description: this.fb.control<string | undefined>(element?.description, SchematicValidator.COMPONENT_DESCRIPTION),
      defaultValue: this.fb.control<string | undefined>(element?.defaultValue, SchematicValidator.COMPONENT_DEFAULT_VALUE),
    })

    switch (element?.kind) {
      case SchematicComponentKind.TEXT:
      case SchematicComponentKind.TEXTAREA: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        componentForm.addControl('minLength', this.fb.control<number | undefined>(element.minLength, SchematicValidator.COMPONENT_MIN_LENGTH))
        componentForm.addControl('maxLength', this.fb.control<number | undefined>(element.maxLength, SchematicValidator.COMPONENT_MAX_LENGTH))
        break;
      }
      case SchematicComponentKind.NUMBER: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        componentForm.addControl('minValue', this.fb.control<number | undefined>(element.minValue, SchematicValidator.COMPONENT_MIN_VALUE));
        componentForm.addControl('maxValue', this.fb.control<number | undefined>(element.maxValue, SchematicValidator.COMPONENT_MAX_VALUE));
        break;
      }
      case SchematicComponentKind.COLOR: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.DATE: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.BOOLEAN: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.OPTION: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchematicComponentOptionSelectable>([], SchematicValidator.COMPONENT_OPTIONS);
        element.options.forEach(it => options.push(this.generateOptionForm(it)))
        componentForm.addControl('options', options)

        break;
      }
      case SchematicComponentKind.OPTIONS: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        const options: FormArray = this.fb.array<SchematicComponentOptionSelectable>([], SchematicValidator.COMPONENT_OPTIONS);
        element.options.forEach(it => options.push(this.generateOptionForm(it)))
        componentForm.addControl('options', options)
        componentForm.addControl('minValues', this.fb.control<number | undefined>(element.minValues, SchematicValidator.COMPONENT_MIN_VALUES));
        componentForm.addControl('maxValues', this.fb.control<number | undefined>(element.maxValues, SchematicValidator.COMPONENT_MAX_VALUES));
        break;
      }
      case SchematicComponentKind.LINK: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.ASSET: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.ASSETS: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(element.translatable, SchematicValidator.COMPONENT_TRANSLATABLE))
        break;
      }
      case SchematicComponentKind.SCHEMATIC: {
        componentForm.addControl('schematics', this.fb.control<string[] | undefined>(element.schematics, SchematicValidator.COMPONENT_SCHEMATIC));
        break;
      }
      // By default, it is a new TEXT
      default: {
        componentForm.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchematicValidator.COMPONENT_TRANSLATABLE))
        componentForm.addControl('minLength', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MIN_LENGTH))
        componentForm.addControl('maxLength', this.fb.control<number | undefined>(undefined, SchematicValidator.COMPONENT_MAX_LENGTH))
      }
    }
    this.components.push(componentForm);
    this.newComponentName.reset();
    this.selectComponent(this.components.length - 1);
  }

  removeComponent(event: Event, index: number): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    // Remove name from reserved names
    const cValue = this.componentControlAt(index, 'name')?.value
    if (cValue) {
      const idx = this.componentReservedNames.indexOf(cValue);
      if (idx !== -1) {
        this.componentReservedNames.splice(index, 1);
      }
    }
    // Remove
    this.components.removeAt(index);
    if (this.components.length === 0) {
      this.selectedComponentIdx = undefined;
      this.cd.markForCheck();
    } else if (this.selectedComponentIdx) {
      if (index == 0 && this.selectedComponentIdx == 0) {
        this.selectComponent(0);
      } else if (index <= this.selectedComponentIdx) {
        this.selectComponent(this.selectedComponentIdx - 1);
      }
    }
  }

  // handle form array element selection, by enforcing refresh
  selectComponent(index: number): void {
    this.selectedComponentIdx = undefined;
    this.cd.detectChanges();
    this.componentNameReadonly = true;
    this.selectedComponentIdx = index;
    this.cd.markForCheck();
  }

  save(): void {
    //console.group('save')
    this.isSaveLoading = true;

    this.schematicService.update(this.selectedSpace!.id, this.entityId, this.form.value as SchematicUpdate)
      .subscribe({
        next: () => {
          this.notificationService.success('Schematic has been updated.');
        },
        error: () => {
          this.notificationService.error('Schematic can not be updated.');
        },
        complete: () => {
          setTimeout(() => {
            this.isSaveLoading = false
            this.cd.markForCheck()
          }, 1000)
        }
      });

    console.groupEnd()
  }

  back(): void {
    this.router.navigate(['features', 'schematics']);
  }

}
