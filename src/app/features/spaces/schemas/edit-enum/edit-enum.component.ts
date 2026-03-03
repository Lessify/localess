import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCircleX, lucideGripVertical, lucideSave, lucideTrash } from '@ng-icons/lucide';
import { DirtyFormGuardComponent } from '@shared/guards/dirty-form.guard';
import { Schema, SchemaEnumUpdate, SchemaEnumValue, SchemaType } from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { combineLatest } from 'rxjs';
import { EditValueComponent } from '../shared/edit-value/edit-value.component';
import { HlmCommandImports } from '@spartan-ng/helm/command';

@Component({
  selector: 'll-schema-edit-enum',
  templateUrl: './edit-enum.component.html',
  styleUrl: './edit-enum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'captureKeyboard($event)',
  },
  imports: [
    CanUserPerformPipe,
    CommonModule,
    HlmTabsImports,
    ReactiveFormsModule,
    DragDropModule,
    MatExpansionModule,
    EditValueComponent,
    HlmProgressImports,
    HlmButtonImports,
    HlmIconImports,
    HlmSpinnerImports,
    HlmTooltipImports,
    HlmSheetImports,
    HlmInputGroupImports,
    HlmFieldImports,
    HlmItemImports,
    HlmInputImports,
    HlmTextareaImports,
    HlmCommandImports,
  ],
  providers: [
    provideIcons({
      lucideSave,
      lucideArrowLeft,
      lucideTrash,
      lucideGripVertical,
      lucideCircleX,
    }),
  ],
})
export class EditEnumComponent implements OnInit, DirtyFormGuardComponent {
  readonly fe = inject(FormErrorHandlerService);
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly schemaService = inject(SchemaService);
  private readonly notificationService = inject(NotificationService);

  // Input
  spaceId = input.required<string>();
  schemaId = input.required<string>();

  entity?: Schema;
  schemas: Schema[] = [];

  selectedFieldIdx = signal<number | undefined>(undefined);

  fieldReservedNames: string[] = [];
  newFieldName = this.fb.control('', [...SchemaValidator.FIELD_ENUM_NAME, CommonValidator.reservedName(this.fieldReservedNames)]);

  //Loadings
  isLoading = signal(true);
  isSaveLoading = signal(false);
  // Subscriptions
  private destroyRef = inject(DestroyRef);
  settingsStore = inject(LocalSettingsStore);

  form: FormRecord = this.fb.record({
    displayName: this.fb.control<string | undefined>(undefined, SchemaValidator.DISPLAY_NAME),
    description: this.fb.control<string | undefined>(undefined, SchemaValidator.DESCRIPTION),
    labels: this.fb.control<string[] | undefined>([]),
    values: this.fb.array<SchemaEnumValue>([]),
  });

  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;

  ngOnInit(): void {
    this.loadData(this.spaceId(), this.schemaId());
  }

  loadData(spaceId: string, entityId: string): void {
    combineLatest([this.schemaService.findAll(spaceId), this.schemaService.findById(spaceId, entityId)])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([schemas, schema]) => {
          this.fieldReservedNames = [];
          this.schemas = schemas;
          this.entity = schema;

          this.form.reset();
          this.form.patchValue(schema);
          if (schema.type === SchemaType.ENUM) {
            this.values.clear();
            schema.values?.forEach(it => this.addValueForm(it));
          }
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  get isFormDirty(): boolean {
    return this.form.dirty;
  }

  captureKeyboard(event: KeyboardEvent): void {
    // Ctrl + S to Save
    if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.save();
    }
  }

  addLabel(value: string): void {
    if (value) {
      const labels = this.form.controls['labels'].value;
      if (labels instanceof Array) {
        labels.push(value);
      } else {
        this.form.controls['labels'].setValue([value]);
      }
    }
  }

  removeLabel(label: string): void {
    const labels = this.form.controls['labels'].value;
    if (labels instanceof Array) {
      const index: number = labels.indexOf(label);
      labels.splice(index, 1);
    }
    this.form.markAsDirty();
  }

  save(): void {
    //console.group('save')
    this.isSaveLoading.set(true);
    this.schemaService.updateEnum(this.spaceId(), this.schemaId(), this.form.value as SchemaEnumUpdate).subscribe({
      next: () => {
        this.notificationService.success('Schema has been updated.');
      },
      error: () => {
        this.notificationService.error('Schema can not be updated.');
      },
      complete: () => {
        setTimeout(() => {
          this.isSaveLoading.set(false);
          this.cd.markForCheck();
        }, 1000);
      },
    });
    //console.groupEnd()
  }

  back(): void {
    this.router.navigate(['features', 'spaces', this.spaceId(), 'schemas']);
  }

  get values(): FormArray<FormGroup> {
    return this.form.controls['values'] as FormArray<FormGroup>;
  }

  valueControlAt(index: number, controlName: string): AbstractControl | undefined {
    return this.values.at(index)?.controls[controlName];
  }

  selectComponent(index: number) {
    this.selectedFieldIdx.set(index);
  }

  removeComponent(event: MouseEvent, index: number) {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    // Remove name from reserved names
    const cValue = this.valueControlAt(index, 'name')?.value;
    if (cValue) {
      const idx = this.fieldReservedNames.indexOf(cValue);
      if (idx !== -1) {
        this.fieldReservedNames.splice(index, 1);
      }
    }
    // Remove Component
    this.values?.removeAt(index);
    this.form.markAsDirty();
  }

  addValueForm(element?: SchemaEnumValue): void {
    if (element) {
      this.values?.push(
        this.fb.group({
          name: this.fb.control(element.name, [
            ...SchemaValidator.FIELD_ENUM_NAME,
            CommonValidator.reservedName(this.fieldReservedNames, element.name),
          ]),
          value: this.fb.control(element.value, SchemaValidator.FIELD_ENUM_VALUE),
        }),
      );
      this.fieldReservedNames.push(element.name);
    } else {
      const fieldName = this.newFieldName.value || '';
      this.values?.push(
        this.fb.group({
          name: this.fb.control<string>(fieldName, [
            ...SchemaValidator.FIELD_ENUM_NAME,
            CommonValidator.reservedName(this.fieldReservedNames, fieldName),
          ]),
          value: this.fb.control<string>(fieldName, SchemaValidator.FIELD_ENUM_VALUE),
        }),
      );
      this.fieldReservedNames.push(fieldName);
      this.newFieldName.reset();
      this.selectComponent(this.values.length - 1);
      this.form.markAsDirty();
    }
  }

  // Drag and Drop
  fieldDropDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.values.at(event.previousIndex);
    this.values.removeAt(event.previousIndex);
    this.values.insert(event.currentIndex, tmp);
    this.form.markAsDirty();
  }
}
