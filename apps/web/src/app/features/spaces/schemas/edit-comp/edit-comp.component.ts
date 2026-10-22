import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { DirtyFormGuardComponent } from '@core/guards/dirty-form.guard';
import { NotificationService } from '@core/services/notification.service';
import { PlatformService } from '@core/services/platform.service';
import { SchemaService } from '@core/services/schema.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { serverReason } from '@core/utils/api-error';
import { formValueKey } from '@core/utils/form-value';
import {
  assetFieldFileType,
  AssetFileType,
  Schema,
  SCHEMA_PREVIEW_FIELD_KINDS,
  SchemaField,
  SchemaFieldKind,
  SchemaType,
  SchemaUpdate,
} from '@localess/shared';
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
import { assetFileTypeDescriptions, schemaFieldKindDescriptions } from '@shared/models/schema.model';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { CommonValidator } from '@shared/validators/common.validator';
import { LabelValidator } from '@shared/validators/label.validator';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { combineLatest, filter } from 'rxjs';

import { EditFieldComponent } from '../shared/edit-field/edit-field.component';
import { SchemaValidator } from '../shared/schema.validator';

@Component({
  selector: 'll-schema-edit-comp',
  templateUrl: './edit-comp.component.html',
  styleUrl: './edit-comp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'captureKeyboard($event)',
  },
  imports: [
    HasRolePipe,
    CommonModule,
    HlmTabsImports,
    ReactiveFormsModule,
    DragDropModule,
    HlmAccordionImports,
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
    HlmScrollAreaImports,
    NgScrollbarModule,
    HlmKbdImports,
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
  readonly platformService = inject(PlatformService);
  readonly fe = inject(FormErrorHandlerService);
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly schemaService = inject(SchemaService);
  private readonly spaceStore = inject(SpaceStore);
  /** The space's schemas (live, from `SpaceStore`), once they arrived: the ones a field may offer. */
  private readonly spaceSchemas$ = toObservable(
    computed(() => (this.spaceStore.schemasLoaded() ? this.spaceStore.schemas() : undefined)),
  ).pipe(filter(it => it !== undefined));
  private readonly notificationService = inject(NotificationService);

  readonly PREVIEW_TYPES = SCHEMA_PREVIEW_FIELD_KINDS;

  // Input
  spaceId = input.required<string>();
  schemaId = input.required<string>();

  entity?: Schema;
  schemas: Schema[] = [];
  /** A field kind's and an asset file type's name, icon and description (typed keys: form values are untyped). */
  protected readonly fieldKindDescription = (kind: SchemaFieldKind) => schemaFieldKindDescriptions[kind];
  protected readonly fileTypeDescription = (type: AssetFileType) => assetFileTypeDescriptions[type];

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
    combineLatest([this.spaceSchemas$, this.schemaService.findOne(spaceId, entityId)])
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
    // Emptied in place: the new-field-name validator holds this array.
    this.fieldReservedNames.length = 0;
    this.entity = schema;

    this.form.reset();
    this.form.patchValue(schema);

    if (schema.type === SchemaType.NODE || schema.type === SchemaType.ROOT) {
      this.fields.clear();
      schema.fields?.forEach(it => this.addField(it));
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
    // Remove name from reserved names, and from the preview when it was that field
    const cValue = this.fieldControlAt(index, 'name')?.value;
    if (cValue) {
      const idx = this.fieldReservedNames.indexOf(cValue);
      if (idx !== -1) {
        this.fieldReservedNames.splice(idx, 1);
      }
      if (this.form.value['previewField'] === cValue) {
        this.form.controls['previewField'].setValue(undefined);
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
        // `fileType`, else the first of `fileTypes` (older schemas, templates): the same rule as the content editor.
        fieldForm.addControl(
          'fileType',
          this.fb.control<AssetFileType | undefined>(assetFieldFileType(element), SchemaValidator.FIELD_FILE_TYPES),
        );
        break;
      }
      case SchemaFieldKind.ASSETS: {
        fieldForm.addControl(
          'translatable',
          this.fb.control<boolean | undefined>(element.translatable, SchemaValidator.FIELD_TRANSLATABLE),
        );
        // `fileType`, else the first of `fileTypes` (older schemas, templates): the same rule as the content editor.
        fieldForm.addControl(
          'fileType',
          this.fb.control<AssetFileType | undefined>(assetFieldFileType(element), SchemaValidator.FIELD_FILE_TYPES),
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

  /** What Save sends: the component's settings from the form, and only those (the server refuses other keys). */
  private body(): SchemaUpdate {
    const value = this.form.value;
    return {
      displayName: value['displayName'],
      description: value['description'],
      previewField: value['previewField'],
      labels: value['labels'],
      fields: value['fields'],
    };
  }

  save(): void {
    //console.group('save')
    this.isSaveLoading.set(true);

    const sent = formValueKey(this.form.value);
    this.schemaService.update(this.spaceId(), this.schemaId(), this.body()).subscribe({
      next: schema => {
        this.savedOver = this.entity?.updatedAt;
        this.notificationService.success('Schema has been updated.');
        // Edits made while the request was in flight were not sent: they stay unsaved (dirty, the leave guard warns)
        // and are not reloaded over; the next Save sends them.
        if (formValueKey(this.form.value) !== sent) return;
        // Saved: live updates may reload the form again; it shows what was stored.
        // The answer is the schema as stored.
        this.form.markAsPristine();
        if (!this.isStale(schema)) this.applySchema(schema);
      },
      error: (err: unknown) => {
        // A refusal (400 broken field rules or a validation list, 409) carries the server's reason.
        const reason = err instanceof HttpErrorResponse && (err.status === 400 || err.status === 409) ? serverReason(err) : undefined;
        if (reason) {
          this.notificationService.error('Schema can not be updated.', { description: reason });
        } else {
          this.notificationService.error('Schema can not be updated.');
        }
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
