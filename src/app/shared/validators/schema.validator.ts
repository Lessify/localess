import { ValidatorFn, Validators } from '@angular/forms';
import { CommonPattern, CommonValidator } from './common.validator';

const SCHEMA_RESERVED_IDS = [
  'Translations',
  'Links',
  'ContentMetadata',
  'ContentReference',
  'ContentRichText',
  'ContentLink',
  'ContentData',
  'ContentAsset',
  'Content',
];

const SCHEMA_RESERVED_FIELD_NAMES = ['_id', '_schema', 'schema'];

export class SchemaValidator {
  public static ID: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.SCHEMA_ID),
    CommonValidator.reservedName(SCHEMA_RESERVED_IDS),
    Validators.minLength(2),
    Validators.maxLength(50),
  ];

  public static TYPE: ValidatorFn[] = [Validators.required];

  public static DESCRIPTION: ValidatorFn[] = [Validators.maxLength(250)];

  public static DISPLAY_NAME: ValidatorFn[] = [CommonValidator.noSpaceAround, Validators.maxLength(50)];

  public static LABEL: ValidatorFn[] = [CommonValidator.noSpace, Validators.minLength(2), Validators.maxLength(50)];

  // Component
  public static FIELD_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.JSON_NAME),
    CommonValidator.reservedName(SCHEMA_RESERVED_FIELD_NAMES),
    Validators.minLength(2),
    Validators.maxLength(30),
  ];

  public static FIELD_KIND: ValidatorFn[] = [Validators.required];

  public static FIELD_DISPLAY_NAME: ValidatorFn[] = [CommonValidator.noSpaceAround, Validators.maxLength(30)];

  public static FIELD_REQUIRED: ValidatorFn[] = [];

  public static FIELD_TRANSLATABLE: ValidatorFn[] = [];

  public static FIELD_DESCRIPTION: ValidatorFn[] = [Validators.maxLength(500)];

  public static FIELD_DEFAULT_VALUE: ValidatorFn[] = [Validators.maxLength(250)];

  public static FIELD_MIN_VALUE: ValidatorFn[] = [];

  public static FIELD_MAX_VALUE: ValidatorFn[] = [];

  public static FIELD_MIN_VALUES: ValidatorFn[] = [Validators.min(0)];

  public static FIELD_MAX_VALUES: ValidatorFn[] = [];

  public static FIELD_MIN_LENGTH: ValidatorFn[] = [Validators.min(0)];

  public static FIELD_MAX_LENGTH: ValidatorFn[] = [];

  public static FIELD_OPTIONS: ValidatorFn[] = [];

  public static FIELD_OPTION_SOURCE: ValidatorFn[] = [Validators.required];

  public static FIELD_OPTION_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(1),
    Validators.maxLength(50),
  ];

  public static FIELD_OPTION_VALUE: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.pattern(CommonPattern.ENUM_VALUE),
    Validators.minLength(1),
    Validators.maxLength(50),
  ];

  public static FIELD_SCHEMA: ValidatorFn[] = [Validators.required];

  public static FIELD_SCHEMAS: ValidatorFn[] = [Validators.required];

  public static FIELD_FILE_TYPES: ValidatorFn[] = [];

  public static FIELD_REFERENCE_PATH: ValidatorFn[] = [CommonValidator.noSpaceAround];
}
