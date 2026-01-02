import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideClock,
  lucideFileSymlink,
  lucideInfo,
  lucideLink,
  lucideList,
  lucidePalette,
  lucidePaperclip,
  lucidePencil,
  lucidePencilOff,
  lucidePencilRuler,
  lucideTextInitial,
  lucideToggleLeft,
  lucideToyBrick,
  lucideType,
} from '@ng-icons/lucide';
import { tablerMarkdown, tablerNumber } from '@ng-icons/tabler-icons';
import {
  AssetFileType,
  assetFileTypeDescriptions,
  Schema,
  SchemaFieldKind,
  schemaFieldKindDescriptions,
  SchemaFieldOptionSelectable,
  SchemaType,
  sortSchema,
} from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'll-schema-field-edit',
  templateUrl: './edit-field.component.html',
  styleUrls: ['./edit-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    MatSlideToggleModule,
    TextFieldModule,
    MatDividerModule,
    DragDropModule,
    MatExpansionModule,
    CommonModule,
    MatListModule,
    HlmFieldImports,
    HlmIconImports,
    HlmInputImports,
    HlmTooltipImports,
    HlmInputGroupImports,
    HlmSelectImports,
    BrnSelectImports,
    HlmSwitchImports,
    HlmTextareaImports,
  ],
  providers: [
    provideIcons({
      lucideInfo,
      lucidePencil,
      lucidePencilOff,
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
    }),
  ],
})
export class EditFieldComponent {
  readonly fe = inject(FormErrorHandlerService);
  private readonly fb = inject(FormBuilder);
  readonly TRANSLATABLE_FIELDS = [
    'TEXT',
    'TEXTAREA',
    'RICH_TEXT',
    'MARKDOWN',
    'NUMBER',
    'COLOR',
    'DATE',
    'DATETIME',
    'BOOLEAN',
    'OPTION',
    'OPTIONS',
    'LINK',
    'ASSET',
    'ASSETS',
  ];

  // Input
  @Input() form: FormGroup = this.fb.group({});
  schemas = input.required<Schema[]>();

  fieldKinds = Object.values(SchemaFieldKind);
  assetTypes = Object.values(AssetFileType);

  schemaFieldKindDescriptions = schemaFieldKindDescriptions;
  assetFileTypeDescriptions = assetFileTypeDescriptions;
  nameReadonly = true;
  // Schemas
  nodeSchemas = computed(() =>
    this.schemas()
      .filter(it => it.type === SchemaType.NODE)
      .sort(sortSchema),
  );
  enumSchemas = computed(() =>
    this.schemas()
      .filter(it => it.type === SchemaType.ENUM)
      .sort(sortSchema),
  );

  settingsStore = inject(LocalSettingsStore);

  get options(): FormArray<FormGroup> | undefined {
    return this.form.controls['options'] as FormArray<FormGroup>;
  }

  addOptionForm(): void {
    this.options?.push(this.generateOptionForm());
  }

  removeOptionForm(idx: number): void {
    this.options?.removeAt(idx);
  }

  generateOptionForm(): FormGroup {
    return this.fb.group({
      name: this.fb.control('', SchemaValidator.FIELD_OPTION_NAME),
      value: this.fb.control('', SchemaValidator.FIELD_OPTION_VALUE),
    });
  }

  selectFieldKind(value: SchemaFieldKind): void {
    switch (value) {
      case SchemaFieldKind.TEXT:
      case SchemaFieldKind.TEXTAREA:
      case SchemaFieldKind.RICH_TEXT:
      case SchemaFieldKind.MARKDOWN: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        this.form.addControl('minLength', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MIN_LENGTH));
        this.form.addControl('maxLength', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MAX_LENGTH));
        // REMOVE
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('slug');
        break;
      }
      case SchemaFieldKind.NUMBER: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        this.form.addControl('minValue', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MIN_VALUE));
        this.form.addControl('maxValue', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MAX_VALUE));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('slug');
        break;
      }
      case SchemaFieldKind.COLOR: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('slug');
        break;
      }

      case SchemaFieldKind.DATE: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.DATETIME: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.BOOLEAN: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.OPTION: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        const options: FormArray = this.fb.array<SchemaFieldOptionSelectable>([], SchemaValidator.FIELD_OPTIONS);
        //options.push(this.generateOptionForm());
        this.form.addControl('options', options);
        this.form.addControl('source', this.fb.control<string>('', SchemaValidator.FIELD_OPTION_SOURCE));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Options
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.OPTIONS: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        const options: FormArray = this.fb.array<SchemaFieldOptionSelectable>([], SchemaValidator.FIELD_OPTIONS);
        //options.push(this.generateOptionForm());
        this.form.addControl('options', options);
        this.form.addControl('source', this.fb.control<string>('', SchemaValidator.FIELD_OPTION_SOURCE));
        this.form.addControl('minValues', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MIN_VALUES));
        this.form.addControl('maxValues', this.fb.control<number | undefined>(undefined, SchemaValidator.FIELD_MAX_VALUES));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.LINK: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.REFERENCE:
      case SchemaFieldKind.REFERENCES: {
        // ADD
        this.form.addControl('path', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_REFERENCE_PATH));
        // REMOVE
        this.form.removeControl('translatable');
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        break;
      }
      case SchemaFieldKind.ASSET: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        this.form.addControl(
          'fileTypes',
          this.fb.control<AssetFileType[] | undefined>([AssetFileType.ANY], SchemaValidator.FIELD_FILE_TYPES),
        );
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.ASSETS: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        this.form.addControl(
          'fileTypes',
          this.fb.control<AssetFileType[] | undefined>([AssetFileType.ANY], SchemaValidator.FIELD_FILE_TYPES),
        );
        // REMOVE
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Schema
        this.form.removeControl('schemas');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.SCHEMA: {
        // ADD
        this.form.addControl('schemas', this.fb.control<string[] | undefined>(undefined));
        // REMOVE
        this.form.removeControl('translatable');
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.SCHEMAS: {
        // ADD
        this.form.addControl('schemas', this.fb.control<string[] | undefined>(undefined));
        // REMOVE
        this.form.removeControl('translatable');
        // Text & TextArea & RichTex & Markdown
        this.form.removeControl('minLength');
        this.form.removeControl('maxLength');
        // Number
        this.form.removeControl('minValue');
        this.form.removeControl('maxValue');
        // Option & Options
        this.form.removeControl('source');
        this.form.removeControl('options');
        this.form.removeControl('minValues');
        this.form.removeControl('maxValues');
        // Asset & Assets
        this.form.removeControl('fileTypes');
        // Reference
        this.form.removeControl('path');
        break;
      }
    }
  }

  optionDropDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const options = this.form.controls['options'] as FormArray;
    const tmp = options.at(event.previousIndex);
    options.removeAt(event.previousIndex);
    options.insert(event.currentIndex, tmp);
  }

  assetTypeSelection(event: MatSelectionListChange) {
    console.log(event);
    const eventOption = event.options[0];
    if (eventOption.selected) {
      if (eventOption.value === AssetFileType.ANY) {
        // Deselect others
        this.form.controls['fileTypes'].setValue([AssetFileType.ANY]);
      } else {
        const values = event.source.selectedOptions.selected.filter(it => it.value !== AssetFileType.ANY).map(it => it.value);
        this.form.controls['fileTypes'].setValue(values);
      }
    } else {
      // In case nothing is selected, Select ANY
      if (event.source.selectedOptions.selected.length === 0) {
        this.form.controls['fileTypes'].setValue([AssetFileType.ANY]);
      }
    }
  }
}
