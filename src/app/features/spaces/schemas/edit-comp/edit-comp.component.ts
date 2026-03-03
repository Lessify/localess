import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideCalendar,
  lucideCircleX,
  lucideClock,
  lucideFile,
  lucideFileDigit,
  lucideFileImage,
  lucideFileMusic,
  lucideFileSymlink,
  lucideFileText,
  lucideFileVideoCamera,
  lucideGripVertical,
  lucideLink,
  lucideList,
  lucidePalette,
  lucidePaperclip,
  lucidePencilRuler,
  lucideSave,
  lucideTextInitial,
  lucideToggleLeft,
  lucideToyBrick,
  lucideTrash,
  lucideType,
} from '@ng-icons/lucide';
import { tablerMarkdown, tablerNumber } from '@ng-icons/tabler-icons';
import { DirtyFormGuardComponent } from '@shared/guards/dirty-form.guard';
import {
  AssetFileType,
  assetFileTypeDescriptions,
  Schema,
  SchemaComponentUpdate,
  SchemaField,
  SchemaFieldKind,
  schemaFieldKindDescriptions,
  SchemaType,
} from '@shared/models/schema.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { SchemaService } from '@shared/services/schema.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { combineLatest } from 'rxjs';
import { EditFieldComponent } from '../shared/edit-field/edit-field.component';
import { HlmCommandImports } from '@spartan-ng/helm/command';

@Component({
  selector: 'll-schema-edit-comp',
  templateUrl: './edit-comp.component.html',
  styleUrl: './edit-comp.component.scss',
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
    EditFieldComponent,
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
    HlmBadgeImports,
    HlmSelectImports,
    BrnSelectImports,
    HlmScrollAreaImports,
    NgScrollbarModule,
    HlmCommandImports,
  ],
  providers: [
    provideIcons({
      lucideSave,
      lucideArrowLeft,
      lucideTrash,
      lucideGripVertical,
      lucideCircleX,
      lucideType,
      lucideTextInitial,
      lucidePencilRuler,
      tablerMarkdown,
      tablerNumber,
      lucidePalette,
      lucideCalendar,
      lucideClock,
      lucideToggleLeft,
      lucideList,
      lucideLink,
      lucideFileSymlink,
      lucidePaperclip,
      lucideToyBrick,
      lucideFile,
      lucideFileImage,
      lucideFileVideoCamera,
      lucideFileMusic,
      lucideFileDigit,
      lucideFileText,
    }),
  ],
})
export class EditCompComponent implements OnInit, DirtyFormGuardComponent {
  readonly fe = inject(FormErrorHandlerService);
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly schemaService = inject(SchemaService);
  private readonly notificationService = inject(NotificationService);

  readonly PREVIEW_TYPES = ['TEXT', 'TEXTAREA', 'NUMBER', 'COLOR', 'DATE', 'DATETIME', 'BOOLEAN', 'OPTION', 'OPTIONS'];

  // Input
  spaceId = input.required<string>();
  schemaId = input.required<string>();

  entity?: Schema;
  schemas: Schema[] = [];
  schemaFieldKindDescriptions = schemaFieldKindDescriptions;
  assetFileTypeDescriptions = assetFileTypeDescriptions;

  selectedFieldIdx = signal<number | undefined>(undefined);

  fieldReservedNames: string[] = [];
  newFieldName = this.fb.control('', [...SchemaValidator.FIELD_NAME, CommonValidator.reservedName(this.fieldReservedNames)]);

  //Loadings
  isLoading = signal(true);
  isSaveLoading = signal(false);
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

  get fields(): FormArray<FormGroup> {
    return this.form.controls['fields'] as FormArray<FormGroup>;
  }

  fieldControlAt(index: number, controlName: string): AbstractControl | undefined {
    return this.fields.at(index)?.controls[controlName];
  }

  fieldAt(index: number): FormGroup | undefined {
    return this.fields.at(index);
  }

  selectComponent(index: number) {
    this.selectedFieldIdx.set(index);
  }

  removeComponent(event: MouseEvent, index: number) {
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
        fieldForm.addControl('source', this.fb.control<string>(element.source, SchemaValidator.FIELD_OPTION_SOURCE));
        break;
      }
      case SchemaFieldKind.OPTIONS: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        fieldForm.addControl('source', this.fb.control<string>(element.source, SchemaValidator.FIELD_OPTION_SOURCE));
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
        // Fallback to first file type if exists
        if (element.fileTypes && element.fileTypes.length > 0) {
          fieldForm.addControl(
            'fileType',
            this.fb.control<AssetFileType | undefined>(element.fileTypes[0], SchemaValidator.FIELD_FILE_TYPES),
          );
        } else {
          fieldForm.addControl(
            'fileType',
            this.fb.control<AssetFileType | undefined>(element.fileType || AssetFileType.ANY, SchemaValidator.FIELD_FILE_TYPES),
          );
        }
        break;
      }
      case SchemaFieldKind.ASSETS: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        // Fallback to first file type if exists
        if (element.fileTypes && element.fileTypes.length > 0) {
          fieldForm.addControl(
            'fileType',
            this.fb.control<AssetFileType | undefined>(element.fileTypes[0], SchemaValidator.FIELD_FILE_TYPES),
          );
        } else {
          fieldForm.addControl(
            'fileType',
            this.fb.control<AssetFileType | undefined>(element.fileType || AssetFileType.ANY, SchemaValidator.FIELD_FILE_TYPES),
          );
        }
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

  save(): void {
    //console.group('save')
    this.isSaveLoading.set(true);

    this.schemaService.updateComponent(this.spaceId(), this.schemaId(), this.form.value as SchemaComponentUpdate).subscribe({
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

  fieldDropDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.fields.at(event.previousIndex);
    this.fields.removeAt(event.previousIndex);
    this.fields.insert(event.currentIndex, tmp);
    this.form.markAsDirty();
  }
}
