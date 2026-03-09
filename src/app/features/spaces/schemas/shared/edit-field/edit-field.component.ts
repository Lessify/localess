import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideClock,
  lucideFile,
  lucideFileDigit,
  lucideFileImage,
  lucideFileMusic,
  lucideFileSymlink,
  lucideFileText,
  lucideFileVideoCamera,
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
    MatExpansionModule,
    CommonModule,
    HlmFieldImports,
    HlmIconImports,
    HlmInputImports,
    HlmTooltipImports,
    HlmInputGroupImports,
    BrnSelectImports,
    HlmSelectImports,
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
      lucideFile,
      lucideFileImage,
      lucideFileVideoCamera,
      lucideFileMusic,
      lucideFileText,
      lucideFileDigit,
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.OPTION: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
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
        this.form.removeControl('fileType');
        // Reference
        this.form.removeControl('path');
        break;
      }
      case SchemaFieldKind.OPTIONS: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
        break;
      }
      case SchemaFieldKind.ASSET: {
        // ADD
        this.form.addControl('translatable', this.fb.control<boolean | undefined>(undefined, SchemaValidator.FIELD_TRANSLATABLE));
        this.form.addControl('fileType', this.fb.control<AssetFileType | undefined>(AssetFileType.ANY, SchemaValidator.FIELD_FILE_TYPES));
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
        this.form.addControl('fileType', this.fb.control<AssetFileType | undefined>(AssetFileType.ANY, SchemaValidator.FIELD_FILE_TYPES));
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
        this.form.removeControl('fileType');
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
        this.form.removeControl('fileType');
        // Reference
        this.form.removeControl('path');
        break;
      }
    }
  }
}
