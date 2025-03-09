import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AnimateDirective } from '@shared/directives/animate.directive';
import { DirtyFormGuardComponent } from '@shared/guards/dirty-form.guard';
import { Schema, SchemaEnumUpdate, SchemaEnumValue, SchemaType } from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { combineLatest } from 'rxjs';
import { EditValueComponent } from '../shared/edit-value/edit-value.component';

@Component({
  selector: 'll-schema-edit-enum',
  standalone: true,
  templateUrl: './edit-enum.component.html',
  styleUrl: './edit-enum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatIconModule,
    CanUserPerformPipe,
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatListModule,
    DragDropModule,
    MatInputModule,
    MatDividerModule,
    TextFieldModule,
    MatChipsModule,
    MatExpansionModule,
    EditValueComponent,
    AnimateDirective,
  ],
})
export class EditEnumComponent implements OnInit, DirtyFormGuardComponent {
  // Input
  spaceId = input.required<string>();
  schemaId = input.required<string>();

  entity?: Schema;
  schemas: Schema[] = [];

  selectedFieldIdx?: number;

  fieldReservedNames: string[] = [];
  newFieldName = this.fb.control('', [...SchemaValidator.FIELD_OPTION_NAME, CommonValidator.reservedName(this.fieldReservedNames)]);

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

  constructor(
    readonly fe: FormErrorHandlerService,
    private readonly fb: FormBuilder,
    private readonly cd: ChangeDetectorRef,
    private readonly router: Router,
    private readonly schemaService: SchemaService,
    private readonly notificationService: NotificationService,
  ) {}

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

  addLabel(event: MatChipInputEvent): void {
    const { value, chipInput } = event;
    if (value) {
      const labels = this.form.controls['labels'].value;
      if (labels instanceof Array) {
        labels.push(value);
      } else {
        this.form.controls['labels'].setValue([value]);
      }
    }
    chipInput.clear();
    this.form.markAsDirty();
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
    this.selectedFieldIdx = index;
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
            ...SchemaValidator.FIELD_OPTION_NAME,
            CommonValidator.reservedName(this.fieldReservedNames, element.name),
          ]),
          value: this.fb.control(element.value, SchemaValidator.FIELD_OPTION_VALUE),
        }),
      );
      this.fieldReservedNames.push(element.name);
    } else {
      const fieldName = this.newFieldName.value || '';
      this.values?.push(
        this.fb.group({
          name: this.fb.control<string>(fieldName, [
            ...SchemaValidator.FIELD_OPTION_NAME,
            CommonValidator.reservedName(this.fieldReservedNames, fieldName),
          ]),
          value: this.fb.control<string>(fieldName, SchemaValidator.FIELD_OPTION_VALUE),
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
