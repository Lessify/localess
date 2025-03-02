import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { SchemaValidator } from '@shared/validators/schema.validator';
import {
  AssetFileType,
  assetFileTypeDescriptions,
  Schema,
  SchemaComponentUpdate,
  SchemaField,
  SchemaFieldKind,
  schemaFieldKindDescriptions,
  SchemaFieldOptionSelectable,
  SchemaType,
} from '@shared/models/schema.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaService } from '@shared/services/schema.service';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { NotificationService } from '@shared/services/notification.service';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { DirtyFormGuardComponent } from '@shared/guards/dirty-form.guard';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IconComponent } from '@shared/components/icon/icon.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { SchemasModule } from '../schemas.module';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'll-schema-edit-comp',
  standalone: true,
  templateUrl: './edit-comp.component.html',
  styleUrl: './edit-comp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    CanUserPerformPipe,
    AsyncPipe,
    MatTooltipModule,
    IconComponent,
    MatProgressBarModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatSidenavModule,
    MatListModule,
    MatFormFieldModule,
    DragDropModule,
    MatInputModule,
    MatDividerModule,
    SchemasModule,
    TextFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatExpansionModule,
    JsonPipe,
  ],
})
export class EditCompComponent implements OnInit, DirtyFormGuardComponent {
  // Input
  spaceId = input.required<string>();
  schemaId = input.required<string>();

  entity?: Schema;
  schemas: Schema[] = [];
  schemaFieldKindDescriptions = schemaFieldKindDescriptions;
  assetFileTypeDescriptions = assetFileTypeDescriptions;

  selectedFieldIdx?: number;

  fieldReservedNames: string[] = [];
  newFieldName = this.fb.control('', [...SchemaValidator.FIELD_NAME, CommonValidator.reservedName(this.fieldReservedNames)]);

  //Loadings
  isLoading = true;
  isSaveLoading = false;
  // Subscriptions
  private destroyRef = inject(DestroyRef);
  settingsStore = inject(LocalSettingsStore);

  form: FormRecord = this.fb.record({
    displayName: this.fb.control<string | undefined>(undefined, SchemaValidator.DISPLAY_NAME),
    description: this.fb.control<string | undefined>(undefined, SchemaValidator.DESCRIPTION),
    previewField: this.fb.control<string | undefined>(undefined),
    labels: this.fb.control<string[] | undefined>([]),
    fields: this.fb.array<SchemaField>([]),
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

          if (schema.type === SchemaType.NODE || schema.type === SchemaType.ROOT) {
            this.fields.clear();
            schema.fields?.forEach(it => this.addField(it));
          }

          this.isLoading = false;
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

  get fields(): FormArray<FormGroup> {
    return this.form.controls['fields'] as FormArray<FormGroup>;
  }

  fieldControlAt(index: number, controlName: string): AbstractControl | undefined {
    return this.fields.at(index)?.controls[controlName];
  }

  fieldAt(index: number): FormGroup | undefined {
    return this.fields.at(index);
  }

  generateOptionForm(option?: SchemaFieldOptionSelectable): FormGroup {
    return this.fb.group({
      name: this.fb.control(option?.name, SchemaValidator.FIELD_OPTION_NAME),
      value: this.fb.control(option?.value, SchemaValidator.FIELD_OPTION_VALUE),
    });
  }

  addField(element?: SchemaField) {
    const fieldName = element?.name || this.newFieldName.value || '';
    this.fieldReservedNames.push(fieldName);

    const defaultKind = SchemaFieldKind.TEXT;
    const fieldForm = this.fb.group<NonNullable<unknown>>({
      // Base
      name: this.fb.control(fieldName, [...SchemaValidator.FIELD_NAME, CommonValidator.reservedName(this.fieldReservedNames, fieldName)]),
      kind: this.fb.control(element?.kind || defaultKind, SchemaValidator.FIELD_KIND),
      displayName: this.fb.control<string | undefined>(element?.displayName, SchemaValidator.FIELD_DISPLAY_NAME),
      required: this.fb.control<boolean | undefined>(element?.required, SchemaValidator.FIELD_REQUIRED),
      description: this.fb.control<string | undefined>(element?.description, SchemaValidator.FIELD_DESCRIPTION),
      defaultValue: this.fb.control<string | undefined>(element?.defaultValue, SchemaValidator.FIELD_DEFAULT_VALUE),
    });

    switch (element?.kind) {
      case SchemaFieldKind.TEXT:
      case SchemaFieldKind.TEXTAREA:
      case SchemaFieldKind.RICH_TEXT:
      case SchemaFieldKind.MARKDOWN: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        fieldForm.addControl('minLength', this.fb.control<number | undefined>(element.minLength, SchemaValidator.FIELD_MIN_LENGTH));
        fieldForm.addControl('maxLength', this.fb.control<number | undefined>(element.maxLength, SchemaValidator.FIELD_MAX_LENGTH));
        break;
      }
      case SchemaFieldKind.NUMBER: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        fieldForm.addControl('minValue', this.fb.control<number | undefined>(element.minValue, SchemaValidator.FIELD_MIN_VALUE));
        fieldForm.addControl('maxValue', this.fb.control<number | undefined>(element.maxValue, SchemaValidator.FIELD_MAX_VALUE));
        break;
      }
      case SchemaFieldKind.COLOR: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        break;
      }
      case SchemaFieldKind.DATE: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        break;
      }
      case SchemaFieldKind.BOOLEAN: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        break;
      }
      case SchemaFieldKind.OPTION: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        const options: FormArray = this.fb.array<SchemaFieldOptionSelectable>([], SchemaValidator.FIELD_OPTIONS);
        element.options?.forEach(it => options.push(this.generateOptionForm(it)));
        fieldForm.addControl('options', options);
        fieldForm.addControl('source', this.fb.control<string>(element.source, SchemaValidator.FIELD_OPTION_SOURCE));
        break;
      }
      case SchemaFieldKind.OPTIONS: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        fieldForm.addControl('source', this.fb.control<string>(element.source, SchemaValidator.FIELD_OPTION_SOURCE));
        const options: FormArray = this.fb.array<SchemaFieldOptionSelectable>([], SchemaValidator.FIELD_OPTIONS);
        element.options?.forEach(it => options.push(this.generateOptionForm(it)));
        fieldForm.addControl('options', options);

        fieldForm.addControl('minValues', this.fb.control<number | undefined>(element.minValues, SchemaValidator.FIELD_MIN_VALUES));
        fieldForm.addControl('maxValues', this.fb.control<number | undefined>(element.maxValues, SchemaValidator.FIELD_MAX_VALUES));
        break;
      }
      case SchemaFieldKind.LINK: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        break;
      }
      case SchemaFieldKind.REFERENCE:
      case SchemaFieldKind.REFERENCES: {
        fieldForm.addControl('path', this.fb.control<string | undefined>(element.path, SchemaValidator.FIELD_REFERENCE_PATH));
        break;
      }
      case SchemaFieldKind.ASSET: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        fieldForm.addControl(
          'fileTypes',
          this.fb.control<AssetFileType[] | undefined>(element.fileTypes || [AssetFileType.ANY], SchemaValidator.FIELD_FILE_TYPES),
        );
        break;
      }
      case SchemaFieldKind.ASSETS: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        fieldForm.addControl(
          'fileTypes',
          this.fb.control<AssetFileType[] | undefined>(element.fileTypes || [AssetFileType.ANY], SchemaValidator.FIELD_FILE_TYPES),
        );
        break;
      }
      case SchemaFieldKind.SCHEMA: {
        fieldForm.addControl('schemas', this.fb.control<string[] | undefined>(element.schemas, SchemaValidator.FIELD_SCHEMA));
        break;
      }
      case SchemaFieldKind.SCHEMAS: {
        fieldForm.addControl('schemas', this.fb.control<string[] | undefined>(element.schemas, SchemaValidator.FIELD_SCHEMAS));
        break;
      }
      // By default, it is a new TEXT
      default: {
        fieldForm.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        fieldForm.addControl('minLength', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MIN_LENGTH));
        fieldForm.addControl('maxLength', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MAX_LENGTH));
      }
    }
    this.fields.push(fieldForm);
    this.newFieldName.reset();
    if (!element) {
      this.selectComponent(this.fields.length - 1);
      this.form.markAsDirty();
    }
  }

  removeComponent(event: Event, index: number): void {
    // Prevent Default
    event.preventDefault();
    event.stopImmediatePropagation();
    // Remove name from reserved names
    const cValue = this.fieldControlAt(index, 'name')?.value;
    if (cValue) {
      const idx = this.fieldReservedNames.indexOf(cValue);
      if (idx !== -1) {
        this.fieldReservedNames.splice(index, 1);
      }
    }
    // Remove
    this.fields.removeAt(index);
    this.form.markAsDirty();
  }

  // handle form array element selection, by enforcing refresh
  selectComponent(index: number): void {
    this.selectedFieldIdx = index;
  }

  save(): void {
    //console.group('save')
    this.isSaveLoading = true;

    this.schemaService.updateComponent(this.spaceId(), this.schemaId(), this.form.value as SchemaComponentUpdate).subscribe({
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

  fieldDropDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.fields.at(event.previousIndex);
    this.fields.removeAt(event.previousIndex);
    this.fields.insert(event.currentIndex, tmp);
    this.form.markAsDirty();
  }
}
