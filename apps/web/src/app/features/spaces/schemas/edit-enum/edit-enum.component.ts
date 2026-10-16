import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { DirtyFormGuardComponent } from '@core/guards/dirty-form.guard';
import { NotificationService } from '@core/services/notification.service';
import { PlatformService } from '@core/services/platform.service';
import { SchemaService } from '@core/services/schema.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { Schema, SchemaEnumUpdate, SchemaEnumValue, SchemaType } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCircleX, lucideGripVertical, lucideSave, lucideTrash } from '@ng-icons/lucide';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { CommonValidator } from '@shared/validators/common.validator';
import { LabelValidator } from '@shared/validators/label.validator';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { combineLatest, take } from 'rxjs';

import { EditValueComponent } from '../shared/edit-value/edit-value.component';
import { SchemaValidator } from '../shared/schema.validator';

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
    HlmAccordionImports,
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
    HlmKbdImports,
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
  readonly platformService = inject(PlatformService);
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
          this.schemas = schemas;
          // Live: any change to the space's schemas re-emits. Unsaved edits are kept (a reload wiped them when a
          // colleague saved another schema); the form reloads after Save.
          if (this.form.dirty) {
            this.cd.markForCheck();
            return;
          }
          if (this.isStale(schema)) return;
          this.applySchema(schema);
        },
      });
  }

  /** Fills the form from the stored schema. */
  /** The version a Save replaced: until a newer one arrives, an answer at or before it is stale. */
  private savedOver?: string;

  /**
   * A live answer older than what the form shows, or not newer than the version just saved: a refetch that started
   * before the Save and answered after it. Applying it would put the old values back (and a following edit would
   * build on them).
   */
  private isStale(schema: Schema): boolean {
    const at = Date.parse(schema.updatedAt);
    if (Number.isNaN(at)) return false;
    if (this.savedOver !== undefined && at <= Date.parse(this.savedOver)) return true;
    return this.entity !== undefined && at < Date.parse(this.entity.updatedAt);
  }

  private applySchema(schema: Schema): void {
    this.savedOver = undefined;
    // Emptied in place: the new-value validator holds this array (a new one left it checking an empty list).
    this.fieldReservedNames.length = 0;
    this.entity = schema;

    this.form.reset();
    this.form.patchValue(schema);
    if (schema.type === SchemaType.ENUM) {
      this.values.clear();
      schema.values?.forEach(it => this.addValueForm(it));
    }
    this.isLoading.set(false);
    this.cd.markForCheck();
  }

  get isFormDirty(): boolean {
    return this.form.dirty;
  }

  captureKeyboard(event: KeyboardEvent): void {
    // Ctrl + S to Save
    if (this.platformService.isActionSave(event)) {
      event.preventDefault();
      this.save();
    }
  }

  /** Why the label typed last was not added; cleared once one is. */
  readonly labelError = signal<string | undefined>(undefined);

  /**
   * Adds the typed label (Enter); an invalid or duplicate one stays in the input with the reason shown. A new array,
   * and the form marked dirty: it was pushed in place, so neither the form nor the leave guard saw the change.
   */
  addLabel(input: HTMLInputElement): void {
    const label = input.value.trim();
    if (!label) return;
    const labels: string[] = this.form.controls['labels'].value ?? [];
    const error = LabelValidator.error(label, labels);
    this.labelError.set(error);
    if (error) return;
    this.form.controls['labels'].setValue([...labels, label]);
    this.form.markAsDirty();
    input.value = '';
  }

  removeLabel(label: string): void {
    const labels: string[] = this.form.controls['labels'].value ?? [];
    this.form.controls['labels'].setValue(labels.filter(it => it !== label));
    this.form.markAsDirty();
  }

  save(): void {
    //console.group('save')
    this.isSaveLoading.set(true);
    this.schemaService.updateEnum(this.spaceId(), this.schemaId(), this.form.value as SchemaEnumUpdate).subscribe({
      next: () => {
        // Saved: live updates may reload the form again; it shows what was stored.
        this.form.markAsPristine();
        this.savedOver = this.entity?.updatedAt;
        this.schemaService
          .findById(this.spaceId(), this.schemaId())
          .pipe(take(1))
          .subscribe(schema => {
            // Not over edits made since Save.
            if (!this.form.dirty && !this.isStale(schema)) this.applySchema(schema);
          });
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
        this.fieldReservedNames.splice(idx, 1);
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
