import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord } from '@angular/forms';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { Schema, SchemaEnumUpdate, SchemaEnumValue, SchemaType } from '@shared/models/schema.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SchemaService } from '@shared/services/schema.service';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { NotificationService } from '@shared/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { LocalSettingsStore } from '@shared/store/local-settings.store';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { CommonValidator } from '@shared/validators/common.validator';

@Component({
  selector: 'll-schema-edit-enum',
  templateUrl: './edit-enum.component.html',
  styleUrl: './edit-enum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditEnumComponent implements OnInit {
  // Input
  spaceId = input.required<string>();
  schemaId = input.required<string>();

  entity?: Schema;
  schemas: Schema[] = [];

  selectedFieldIdx?: number;

  fieldReservedNames: string[] = [];
  newFieldName = this.fb.control('', [...SchemaValidator.FIELD_OPTION_NAME, CommonValidator.reservedName(this.fieldReservedNames)]);

  //Loadings
  isLoading = true;
  isSaveLoading = false;
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

          this.form.patchValue(schema);
          if (schema.type === SchemaType.ENUM) {
            this.values.clear();
            schema.values?.forEach(it => this.addValueForm(it));
          }
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
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
  }

  removeLabel(label: string): void {
    const labels = this.form.controls['labels'].value;
    if (labels instanceof Array) {
      const index: number = labels.indexOf(label);
      labels.splice(index, 1);
    }
  }

  save(): void {
    //console.group('save')
    this.isSaveLoading = true;
    this.schemaService.updateEnum(this.spaceId(), this.schemaId(), this.form.value as SchemaEnumUpdate).subscribe({
      next: () => {
        this.notificationService.success('Schema has been updated.');
      },
      error: () => {
        this.notificationService.error('Schema can not be updated.');
      },
      complete: () => {
        setTimeout(() => {
          this.isSaveLoading = false;
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
    this.selectedFieldIdx = undefined;
    this.cd.detectChanges();
    this.selectedFieldIdx = index;
    this.cd.markForCheck();
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
    }
  }

  // Drag and Drop
  fieldDropDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.values.at(event.previousIndex);
    this.values.removeAt(event.previousIndex);
    this.values.insert(event.currentIndex, tmp);
  }
}
